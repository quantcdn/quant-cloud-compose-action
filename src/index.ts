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

    const output = JSON.stringify(translatedCompose);
    core.setOutput('translated_compose', output);
    core.info(`\n ✅ Successfully translated compose file`);
    return;
}

run(); 