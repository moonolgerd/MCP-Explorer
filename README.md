# MCP Explorer

**MCP Explorer** is a VS Code extension that helps you discover, install, and manage Model Context Protocol (MCP) servers directly from within Visual Studio Code.

## Features

- **Browse 50+ MCP Servers**: Explore available MCP servers from both official and community sources
- **Comprehensive Server Database**: Includes reference servers (filesystem, github, sqlite, memory, postgres) and 45+ community servers across categories:
  - **Development**: GitHub, Docker, Kubernetes, Azure DevOps, Git tools
  - **Databases**: PostgreSQL, MongoDB, MySQL, Redis, SQLite, Airtable  
  - **AI/ML**: OpenAI, HuggingFace, Replicate, Solana Agent Kit
  - **Cloud**: AWS, Azure, Google Cloud services
  - **Communication**: Slack, Discord, Email, Teams
  - **Productivity**: Google Calendar, Sheets, Todoist, Notion
  - **Web Scraping**: Playwright, Firecrawl, browser automation
  - **Blockchain**: Solana, Ethereum, Bitcoin, DeFi protocols
  - **Data Science**: Jupyter, R, Python code execution
  - **And many more categories!**
- **Search & Filter**: Find servers by name, description, category, or tags
- **Easy Installation**: Install MCP servers with a single click
- **Configuration Management**: Configure installed servers through VS Code settings
- **Status Indicators**: See which servers are installed and their current status
- **Detailed Server Information**: View comprehensive details about each server in a dedicated webview

## Requirements

- VS Code 1.100.0 or higher
- Node.js (for installing Node.js-based MCP servers)
- Python (for installing Python-based MCP servers)

## Extension Settings

This extension contributes the following settings:

* `mcpExplorer.serverRegistry`: URL or path to the MCP server registry JSON file (default: local comprehensive registry)
* `mcpExplorer.autoRefresh`: Automatically refresh the server list on startup (default: true)

## Getting Started

1. Install the MCP Explorer extension from the VS Code marketplace
2. Open the **Explorer** panel in VS Code
3. Look for the **MCP Servers** section in the explorer
4. Browse available servers or use the search functionality
5. Click the install button next to any server to install it
6. Configure installed servers using the gear icon

## Commands

- **MCP Explorer: Refresh** - Refresh the server list from the registry
- **MCP Explorer: Search** - Search for specific MCP servers
- **MCP Explorer: Install** - Install a selected MCP server
- **MCP Explorer: Uninstall** - Remove an installed MCP server
- **MCP Explorer: Configure** - Configure an installed MCP server
- **MCP Explorer: View Details** - Show detailed information about a server

## How to Use

### Browsing Servers
The MCP Explorer shows servers organized by categories. Expand any category to see available servers. Installed servers are marked with a green checkmark.

### Installing Servers
1. Find the server you want to install
2. Click the **+** (install) button next to the server name
3. The extension will handle the installation process
4. You'll see a progress notification during installation
5. If installation fails, you'll get detailed error information with options to:
   - **Show Details**: View full error logs in output channel
   - **Retry**: Attempt installation again
   - **Dismiss**: Close the notification

### Error Handling
The extension provides comprehensive error handling for installation failures:
- **Detailed Error Messages**: Shows specific reasons for installation failures
- **Full Error Logs**: Access complete installation logs through "Show Details"
- **Automatic Retry**: Easy retry functionality for transient issues
- **Smart Error Parsing**: Extracts meaningful error information from command output

### Configuring Servers
1. Right-click on an installed server
2. Select **Configure** from the context menu
3. Follow the configuration wizard to set up the server

## About MCP

Model Context Protocol (MCP) is an open standard for connecting AI assistants to data sources and tools. Learn more at [modelcontextprotocol.io](https://modelcontextprotocol.io/).

## Known Issues

- Some servers may require specific system dependencies (Node.js, Python, etc.)
- Installation of certain packages may require elevated permissions
- Network connectivity issues may cause installation timeouts
- Some servers may need manual configuration after successful installation

All installation errors are now captured and displayed with detailed information to help troubleshoot issues.

## Release Notes

### 0.0.1

- Initial release of MCP Explorer
- Browse and search MCP servers
- Install and uninstall servers
- Basic configuration management
- Webview for detailed server information

### 0.0.6

### 0.0.7
- Added env

---

## Contributing

Found a bug or want to contribute? Please visit our [GitHub repository](https://github.com/your-repo/mcp-explorer) to report issues or submit pull requests.

**Enjoy exploring MCP servers!**
