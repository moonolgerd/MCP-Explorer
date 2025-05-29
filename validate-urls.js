const fs = require('fs');
const path = require('path');

// Read the registry file
const registryPath = path.join(__dirname, 'mcp-servers-registry.json');
const registryData = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

// Extract all homepage URLs
const urls = registryData.servers.map(server => ({
    id: server.id,
    name: server.name,
    homepage: server.homepage
}));

console.log(`Found ${urls.length} servers to validate...`);

// Function to check URL status using https module
const https = require('https');
const http = require('http');
const { URL } = require('url');

function checkUrl(url) {
    return new Promise((resolve) => {
        try {
            const urlObj = new URL(url);
            const client = urlObj.protocol === 'https:' ? https : http;
            
            const options = {
                method: 'HEAD',
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname + urlObj.search,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 10000
            };
            
            const req = client.request(options, (res) => {
                resolve({
                    url,
                    status: res.statusCode,
                    ok: res.statusCode >= 200 && res.statusCode < 400
                });
            });
            
            req.on('error', (error) => {
                resolve({
                    url,
                    status: 'ERROR',
                    ok: false,
                    error: error.message
                });
            });
            
            req.on('timeout', () => {
                req.destroy();
                resolve({
                    url,
                    status: 'TIMEOUT',
                    ok: false,
                    error: 'Request timeout'
                });
            });
            
            req.end();
        } catch (error) {
            resolve({
                url,
                status: 'ERROR',
                ok: false,
                error: error.message
            });
        }
    });
}

// Validate all URLs with rate limiting
async function validateAllUrls() {
    const results = [];
    const invalidUrls = [];
    
    console.log('Starting URL validation...\n');
    
    for (let i = 0; i < urls.length; i++) {
        const { id, name, homepage } = urls[i];
        console.log(`Checking ${i + 1}/${urls.length}: ${name} - ${homepage}`);
        
        const result = await checkUrl(homepage);
        results.push({
            id,
            name,
            ...result
        });
        
        if (!result.ok) {
            invalidUrls.push({
                id,
                name,
                homepage,
                status: result.status,
                error: result.error
            });
            console.log(`❌ FAILED: ${name} - ${homepage} (${result.status})`);
        } else {
            console.log(`✅ OK: ${name}`);
        }
        
        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n=== VALIDATION COMPLETE ===');
    console.log(`Total servers checked: ${results.length}`);
    console.log(`Valid URLs: ${results.filter(r => r.ok).length}`);
    console.log(`Invalid URLs: ${invalidUrls.length}`);
    
    if (invalidUrls.length > 0) {
        console.log('\n=== INVALID URLS ===');
        invalidUrls.forEach(item => {
            console.log(`- ${item.name} (${item.id}): ${item.homepage} - Status: ${item.status}`);
            if (item.error) {
                console.log(`  Error: ${item.error}`);
            }
        });
        
        // Write invalid URLs to file for reference
        fs.writeFileSync('invalid-urls.json', JSON.stringify(invalidUrls, null, 2));
        console.log('\nInvalid URLs written to invalid-urls.json');
    } else {
        console.log('\n✅ All URLs are valid!');
    }
    
    return invalidUrls;
}

// Run the validation
validateAllUrls().catch(console.error);
