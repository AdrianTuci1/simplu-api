#!/usr/bin/env node

/**
 * Script pentru activarea tool-urilor ElevenLabs pe agent
 */

const axios = require('axios');
require('dotenv').config();

const AI_AGENT_SERVER_URL = process.env.AI_AGENT_SERVER_URL;

async function activateToolsOnAgent(businessId, locationId, toolIds) {
  console.log(`🔧 Activating tools on agent for ${businessId}-${locationId}...`);
  
  try {
    const response = await axios.post(`${AI_AGENT_SERVER_URL}/api/elevenlabs/activate/${businessId}-${locationId}`, {
      toolIds: toolIds
    });
    
    console.log('✅ Tools activated successfully on agent');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Failed to activate tools on agent:', error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  const businessId = process.argv[2] || 'B0100001';
  const locationId = process.argv[3] || 'L0100001';
  
  // Tool IDs from the creation script output
  const toolIds = process.argv.slice(4);
  
  if (toolIds.length === 0) {
    console.log('Usage: node activate-elevenlabs-tools.js <businessId> <locationId> <toolId1> <toolId2> <toolId3>');
    console.log('Example: node activate-elevenlabs-tools.js B0100001 L0100001 tool_123 tool_456 tool_789');
    process.exit(1);
  }
  
  console.log(`🚀 Activating tools for ${businessId}-${locationId}`);
  console.log(`📋 Tool IDs: ${toolIds.join(', ')}`);
  
  try {
    await activateToolsOnAgent(businessId, locationId, toolIds);
    console.log('🎉 Tools activation completed!');
    
  } catch (error) {
    console.error('❌ Activation failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  activateToolsOnAgent
};
