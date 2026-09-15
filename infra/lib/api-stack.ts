import * as cdk from 'aws-cdk-lib';
import {
    aws_apigatewayv2 as apigatewayv2,
    aws_cognito as cognito,
    aws_lambda as lambda,
    aws_lambda_nodejs as lambdaNodejs,
} from 'aws-cdk-lib';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import type { Construct } from 'constructs';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

type APIStackProps = cdk.StackProps & {
    siteDomain: string;
};

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

        const stackSourceDir = path.dirname(fileURLToPath(import.meta.url));
        const authLambdaEntry = path.resolve(stackSourceDir, '../../api/src/lambdas/auth.ts');

        const authLambda = new lambdaNodejs.NodejsFunction(this, 'AuthLambda', {
            functionName: 'cruise-deck-auth',
            entry: authLambdaEntry,
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_22_X,
            architecture: lambda.Architecture.ARM_64,
            memorySize: 512,
            timeout: cdk.Duration.seconds(10),
            environment: {
                ALLOWED_ORIGINS: [
                    `https://${props.siteDomain}`,
                    `https://www.${props.siteDomain}`,
                    'http://localhost:5173',
                ].join(','),
                USER_POOL_ID: userPool.userPoolId,
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
                USER_POOL_REGION: this.region,
            },
        });

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

        this.api.addRoutes({
            path: '/{proxy+}',
            methods: [apigatewayv2.HttpMethod.ANY],
            integration: lambdaIntegration,
        });

        new cdk.CfnOutput(this, 'AuthApiUrlOutput', {
            value: this.api.apiEndpoint,
            description: 'Auth API URL',
        });

        new cdk.CfnOutput(this, 'UserPoolIdOutput', {
            value: userPool.userPoolId,
            description: 'Cognito user pool ID',
        });

        new cdk.CfnOutput(this, 'UserPoolClientIdOutput', {
            value: userPoolClient.userPoolClientId,
            description: 'Cognito web app client ID',
        });
    }
}
