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
    image_suffix: feature-xyz  # Optional - simpler approach for consistent tagging
```

## Inputs

* `api_key`: Your Quant API key (required)
* `organization`: Your Quant organisation ID (required)
* `compose_file`: Path to your docker-compose file (required)
* `base_url`: Quant Cloud API URL (optional, defaults to https://dashboard.quantcdn.io/api/v3)
* `image_suffix`: Optional suffix to append to internal image tags (optional, recommended for feature branches)
* `image_tag_updates`: JSON object mapping container names to new image tags (optional, for complex scenarios)

## Outputs

* `translated_compose`: Service definition to be used with other Quant Cloud actions.

## Examples

### Using image suffix (recommended)

For feature branches or consistent tagging across all internal images, use `image_suffix`:

```yaml
- uses: quantcdn/quant-cloud-compose-action@v1
  with:
    api_key: ${{ secrets.QUANT_API_KEY }}
    organization: your-org-id
    compose_file: docker-compose.yml
    image_suffix: ${{ github.head_ref }}  # e.g., converts "nginx" to "nginx-feature-xyz"
```

This automatically transforms all internal image references from `apache` to `apache-feature-xyz`, making it perfect for:
- Feature branch deployments
- PR previews
- Testing environments

### Updating specific image tags

For more complex scenarios where different containers need different tags, use `image_tag_updates`:

```yaml
- uses: quantcdn/quant-cloud-compose-action@v1
  with:
    api_key: ${{ secrets.QUANT_API_KEY }}
    organization: your-org-id
    compose_file: docker-compose.yml
    image_tag_updates: '{"service1": "${{ steps.get-tag.outputs.tag }}", "service2": "v2.0.0"}'
```

This is useful when you need to:
- Update specific services to different versions
- Mix internal and external image references
- Use dynamic tags from previous steps