# VS Code Marketplace Publishing Guide

## Current Status ✅
- ✅ Extension builds successfully
- ✅ Extension packages successfully (37.43 KB, 16 files)
- ✅ All TypeScript compiles without errors
- ✅ ESLint passes
- ✅ Package.json is properly configured
- ⚠️  Need to create publisher account
- ⚠️  Need to update repository URLs
- ⚠️  Need Personal Access Token

## Step-by-Step Publishing Process

### Step 1: Create Visual Studio Marketplace Publisher Account
1. Go to [Visual Studio Marketplace Publisher Management](https://marketplace.visualstudio.com/manage)
2. Sign in with your Microsoft/Azure account (create one if needed)
3. Create a new publisher:
   - **Publisher ID**: Choose a unique identifier (e.g., `yourname-extensions`, `your-company-name`)
   - **Display Name**: Human-readable name (e.g., "Your Name", "Your Company")
   - **Important**: Save the Publisher ID - you'll need it!

### Step 2: Create Personal Access Token (PAT)
1. Go to [Azure DevOps](https://dev.azure.com)
2. Sign in with the same Microsoft account
3. Click your profile picture > Personal Access Tokens
4. Create new token:
   - **Name**: "VS Code Extension Publishing"
   - **Organization**: All accessible organizations
   - **Expiration**: Choose 1 year or custom
   - **Scopes**: Select "Custom defined" > "Marketplace" > "Manage"
5. **IMPORTANT**: Copy and save the token immediately (you can't see it again!)

### Step 3: Update package.json with Your Information
Replace these values in `package.json`:
```json
"publisher": "YOUR_ACTUAL_PUBLISHER_ID",
"author": {
  "name": "Your Actual Name"
},
"repository": {
  "type": "git",
  "url": "https://github.com/YOUR_GITHUB_USERNAME/mcp-explorer.git"
},
"homepage": "https://github.com/YOUR_GITHUB_USERNAME/mcp-explorer#readme",
"bugs": {
  "url": "https://github.com/YOUR_GITHUB_USERNAME/mcp-explorer/issues"
}
```

### Step 4: Publish to GitHub (if not done already)
```powershell
# Add GitHub remote (replace YOUR_GITHUB_USERNAME)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/mcp-explorer.git

# Push to GitHub
git push -u origin master
```

### Step 5: Login to VS Code Marketplace
```powershell
vsce login YOUR_ACTUAL_PUBLISHER_ID
```
Enter your Personal Access Token when prompted.

### Step 6: Final Package Test
```powershell
vsce package
```
This should create `mcp-explorer-0.0.1.vsix` successfully.

### Step 7: Publish to Marketplace
```powershell
vsce publish
```

## Alternative: Manual Upload
If `vsce publish` doesn't work:
1. Package the extension: `vsce package`
2. Go to [Visual Studio Marketplace Publisher Management](https://marketplace.visualstudio.com/manage)
3. Click your publisher
4. Click "New extension" > "Visual Studio Code"
5. Upload the `.vsix` file
6. Fill in any additional details

## Post-Publishing Steps
1. Verify extension appears in marketplace
2. Test installation: `code --install-extension YOUR_PUBLISHER.mcp-explorer`
3. Update README with marketplace badge
4. Consider adding screenshots to README
5. Share with the community!

## Version Updates
For future updates:
```powershell
# Update version and publish
vsce publish patch    # 0.0.1 -> 0.0.2
vsce publish minor    # 0.0.1 -> 0.1.0  
vsce publish major    # 0.0.1 -> 1.0.0
vsce publish 1.0.0    # Specific version
```

## Troubleshooting
- **Publisher name error**: Make sure to use Publisher ID (not display name)
- **Repository URL error**: Ensure GitHub repo exists and URLs are correct
- **Token expired**: Create new PAT and login again
- **Package too large**: Check `.vscodeignore` to exclude unnecessary files

## Ready to Publish!
Your extension is ready for marketplace publishing. The package has been tested and builds successfully. Just follow the steps above to get your publisher account and publish!
