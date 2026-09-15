import * as cdk from 'aws-cdk-lib';

import { APIStack } from '../lib/api-stack.js';
import { UIStack } from '../lib/ui-stack.js';

const app = new cdk.App();

const requiredContext = (key: string, options: { allowEmpty?: boolean } = {}) => {
    const value = app.node.tryGetContext(key);

    if (typeof value !== 'string' || (!options.allowEmpty && value.trim().length === 0)) {
        throw new Error(`Missing required CDK context value: ${key}`);
    }

    return value.trim();
};

const rootDomain = requiredContext('rootDomain');
const siteSubdomain = requiredContext('siteSubdomain', { allowEmpty: true });
const hostedZoneId = requiredContext('hostedZoneId');
const siteDomain = siteSubdomain.length > 0 ? `${siteSubdomain}.${rootDomain}` : rootDomain;

const apiStack = new APIStack(app, 'cruise-deck-api', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
    },
    stackName: 'cruise-deck-api',
    siteDomain,
});

new UIStack(app, 'cruise-deck-ui', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
    },
    stackName: 'cruise-deck-ui',
    apiEndpoint: apiStack.api.apiEndpoint,
    rootDomain,
    hostedZoneId,
    siteDomain,
});
