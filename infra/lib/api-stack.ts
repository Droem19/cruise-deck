import * as cdk from 'aws-cdk-lib';
import {
    aws_apigatewayv2 as apigatewayv2,
    aws_cognito as cognito,
    aws_dynamodb as dynamodb,
    aws_lambda as lambda,
    aws_lambda_nodejs as lambdaNodejs,
    aws_s3 as s3,
    aws_s3_notifications as s3n,
} from 'aws-cdk-lib';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import type { Construct } from 'constructs';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

type APIStackProps = cdk.StackProps & {
    siteDomain: string;
};

const copyPdfWorkerAfterBundling = (inputDir: string, outputDir: string) => [
    [
        'node',
        '-e',
        "\"const fs=require('node:fs');const path=require('node:path');const inputDir=process.argv[1];const outputDir=process.argv[2];const workerPath=require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs',{paths:[path.join(inputDir,'api'),inputDir]});fs.copyFileSync(workerPath,path.join(outputDir,'pdf.worker.mjs'));\"",
        JSON.stringify(inputDir),
        JSON.stringify(outputDir),
    ].join(' '),
];

export class APIStack extends cdk.Stack {
    public readonly api: apigatewayv2.HttpApi;

    constructor(scope: Construct, id: string, props: APIStackProps) {
        super(scope, id, props);

        const userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: 'cruise-deck-user-pool',
            signInAliases: {
                email: true,
                username: false,
            },
            signInCaseSensitive: false,
            selfSignUpEnabled: true,
            autoVerify: {
                email: true,
            },
            standardAttributes: {
                email: {
                    required: true,
                    mutable: false,
                },
                givenName: {
                    required: false,
                    mutable: true,
                },
                familyName: {
                    required: false,
                    mutable: true,
                },
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: true,
                tempPasswordValidity: cdk.Duration.days(7),
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            mfa: cognito.Mfa.OFF,
            mfaSecondFactor: { sms: false, otp: true },
            email: cognito.UserPoolEmail.withCognito(),
            userVerification: {
                emailSubject: 'Verify your Cruise Deck account',
                emailBody: [
                    'Your Cruise Deck verification code is {####}',
                    'Enter this code in the app to verify your account.',
                ].join('\n\n'),
                emailStyle: cognito.VerificationEmailStyle.CODE,
            },
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            deletionProtection: true,
            standardThreatProtectionMode: cognito.StandardThreatProtectionMode.NO_ENFORCEMENT,
        });

        const userPoolClient = userPool.addClient('WebAppClient', {
            userPoolClientName: 'cruise-deck-web-app',
            generateSecret: false,
            authFlows: {
                userPassword: true,
                userSrp: true,
            },
            accessTokenValidity: cdk.Duration.hours(1),
            idTokenValidity: cdk.Duration.hours(1),
            refreshTokenValidity: cdk.Duration.days(30),
            enableTokenRevocation: true,
            preventUserExistenceErrors: true,
            readAttributes: new cognito.ClientAttributes().withStandardAttributes({
                email: true,
                emailVerified: true,
                givenName: true,
                familyName: true,
            }),
            writeAttributes: new cognito.ClientAttributes().withStandardAttributes({
                email: true,
                givenName: true,
                familyName: true,
            }),
        });

