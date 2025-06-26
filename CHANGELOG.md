# Change Log

All notable changes to the "mcp-explorer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.9] - 2025-06-25

### Added
- **Local Server Discovery**: Automatically discover MCP servers in workspace `.vscode` folders
- Support for MCP configuration files (`mcp.json`, `mcp-config.json`, `mcp-servers.json`)
- Detection of Node.js packages with MCP-related keywords in `package.json`
- Discovery of Python scripts containing MCP imports and patterns
- Recognition of shell scripts with MCP-related patterns
- New "Local Servers" category in the explorer tree
- Special icons and indicators for local servers (home icon)
- File system watcher for real-time updates when local servers are added/removed
- GitHub CI/CD workflows for automated publishing to VS Code Marketplace
- Build and test automation on push/PR
- Publishing scripts in package.json for local development

### Improved
- Enhanced tree view with better categorization including local servers
- Automatic refresh of local servers when workspace changes
- Better server identification and metadata extraction
- Repository structure with comprehensive CI/CD documentation

### Fixed
- Registry service now properly combines local and remote servers
- Extension disposal properly cleans up file watchers and resources

## [0.0.8] - 2025-06-17

### Added
- Enhanced search functionality with real-time filtering
- Search history feature (remembers last 10 searches)
- Keyboard shortcuts for search operations (Ctrl+Shift+F to search, Escape to clear)
- Clear search command with dedicated button in toolbar
- Visual search indicators in tree view showing current search query
- Author field included in search criteria

### Improved
- Search results now organized by categories with filtered counts
- Better search algorithm with proper query validation and trimming
- Enhanced search state management and persistence
- Search input box now shows current search query when reopened

### Fixed
- Category filtering during search operations now works correctly
- Installed servers section properly filtered during search
- Search results display shows "No results" message when appropriate
- Duplicate search results eliminated in category expansions

## [0.0.7] - 2025-06-16

### Added
- Environment variable support for MCP server configurations

## [0.0.6] - 2025-06-15

### Added
- Initial comprehensive server registry with 50+ MCP servers
- Installation and configuration management
- Webview for detailed server information

## [0.0.1] - 2025-06-10

### Added
- Initial release
- Basic MCP server browsing functionality
- Simple installation capabilities