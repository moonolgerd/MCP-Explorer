<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# MCP Explorer VS Code Extension

This is a VS Code extension project. Please use the get_vscode_api with a query as input to fetch the latest VS Code API references.

## Project Overview
This extension helps users find and install Model Context Protocol (MCP) servers directly from VS Code. It provides:
- A tree view to browse available MCP servers
- Search functionality
- Installation capabilities  
- Configuration management

## Architecture
- TypeScript-based VS Code extension
- Tree view for MCP server browsing
- Webview panels for detailed server information
- Configuration management through VS Code settings
- Node.js process execution for installation

## Key Features to Implement
- MCP Server Registry integration
- Tree view with categories (Popular, Recent, All)
- Search and filter functionality
- Installation wizard
- Configuration management
- Status indicators for installed servers

## API Guidelines
- Use VS Code TreeDataProvider for the explorer view
- Implement webview panels for detailed server info
- Use workspace configuration for settings
- Register commands for user actions
- Follow VS Code extension best practices

You can find more info about MCP at https://modelcontextprotocol.io/
