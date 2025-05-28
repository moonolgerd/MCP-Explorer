import * as vscode from 'vscode';
import { McpServer, InstallationStatus } from './types';

export class McpInstallationService {
    private _onDidChangeInstallation = new vscode.EventEmitter<{ server: McpServer; status: InstallationStatus }>();
    public readonly onDidChangeInstallation = this._onDidChangeInstallation.event;

    constructor(private context: vscode.ExtensionContext) {}async installServer(server: McpServer): Promise<boolean> {
        try {
            this._onDidChangeInstallation.fire({ server, status: InstallationStatus.Installing });

            return await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Installing ${server.name}`,
                cancellable: true
            }, async (progress, token) => {
                progress.report({ increment: 0, message: 'Preparing installation...' });

                if (!server.installCommand) {
                    throw new Error('No install command available for this server');
                }

                // Check requirements first
                if (server.requirements) {
                    progress.report({ increment: 10, message: 'Checking requirements...' });
                    const missingRequirements = await this.checkRequirements(server.requirements);
                    if (missingRequirements.length > 0) {
                        throw new Error(`Missing requirements: ${missingRequirements.join(', ')}`);
                    }
                }

                // Execute installation command
                progress.report({ increment: 30, message: 'Installing package...' });
                const success = await this.executeInstallCommand(server.installCommand, progress, token);

                if (!success) {
                    throw new Error('Installation command failed');
                }

                if (token.isCancellationRequested) {
                    this._onDidChangeInstallation.fire({ server, status: InstallationStatus.Failed });
                    return false;
                }                progress.report({ increment: 100, message: 'Installation complete!' });

                // Add server to VS Code MCP configuration
                const configSuccess = await this.addServerToConfiguration(server);
                if (!configSuccess) {
                    vscode.window.showWarningMessage(`${server.name} installed but failed to configure in VS Code settings`);
                }

                server.isInstalled = true;
                this._onDidChangeInstallation.fire({ server, status: InstallationStatus.Installed });
                vscode.window.showInformationMessage(`Successfully installed ${server.name}`);
                
                return true;
            });
        } catch (error) {
            console.error(`Failed to install ${server.name}:`, error);
            this._onDidChangeInstallation.fire({ server, status: InstallationStatus.Failed });
            vscode.window.showErrorMessage(`Failed to install ${server.name}: ${error}`);
            return false;
        }
    }

    async uninstallServer(server: McpServer): Promise<boolean> {
        try {
            const confirm = await vscode.window.showWarningMessage(
                `Are you sure you want to uninstall ${server.name}?`,
                { modal: true },
                'Yes', 'No'
            );

            if (confirm !== 'Yes') {
                return false;
            }

            return await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Uninstalling ${server.name}`,
                cancellable: false            }, async (progress) => {
                progress.report({ increment: 0, message: 'Removing package...' });
                
                // Remove from VS Code configuration first
                const configRemoved = await this.removeServerFromConfiguration(server);
                if (!configRemoved) {
                    vscode.window.showWarningMessage(`Failed to remove ${server.name} from VS Code settings`);
                }

                progress.report({ increment: 50, message: 'Removing package files...' });

                // Execute uninstall command if available
                if (server.installCommand) {
                    const uninstallCommand = this.getUninstallCommand(server);
                    if (uninstallCommand) {
                        const success = await this.executeUninstallCommand(uninstallCommand);
                        if (!success) {
                            vscode.window.showWarningMessage(`Package removal completed but uninstall command failed for ${server.name}`);
                        }
                    }
                }

                progress.report({ increment: 100, message: 'Uninstallation complete!' });

                server.isInstalled = false;
                this._onDidChangeInstallation.fire({ server, status: InstallationStatus.NotInstalled });
                vscode.window.showInformationMessage(`Successfully uninstalled ${server.name}`);
                return true;
            });
        } catch (error) {
            console.error(`Failed to uninstall ${server.name}:`, error);
            vscode.window.showErrorMessage(`Failed to uninstall ${server.name}: ${error}`);
            return false;
        }
    }    async configureServer(server: McpServer): Promise<void> {
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
    }

    private async executeInstallCommand(
        installCommand: string, 
        progress: vscode.Progress<{ message?: string; increment?: number }>,
        token: vscode.CancellationToken
    ): Promise<boolean> {
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

                let output = '';                process.stdout?.on('data', (data: Buffer) => {
                    output += data.toString();
                    console.log('stdout:', data.toString());
                });

                process.stderr?.on('data', (data: Buffer) => {
                    output += data.toString();
                    console.log('stderr:', data.toString());
                });

                process.on('close', (code: number) => {
                    console.log(`Installation process exited with code ${code}`);
                    if (code === 0) {
                        progress.report({ increment: 40, message: 'Installation completed successfully' });
                        resolve(true);
                    } else {
                        console.error('Installation failed with output:', output);
                        resolve(false);
                    }
                });

                process.on('error', (error: Error) => {
                    console.error('Installation process error:', error);
                    resolve(false);
                });

                // Handle cancellation
                token.onCancellationRequested(() => {
                    process.kill();
                    resolve(false);
                });

            } catch (error) {
                console.error('Failed to execute install command:', error);
                resolve(false);            }
        });
    }

    /**
     * Adds a successfully installed MCP server to VS Code settings
     */
    private async addServerToConfiguration(server: McpServer): Promise<boolean> {
        try {
            const config = vscode.workspace.getConfiguration('mcp');
            const currentServers = config.get<any>('servers') || {};

            // Create server configuration based on the server data
            const serverConfig = this.createServerConfiguration(server);
            if (!serverConfig) {
                return false;
            }

            // Add to the servers object
            currentServers[server.id] = serverConfig;

            // Update the configuration
            await config.update('servers', currentServers, vscode.ConfigurationTarget.Global);
            
            console.log(`Added ${server.name} to VS Code MCP configuration`);
            return true;
        } catch (error) {
            console.error(`Failed to add ${server.name} to VS Code configuration:`, error);
            return false;
        }
    }

    /**
     * Removes an MCP server from VS Code settings
     */
    private async removeServerFromConfiguration(server: McpServer): Promise<boolean> {
        try {
            const config = vscode.workspace.getConfiguration('mcp');
            const currentServers = config.get<any>('servers') || {};

            // Remove the server
            if (currentServers[server.id]) {
                delete currentServers[server.id];
                await config.update('servers', currentServers, vscode.ConfigurationTarget.Global);
                console.log(`Removed ${server.name} from VS Code MCP configuration`);
                return true;
            }

            return true; // Already removed
        } catch (error) {
            console.error(`Failed to remove ${server.name} from VS Code configuration:`, error);
            return false;
        }
    }

    /**
     * Creates VS Code MCP server configuration from server data
     */
    private createServerConfiguration(server: McpServer): any | null {
        try {
            // Parse the install command to determine the configuration
            if (!server.installCommand) {
                return null;
            }

            // For npm packages, use npx
            if (server.installCommand.includes('npm install')) {
                const packageName = this.extractPackageName(server.installCommand);
                return {
                    type: 'stdio',
                    command: 'npx',
                    args: [packageName]
                };
            }

            // For pip packages, use uvx or python -m
            if (server.installCommand.includes('pip install')) {
                const packageName = this.extractPythonPackageName(server.installCommand);
                return {
                    type: 'stdio',
                    command: 'uvx',
                    args: [packageName]
                };
            }

            // For Docker commands
            if (server.dockerCommand) {
                const dockerArgs = server.dockerCommand.split(' ').slice(1); // Remove 'docker'
                return {
                    type: 'stdio',
                    command: 'docker',
                    args: dockerArgs
                };
            }

            // Fallback configuration
            const commandParts = server.installCommand.split(' ');
            if (commandParts.length >= 2) {
                return {
                    type: 'stdio',
                    command: commandParts[0],
                    args: commandParts.slice(1)
                };
            }

            return null;
        } catch (error) {
            console.error(`Failed to create server configuration for ${server.name}:`, error);
            return null;
        }
    }

    /**
     * Generates uninstall command from install command
     */
    private getUninstallCommand(server: McpServer): string | null {
        if (!server.installCommand) {
            return null;
        }

        if (server.installCommand.includes('npm install')) {
            const packageName = this.extractPackageName(server.installCommand);
            return `npm uninstall ${packageName}`;
        }

        if (server.installCommand.includes('pip install')) {
            const packageName = this.extractPythonPackageName(server.installCommand);
            return `pip uninstall ${packageName} -y`;
        }

        return null; // No uninstall command available
    }

    /**
     * Executes uninstall command
     */
    private async executeUninstallCommand(uninstallCommand: string): Promise<boolean> {
        return new Promise((resolve) => {
            try {
                const { spawn } = require('child_process');
                
                const parts = uninstallCommand.split(' ');
                const command = parts[0];
                const args = parts.slice(1);
                
                console.log(`Executing uninstall: ${command} ${args.join(' ')}`);

                const process = spawn(command, args, {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    shell: true
                });

                process.on('close', (code: number) => {
                    console.log(`Uninstall process exited with code ${code}`);
                    resolve(code === 0);
                });

                process.on('error', (error: Error) => {
                    console.error('Uninstall process error:', error);
                    resolve(false);
                });

            } catch (error) {
                console.error('Failed to execute uninstall command:', error);
                resolve(false);
            }
        });
    }

    /**
     * Checks if a server is configured in VS Code MCP settings
     */
    public isServerConfigured(server: McpServer): boolean {
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
     * Extracts package name from npm install command
     */
    private extractPackageName(installCommand: string): string {
        const match = installCommand.match(/npm install\s+(-g\s+)?(.+)/);
        return match ? match[2].trim() : '';
    }

    /**
     * Extracts package name from pip install command
     */
    private extractPythonPackageName(installCommand: string): string {
        const match = installCommand.match(/pip install\s+(.+)/);
        return match ? match[1].trim() : '';
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
				
				if (config.transport && config.transport !== 'stdio') {
					warnings.push(`Server '${serverName}' uses non-stdio transport: ${config.transport}`);
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
}
