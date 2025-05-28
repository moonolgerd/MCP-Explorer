const fs = require('fs');
const path = require('path');

console.log('Testing MCP Explorer Extension Registry...');

try {
    // Test registry loading
    const registryPath = path.join(__dirname, 'mcp-servers-registry.json');
    console.log('Registry path:', registryPath);
    
    if (!fs.existsSync(registryPath)) {
        throw new Error('Registry file not found');
    }
    
    const registryContent = fs.readFileSync(registryPath, 'utf8');
    const registry = JSON.parse(registryContent);
    
    console.log('✅ Registry loaded successfully');
    console.log(`   Version: ${registry.version}`);
    console.log(`   Total servers: ${registry.servers.length}`);
    console.log(`   Categories: ${registry.categories.length}`);
    
    // Test server structure
    const sampleServer = registry.servers[0];
    const requiredFields = ['id', 'name', 'description', 'version', 'author', 'category', 'tags'];
    
    for (const field of requiredFields) {
        if (!sampleServer[field]) {
            throw new Error(`Missing required field: ${field}`);
        }
    }
    
    console.log('✅ Server structure validation passed');
    
    // Test categories
    const categories = new Set(registry.servers.map(s => s.category));
    console.log(`   Unique categories found: ${categories.size}`);
    console.log(`   Categories: ${Array.from(categories).join(', ')}`);
    
    // Test install commands
    const withInstallCommands = registry.servers.filter(s => s.installCommand).length;
    console.log(`   Servers with install commands: ${withInstallCommands}/${registry.servers.length}`);
    
    // Test features
    const withFeatures = registry.servers.filter(s => s.features && s.features.length > 0).length;
    console.log(`   Servers with features: ${withFeatures}/${registry.servers.length}`);
    
    console.log('\n🎉 All tests passed! Extension registry is ready.');
    
} catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
}
