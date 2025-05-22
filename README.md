# Quant Cloud Compose Action

Validate and prepare a translated docker compose specification to be used with other Quant Cloud actions.

## Usage

```yaml
- uses: quantcdn/quant-cloud-compose-action@v1
  with:
    api_key: ${{ secrets.QUANT_API_KEY }}
    organization: your-org-id
    compose_file: path/to/docker-compose.yml
    base_url: https://dashboard.quantcdn.io/api/v3  # Optional
```

## Inputs

* `api_key`: Your Quant API key (required)
* `organization`: Your Quant organisation ID (required)
* `environment_name`: Name for the environment (required)
* `base_url`: Quant Cloud API URL (optional, defaults to https://dashboard.quantcdn.io/api/v3)

## Outputs

* `validated_compose`: The ID of the created environment 