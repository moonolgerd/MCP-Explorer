// Test script to verify MCP configuration functionality
const vscode = {
    workspace: {
        getConfiguration: (section) => {
            const mockConfig = {
                get: (key) => {
                    if (section === 'mcp' && key === 'servers') {
                        return {
                            'test-server': {
                                type: 'stdio',
                                command: 'npx',
                                args: ['test-mcp-server']
                            }
                        };
                    }
                    return {};
                },
                update: async (key, value, target) => {
                    console.log(`Updated ${section}.${key} with:`, JSON.stringify(value, null, 2));
                    return Promise.resolve();
                }
            };
            return mockConfig;
        }
    },
    ConfigurationTarget: {
        Global: 1
    }
};

// Mock server for testing
const testServer = {
    id: 'filesystem-server',
    name: 'Filesystem Server',
    installCommand: 'npm install @modelcontextprotocol/server-filesystem',
    isInstalled: false
};

// Test the configuration methods
class TestMcpInstallationService {
    async addServerToConfiguration(server) {
        try {
            const config = vscode.workspace.getConfiguration('mcp');
            const currentServers = config.get('servers') || {};

            // Create server configuration based on the server data
            const serverConfig = this.createServerConfiguration(server);
            if (!serverConfig) {
                return false;
            }

            // Add to the servers object
            currentServers[server.id] = serverConfig;

            // Update the configuration
            await config.update('servers', currentServers, vscode.ConfigurationTarget.Global);
            
            console.log(`✅ Added ${server.name} to VS Code MCP configuration`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to add ${server.name} to VS Code configuration:`, error);
            return false;
        }
    }

    createServerConfiguration(server) {
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

            return null;
        } catch (error) {
            console.error(`Failed to create server configuration for ${server.name}:`, error);
            return null;
        }
    }

    extractPackageName(installCommand) {
        const match = installCommand.match(/@[\w-]+\/[\w-]+|[\w-]+$/);
        return match ? match[0] : null;
    }

    isServerConfigured(server) {
        try {
            const config = vscode.workspace.getConfiguration('mcp');
            const currentServers = config.get('servers') || {};
            return !!currentServers[server.id];
        } catch (error) {
            console.error(`Failed to check configuration for ${server.name}:`, error);
            return false;
        }
    }
}

// Run the test
async function runTest() {
    console.log('🧪 Testing MCP Configuration Integration...\n');
    
    const service = new TestMcpInstallationService();
    
    console.log('1. Testing server configuration creation:');
    const config = service.createServerConfiguration(testServer);
    console.log('Generated config:', JSON.stringify(config, null, 2));
    
    console.log('\n2. Testing package name extraction:');
    const packageName = service.extractPackageName(testServer.installCommand);
    console.log('Extracted package name:', packageName);
    
    console.log('\n3. Testing configuration check:');
    const isConfigured = service.isServerConfigured(testServer);
    console.log('Is server configured:', isConfigured);
    
    console.log('\n4. Testing adding server to configuration:');
    const success = await service.addServerToConfiguration(testServer);
    console.log('Configuration added successfully:', success);
    
    console.log('\n✅ All tests completed!');
}

runTest().catch(console.error);
