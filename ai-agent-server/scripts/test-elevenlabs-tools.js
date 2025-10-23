#!/usr/bin/env node

/**
 * Script pentru testarea tool-urilor ElevenLabs create
 */

const axios = require('axios');
require('dotenv').config();

const AI_AGENT_SERVER_URL = process.env.AI_AGENT_SERVER_URL;

async function testQueryResources() {
  console.log('🧪 Testing query_resources tool...');
  
  try {
    const response = await axios.post(`${AI_AGENT_SERVER_URL}/api/elevenlabs/tools/execute`, {
      toolName: 'query_resources',
      parameters: {
        businessId: 'B0100001',
        locationId: 'L0100001',
        resourceType: 'patient',
        action: 'list',
        params: {
          'data.patientName': 'Ion Popescu',
          limit: '10'
        }
      },
      metadata: {
        businessId: 'B0100001',
        locationId: 'L0100001'
      }
    });
    
    console.log('✅ query_resources test successful');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ query_resources test failed:', error.response?.data || error.message);
  }
}

async function testQueryPatientBooking() {
  console.log('🧪 Testing query_patient_booking tool...');
  
  try {
    const response = await axios.post(`${AI_AGENT_SERVER_URL}/api/elevenlabs/tools/execute`, {
      toolName: 'query_patient_booking',
      parameters: {
        businessId: 'B0100001',
        locationId: 'L0100001',
        action: 'available-dates-with-slots',
        params: {
          from: '2024-12-01',
          to: '2024-12-31',
          serviceId: 'T0100001',
          medicId: 'M0100001'
        }
      },
      metadata: {
        businessId: 'B0100001',
        locationId: 'L0100001'
      }
    });
    
    console.log('✅ query_patient_booking test successful');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ query_patient_booking test failed:', error.response?.data || error.message);
  }
}

async function testLogCallCompletion() {
  console.log('🧪 Testing log_call_completion tool...');
  
  try {
    const response = await axios.post(`${AI_AGENT_SERVER_URL}/api/elevenlabs/tools/execute`, {
      toolName: 'log_call_completion',
      parameters: {
        businessId: 'B0100001',
        locationId: 'L0100001',
        conversationId: 'conv_test_123',
        callDuration: 180,
        cost: 350,
        startTime: 1739537297,
        status: 'completed',
        transcript: [
          {
            role: 'agent',
            message: 'Bună ziua! Cum vă pot ajuta?',
            timeInCallSecs: 0
          },
          {
            role: 'user',
            message: 'Vreau o programare pentru mâine.',
            timeInCallSecs: 5
          }
        ],
        metadata: {
          callType: 'appointment_booking',
          outcome: 'successful_booking'
        }
      },
      metadata: {
        businessId: 'B0100001',
        locationId: 'L0100001'
      }
    });
    
    console.log('✅ log_call_completion test successful');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ log_call_completion test failed:', error.response?.data || error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting ElevenLabs tools testing...');
  console.log(`📍 AI Agent Server URL: ${AI_AGENT_SERVER_URL}`);
  
  if (!AI_AGENT_SERVER_URL) {
    throw new Error('AI_AGENT_SERVER_URL environment variable is required');
  }

  try {
    await testQueryResources();
    console.log('');
    
    await testQueryPatientBooking();
    console.log('');
    
    await testLogCallCompletion();
    console.log('');
    
    console.log('🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Testing failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testQueryResources,
  testQueryPatientBooking,
  testLogCallCompletion,
  runAllTests
};
