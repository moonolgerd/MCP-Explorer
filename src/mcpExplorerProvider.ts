import * as vscode from 'vscode';
import { McpServer } from './types';
import { McpRegistryService } from './mcpRegistryService';

export class McpTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly server?: McpServer,
        public readonly itemType?: 'category' | 'server' | 'installed'
    ) {
        super(label, collapsibleState);        if (server) {
            this.description = server.version;
            this.tooltip = `${server.description}\n\nCategory: ${server.category}\nInstalled: ${server.isInstalled ? 'Yes' : 'No'}`;
            this.contextValue = server.isInstalled ? 'installedMcpServer' : 'mcpServer';
            
            if (server.isInstalled) {
                this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
                this.description = `${server.version} • Installed`;
            } else {
                this.iconPath = new vscode.ThemeIcon('package');
            }
        } else if (itemType === 'category') {
            this.iconPath = new vscode.ThemeIcon('folder');
            this.contextValue = 'category';
        } else if (itemType === 'installed') {
            this.iconPath = new vscode.ThemeIcon('check');
            this.contextValue = 'installedSection';
        }
    }
}

export class McpExplorerProvider implements vscode.TreeDataProvider<McpTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<McpTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private searchQuery: string = '';

    constructor(private registryService: McpRegistryService) {
        this.registryService.onDidChangeServers(() => this.refresh());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setSearchQuery(query: string): void {
        this.searchQuery = query;
        this.refresh();
    }

    getTreeItem(element: McpTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: McpTreeItem): Promise<McpTreeItem[]> {
        if (!element) {
            return this.getRootItems();
        }

        if (element.itemType === 'installed') {
            const servers = await this.registryService.fetchServers();
            const installedServers = servers.filter(server => server.isInstalled);
            return installedServers.map(server => 
                new McpTreeItem(server.name, vscode.TreeItemCollapsibleState.None, server)
            );
        }        if (element.itemType === 'category') {
            const servers = await this.registryService.fetchServers();
            // Extract category name from label (remove count)
            const categoryName = element.label.split(' (')[0];
            const categoryServers = this.searchQuery 
                ? this.registryService.searchServers(this.searchQuery)
                : servers.filter(server => server.category === categoryName);
                
            return categoryServers.map(server => 
                new McpTreeItem(server.name, vscode.TreeItemCollapsibleState.None, server)
            );
        }

        return [];
    }

    private async getRootItems(): Promise<McpTreeItem[]> {
        const items: McpTreeItem[] = [];

        if (this.searchQuery) {
            const searchResults = this.registryService.searchServers(this.searchQuery);
            return searchResults.map(server => 
                new McpTreeItem(server.name, vscode.TreeItemCollapsibleState.None, server)
            );
        }

        const servers = await this.registryService.fetchServers();
        const installedCount = servers.filter(server => server.isInstalled).length;
        if (installedCount > 0) {
            items.push(new McpTreeItem(
                `Installed (${installedCount})`, 
                vscode.TreeItemCollapsibleState.Expanded,
                undefined,
                'installed'
            ));
        }

        const categories = this.registryService.getCategories();
        for (const category of categories) {
            const categoryServers = this.registryService.getServersByCategory(category);
            items.push(new McpTreeItem(
                `${category} (${categoryServers.length})`,
                vscode.TreeItemCollapsibleState.Collapsed,
                undefined,
                'category'
            ));
        }

        return items;
    }
}
