import * as vscode from 'vscode';
import { McpServer } from './types';

export class McpWebviewService {
    private panels: Map<string, vscode.WebviewPanel> = new Map();

    constructor(private context: vscode.ExtensionContext) {}

    showServerDetails(server: McpServer): void {
        const existingPanel = this.panels.get(server.id);
        if (existingPanel) {
            existingPanel.reveal();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'mcpServerDetails',
            `${server.name} - Details`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );        panel.webview.html = this.getServerDetailsContent(server);

        this.panels.set(server.id, panel);

        panel.onDidDispose(() => {
            this.panels.delete(server.id);
        }, null, this.context.subscriptions);

        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.type) {
                    case 'install':
                        vscode.commands.executeCommand('mcpExplorer.install', server);
                        break;
                    case 'uninstall':
                        vscode.commands.executeCommand('mcpExplorer.uninstall', server);
                        break;
                    case 'configure':
                        vscode.commands.executeCommand('mcpExplorer.configure', server);
                        break;
                    case 'openUrl':
                        vscode.env.openExternal(vscode.Uri.parse(message.url));
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );
    }

    updateServerDetails(server: McpServer): void {
        const panel = this.panels.get(server.id);
        if (panel) {
            panel.webview.html = this.getServerDetailsContent(server);
        }
    }    private getServerDetailsContent(server: McpServer): string {
        const installButton = server.isInstalled 
            ? `<button class="button secondary" onclick="uninstall()">Uninstall</button>
               <button class="button primary" onclick="configure()">Configure</button>`
            : `<button class="button primary" onclick="install()">Install</button>`;

        const statusBadge = server.isInstalled 
            ? '<span class="status-badge installed">Installed</span>'
            : '<span class="status-badge not-installed">Not Installed</span>';

        const featuresSection = server.features && server.features.length > 0 
            ? `<div class="info-item">
                <div class="label">Features</div>
                <div class="value">
                    <ul>
                        ${server.features.map(feature => `<li>${feature}</li>`).join('')}
                    </ul>
                </div>
            </div>`
            : '';

        const requirementsSection = server.requirements
            ? `<div class="info-item">
                <div class="label">Requirements</div>
                <div class="value">
                    ${server.requirements.node ? `<div>Node.js: ${server.requirements.node}</div>` : ''}
                    ${server.requirements.python ? `<div>Python: ${server.requirements.python}</div>` : ''}
                    ${server.requirements.system ? `<div>System: ${server.requirements.system.join(', ')}</div>` : ''}
                    ${server.requirements.environment ? `<div>Environment Variables: ${Object.keys(server.requirements.environment).join(', ')}</div>` : ''}
                </div>
            </div>`
            : '';

        const installCommandSection = server.installCommand
            ? `<div class="info-item">
                <div class="label">Install Command</div>
                <div class="value code">${server.installCommand}</div>
            </div>`
            : '';

        const dockerCommandSection = server.dockerCommand
            ? `<div class="info-item">
                <div class="label">Docker Command</div>
                <div class="value code">${server.dockerCommand}</div>
            </div>`
            : '';

        const tagsSection = server.tags && server.tags.length > 0
            ? `<div class="info-item">
                <div class="label">Tags</div>
                <div class="value">
                    ${server.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}
                </div>
            </div>`
            : '';

        const linksSection = `<div class="info-item">
            <div class="label">Links</div>
            <div class="value">
                ${server.homepage ? `<a href="#" onclick="openUrl('${server.homepage}')">Homepage</a>` : ''}
                ${server.repository ? `<a href="#" onclick="openUrl('${server.repository}')">Repository</a>` : ''}
            </div>
        </div>`;

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${server.name} - Details</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    line-height: 1.6;
                    color: var(--vscode-foreground);
                    background: var(--vscode-editor-background);
                    margin: 0;
                    padding: 20px;
                }
                .header {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                .header h1 {
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
                }
                .version {
                    color: var(--vscode-descriptionForeground);
                    font-size: 14px;
                    margin: 5px 0;
                }
                .status-badge {
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 500;
                    text-transform: uppercase;
                }
                .status-badge.installed {
                    background: green;
                    color: white;
                }
                .status-badge.not-installed {
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                .description {
                    font-size: 16px;
                    margin: 20px 0;
                    color: var(--vscode-editor-foreground);
                }
                .actions {
                    display: flex;
                    gap: 10px;
                    margin: 30px 0 20px 0;
                }
                .button {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                .button.primary {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }
                .button.secondary {
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                .info-item {
                    background: var(--vscode-input-background);
                    padding: 15px;
                    border-radius: 6px;
                    border: 1px solid var(--vscode-input-border);
                    margin: 10px 0;
                }
                .info-item .label {
                    font-weight: 600;
                    color: var(--vscode-editor-foreground);
                    margin-bottom: 5px;
                }
                .info-item .value {
                    color: var(--vscode-descriptionForeground);
                }
                .info-item .value.code {
                    font-family: var(--vscode-editor-font-family);
                    background: var(--vscode-textCodeBlock-background);
                    padding: 8px;
                    border-radius: 4px;
                }
                .tag {
                    background: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 12px;
                    margin-right: 5px;
                }
                ul {
                    margin: 0;
                    padding-left: 20px;
                }
                a {
                    color: var(--vscode-textLink-foreground);
                    text-decoration: none;
                    margin-right: 15px;
                }
                a:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1>${server.name}</h1>
                    <div>${server.id}</div> <div class="version">Version ${server.version}</div>
                    ${statusBadge}
                </div>
            </div>

            <div class="description">
                ${server.description}
            </div>

            <div class="actions">
                ${installButton}
            </div>

            <div class="info-item">
                <div class="label">Author</div>
                <div class="value">${server.author}</div>
            </div>
            
            <div class="info-item">
                <div class="label">Category</div>
                <div class="value">${server.category}</div>
            </div>

            ${tagsSection}
            ${featuresSection}
            ${requirementsSection}
            ${installCommandSection}
            ${dockerCommandSection}
            ${linksSection}

            <script>
                const vscode = acquireVsCodeApi();
                
                function install() {
                    vscode.postMessage({ type: 'install' });
                }
                
                function uninstall() {
                    vscode.postMessage({ type: 'uninstall' });
                }
                
                function configure() {
                    vscode.postMessage({ type: 'configure' });
                }
                
                function openUrl(url) {
                    vscode.postMessage({ type: 'openUrl', url: url });
                }
            </script>
        </body>
        </html>`;
    }
}