        const offersBucket = new s3.Bucket(this, 'OfferFilesBucket', {
            bucketName: `cruise-deck-offers-${this.account}-${this.region}`,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        const dataTable = new dynamodb.Table(this, 'CruiseDeckDataTable', {
            tableName: `cruise-deck-data-${this.account}-${this.region}`,
            partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        const stackSourceDir = path.dirname(fileURLToPath(import.meta.url));
        const authLambdaEntry = path.resolve(stackSourceDir, '../../api/src/lambdas/auth.ts');
        const offersLambdaEntry = path.resolve(stackSourceDir, '../../api/src/lambdas/offers.ts');
        const parseOfferLambdaEntry = path.resolve(stackSourceDir, '../../api/src/lambdas/parse-offer.ts');
        const sailingsLambdaEntry = path.resolve(stackSourceDir, '../../api/src/lambdas/sailings.ts');
        const travelersLambdaEntry = path.resolve(stackSourceDir, '../../api/src/lambdas/travelers.ts');

        const allowedOrigins = [
            `https://${props.siteDomain}`,
            `https://www.${props.siteDomain}`,
            'http://localhost:5173',
            'http://localhost:5174',
        ].join(',');

        const authLambda = new lambdaNodejs.NodejsFunction(this, 'AuthLambda', {
            functionName: 'cruise-deck-auth',
            entry: authLambdaEntry,
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_22_X,
            architecture: lambda.Architecture.ARM_64,
            memorySize: 512,
            timeout: cdk.Duration.seconds(10),
            environment: {
                ALLOWED_ORIGINS: allowedOrigins,
                USER_POOL_ID: userPool.userPoolId,
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
                USER_POOL_REGION: this.region,
                CRUISE_DECK_DATA_TABLE_NAME: dataTable.tableName,
            },
        });

        const offersLambda = new lambdaNodejs.NodejsFunction(this, 'OffersLambda', {
            functionName: 'cruise-deck-offers',
            entry: offersLambdaEntry,
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_22_X,
            architecture: lambda.Architecture.ARM_64,
            memorySize: 512,
            timeout: cdk.Duration.seconds(30),
            environment: {
                ALLOWED_ORIGINS: allowedOrigins,
                USER_POOL_ID: userPool.userPoolId,
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
                USER_POOL_REGION: this.region,
                OFFERS_BUCKET_NAME: offersBucket.bucketName,
                CRUISE_DECK_DATA_TABLE_NAME: dataTable.tableName,
            },
        });

        const parseOfferLambda = new lambdaNodejs.NodejsFunction(this, 'ParseOfferLambda', {
            functionName: 'cruise-deck-parse-offer',
            entry: parseOfferLambdaEntry,
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_22_X,
            architecture: lambda.Architecture.ARM_64,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(60),
            bundling: {
                commandHooks: {
                    beforeBundling: () => [],
                    beforeInstall: () => [],
                    afterBundling: copyPdfWorkerAfterBundling,
                },
            },
            environment: {
                OFFERS_BUCKET_NAME: offersBucket.bucketName,
                CRUISE_DECK_DATA_TABLE_NAME: dataTable.tableName,
            },
        });

        const sailingsLambda = new lambdaNodejs.NodejsFunction(this, 'SailingsLambda', {
            functionName: 'cruise-deck-sailings',
            entry: sailingsLambdaEntry,
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_22_X,
            architecture: lambda.Architecture.ARM_64,
            memorySize: 512,
            timeout: cdk.Duration.seconds(10),
            environment: {
                ALLOWED_ORIGINS: allowedOrigins,
                USER_POOL_ID: userPool.userPoolId,
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
                USER_POOL_REGION: this.region,
                CRUISE_DECK_DATA_TABLE_NAME: dataTable.tableName,
            },
        });

        const travelersLambda = new lambdaNodejs.NodejsFunction(this, 'TravelersLambda', {
            functionName: 'cruise-deck-travelers',
            entry: travelersLambdaEntry,
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_22_X,
            architecture: lambda.Architecture.ARM_64,
            memorySize: 512,
            timeout: cdk.Duration.seconds(10),
            environment: {
                ALLOWED_ORIGINS: allowedOrigins,
                USER_POOL_ID: userPool.userPoolId,
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
                USER_POOL_REGION: this.region,
                CRUISE_DECK_DATA_TABLE_NAME: dataTable.tableName,
            },
        });

        offersBucket.grantReadWrite(offersLambda);
        offersBucket.grantRead(parseOfferLambda);
        offersBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(parseOfferLambda));
        dataTable.grantReadWriteData(authLambda);
        dataTable.grantReadWriteData(offersLambda);
        dataTable.grantReadWriteData(parseOfferLambda);
        dataTable.grantReadData(sailingsLambda);
        dataTable.grantReadWriteData(travelersLambda);

        this.api = new apigatewayv2.HttpApi(this, 'AuthApi', {
            apiName: 'cruise-deck-api',
            corsPreflight: {
                allowHeaders: ['Authorization', 'Content-Type'],
                allowMethods: [
                    apigatewayv2.CorsHttpMethod.DELETE,
                    apigatewayv2.CorsHttpMethod.GET,
                    apigatewayv2.CorsHttpMethod.OPTIONS,
                    apigatewayv2.CorsHttpMethod.POST,
                    apigatewayv2.CorsHttpMethod.PUT,
                ],
                allowOrigins: [
                    `https://${props.siteDomain}`,
                    `https://www.${props.siteDomain}`,
                    'http://localhost:5173',
                ],
                allowCredentials: true,
                maxAge: cdk.Duration.days(1),
            },
        });

        const lambdaIntegration = new HttpLambdaIntegration('AuthLambdaIntegration', authLambda);
        const offersLambdaIntegration = new HttpLambdaIntegration('OffersLambdaIntegration', offersLambda);
        const sailingsLambdaIntegration = new HttpLambdaIntegration('SailingsLambdaIntegration', sailingsLambda);
        const travelersLambdaIntegration = new HttpLambdaIntegration('TravelersLambdaIntegration', travelersLambda);

        this.api.addRoutes({
            path: '/{proxy+}',
            methods: [apigatewayv2.HttpMethod.ANY],
            integration: lambdaIntegration,
        });

        new cdk.CfnOutput(this, 'AuthApiUrlOutput', {
            value: this.api.apiEndpoint,
            description: 'Auth API URL',
        });

        this.api.addRoutes({
            path: '/offers',
            methods: [apigatewayv2.HttpMethod.GET, apigatewayv2.HttpMethod.POST],
            integration: offersLambdaIntegration,
        });

        this.api.addRoutes({
            path: '/offers/{offerId}',
            methods: [apigatewayv2.HttpMethod.DELETE],
            integration: offersLambdaIntegration,
        });

        this.api.addRoutes({
            path: '/offers/{offerId}/download',
            methods: [apigatewayv2.HttpMethod.GET],
            integration: offersLambdaIntegration,
        });

        this.api.addRoutes({
            path: '/sailings',
            methods: [apigatewayv2.HttpMethod.GET],
            integration: sailingsLambdaIntegration,
        });

        this.api.addRoutes({
            path: '/travelers',
            methods: [apigatewayv2.HttpMethod.GET, apigatewayv2.HttpMethod.POST],
            integration: travelersLambdaIntegration,
        });

        this.api.addRoutes({
            path: '/travelers/{travelerId}',
            methods: [apigatewayv2.HttpMethod.DELETE, apigatewayv2.HttpMethod.PUT],
            integration: travelersLambdaIntegration,
        });

        new cdk.CfnOutput(this, 'UserPoolIdOutput', {
            value: userPool.userPoolId,
            description: 'Cognito user pool ID',
        });

        new cdk.CfnOutput(this, 'UserPoolClientIdOutput', {
            value: userPoolClient.userPoolClientId,
            description: 'Cognito web app client ID',
        });

        new cdk.CfnOutput(this, 'OffersBucketNameOutput', {
            value: offersBucket.bucketName,
            description: 'Private uploaded offers bucket name',
        });

        new cdk.CfnOutput(this, 'CruiseDeckDataTableNameOutput', {
            value: dataTable.tableName,
            description: 'CruiseDeck application data table name',
        });
    }
}
