# MCP Explorer Publishing Setup Script
# Run this script to prepare your extension for publishing

param(
    [Parameter(Mandatory=$true)]
    [string]$PublisherID,
    
    [Parameter(Mandatory=$true)]
    [string]$GitHubUsername,
    
    [Parameter(Mandatory=$true)]
    [string]$AuthorName
)

Write-Host "🚀 Setting up MCP Explorer for VS Code Marketplace publishing..." -ForegroundColor Green

# Update package.json with user information
$packageJsonPath = "package.json"
$packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json

# Update publisher
$packageJson.publisher = $PublisherID
Write-Host "✅ Updated publisher to: $PublisherID" -ForegroundColor Green

# Update author
$packageJson.author.name = $AuthorName
Write-Host "✅ Updated author to: $AuthorName" -ForegroundColor Green

# Update repository URLs
$packageJson.repository.url = "https://github.com/$GitHubUsername/mcp-explorer.git"
$packageJson.homepage = "https://github.com/$GitHubUsername/mcp-explorer#readme"
$packageJson.bugs.url = "https://github.com/$GitHubUsername/mcp-explorer/issues"
Write-Host "✅ Updated repository URLs for GitHub user: $GitHubUsername" -ForegroundColor Green

# Save updated package.json
$packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath
Write-Host "✅ Saved updated package.json" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Setup complete! Next steps:" -ForegroundColor Yellow
Write-Host "1. Create your publisher account at: https://marketplace.visualstudio.com/manage" -ForegroundColor White
Write-Host "2. Create a Personal Access Token at: https://dev.azure.com" -ForegroundColor White
Write-Host "3. Login: vsce login $PublisherID" -ForegroundColor White
Write-Host "4. Publish: vsce publish" -ForegroundColor White
Write-Host ""
Write-Host "📖 See MARKETPLACE_PUBLISHING.md for detailed instructions" -ForegroundColor Cyan
