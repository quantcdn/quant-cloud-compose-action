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
    image_tag_updates: '{"service1": "v1.0.0", "service2": "feature-x"}'  # Optional
```

## Inputs

* `api_key`: Your Quant API key (required)
* `organization`: Your Quant organisation ID (required)
* `compose_file`: Path to your docker-compose file (required)
* `base_url`: Quant Cloud API URL (optional, defaults to https://dashboard.quantcdn.io/api/v3)
* `image_tag_updates`: JSON object mapping container names to new image tags (optional)

## Outputs

* `translated_compose`: Service definition to be used with other Quant Cloud actions.

## Examples

### Updating image tags

You can update image tags for specific containers using the `image_tag_updates` input:

```yaml
- uses: quantcdn/quant-cloud-compose-action@v1
  with:
    api_key: ${{ secrets.QUANT_API_KEY }}
    organization: your-org-id
    compose_file: docker-compose.yml
    image_tag_updates: '{"service1": "${{ steps.get-tag.outputs.tag }}"}'
```

This is useful when you want to:
- Use tags from previous steps
- Deploy feature branches
- Update specific services to different versions