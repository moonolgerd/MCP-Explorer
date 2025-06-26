# Quick Publishing Guide

## 🚀 Auto-Publishing with GitHub Actions

### Publishing Options

#### Option 1: Tag-based Release (Recommended)
```bash
# Bump version and create tag
npm version patch    # 0.0.8 → 0.0.9
# or: npm version minor   # 0.0.8 → 0.1.0  
# or: npm version major   # 0.0.8 → 1.0.0

# Push tag to trigger auto-publish
git push origin v0.0.9
```

#### Option 2: Manual Trigger
1. Go to GitHub → Actions → "Publish VS Code Extension"
2. Click "Run workflow"
3. Optionally enter version (e.g., "0.0.9")
4. Click "Run workflow"

#### Option 3: Local Publishing
```bash
# Install vsce globally
npm install -g @vscode/vsce

# Set your publisher token
vsce login your-publisher-id

# Publish
npm run publish:marketplace
```

## 🔍 Monitoring

- **Build Status**: GitHub → Actions tab
- **Marketplace**: [Your Extension Page](https://marketplace.visualstudio.com/manage)
- **Artifacts**: Download `.vsix` files from successful builds

## ✅ What Happens Automatically

1. **On every push/PR**: 
   - Builds and tests extension
   - Creates `.vsix` artifact

2. **On version tags**:
   - Publishes to VS Code Marketplace
   - Creates GitHub release with `.vsix` attached
   - Updates marketplace listing


**🎉 That's it! Your extension will now auto-publish on every version tag.**
