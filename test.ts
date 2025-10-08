#!/usr/bin/env ts-node
/**
 * Local test script for the compose action
 * 
 * Usage:
 *   QUANT_API_KEY=your-key QUANT_ORG=your-org npm run test:local
 * 
 * Or with image suffix:
 *   QUANT_API_KEY=your-key QUANT_ORG=your-org IMAGE_SUFFIX=feature-test npm run test:local
 */

import { 
    ComposeApi,
    ValidateComposeRequest,
    ValidateCompose200Response
} from '@quantcdn/quant-client';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

const apiOpts = (apiKey: string) => {
    return{
        applyToRequest: (requestOptions: any) => {
            if (requestOptions && requestOptions.headers) {
                requestOptions.headers["Authorization"] = `Bearer ${apiKey}`;
            }
        }
    }
}

async function test() {
    const apiKey = process.env.QUANT_API_KEY;
    const org = process.env.QUANT_ORG;
    const imageSuffix = process.env.IMAGE_SUFFIX;
    const composeFile = process.env.COMPOSE_FILE || 'docker-compose.yml';
    const baseUrl = process.env.BASE_URL || 'https://dashboard.quantcdn.io/api/v3';

    if (!apiKey || !org) {
        console.error('ERROR: QUANT_API_KEY and QUANT_ORG environment variables are required');
        process.exit(1);
    }

    console.log('Test Configuration:');
    console.log('  API Key:', apiKey.substring(0, 10) + '...');
    console.log('  Organization:', org);
    console.log('  Compose File:', composeFile);
    console.log('  Base URL:', baseUrl);
    console.log('  Image Suffix:', imageSuffix || '(none)');
    console.log('');

    // Read the docker-compose file
    const composeContent = fs.readFileSync(composeFile, 'utf8');
    const composeContentYaml = yaml.load(composeContent);

    if (!composeContentYaml) {
        console.error('ERROR: Compose file is not valid YAML');
        process.exit(1);
    }

    const composeClient = new ComposeApi(baseUrl);
    composeClient.setDefaultAuthentication(apiOpts(apiKey));

    const validateRequest = new ValidateComposeRequest();
    validateRequest.compose = yaml.dump(composeContentYaml);
    
    if (imageSuffix) {
        console.log(`Using image suffix: ${imageSuffix}`);
        validateRequest.imageSuffix = imageSuffix;
    }

    console.log('Validating compose file...\n');

    let validateResponse: ValidateCompose200Response;

    try {
        const { body } = await composeClient.validateCompose(org, validateRequest);
        validateResponse = body;
        console.log('✅ Validation successful!\n');
    } catch (error: any) {
        console.error('❌ Validation failed!');
        console.error('');
        
        if (error.response) {
            console.error('Status Code:', error.response.statusCode);
            console.error('');
            if (error.response.body) {
                const errorBody = typeof error.response.body === 'string' 
                    ? error.response.body 
                    : JSON.stringify(error.response.body, null, 2);
                console.error('Response Body:');
                console.error(errorBody);
            }
        } else if (error.message) {
            console.error('Error Message:', error.message);
        } else {
            console.error('Error:', JSON.stringify(error, null, 2));
        }
        
        process.exit(1);
    }

    if (validateResponse.translationWarnings && validateResponse.translationWarnings.length > 0) {
        console.log('⚠️  Translation Warnings:');
        for (const warning of validateResponse.translationWarnings) {
            console.log('  -', warning);
        }
        console.log('');
    }

    console.log('Translated Compose Definition:');
    console.log(JSON.stringify(validateResponse.translatedComposeDefinition, null, 2));
    console.log('');
    console.log('✅ Test completed successfully');
}

test().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});

