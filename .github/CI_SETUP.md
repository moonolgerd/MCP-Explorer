# GitHub CI/CD Setup for VS Code Extension

This repository includes GitHub Actions workflows for building, testing, and publishing the MCP Explorer VS Code extension.

## Workflows

### 1. Build and Test (`build.yml`)
**Trigger**: Push to main/master, pull requests, manual dispatch
**Purpose**: Continuous integration - builds and tests the extension

**What it does**:
- Installs dependencies
- Runs linting and type checking
- Builds the extension
- Packages the extension into a `.vsix` file
- Uploads the `.vsix` as a build artifact

### 2. Publish (`publish.yml`)
**Trigger**: Version tags (`v*`), manual dispatch
**Purpose**: Publishes the extension to VS Code Marketplace and creates GitHub releases

**What it does**:
- Builds and packages the extension
- Publishes to VS Code Marketplace
- Creates a GitHub release with the `.vsix` file attached

## Setup Instructions

### 1. Required Secrets

You need to configure these secrets in your GitHub repository:

#### `VSCE_PAT` - VS Code Publishing Personal Access Token
1. Go to [Azure DevOps](https://dev.azure.com)
2. Sign in with your Microsoft account
3. Go to Profile > Personal Access Tokens
4. Create new token:
   - **Name**: "VS Code Extension Publishing"
   - **Organization**: All accessible organizations
   - **Expiration**: 1 year (or your preference)
   - **Scopes**: Custom defined → Marketplace → Manage
5. Copy the token
6. In your GitHub repository: Settings → Secrets and variables → Actions → New repository secret
7. Name: `VSCE_PAT`, Value: paste your token

### 2. VS Code Marketplace Publisher Setup

1. Visit [Visual Studio Marketplace Publisher Management](https://marketplace.visualstudio.com/manage)
2. Sign in with the same Microsoft account from step 1
3. Create a new publisher or use existing one
4. Note your publisher ID

## Publishing Process

### Option 1: Tag-based Publishing (Recommended)

1. Update version in `package.json`:
   ```bash
   npm version patch  # or minor/major
   ```

2. Push the tag:
   ```bash
   git push origin v1.0.0  # replace with your version
   ```

3. The workflow will automatically:
   - Build and test the extension
   - Publish to VS Code Marketplace
   - Create a GitHub release

### Option 2: Manual Publishing

1. Go to GitHub repository → Actions tab
2. Select "Publish VS Code Extension" workflow
3. Click "Run workflow"
4. Optionally specify a version number
5. Click "Run workflow"

## Local Testing

Before publishing, you can test the build locally:

```bash
# Install dependencies
npm install

# Build and package
npm run compile
npx vsce package

# The .vsix file can be installed in VS Code for testing
```

## Troubleshooting

### Common Issues

1. **Publisher not found**: Make sure the publisher ID in `package.json` matches your VS Code Marketplace publisher
2. **Token invalid**: Your Personal Access Token may have expired or lack proper permissions
3. **Build fails**: Check that all dependencies are properly listed in `package.json`

### Checking Build Status

- Go to the "Actions" tab in your GitHub repository
- Click on any workflow run to see detailed logs
- Build artifacts (`.vsix` files) are available for download from successful builds

## Security Notes

- Never commit your Personal Access Token to the repository
- Use GitHub Secrets to store sensitive information
- The PAT should only have Marketplace publishing permissions
- Consider setting token expiration dates for security
