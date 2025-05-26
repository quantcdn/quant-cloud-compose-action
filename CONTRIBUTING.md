# Contributing to Quant Cloud Environment State Action

## Development

### Local Testing

1. Install dependencies:
```bash
npm install
```

2. Build the action:
```bash
npx ncc build src/index.ts
```

3. Run tests locally using act:
```bash
act workflow_dispatch -W .github/workflows/test.yml --secret-file .secrets
```

### Release Process

1. Update version in `package.json`
2. Create and push a new tag:
```bash
git tag v1.0.0
git push origin v1.0.0
```

The release workflow will automatically:
- Build the action
- Create a GitHub release
- Package the action for the marketplace 