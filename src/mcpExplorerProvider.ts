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

    clearSearch(): void {
        this.searchQuery = '';
        this.refresh();
    }

    getSearchQuery(): string {
        return this.searchQuery;
    }

    getTreeItem(element: McpTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: McpTreeItem): Promise<McpTreeItem[]> {
        if (!element) {
            return this.getRootItems();
        }        if (element.itemType === 'installed') {
            const servers = await this.registryService.fetchServers();
            let installedServers = servers.filter(server => server.isInstalled);
            
            // If there's a search query, filter installed servers by search
            if (this.searchQuery.trim()) {
                const searchResults = this.registryService.searchServers(this.searchQuery);
                installedServers = installedServers.filter(server => 
                    searchResults.some(searchResult => searchResult.id === server.id)
                );
            }
            
            return installedServers.map(server => 
                new McpTreeItem(server.name, vscode.TreeItemCollapsibleState.None, server)
            );
        }if (element.itemType === 'category') {
            const servers = await this.registryService.fetchServers();
            // Extract category name from label (remove count)
            const categoryName = element.label.split(' (')[0];
            
            let categoryServers: any[];
            if (this.searchQuery) {
                // When searching, filter search results by category
                const searchResults = this.registryService.searchServers(this.searchQuery);
                categoryServers = searchResults.filter(server => server.category === categoryName);
            } else {
                // When not searching, show all servers in category
                categoryServers = servers.filter(server => server.category === categoryName);
            }
                
            return categoryServers.map(server => 
                new McpTreeItem(server.name, vscode.TreeItemCollapsibleState.None, server)
            );
        }

        return [];
    }    private async getRootItems(): Promise<McpTreeItem[]> {
        const items: McpTreeItem[] = [];
        const servers = await this.registryService.fetchServers();

        if (this.searchQuery.trim()) {
            const searchResults = this.registryService.searchServers(this.searchQuery);
            
            if (searchResults.length === 0) {
                // Show a "No results" item when search returns nothing
                items.push(new McpTreeItem(
                    `No results for "${this.searchQuery}"`,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    'category'
                ));
                return items;
            }

            // Show search results grouped by category
            const searchCategories = new Map<string, McpServer[]>();
            searchResults.forEach(server => {
                if (!searchCategories.has(server.category)) {
                    searchCategories.set(server.category, []);
                }
                searchCategories.get(server.category)!.push(server);
            });

            // Add installed servers from search results first
            const installedSearchResults = searchResults.filter(server => server.isInstalled);
            if (installedSearchResults.length > 0) {
                items.push(new McpTreeItem(
                    `Installed (${installedSearchResults.length})`, 
                    vscode.TreeItemCollapsibleState.Expanded,
                    undefined,
                    'installed'
                ));
            }

            // Add categories with search result counts
            for (const [category, categoryServers] of searchCategories) {
                items.push(new McpTreeItem(
                    `${category} (${categoryServers.length})`,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    undefined,
                    'category'
                ));
            }

            return items;
        }

        // Normal view (no search)
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
