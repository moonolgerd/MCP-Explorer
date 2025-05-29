import * as vscode from 'vscode';
import { McpServer, InstallationStatus, McpServerConfiguration } from './types';

export class McpInstallationService {
    private _onDidChangeInstallation = new vscode.EventEmitter<{ server: McpServer; status: InstallationStatus }>();
    public readonly onDidChangeInstallation = this._onDidChangeInstallation.event;
    private registryService?: any; // McpRegistryService - avoiding circular import

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Set the registry service for refreshing server status after configuration changes
     */
    setRegistryService(registryService: any): void {
        this.registryService = registryService;
    }    async installServer(server: McpServer): Promise<boolean> {
        try {
            this._onDidChangeInstallation.fire({ server, status: InstallationStatus.Installing });

            return await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Configuring ${server.name}`,
                cancellable: true
            }, async (progress, token) => {
                progress.report({ increment: 0, message: 'Preparing configuration...' });

                // Check if server is already configured
                if (this.isServerConfigured(server)) {
                    throw new Error(`${server.name} is already configured in VS Code MCP settings`);
                }

                if (token.isCancellationRequested) {
                    this._onDidChangeInstallation.fire({ server, status: InstallationStatus.Failed });
                    return false;
                }

                progress.report({ increment: 25, message: 'Validating server configuration...' });

                // Create server configuration
                const serverConfig = this.createServerConfiguration(server);
                if (!serverConfig) {
                    throw new Error(`Cannot create configuration for ${server.name}. Missing required information.`);
                }

                if (token.isCancellationRequested) {
                    this._onDidChangeInstallation.fire({ server, status: InstallationStatus.Failed });
                    return false;
                }

                progress.report({ increment: 50, message: 'Updating VS Code settings...' });

                // Add server to VS Code MCP configuration
                const configSuccess = await this.addServerToConfiguration(server);
                if (!configSuccess) {
                    throw new Error(`Failed to add ${server.name} to VS Code MCP settings`);
                }

                if (token.isCancellationRequested) {
                    this._onDidChangeInstallation.fire({ server, status: InstallationStatus.Failed });
                    return false;
                }

                progress.report({ increment: 75, message: 'Verifying configuration...' });

                // Verify the configuration was added correctly
                await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for settings to update
                
                if (!this.isServerConfigured(server)) {
                    throw new Error(`Configuration verification failed for ${server.name}`);
                }

                progress.report({ increment: 100, message: 'Configuration complete!' });

                server.isInstalled = true;
                this._onDidChangeInstallation.fire({ server, status: InstallationStatus.Installed });
                
                // Show success message with additional information
                const configId = this.getServerConfigId(server);
                vscode.window.showInformationMessage(
                    `Successfully configured ${server.name} in VS Code MCP settings`,
                    'Open Settings', 'View Configuration'
                ).then(action => {
                    if (action === 'Open Settings') {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'mcp.servers');
                    } else if (action === 'View Configuration') {
                        this.showServerConfiguration(server);
                    }
                });
                
                return true;
            });} catch (error) {
            console.error(`Failed to install ${server.name}:`, error);
            this._onDidChangeInstallation.fire({ server, status: InstallationStatus.Failed });
            
            // Create a more user-friendly error message
            let errorMessage = error instanceof Error ? error.message : String(error);
            
            // Truncate very long error messages but keep them informative
            if (errorMessage.length > 200) {
                errorMessage = errorMessage.substring(0, 197) + '...';
            }
            
            // Show detailed error with action buttons
            const action = await vscode.window.showErrorMessage(
                `Failed to install ${server.name}: ${errorMessage}`,
                'Show Details', 'Retry', 'Dismiss'
            );
            
            if (action === 'Show Details') {
                // Show full error details in output channel
                const outputChannel = vscode.window.createOutputChannel(`MCP Installation - ${server.name}`);
                outputChannel.appendLine(`Installation failed for ${server.name}`);
                outputChannel.appendLine(`Command: ${server.installCommand}`);
                outputChannel.appendLine(`Error: ${error}`);
                outputChannel.appendLine(`Timestamp: ${new Date().toISOString()}`);
                outputChannel.show();
            } else if (action === 'Retry') {
                // Retry installation
                return this.installServer(server);
            }
            
            return false;
        }
    }    async uninstallServer(server: McpServer): Promise<boolean> {
        try {
            const confirm = await vscode.window.showWarningMessage(
                `Are you sure you want to remove ${server.name} from your MCP configuration?`,
                { modal: true },
                'Yes', 'No'
            );

            if (confirm !== 'Yes') {
                return false;
            }

            return await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Removing ${server.name}`,
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Removing from VS Code configuration...' });
                
                // Remove from VS Code configuration
                const configRemoved = await this.removeServerFromConfiguration(server);
                if (!configRemoved) {
                    throw new Error(`Failed to remove ${server.name} from VS Code MCP settings`);
                }

                progress.report({ increment: 75, message: 'Verifying removal...' });

                // Verify the configuration was removed
                await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for settings to update

                progress.report({ increment: 100, message: 'Removal complete!' });

                server.isInstalled = false;
                this._onDidChangeInstallation.fire({ server, status: InstallationStatus.NotInstalled });
                vscode.window.showInformationMessage(
                    `Successfully removed ${server.name} from VS Code MCP configuration`,
                    'Open Settings'
                ).then(action => {
                    if (action === 'Open Settings') {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'mcp.servers');
                    }
                });
                return true;
            });
        } catch (error) {
            console.error(`Failed to remove ${server.name}:`, error);
            
            // Create a more user-friendly error message
            let errorMessage = error instanceof Error ? error.message : String(error);
            
            // Show detailed error with action buttons
            const action = await vscode.window.showErrorMessage(
                `Failed to remove ${server.name}: ${errorMessage}`,
                'Show Details', 'Retry', 'Dismiss'
            );
            
            if (action === 'Show Details') {
                // Show full error details in output channel
                const outputChannel = vscode.window.createOutputChannel(`MCP Removal - ${server.name}`);
                outputChannel.clear();
                outputChannel.appendLine(`Removal failed for ${server.name}`);
                outputChannel.appendLine(`Error: ${error}`);
                outputChannel.appendLine(`Timestamp: ${new Date().toISOString()}`);
                outputChannel.show();
            } else if (action === 'Retry') {
                // Retry removal
                return this.uninstallServer(server);
            }
            
            return false;
        }
    }async configureServer(server: McpServer): Promise<void> {
        if (!server.isInstalled) {
            vscode.window.showWarningMessage(`${server.name} is not installed`);
            return;
        }

        // Check if the server is configured in VS Code MCP settings
        const isConfigured = this.isServerConfigured(server);
        
        if (isConfigured) {
            const config = vscode.workspace.getConfiguration('mcp');
            const servers = config.get<any>('servers') || {};
            const serverConfig = servers[server.id];
            
            const message = `${server.name} is configured in VS Code MCP settings:\n\nConfiguration:\n${JSON.stringify(serverConfig, null, 2)}`;
            
            const action = await vscode.window.showInformationMessage(
                message,
                { modal: true },
                'Open Settings', 'Remove Configuration'
            );
            
            if (action === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'mcp.servers');
            } else if (action === 'Remove Configuration') {
                await this.removeServerFromConfiguration(server);
                vscode.window.showInformationMessage(`Removed ${server.name} from MCP configuration`);
            }
        } else {
            const action = await vscode.window.showWarningMessage(
                `${server.name} is installed but not configured in VS Code MCP settings. Would you like to configure it now?`,
                'Configure Now', 'Open Settings'
            );
            
            if (action === 'Configure Now') {
                const success = await this.addServerToConfiguration(server);
                if (success) {
                    vscode.window.showInformationMessage(`Successfully configured ${server.name} in VS Code MCP settings`);
                }
            } else if (action === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'mcp.servers');
            }
        }
    }private async simulateInstallation(
        progress: vscode.Progress<{ message?: string; increment?: number }>,
        token: vscode.CancellationToken
    ): Promise<void> {
        const steps = [
            'Checking requirements...',
            'Downloading package...',
            'Installing dependencies...',
            'Configuring server...',
            'Finalizing installation...'
        ];

        for (let i = 0; i < steps.length; i++) {
            if (token.isCancellationRequested) {
                throw new Error('Installation cancelled');
            }

            progress.report({ 
                increment: 15, 
                message: steps[i] 
            });

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    private async checkRequirements(requirements: any): Promise<string[]> {
        const missing: string[] = [];
        
        // Check Node.js version if required
        if (requirements.node) {
            try {
                const { exec } = require('child_process');                const result = await new Promise<string>((resolve, reject) => {
                    exec('node --version', (error: any, stdout: string) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(stdout.trim());
                        }
                    });
                });
                console.log(`Node.js version: ${result}`);
            } catch {
                missing.push(`Node.js ${requirements.node}`);
            }
        }

        // Check Python version if required
        if (requirements.python) {
            try {
                const { exec } = require('child_process');                const result = await new Promise<string>((resolve, reject) => {
                    exec('python --version', (error: any, stdout: string) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(stdout.trim());
                        }
                    });
                });
                console.log(`Python version: ${result}`);
            } catch {
                missing.push(`Python ${requirements.python}`);
            }
        }

        return missing;
    }    private async executeInstallCommand(
        installCommand: string, 
        progress: vscode.Progress<{ message?: string; increment?: number }>,
        token: vscode.CancellationToken
    ): Promise<{ success: boolean; error?: string; output?: string }> {
        return new Promise((resolve) => {
            try {
                const { spawn } = require('child_process');
                
                // Parse the install command
                const parts = installCommand.split(' ');
                const command = parts[0];
                const args = parts.slice(1);
                
                console.log(`Executing: ${command} ${args.join(' ')}`);
                progress.report({ increment: 20, message: `Running: ${command} ${args.join(' ')}...` });

                const process = spawn(command, args, {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    shell: true
                });

                let output = '';
                let errorOutput = '';

                process.stdout?.on('data', (data: Buffer) => {
                    const text = data.toString();
                    output += text;
                    console.log('stdout:', text);
                });

                process.stderr?.on('data', (data: Buffer) => {
                    const text = data.toString();
                    errorOutput += text;
                    console.log('stderr:', text);
                });

                process.on('close', (code: number) => {
                    console.log(`Installation process exited with code ${code}`);
                    if (code === 0) {
                        progress.report({ increment: 40, message: 'Installation completed successfully' });
                        resolve({ success: true, output });
                    } else {
                        const combinedOutput = output + errorOutput;
                        console.error('Installation failed with output:', combinedOutput);
                        
                        // Extract meaningful error message
                        let errorMessage = `Process exited with code ${code}`;
                        if (errorOutput.trim()) {
                            // Get the last meaningful error line
                            const errorLines = errorOutput.trim().split('\n').filter(line => line.trim());
                            if (errorLines.length > 0) {
                                errorMessage = errorLines[errorLines.length - 1].trim();
                                // Clean up common error prefixes
                                errorMessage = errorMessage.replace(/^(ERROR|Error|error):\s*/i, '');
                                errorMessage = errorMessage.replace(/^npm ERR!\s*/i, '');
                            }
                        }
                        
                        resolve({ 
                            success: false, 
                            error: errorMessage,
                            output: combinedOutput
                        });
                    }
                });

                process.on('error', (error: Error) => {
                    console.error('Installation process error:', error);
                    resolve({ 
                        success: false, 
                        error: `Process execution failed: ${error.message}`,
                        output: output + errorOutput
                    });
                });

                // Handle cancellation
                token.onCancellationRequested(() => {
                    process.kill();
                    resolve({ 
                        success: false, 
                        error: 'Installation was cancelled by user',
                        output: output + errorOutput
                    });
                });

            } catch (error) {
                console.error('Failed to execute install command:', error);
                resolve({ 
                    success: false, 
                    error: `Failed to start installation process: ${error}`,
                    output: ''
                });
            }
        });
    }    /**
     * Adds a successfully installed MCP server to VS Code settings
     */
    private async addServerToConfiguration(server: McpServer): Promise<boolean> {
        try {
            const config = vscode.workspace.getConfiguration('mcp');
            const currentServers = config.get<any>('servers') || {};

            // Create server configuration based on the server data
            const serverConfig = this.createServerConfiguration(server);
            if (!serverConfig) {
                console.error(`Failed to create configuration for ${server.name}`);
                return false;
            }

            // Use a clean server ID for the configuration
            // Remove common suffixes and normalize the ID
            let configId = server.id;
            if (configId.endsWith('-server')) {
                configId = configId.slice(0, -7); // Remove '-server'
            }
            
            // Add to the servers object
            currentServers[configId] = serverConfig;

            // Update the configuration
            await config.update('servers', currentServers, vscode.ConfigurationTarget.Global);
            
            console.log(`Added ${server.name} to VS Code MCP configuration with ID: ${configId}`);
            console.log(`Configuration:`, JSON.stringify(serverConfig, null, 2));
            return true;
        } catch (error) {
            console.error(`Failed to add ${server.name} to VS Code configuration:`, error);
            return false;
        }
    }    /**
     * Removes an MCP server from VS Code settings
     */
    private async removeServerFromConfiguration(server: McpServer): Promise<boolean> {
        try {
            let result = await this.removeMcpServer(server.id);
            
            if (result.success) {
                console.log(`Successfully removed ${server.name} from VS Code MCP configuration`);
                // Trigger registry refresh if available
                if (this.registryService) {
                    await this.registryService.refreshAfterConfigurationChange();
                }
                return true;
            } else {
                console.warn(`Server ${server.name} was not found in MCP configuration: ${result.error}`);
                return true; // Return true since server not being configured is acceptable
            }
        } catch (error) {
            console.error(`Failed to remove ${server.name} from VS Code configuration:`, error);
            return false;
        }
    }    /**
     * Creates VS Code MCP server configuration from server data
     */
    private createServerConfiguration(server: McpServer): McpServerConfiguration | null {
        try {
            // If server has command and args directly specified, use them
            if (server.command) {
                return {
                    command: server.command,
                    args: server.args || [],
                    type: 'stdio'
                };
            }

            // Parse from install command if available
            if (server.installCommand) {
                // For npm packages, use npx
                if (server.installCommand.includes('npm install') || server.installCommand.includes('npx')) {
                    const packageName = this.extractPackageName(server.installCommand);
                    if (!packageName) {
                        console.error(`Could not extract package name from: ${server.installCommand}`);
                        return null;
                    }
                    return {
                        command: 'npx',
                        args: [packageName],
                        type: 'stdio'
                    };
                }

                // For pip packages, use uvx or python -m
                if (server.installCommand.includes('pip install')) {
                    const packageName = this.extractPythonPackageName(server.installCommand);
                    if (!packageName) {
                        console.error(`Could not extract Python package name from: ${server.installCommand}`);
                        return null;
                    }
                    return {
                        command: 'uvx',
                        args: [packageName],
                        type: 'stdio'
                    };
                }

                // Handle direct npx commands
                if (server.installCommand.startsWith('npx')) {
                    const parts = server.installCommand.split(' ');
                    return {
                        command: 'npx',
                        args: parts.slice(1),
                        type: 'stdio'
                    };
                }

                // Fallback configuration for other command types
                const commandParts = server.installCommand.split(' ');
                if (commandParts.length >= 1) {
                    return {
                        command: commandParts[0],
                        args: commandParts.slice(1),
                        type: 'stdio'
                    };
                }
            }

            // For Docker commands
            if (server.dockerCommand) {
                const dockerParts = server.dockerCommand.split(' ');
                if (dockerParts[0] === 'docker') {
                    return {
                        command: 'docker',
                        args: dockerParts.slice(1),
                        type: 'stdio'
                    };
                }
            }

            // If we have a repository URL, suggest a generic configuration
            if (server.repository) {
                console.warn(`Server ${server.name} requires manual configuration. Repository: ${server.repository}`);
                return {
                    command: 'echo',
                    args: [`Please configure ${server.name} manually. See: ${server.repository}`],
                    type: 'stdio'
                };
            }

            console.error(`Cannot create configuration for ${server.name}: insufficient information`);
            return null;
        } catch (error) {
            console.error(`Failed to create server configuration for ${server.name}:`, error);
            return null;
        }
    }

    /**
     * Checks if a server is configured in VS Code MCP settings
     */
    public isServerConfigured(server: McpServer): boolean {
        try {
            const config = vscode.workspace.getConfiguration('mcp');
            const currentServers = config.get<any>('servers') || {};
            
            // Check with the original ID first
            if (currentServers[server.id]) {
                return true;
            }
            
            // Check with the cleaned ID (without '-server' suffix)
            let configId = server.id;
            if (configId.endsWith('-server')) {
                configId = configId.slice(0, -7);
            }
            
            return !!currentServers[configId];
        } catch (error) {
            console.error(`Failed to check configuration for ${server.name}:`, error);
            return false;
        }
    }/**
     * Extracts package name from npm install command
     */
    private extractPackageName(installCommand: string): string {
        // Handle various npm/npx command formats
        let match;
        
        // Try to match 'npm install @scope/package' or 'npm install package'
        match = installCommand.match(/npm install\s+(-g\s+)?(@?[\w-]+(?:\/[\w-]+)?)/);
        if (match) {
            return match[2].trim();
        }
        
        // Try to match 'npx @scope/package' or 'npx package'
        match = installCommand.match(/npx\s+(-y\s+)?(@?[\w-]+(?:\/[\w-]+)?)/);
        if (match) {
            return match[2].trim();
        }
        
        // Fallback: extract last argument that looks like a package name
        const parts = installCommand.split(' ');
        for (let i = parts.length - 1; i >= 0; i--) {
            const part = parts[i];
            if (part && !part.startsWith('-') && (part.includes('@') || part.match(/^[\w-]+$/))) {
                return part;
            }
        }
        
        console.warn(`Could not extract package name from: ${installCommand}`);
        return '';
    }

    /**
     * Extracts package name from pip install command
     */
    private extractPythonPackageName(installCommand: string): string {
        // Handle various pip command formats
        let match;
        
        // Try to match 'pip install package-name' or 'pip install package_name'
        match = installCommand.match(/pip install\s+([\w-_]+)/);
        if (match) {
            return match[1].trim();
        }
        
        // Fallback: extract last argument that looks like a package name
        const parts = installCommand.split(' ');
        for (let i = parts.length - 1; i >= 0; i--) {
            const part = parts[i];
            if (part && !part.startsWith('-') && part.match(/^[\w-_]+$/)) {
                return part;
            }
        }
        
        console.warn(`Could not extract Python package name from: ${installCommand}`);
        return '';
    }

    /**
	 * Validates MCP configuration in VS Code settings
	 */
	async validateMcpConfiguration(): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
		const errors: string[] = [];
		const warnings: string[] = [];
		
		try {
			const mcpConfig = vscode.workspace.getConfiguration('mcp');
			const servers = mcpConfig.get<Record<string, any>>('servers', {});
			
			// Check if any servers are configured
			if (Object.keys(servers).length === 0) {
				warnings.push('No MCP servers configured in settings');
			}
			
			// Validate each server configuration
			for (const [serverName, config] of Object.entries(servers)) {
				if (!config.command) {
					errors.push(`Server '${serverName}' missing 'command' property`);
				}
				
				if (!config.args || !Array.isArray(config.args)) {
					errors.push(`Server '${serverName}' missing or invalid 'args' property`);
				}
						if (config.type && config.type !== 'stdio') {
					warnings.push(`Server '${serverName}' uses non-stdio type: ${config.type}`);
				}
			}
			
			return {
				isValid: errors.length === 0,
				errors,
				warnings
			};
		} catch (error) {
			return {
				isValid: false,
				errors: [`Failed to validate MCP configuration: ${error}`],
				warnings: []
			};
		}
	}
    
	/**
	 * Removes an MCP server from VS Code settings.json
	 */
	async removeMcpServer(serverId: string): Promise<{ success: boolean; error?: string }> {
		try {
			const mcpConfig = vscode.workspace.getConfiguration('mcp');
			const servers = mcpConfig.get<Record<string, any>>('servers', {});
			
			let removed = false;
			let removedId = '';
			
			// Try to remove with the provided serverId first
			if (servers[serverId]) {
				servers[serverId] = undefined; // Use undefined to remove the property
				removed = true;
				removedId = serverId;
			}
			
			// If not found, try with cleaned ID (without '-server' suffix)
			if (!removed) {
				let cleanedId = serverId;
				if (cleanedId.endsWith('-server')) {
					cleanedId = cleanedId.slice(0, -7);
					if (servers[cleanedId]) {
						servers[cleanedId] = undefined; // Use undefined to remove the property
						removed = true;
						removedId = cleanedId;
					}
				}
			}
			
			// If still not found, try adding '-server' suffix
			if (!removed) {
				const suffixedId = serverId + '-server';
				if (servers[suffixedId]) {
					servers[suffixedId] = undefined; // Use undefined to remove the property
					removed = true;
					removedId = suffixedId;
				}
			}
			
			if (!removed) {
				return {
					success: false,
					error: `Server '${serverId}' not found in MCP configuration. Available servers: ${Object.keys(servers).join(', ')}`
				};
			}
			
			// Update the configuration
			await mcpConfig.update('servers', undefined, vscode.ConfigurationTarget.Global);

            await mcpConfig.update('servers', servers, vscode.ConfigurationTarget.Global);
			
			console.log(`Successfully removed server '${removedId}' from MCP configuration`);
			
			// Notify registry service about the removal
			if (this.registryService) {
				await this.registryService.removeServerFromRegistry(serverId);
			}
			
			return { success: true };
		} catch (error) {
			const errorMsg = `Failed to remove server '${serverId}': ${error}`;
			console.error(errorMsg);
			return {
				success: false,
				error: errorMsg
			};
		}
	}

	/**
	 * Gets list of all configured MCP server IDs
	 */
	getConfiguredServerIds(): string[] {
		try {
			const mcpConfig = vscode.workspace.getConfiguration('mcp');
			const servers = mcpConfig.get<Record<string, any>>('servers', {});
			return Object.keys(servers);
		} catch (error) {
			console.error('Failed to get configured server IDs:', error);
			return [];
		}
	}

    /**
     * Gets the configuration ID used for a server in VS Code settings
     */
    private getServerConfigId(server: McpServer): string {
        let configId = server.id;
        if (configId.endsWith('-server')) {
            configId = configId.slice(0, -7); // Remove '-server'
        }
        return configId;
    }

    /**
     * Shows the server configuration in a readable format
     */
    private async showServerConfiguration(server: McpServer): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('mcp');
            const servers = config.get<any>('servers') || {};
            const configId = this.getServerConfigId(server);
            const serverConfig = servers[configId] || servers[server.id];
            
            if (serverConfig) {
                const configText = JSON.stringify(serverConfig, null, 2);
                const outputChannel = vscode.window.createOutputChannel(`MCP Configuration - ${server.name}`);
                outputChannel.clear();
                outputChannel.appendLine(`Configuration for ${server.name}:`);
                outputChannel.appendLine(`Server ID: ${configId}`);
                outputChannel.appendLine(`Configuration:`);
                outputChannel.appendLine(configText);
                outputChannel.appendLine('');
                outputChannel.appendLine('This configuration can be found in your VS Code settings under "mcp.servers"');
                outputChannel.show();
            } else {
                vscode.window.showWarningMessage(`No configuration found for ${server.name}`);
            }
        } catch (error) {
            console.error(`Failed to show configuration for ${server.name}:`, error);
            vscode.window.showErrorMessage(`Failed to show configuration: ${error}`);
        }
    }

    /**
	 * Gets all configured MCP server IDs for debugging purposes
	 */
	async getConfiguredServersList(): Promise<{ serverIds: string[]; servers: Record<string, any> }> {
		try {
			const mcpConfig = vscode.workspace.getConfiguration('mcp');
			const servers = mcpConfig.get<Record<string, any>>('servers', {});
			return {
				serverIds: Object.keys(servers),
				servers
			};
		} catch (error) {
			console.error('Failed to get configured servers list:', error);
			return { serverIds: [], servers: {} };
		}
	}
}
