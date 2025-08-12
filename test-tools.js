#!/usr/bin/env node

// Simple test script for Dota MCP tools
const STEAM_ACCOUNT_ID = 1146009051;
const MCP_URL = "http://localhost:3002/mcp";

async function testTool(toolName, params) {
    try {
        console.log(`\n🧪 Testing ${toolName}...`);
        
        const response = await fetch(MCP_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: params
                }
            })
        });

        const result = await response.json();
        
        if (result.error) {
            console.log(`❌ ${toolName} failed:`, result.error.message);
            return false;
        } else {
            console.log(`✅ ${toolName} success`);
            // Parse the response content
            try {
                const content = JSON.parse(result.result.content[0].text);
                if (content.success) {
                    console.log(`   Data received: ${Object.keys(content).filter(k => k !== 'success' && k !== 'timestamp').join(', ')}`);
                } else {
                    console.log(`   Error: ${content.error}`);
                }
            } catch (e) {
                console.log(`   Raw response length: ${result.result.content[0].text.length} chars`);
            }
            return true;
        }
    } catch (error) {
        console.log(`❌ ${toolName} network error:`, error.message);
        return false;
    }
}

async function runTests() {
    console.log(`🚀 Testing Dota 2 MCP Tools with Steam Account ID: ${STEAM_ACCOUNT_ID}`);
    
    const tests = [
        ['dota.player.profile', { steamAccountId: STEAM_ACCOUNT_ID }],
        ['dota.player.matches', { steamAccountId: STEAM_ACCOUNT_ID, take: 5 }],
        ['dota.player.heroes', { steamAccountId: STEAM_ACCOUNT_ID, take: 5 }],
    ];
    
    let passed = 0;
    let total = tests.length;
    
    for (const [toolName, params] of tests) {
        const success = await testTool(toolName, params);
        if (success) passed++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
    
    console.log(`\n📊 Test Results: ${passed}/${total} tools working`);
    
    if (passed === total) {
        console.log(`✅ All tools are working correctly!`);
    } else {
        console.log(`⚠️  Some tools need fixing. Check GraphQL schema compatibility.`);
    }
}

runTests().catch(console.error);