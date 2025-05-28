import * as vscode from 'vscode';
import { McpServer, McpRegistry } from './types';

/**
 * Service for fetching and managing MCP servers from the registry
 */
export class McpRegistryService {
    private _onDidChangeServers = new vscode.EventEmitter<McpServer[]>();
    public readonly onDidChangeServers = this._onDidChangeServers.event;

    private servers: McpServer[] = [];
    private lastFetch: Date | null = null;

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Fetch servers from the registry
     */
    async fetchServers(force: boolean = false): Promise<McpServer[]> {
        // Cache for 5 minutes unless forced
        if (!force && this.lastFetch && Date.now() - this.lastFetch.getTime() < 5 * 60 * 1000) {
            return this.servers;
        }        try {
            const config = vscode.workspace.getConfiguration('mcpExplorer');
            const registryUrl = config.get<string>('serverRegistry') || 
                'https://raw.githubusercontent.com/modelcontextprotocol/servers/main/registry.json';            // First try to load from local registry file
            try {
                const fs = require('fs');
                const path = require('path');
                // The registry file is in the extension root, not in src
                const localRegistryPath = path.join(this.context.extensionPath, 'mcp-servers-registry.json');
                
                if (fs.existsSync(localRegistryPath)) {
                    const localRegistry = JSON.parse(fs.readFileSync(localRegistryPath, 'utf8')) as McpRegistry;
                    this.servers = localRegistry.servers || [];
                    this.lastFetch = new Date();
                    console.log(`Loaded ${this.servers.length} servers from local registry`);
                    this._onDidChangeServers.fire(this.servers);
                } else {
                    throw new Error('Local registry not found');
                }
            } catch (localError) {
                console.log('Local registry not available, trying remote registry:', localError);
                
                // Fallback to remote registry
                const response = await fetch(registryUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch registry: ${response.statusText}`);
                }

                const registry = await response.json() as McpRegistry;
                this.servers = registry.servers || [];
                this.lastFetch = new Date();
            }            // Check installation status for each server
            await this.updateInstallationStatus();

            // Sync with user's VS Code configuration
            await this.syncWithUserConfiguration();

            this._onDidChangeServers.fire(this.servers);
            return this.servers;
        } catch (error) {
            console.error('Failed to fetch MCP servers:', error);
            vscode.window.showErrorMessage(`Failed to fetch MCP servers: ${error}`);
              // If we don't have cached servers, use sample data
            if (this.servers.length === 0) {
                this.servers = this.getSampleServers();
                await this.updateInstallationStatus();
                await this.syncWithUserConfiguration();
                this._onDidChangeServers.fire(this.servers);
            }
            
            return this.servers;
        }
    }

    /**
     * Search servers by query
     */
    searchServers(query: string): McpServer[] {
        const lowercaseQuery = query.toLowerCase();
        return this.servers.filter(server => 
            server.name.toLowerCase().includes(lowercaseQuery) ||
            server.description.toLowerCase().includes(lowercaseQuery) ||
            server.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
            server.category.toLowerCase().includes(lowercaseQuery)
        );
    }

    /**
     * Get servers by category
     */
    getServersByCategory(category: string): McpServer[] {
        return this.servers.filter(server => server.category === category);
    }

    /**
     * Get all unique categories
     */
    getCategories(): string[] {
        const categories = new Set(this.servers.map(server => server.category));
        return Array.from(categories).sort();
    }    /**
     * Get installed servers
     */
    getInstalledServers(): McpServer[] {
        return this.servers.filter(server => server.isInstalled);
    }    /**
     * Update installation status for all servers
     */
    private async updateInstallationStatus(): Promise<void> {
        for (const server of this.servers) {
            server.isInstalled = await this.isServerInstalled(server);
        }
    }    /**
     * Check if server is installed by checking both package installation and VS Code configuration
     */
    private async isServerInstalled(server: McpServer): Promise<boolean> {
        try {
            // First check if it's configured in VS Code MCP settings
            const isConfigured = this.isServerConfigured(server);
            
            if (!server.installCommand) {
                // If no install command, just check configuration
                return isConfigured;
            }

            const { exec } = require('child_process');
            
            // Check based on install command type
            if (server.installCommand.startsWith('npm') || server.installCommand.startsWith('npx')) {
                // For npm packages, check if they exist in global or local packages
                const packageName = this.extractPackageName(server.installCommand);
                if (packageName) {
                    const result = await new Promise<string>((resolve, reject) => {
                        exec(`npm list -g ${packageName} --depth=0`, (error: any, stdout: string) => {
                            resolve(stdout);
                        });
                    });
                    const isPackageInstalled = result.includes(packageName);
                    return isPackageInstalled && isConfigured;
                }
            } else if (server.installCommand.startsWith('pip') || server.installCommand.startsWith('uvx')) {
                // For Python packages, check if they're available
                const packageName = this.extractPythonPackageName(server.installCommand);
                if (packageName) {
                    const result = await new Promise<boolean>((resolve) => {
                        exec(`python -c "import ${packageName}"`, (error: any) => {
                            resolve(!error);
                        });
                    });
                    return result && isConfigured;
                }
            }

            // For other types, just check configuration
            return isConfigured;
        } catch (error) {
            console.log(`Failed to check installation status for ${server.name}:`, error);
            // Fallback to just checking configuration
            return this.isServerConfigured(server);
        }
    }

    /**
     * Checks if a server is configured in VS Code MCP settings
     */
    private isServerConfigured(server: McpServer): boolean {
        try {
            const config = vscode.workspace.getConfiguration('mcp');
            const currentServers = config.get<any>('servers') || {};
            return !!currentServers[server.id];
        } catch (error) {
            console.error(`Failed to check configuration for ${server.name}:`, error);
            return false;
        }
    }

    /**
     * Extract package name from npm/npx command
     */
    private extractPackageName(installCommand: string): string | null {
        const match = installCommand.match(/@[\w-]+\/[\w-]+|[\w-]+$/);
        return match ? match[0] : null;
    }

    /**
     * Extract package name from pip/uvx command  
     */
    private extractPythonPackageName(installCommand: string): string | null {
        const parts = installCommand.split(' ');
        const packageIndex = parts.findIndex(part => part === 'install') + 1;
        if (packageIndex > 0 && packageIndex < parts.length) {
            const packageName = parts[packageIndex].replace(/[^a-zA-Z0-9_]/g, '_');
            return packageName;
        }
        return null;
    }

    /**
     * Get server by ID
     */
    getServerById(id: string): McpServer | undefined {
        return this.servers.find(server => server.id === id);
    }

    /**
     * Get sample servers for demo/fallback purposes
     */
    private getSampleServers(): McpServer[] {
        return [
            {
                id: 'filesystem-server',
                name: 'Filesystem Server',
                description: 'Access and manipulate files and directories on the local filesystem',
                version: '1.0.0',
                author: 'MCP Team',
                homepage: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
                repository: 'https://github.com/modelcontextprotocol/servers',
                category: 'File System',
                tags: ['filesystem', 'files', 'directories'],
                installCommand: 'npm install @modelcontextprotocol/server-filesystem',
                requirements: {
                    node: '>=18.0.0'
                }
            },
            {
                id: 'github-server',
                name: 'GitHub Server',
                description: 'Interact with GitHub repositories, issues, and pull requests',
                version: '2.1.0',
                author: 'GitHub',
                homepage: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github',
                repository: 'https://github.com/modelcontextprotocol/servers',
                category: 'Development',
                tags: ['github', 'git', 'repositories', 'issues'],
                installCommand: 'npm install @modelcontextprotocol/server-github',
                requirements: {
                    node: '>=16.0.0'
                }
            },
            {
                id: 'sqlite-server',
                name: 'SQLite Server',
                description: 'Query and manipulate SQLite databases',
                version: '1.2.3',
                author: 'Database Team',
                homepage: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite',
                repository: 'https://github.com/modelcontextprotocol/servers',
                category: 'Database',
                tags: ['sqlite', 'database', 'sql', 'query'],
                installCommand: 'npm install @modelcontextprotocol/server-sqlite',
                requirements: {
                    node: '>=18.0.0'
                }
            },
            {
                id: 'web-search-server',
                name: 'Web Search Server',
                description: 'Search the web using various search engines',
                version: '0.9.1',
                author: 'Search Team',
                homepage: 'https://github.com/modelcontextprotocol/servers/tree/main/src/web-search',
                repository: 'https://github.com/modelcontextprotocol/servers',
                category: 'Search',
                tags: ['web', 'search', 'internet', 'query'],
                installCommand: 'pip install mcp-server-web-search',
                requirements: {
                    python: '>=3.8'
                }
            },
            {
                id: 'docker-server',
                name: 'Docker Server',
                description: 'Manage Docker containers and images',
                version: '1.5.0',
                author: 'DevOps Team',
                homepage: 'https://github.com/modelcontextprotocol/servers/tree/main/src/docker',
                repository: 'https://github.com/modelcontextprotocol/servers',
                category: 'DevOps',
                tags: ['docker', 'containers', 'images', 'deployment'],
                installCommand: 'npm install @modelcontextprotocol/server-docker',
                requirements: {
                    node: '>=18.0.0'
                }
            },
            {
                id: 'calendar-server',
                name: 'Calendar Server',
                description: 'Access and manage calendar events and schedules',
                version: '2.0.0',
                author: 'Productivity Team',
                homepage: 'https://github.com/modelcontextprotocol/servers/tree/main/src/calendar',
                repository: 'https://github.com/modelcontextprotocol/servers',
                category: 'Productivity',
                tags: ['calendar', 'events', 'scheduling', 'time'],
                installCommand: 'pip install mcp-server-calendar',
                requirements: {
                    python: '>=3.9'
                }
            }
        ];
    }

    /**
     * Refresh installation status for all servers
     */
    async refreshServerStatus(): Promise<void> {
        await this.updateInstallationStatus();
        this._onDidChangeServers.fire(this.servers);
    }

    /**
     * Refresh installation status for a specific server
     */
    async refreshServerStatusById(serverId: string): Promise<void> {
        const server = this.getServerById(serverId);
        if (server) {
            server.isInstalled = await this.isServerInstalled(server);
            this._onDidChangeServers.fire(this.servers);
        }
    }

	/**
	 * Get MCP servers from user's VS Code settings
	 */
	getUserConfiguredServers(): Record<string, any> {
		try {
			const mcpConfig = vscode.workspace.getConfiguration('mcp');
			return mcpConfig.get<Record<string, any>>('servers', {});
		} catch (error) {
			console.error('Failed to read MCP configuration:', error);
			return {};
		}
	}
	/**
	 * Match registry servers with user's configured servers
	 */
	async syncWithUserConfiguration(): Promise<void> {
		try {
			const userServers = this.getUserConfiguredServers();
			const userServerIds = Object.keys(userServers);
			
			console.log('User configured servers:', userServerIds);
			
			// Update servers array to reflect actual installation status
			this.servers = this.servers.map(server => {
				// Try multiple matching strategies
				const isConfigured = this.matchServerWithUserConfig(server, userServerIds);
				const matchedId = isConfigured ? this.findMatchingUserConfigId(server, userServerIds) : undefined;
				
				return {
					...server,
					isInstalled: isConfigured,
					userConfigId: matchedId
				};
			});

			// Also add any user-configured servers that aren't in our registry
			for (const [serverId, serverConfig] of Object.entries(userServers)) {
				const existsInRegistry = this.servers.some(s => 
					s.id === serverId || 
					s.userConfigId === serverId ||
					s.name.toLowerCase().replace(/\s+/g, '-') === serverId.toLowerCase()
				);

				if (!existsInRegistry) {
					// Add unknown server to registry
					this.servers.push({
						id: serverId,
						name: this.formatServerName(serverId),
						description: `User-configured MCP server (not in registry)`,
						version: 'unknown',
						author: 'User',
						homepage: '',
						repository: '',
						category: 'User Configured',
						tags: ['user-configured'],
						installCommand: '',
						features: [],
						requirements: {},
						isInstalled: true,
						userConfigId: serverId
					});
				}
			}

			this._onDidChangeServers.fire(this.servers);
		} catch (error) {
			console.error('Failed to sync with user configuration:', error);
		}
	}
	/**
	 * Check if a server matches any user configuration
	 */
	private matchServerWithUserConfig(server: McpServer, userServerIds: string[]): boolean {
		return userServerIds.some(userId => {
			// Exact ID match
			if (userId === server.id) {
				return true;
			}
			
			// Name-based matches
			const serverNameNormalized = server.name.toLowerCase().replace(/\s+/g, '-');
			const userIdNormalized = userId.toLowerCase();
			
			// Direct name match
			if (serverNameNormalized === userIdNormalized) {
				return true;
			}
			
			// Partial name matches
			if (server.name.toLowerCase().includes(userIdNormalized)) {
				return true;
			}
			if (userIdNormalized.includes(serverNameNormalized)) {
				return true;
			}
			
			// Special cases for common patterns
			if (server.name.toLowerCase().includes('figma') && userIdNormalized.includes('figma')) {
				return true;
			}
			if (server.name.toLowerCase().includes('travel') && userIdNormalized.includes('travel')) {
				return true;
			}
			if (server.name.toLowerCase().includes('playwright') && userIdNormalized.includes('playwright')) {
				return true;
			}
			if (server.name.toLowerCase().includes('kubernetes') && userIdNormalized.includes('kubernetes')) {
				return true;
			}
			
			return false;
		});
	}

	/**
	 * Find the matching user config ID for a server
	 */
	private findMatchingUserConfigId(server: McpServer, userServerIds: string[]): string | undefined {
		return userServerIds.find(userId => {
			if (userId === server.id) {
				return true;
			}
			
			const serverNameNormalized = server.name.toLowerCase().replace(/\s+/g, '-');
			const userIdNormalized = userId.toLowerCase();
			
			if (serverNameNormalized === userIdNormalized) {
				return true;
			}
			if (server.name.toLowerCase().includes(userIdNormalized)) {
				return true;
			}
			if (userIdNormalized.includes(serverNameNormalized)) {
				return true;
			}
			
			// Special cases
			if (server.name.toLowerCase().includes('figma') && userIdNormalized.includes('figma')) {
				return true;
			}
			if (server.name.toLowerCase().includes('travel') && userIdNormalized.includes('travel')) {
				return true;
			}
			if (server.name.toLowerCase().includes('playwright') && userIdNormalized.includes('playwright')) {
				return true;
			}
			if (server.name.toLowerCase().includes('kubernetes') && userIdNormalized.includes('kubernetes')) {
				return true;
			}
			
			return false;
		});
	}

	/**
	 * Format server name from ID
	 */
	private formatServerName(serverId: string): string {
		return serverId
			.split(/[-_]/)
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}
}
