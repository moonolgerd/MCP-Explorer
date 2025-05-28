# MCP Explorer Demo Instructions

## How to Test the Extension

1. **Start Debug Mode**: Press `F5` or use "Run Extension" in VS Code to launch a new Extension Development Host window

2. **Open MCP Explorer**: In the new window, look for "MCP Servers" in the Explorer sidebar

3. **Test Commands**: Use the toolbar buttons in the MCP Explorer view:
   - **Refresh**: Update the server list
   - **Search**: Search for specific servers
   - **Show MCP Configuration**: View current VS Code MCP settings
   - **Test Installation**: Pick a server to install via quick pick
   - **Show Installation Status**: View detailed status information
   - **Validate MCP Configuration**: Check if MCP settings are valid

## Testing Installation Flow

1. Click "Test Installation" button
2. Select a server from the dropdown (try "Filesystem Server" - it's lightweight)
3. Watch the installation process in the output panel
4. Check that the server appears in the "Installed" section of the tree
5. Run "Show MCP Configuration" to see the generated settings
6. Run "Validate MCP Configuration" to verify everything is correct

## Expected Results

- Installed servers should appear in the "Installed (count)" section
- VS Code settings.json should contain MCP server configurations under `mcp.servers`
- Each server configuration should have proper `command`, `args`, and `transport` properties
- Tree view should show "• Installed" next to installed servers

## MCP Configuration Format

The extension generates configurations like this:

```json
{
  "mcp": {
    "servers": {
      "filesystem-server": {
        "command": "npx",
        "args": ["@modelcontextprotocol/server-filesystem", "/path/to/allowed/directory"],
        "transport": "stdio"
      }
    }
  }
}
```

## Troubleshooting

- If installation fails, check the Output panel for error messages
- Ensure you have npm/node.js installed for npm packages
- Some servers require additional configuration (environment variables, paths)
- Use "Validate MCP Configuration" to check for configuration issues
