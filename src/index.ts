import * as core from '@actions/core';
import { 
    ComposeApi,
    ValidateComposeRequest,
    ValidateCompose200Response
} from 'quant-ts-client';
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

    core.info('Validating compose file');

    let validateResponse: ValidateCompose200Response;

    try {
        const { body } = await composeClient.validateCompose(org, validateRequest);
        validateResponse = body;
    } catch (error) {
        core.setFailed('Compose file is invalid');
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

    // Apply image tag updates if provided
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