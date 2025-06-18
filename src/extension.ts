// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { McpRegistryService } from './mcpRegistryService';
import { McpExplorerProvider } from './mcpExplorerProvider';
import { McpTreeItem } from './mcpExplorerProvider';
import { McpInstallationService } from './mcpInstallationService';
import { McpWebviewService } from './mcpWebviewService';
import { McpServer } from './types';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	console.log('MCP Explorer extension is now active!');

	// Initialize services
	const registryService = new McpRegistryService(context);
	const installationService = new McpInstallationService(context);
	const webviewService = new McpWebviewService(context);
	const explorerProvider = new McpExplorerProvider(registryService);

	// Register tree data provider
	const treeView = vscode.window.createTreeView('mcpExplorer', {
		treeDataProvider: explorerProvider,
		showCollapseAll: true
	});

	// Update tree view when search changes
	explorerProvider.onDidChangeTreeData(() => {
		const searchQuery = explorerProvider.getSearchQuery();
		if (searchQuery.trim()) {
			treeView.description = `Searching: "${searchQuery}"`;
		} else {
			treeView.description = undefined;
		}
	});

	// Auto-refresh on startup if configured
	const config = vscode.workspace.getConfiguration('mcpExplorer');
	if (config.get<boolean>('autoRefresh', true)) {
		registryService.fetchServers();
	}

	// Listen for installation changes and refresh tree
	installationService.onDidChangeInstallation(async (event) => {
		// Refresh the specific server status in registry
		await registryService.refreshServerStatusById(event.server.id);
		explorerProvider.refresh();
	});

	// Register commands
	const commands = [
		// Refresh command
		vscode.commands.registerCommand('mcpExplorer.refresh', async () => {
			await registryService.fetchServers(true);
			vscode.window.showInformationMessage('MCP server list refreshed');
		}),		// Search command
		vscode.commands.registerCommand('mcpExplorer.search', async () => {
			// Get search history from context
			const searchHistory = context.globalState.get<string[]>('mcpExplorer.searchHistory', []);
			
			const query = await vscode.window.showInputBox({
				prompt: 'Search MCP servers',
				placeHolder: 'Enter server name, description, or tag...',
				value: explorerProvider.getSearchQuery()
			});
			
			if (query !== undefined) {
				explorerProvider.setSearchQuery(query);
				
				// Save to search history if not empty and not already in history
				if (query.trim() && !searchHistory.includes(query.trim())) {
					searchHistory.unshift(query.trim());
					// Keep only last 10 searches
					if (searchHistory.length > 10) {
						searchHistory.splice(10);
					}
					await context.globalState.update('mcpExplorer.searchHistory', searchHistory);
				}
				
				if (query.trim()) {
					vscode.window.showInformationMessage(`Searching for "${query}"`);
				} else {
					vscode.window.showInformationMessage('Search cleared');
				}
			}
		}),

		// Clear search command
		vscode.commands.registerCommand('mcpExplorer.clearSearch', async () => {
			explorerProvider.clearSearch();
			vscode.window.showInformationMessage('Search cleared');
		}),

		// Install command
		vscode.commands.registerCommand('mcpExplorer.install', async (item?: McpTreeItem | McpServer) => {
			let server: McpServer | undefined;
			
			if (item instanceof McpTreeItem && item.server) {
				server = item.server;
			} else if (item && 'id' in item) {
				server = item as McpServer;
			} else {
				// Show quick pick to select server
				const servers = await registryService.fetchServers();
				const availableServers = servers.filter(s => !s.isInstalled);
				
				if (availableServers.length === 0) {
					vscode.window.showInformationMessage('All servers are already installed');
					return;
				}

				const selected = await vscode.window.showQuickPick(
					availableServers.map(s => ({
						label: s.name,
						description: s.version,
						detail: s.description,
						server: s
					})),
					{ placeHolder: 'Select an MCP server to install' }
				);

				server = selected?.server;
			}

			if (server) {
				await installationService.installServer(server);
				// Update webview if open
				webviewService.updateServerDetails(server);
			}
		}),

		// Uninstall command
		vscode.commands.registerCommand('mcpExplorer.uninstall', async (item?: McpTreeItem | McpServer) => {
			let server: McpServer | undefined;
			
			if (item instanceof McpTreeItem && item.server) {
				server = item.server;
			} else if (item && 'id' in item) {
				server = item as McpServer;
			} else {
				// Show quick pick to select server
				const servers = await registryService.fetchServers();
				const installedServers = servers.filter(s => s.isInstalled);
				
				if (installedServers.length === 0) {
					vscode.window.showInformationMessage('No servers are currently installed');
					return;
				}

				const selected = await vscode.window.showQuickPick(
					installedServers.map(s => ({
						label: s.name,
						description: s.version,
						detail: s.description,
						server: s
					})),
					{ placeHolder: 'Select an MCP server to uninstall' }
				);

				server = selected?.server;
			}

			if (server) {
				await installationService.uninstallServer(server);
				// Update webview if open
				webviewService.updateServerDetails(server);
			}
		}),

		// Configure command
		vscode.commands.registerCommand('mcpExplorer.configure', async (item?: McpTreeItem | McpServer) => {
			let server: McpServer | undefined;
			
			if (item instanceof McpTreeItem && item.server) {
				server = item.server;
			} else if (item && 'id' in item) {
				server = item as McpServer;
			} else {
				// Show quick pick to select server
				const servers = await registryService.fetchServers();
				const installedServers = servers.filter(s => s.isInstalled);
				
				if (installedServers.length === 0) {
					vscode.window.showInformationMessage('No servers are currently installed');
					return;
				}

				const selected = await vscode.window.showQuickPick(
					installedServers.map(s => ({
						label: s.name,
						description: s.version,
						detail: s.description,
						server: s
					})),
					{ placeHolder: 'Select an MCP server to configure' }
				);

				server = selected?.server;
			}

			if (server) {
				await installationService.configureServer(server);
			}
		}),

		// View details command
		vscode.commands.registerCommand('mcpExplorer.viewDetails', async (item?: McpTreeItem | McpServer) => {
			let server: McpServer | undefined;
			
			if (item instanceof McpTreeItem && item.server) {
				server = item.server;
			} else if (item && 'id' in item) {
				server = item as McpServer;
			} else {
				// Show quick pick to select server
				const servers = await registryService.fetchServers();
				
				if (servers.length === 0) {
					vscode.window.showInformationMessage('No servers available');
					return;
				}

				const selected = await vscode.window.showQuickPick(
					servers.map(s => ({
						label: s.name,
						description: s.version,
						detail: s.description,
						server: s
					})),
					{ placeHolder: 'Select an MCP server to view details' }
				);

				server = selected?.server;
			}

			if (server) {
				webviewService.showServerDetails(server);
			}
		}),

		// Show MCP configuration command
		vscode.commands.registerCommand('mcpExplorer.showMcpConfig', async () => {
			try {
				const config = vscode.workspace.getConfiguration('mcp');
				const mcpServers = config.get<any>('servers') || {};
				
				if (Object.keys(mcpServers).length === 0) {
					vscode.window.showInformationMessage('No MCP servers are configured in VS Code settings');
					return;
				}

				const configText = JSON.stringify(mcpServers, null, 2);
				const doc = await vscode.workspace.openTextDocument({
					content: configText,
					language: 'json'
				});
				await vscode.window.showTextDocument(doc);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to show MCP configuration: ${error}`);
			}
		}),

		// Test installation command for demonstration
		vscode.commands.registerCommand('mcpExplorer.testInstallation', async () => {
			const servers = await registryService.fetchServers();
			const quickPickItems = servers.map(server => ({
				label: server.name,
				description: server.version,
				detail: server.description,
				server: server
			}));

			const selected = await vscode.window.showQuickPick(quickPickItems, {
				placeHolder: 'Select an MCP server to test installation'
			});

			if (selected) {
				await vscode.commands.executeCommand('mcpExplorer.installServer', selected.server);
			}
		}),

		// Show installation status command
		vscode.commands.registerCommand('mcpExplorer.showInstallationStatus', async () => {
			const servers = await registryService.fetchServers();
			const installedServers = servers.filter(s => s.isInstalled);
			const mcpConfig = vscode.workspace.getConfiguration('mcp');
			const configuredServers = mcpConfig.get('servers', {});

			const statusInfo = {
				totalServers: servers.length,
				installedServers: installedServers.length,
				configuredServers: Object.keys(configuredServers).length,
				installedServerNames: installedServers.map(s => s.name),
				mcpConfiguration: configuredServers
			};

			const doc = await vscode.workspace.openTextDocument({
				content: JSON.stringify(statusInfo, null, 2),
				language: 'json'
			});
			await vscode.window.showTextDocument(doc);
		}),

		// Validate MCP configuration command
		vscode.commands.registerCommand('mcpExplorer.validateMcpConfig', async () => {
			const validation = await installationService.validateMcpConfiguration();
			
			let message = 'MCP Configuration Validation:\n\n';
			
			if (validation.isValid) {
				message += '✅ Configuration is valid!\n\n';
			} else {
				message += '❌ Configuration has errors:\n\n';
			}
			
			if (validation.errors.length > 0) {
				message += 'Errors:\n';
				validation.errors.forEach(error => {
					message += `• ${error}\n`;
				});
				message += '\n';
			}
			
			if (validation.warnings.length > 0) {
				message += 'Warnings:\n';
				validation.warnings.forEach(warning => {
					message += `• ${warning}\n`;
				});
				message += '\n';
			}
			
			const mcpConfig = vscode.workspace.getConfiguration('mcp');
			const servers = mcpConfig.get('servers', {});
			message += `Current MCP servers configured: ${Object.keys(servers).length}`;
			
			const doc = await vscode.workspace.openTextDocument({
				content: message,
				language: 'markdown'
			});
			await vscode.window.showTextDocument(doc);
		})
	];

	// Add all commands to subscriptions
	context.subscriptions.push(treeView, ...commands);

	// Quick demo installation command
	context.subscriptions.push(
		vscode.commands.registerCommand('mcpExplorer.demoInstallFilesystem', async () => {
			const servers = await registryService.fetchServers();
			const filesystemServer = servers.find(s => s.id === 'filesystem-server');
			
			if (!filesystemServer) {
				vscode.window.showErrorMessage('Filesystem server not found in registry');
				return;
			}

			// Show confirmation dialog
			const result = await vscode.window.showInformationMessage(
				`Install ${filesystemServer.name}?\n\nThis will:\n1. Install the npm package\n2. Add configuration to VS Code settings\n3. Make it available for MCP usage`,
				'Install',
				'Cancel'
			);

			if (result === 'Install') {
				await vscode.commands.executeCommand('mcpExplorer.installServer', filesystemServer);
			}
		})
	);

	// Sync with user configuration command
	context.subscriptions.push(
		vscode.commands.registerCommand('mcpExplorer.syncWithUserConfig', async () => {
			await registryService.syncWithUserConfiguration();
			vscode.window.showInformationMessage('Synced MCP Explorer with your VS Code settings');
		})
	);

	// Show user's configured servers
	context.subscriptions.push(
		vscode.commands.registerCommand('mcpExplorer.showUserConfiguredServers', async () => {
			const userServers = registryService.getUserConfiguredServers();
			const serverNames = Object.keys(userServers);
			
			let message = `You have ${serverNames.length} MCP servers configured in VS Code:\n\n`;
			
			if (serverNames.length === 0) {
				message += 'No MCP servers found in your settings.json\n\n';
				message += 'Tip: Install servers using MCP Explorer to automatically configure them!';
			} else {
				serverNames.forEach(serverName => {
					const config = userServers[serverName];
					message += `• ${serverName}\n`;
					message += `  Command: ${config.command}\n`;
					if (config.args) {
						message += `  Args: ${config.args.join(' ')}\n`;
					}
					message += '\n';
				});
			}

			const doc = await vscode.workspace.openTextDocument({
				content: message,
				language: 'markdown'
			});
			await vscode.window.showTextDocument(doc);
		})
	);

	// Load servers and sync with user configuration
	await registryService.fetchServers();
	const userServers = registryService.getUserConfiguredServers();
	const userServerCount = Object.keys(userServers).length;
	
	if (userServerCount > 0) {
		vscode.window.showInformationMessage(
			`MCP Explorer loaded! Found ${userServerCount} configured MCP server(s) in your settings.`,
			'View Servers'
		).then(action => {
			if (action === 'View Servers') {
				vscode.commands.executeCommand('mcpExplorer.focus');
			}
		});
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
