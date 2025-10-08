import * as core from '@actions/core';
import { 
    ComposeApi,
    ValidateComposeRequest,
    ValidateCompose200Response
} from '@quantcdn/quant-client';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface ApiError {
    body?: {
        message?: string;
    }
}

interface ImageTagUpdates {
    [key: string]: string;
}

const apiOpts = (apiKey: string) => {
    return{
        applyToRequest: (requestOptions: any) => {
            if (requestOptions && requestOptions.headers) {
                requestOptions.headers["Authorization"] = `Bearer ${apiKey}`;
            }
        }
    }
}

async function run() {
    const apiKey = core.getInput('api_key', { required: true });
    const org = core.getInput('organization', { required: true });
    const composeFilePath = core.getInput('compose_file', { required: true });
    const imageSuffix = core.getInput('image_suffix', { required: false });
    const imageTagUpdatesStr = core.getInput('image_tag_updates', { required: false });
    
    // Default to the public Quant Cloud API
    const baseUrl = core.getInput('base_url', { required: false }) || 'https://dashboard.quantcdn.io/api/v3';

    // Read the docker-compose file
    const composeContent = fs.readFileSync(path.join(process.env.GITHUB_WORKSPACE || '', composeFilePath), 'utf8');

    if (!composeContent) {
        core.setFailed('Compose file not found at ' + composeFilePath);
        return;
    }

    const composeContentYaml = yaml.load(composeContent);

    if (!composeContentYaml) {
        core.setFailed('Compose file is not valid YAML');
        return;
    }

    const composeClient = new ComposeApi(baseUrl);
    composeClient.setDefaultAuthentication(apiOpts(apiKey));

    const validateRequest = new ValidateComposeRequest();
    validateRequest.compose = yaml.dump(composeContentYaml);
    
    // Apply image suffix if provided (cleaner approach for consistent tagging)
    if (imageSuffix) {
        core.info(`Using image suffix: ${imageSuffix}`);
        validateRequest.imageSuffix = imageSuffix;
    }

    core.info('Validating compose file');

    let validateResponse: ValidateCompose200Response;

    try {
        const { body } = await composeClient.validateCompose(org, validateRequest);
        validateResponse = body;
    } catch (error: any) {
        core.error('Failed to validate compose file');
        
        // Log detailed error information
        if (error.response) {
            core.error(`Status: ${error.response.statusCode}`);
            if (error.response.body) {
                const errorBody = typeof error.response.body === 'string' 
                    ? error.response.body 
                    : JSON.stringify(error.response.body, null, 2);
                core.error(`Response: ${errorBody}`);
            }
        } else if (error.message) {
            core.error(`Error: ${error.message}`);
        } else {
            core.error(`Error: ${JSON.stringify(error, null, 2)}`);
        }
        
        core.setFailed('Compose file validation failed - see logs above for details');
        return;
    }

    if (validateResponse.translationWarnings) {
        core.warning('Compose file has translation warnings');
        for (const warning of validateResponse.translationWarnings) {
            core.warning(warning);
        }
    }

    const translatedCompose = validateResponse?.translatedComposeDefinition

    if (!translatedCompose || !('containers' in translatedCompose) || !Array.isArray(translatedCompose.containers)) {
        core.setFailed('Compose file is invalid');
        return;
    }

    if (translatedCompose.containers.length === 0) {
        core.setFailed('Compose file is invalid');
        return;
    }

    // Apply image tag updates if provided (for more complex per-container tag updates)
    // Note: image_suffix is preferred for simpler use cases
    if (imageTagUpdatesStr) {
        core.info('Applying image tag updates');
        try {
            const imageTagUpdates = JSON.parse(imageTagUpdatesStr) as ImageTagUpdates;
            
            for (const container of translatedCompose.containers) {
                if (container.name && imageTagUpdates[container.name]) {
                    const tag = imageTagUpdates[container.name];
                    core.info(`Updated image tag for container ${container.name} to ${tag}`);
                    container.imageReference = {
                        type: tag.includes(':') ? 'external' : 'internal',
                        identifier: tag
                    }
                }
            }
        } catch (error) {
            core.warning('Failed to parse image tag updates, skipping tag updates');
        }
    }

    const output = JSON.stringify(translatedCompose, null, 2);
    core.setOutput('translated_compose', output);
    core.info(`\n ✅ Successfully translated compose file`);
    return;
}

run(); 