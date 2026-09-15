import * as cdk from 'aws-cdk-lib';
import {
    aws_certificatemanager as acm,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_route53 as route53,
    aws_route53_targets as route53Targets,
    aws_s3 as s3,
    aws_s3_deployment as s3deploy,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

type UIStackProps = cdk.StackProps & {
    apiEndpoint: string;
    rootDomain: string;
    hostedZoneId: string;
    siteDomain: string;
};

export class UIStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: UIStackProps) {
        super(scope, id, props);

        if (!cdk.Token.isUnresolved(this.region) && this.region !== 'us-east-1') {
            throw new Error(
                'CloudFront certificates must live in us-east-1. Deploy this stack with CDK_DEFAULT_REGION=us-east-1.'
            );
        }

        const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
            hostedZoneId: props.hostedZoneId,
            zoneName: props.rootDomain,
        });

        const siteBucket = new s3.Bucket(this, 'SiteBucket', {
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            publicReadAccess: false,
            enforceSSL: true,
            versioned: false,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            autoDeleteObjects: false,
        });

        const wwwSiteDomain = `www.${props.siteDomain}`;
        const domainNames = [props.siteDomain, wwwSiteDomain];

        cdk.Tags.of(this).add('Project', this.stackName);
        cdk.Tags.of(this).add('SiteDomain', props.siteDomain);
        cdk.Tags.of(this).add('WwwSiteDomain', wwwSiteDomain);

        const certificate = new acm.Certificate(this, 'SiteCertificate', {
            domainName: props.siteDomain,
            subjectAlternativeNames: [wwwSiteDomain],
            validation: acm.CertificateValidation.fromDns(hostedZone),
        });

        const apiDomainName = cdk.Fn.select(2, cdk.Fn.split('/', props.apiEndpoint));
        const apiOrigin = new origins.HttpOrigin(apiDomainName, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
        });
        const apiBehavior: cloudfront.BehaviorOptions = {
            origin: apiOrigin,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
            cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
            originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        };

        const spaRewriteCode = [
            'function handler(event) {',
            '    var request = event.request;',
            '    var uri = request.uri;',
            '',
            "    if (uri === '/favicon.ico') {",
            "        request.uri = '/favicon.svg';",
            '        return request;',
            '    }',
            '',
            "    if (uri !== '/' && uri.indexOf('.') === -1) {",
            "        request.uri = '/index.html';",
            '    }',
            '',
            '    return request;',
            '}',
        ].join('\n');

        const spaRewriteFunction = new cloudfront.Function(this, 'SpaRewriteFunction', {
            code: cloudfront.FunctionCode.fromInline(spaRewriteCode),
        });

        const distribution = new cloudfront.Distribution(this, 'Distribution', {
            defaultBehavior: {
                origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                functionAssociations: [
                    {
                        function: spaRewriteFunction,
                        eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
                    },
                ],
            },
            additionalBehaviors: {
                'auth/*': apiBehavior,
                health: apiBehavior,
                me: apiBehavior,
            },
            domainNames,
            certificate,
            defaultRootObject: 'index.html',
            minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            enableLogging: true,
        });

        const primaryRecordName =
            props.siteDomain === props.rootDomain ? undefined : props.siteDomain.replace(`.${props.rootDomain}`, '');
        const wwwRecordName = wwwSiteDomain.replace(`.${props.rootDomain}`, '');

        new route53.ARecord(this, 'PrimaryDomainARecord', {
            zone: hostedZone,
            recordName: primaryRecordName,
            target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(distribution)),
        });

        new route53.AaaaRecord(this, 'PrimaryDomainAaaaRecord', {
            zone: hostedZone,
            recordName: primaryRecordName,
            target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(distribution)),
        });

        new route53.ARecord(this, 'WwwDomainARecord', {
            zone: hostedZone,
            recordName: wwwRecordName,
            target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(distribution)),
        });

        new route53.AaaaRecord(this, 'WwwDomainAaaaRecord', {
            zone: hostedZone,
            recordName: wwwRecordName,
            target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(distribution)),
        });

        const stackSourceDir = path.dirname(fileURLToPath(import.meta.url));
        const uiDistPath = path.resolve(stackSourceDir, '../../ui/dist');

        new s3deploy.BucketDeployment(this, 'DeployWebsite', {
            destinationBucket: siteBucket,
            sources: [s3deploy.Source.asset(uiDistPath)],
            distribution,
            distributionPaths: ['/*'],
            prune: true,
            retainOnDelete: false,
        });

        new cdk.CfnOutput(this, 'SiteDomainOutput', {
            value: `https://${props.siteDomain}`,
            description: 'Static app URL',
        });

        new cdk.CfnOutput(this, 'WwwSiteDomainOutput', {
            value: `https://${wwwSiteDomain}`,
            description: 'Static app www URL',
        });

        new cdk.CfnOutput(this, 'DistributionIdOutput', {
            value: distribution.distributionId,
            description: 'CloudFront distribution ID',
        });
    }
}
