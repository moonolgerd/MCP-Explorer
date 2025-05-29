/**
 * Represents an MCP server from the registry
 */
export interface McpServer {
    id: string;
    name: string;
    description: string;
    version: string;
    author: string;
    homepage?: string;
    repository?: string;
    category: string;
    tags: string[];
    installCommand?: string;
    dockerCommand?: string;
    features?: string[];
    configSchema?: any;
    requirements?: {
        node?: string;
        python?: string;
        system?: string[];
        dependencies?: string[];
        environment?: Record<string, string>;
    };
    isInstalled?: boolean;
    installPath?: string;
    userConfigId?: string; // ID used in user's VS Code settings
    // Direct configuration properties
    command?: string;
    args?: string[];
    mcpConfig?: McpServerConfiguration;
}

/**
 * Registry response structure
 */
export interface McpRegistry {
    version: string;
    lastUpdated: string;
    totalServers: number;
    categories: string[];
    servers: McpServer[];
}

/**
 * Installation status
 */
export enum InstallationStatus {
    NotInstalled = 'not-installed',
    Installing = 'installing',
    Installed = 'installed',
    Failed = 'failed',
    Updating = 'updating'
}

/**
 * MCP Server configuration for VS Code settings
 */
export interface McpServerConfiguration {
    command: string;
    args: string[];
    type: 'stdio';
    env?: Record<string, string>;
}

/**
 * Server configuration
 */
export interface ServerConfig {
    enabled: boolean;
    config: any;
}
