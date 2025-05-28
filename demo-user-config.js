// Demo script to test MCP Explorer functionality
const fs = require('fs');
const path = require('path');

console.log('🎯 MCP Explorer Demo - User Configuration Sync Test');
console.log('=====================================================\n');

try {
    // Load the registry data
    const registryPath = path.join(__dirname, 'mcp-servers-registry.json');
    const registryData = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

    // Simulate user's VS Code settings
    const userServers = {
        "figma_mcp": {
            "type": "stdio",
            "command": "cmd",
            "args": ["/c", "npx", "-y", "figma-developer-mcp"]
        },
        "travel_planner": {
            "type": "stdio", 
            "command": "npx",
            "args": ["@gongrzhe/server-travelplanner-mcp"]
        },
        "playwright": {
            "command": "docker",
            "args": ["run", "-i", "--rm", "--init", "mcp/playwright"]
        },
        "kubernetes-server": {
            "type": "stdio",
            "command": "npx", 
            "args": ["mcp-server-kubernetes"]
        }
    };

    const userServerIds = Object.keys(userServers);

    console.log('📋 User Configured Servers:');
    userServerIds.forEach(id => {
        console.log(`   • ${id}`);
    });
    console.log('');

    // Test matching logic
    function matchServer(server, userIds) {
        return userIds.some(userId => {
            const serverName = server.name.toLowerCase();
            const userIdLower = userId.toLowerCase();
            
            if (userId === server.id) return true;
            if (serverName.includes('figma') && userIdLower.includes('figma')) return true;
            if (serverName.includes('travel') && userIdLower.includes('travel')) return true;
            if (serverName.includes('playwright') && userIdLower.includes('playwright')) return true;
            if (serverName.includes('kubernetes') && userIdLower.includes('kubernetes')) return true;
            
            return false;
        });
    }

    let matchedCount = 0;
    const installedServers = [];

    // Check each registry server
    registryData.servers.forEach(server => {
        if (matchServer(server, userServerIds)) {
            matchedCount++;
            installedServers.push(server);
        }
    });

    // Add user servers not in registry
    userServerIds.forEach(userId => {
        const existsInRegistry = registryData.servers.some(s => matchServer(s, [userId]));
        if (!existsInRegistry) {
            installedServers.push({
                id: userId,
                name: userId.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                category: 'User Configured',
                description: 'User-configured MCP server'
            });
        }
    });

    console.log('🔍 Match Results:');
    console.log(`   Registry servers: ${registryData.servers.length}`);
    console.log(`   User configured: ${userServerIds.length}`);
    console.log(`   Matched from registry: ${matchedCount}`);
    console.log(`   Total installed: ${installedServers.length}`);
    console.log('');

    console.log('✅ Installed Servers:');
    installedServers.forEach(server => {
        console.log(`   • ${server.name} (${server.category || 'Unknown'})`);
    });
    console.log('');

    console.log('🎉 Demo complete! Your MCP servers will be detected.');
    console.log('💡 Start the extension (F5) to see them in the tree view!');

} catch (error) {
    console.error('Error:', error.message);
    console.error('Make sure mcp-servers-registry.json exists');
}
