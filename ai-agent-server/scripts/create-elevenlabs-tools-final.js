#!/usr/bin/env node

/**
 * Script pentru crearea tool-urilor ElevenLabs – VERSIUNEA FINALĂ CORECTATĂ
 * Schema respectată conform documentaţiei ElevenLabs
 */

const axios = require('axios');
require('dotenv').config();

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/convai/tools';

if (!process.env.ELEVENLABS_API_KEY) {
  throw new Error('ELEVENLABS_API_KEY environment variable is required');
}
if (!process.env.AI_AGENT_SERVER_URL) {
  throw new Error('AI_AGENT_SERVER_URL environment variable is required');
}

// Tool: query_resources
const queryResourcesToolConfig = {
  type: "webhook",
  name: "query_resources",
  description: "Query medical resources: patients, treatments, medics. Use this to search for patients by name, list treatments by type, or find available doctors.",
  response_timeout_secs: 20,
  disable_interruptions: false,
  force_pre_tool_speech: false,
  tool_call_sound: "typing",
  tool_call_sound_behavior: "auto",
  assignments: [],
  api_schema: {
    url: process.env.AI_AGENT_SERVER_URL + "/api/elevenlabs/tools/execute",
    method: "POST",
    request_body_schema: {
      type: "object",
      required: ["toolName", "parameters", "metadata"],
      description: "Query medical resources using existing /resources endpoint",
      properties: {
        toolName: {
          type: "string",
          description: "Tool name"
        },
        parameters: {
          type: "object",
          description: "Tool parameters",
          properties: {
            businessId: { type: "string", description: "Business identifier" },
            locationId: { type: "string", description: "Location identifier" },
            resourceType: { type: "string", description: "Type of resource to query", enum: ["patient", "treatment", "medic"] },
            action: { type: "string", description: "Action to perform" },
            params: {
              type: "object",
              description: "Search parameters",
              properties: {
                "data.patientName": { type: "string", description: "Patient name to search for (use when resourceType is 'patient')" },
                "data.treatmentType": { type: "string", description: "Treatment name to filter by (use when resourceType is 'treatment')" },
                "data.medicName": { type: "string", description: "Doctor name to search for (use when resourceType is 'medic')" },
                limit: { type: "integer", description: "Maximum number of results (default: 60)" }
              }
            }
          },
          required: ["businessId", "locationId", "resourceType", "action", "params"]
        },
        metadata: {
          type: "object",
          description: "Metadata for tenant identification",
          properties: {
            businessId: { type: "string", description: "Business identifier" },
            locationId: { type: "string", description: "Location identifier" }
          },
          required: ["businessId", "locationId"]
        }
      }
    },
    request_headers: {},
    auth_connection: null
  },
  dynamic_variables: {
    dynamic_variable_placeholders: {}
  },
  execution_mode: "immediate"
};

// Tool: query_patient_booking
const queryBookingToolConfig = {
  type: "webhook",
  name: "query_patient_booking",
  description: "Manage patient appointments: check availability, create bookings, cancel appointments. Essential for appointment management.",
  response_timeout_secs: 20,
  disable_interruptions: false,
  force_pre_tool_speech: false,
  tool_call_sound: "typing",
  tool_call_sound_behavior: "auto",
  assignments: [],
  api_schema: {
    url: process.env.AI_AGENT_SERVER_URL + "/api/elevenlabs/tools/execute",
    method: "POST",
    request_body_schema: {
      type: "object",
      required: ["toolName", "parameters", "metadata"],
      description: "Manage patient appointments using existing booking endpoints",
      properties: {
        toolName: { type: "string", description: "Tool name" },
        parameters: {
          type: "object",
          description: "Tool parameters",
          properties: {
            businessId: { type: "string", description: "Business identifier" },
            locationId: { type: "string", description: "Location identifier" },
            action: { type: "string", description: "Booking action to perform", enum: ["available-dates-with-slots", "reserve", "cancel-appointment"] },
            params: {
              type: "object",
              description: "Action parameters",
              properties: {
                from: { type: "string", description: "Start date for availability search (YYYY-MM-DD)" },
                to: { type: "string", description: "End date for availability search (YYYY-MM-DD)" },
                serviceId: { type: "string", description: "Service/treatment ID" },
                medicId: { type: "string", description: "Doctor/medic ID" },
                date: { type: "string", description: "Appointment date (YYYY-MM-DD)" },
                time: { type: "string", description: "Appointment time (HH:mm)" },
                duration: { type: "integer", description: "Appointment duration in minutes" },
                customer: {
                  type: "object",
                  description: "Customer information",
                  properties: {
                    name: { type: "string", description: "Customer name" },
                    email: { type: "string", description: "Customer email" },
                    phone: { type: "string", description: "Customer phone number" }
                  },
                  required: ["name", "phone"]
                },
                appointmentId: { type: "string", description: "Appointment ID (for cancel)" },
                patientId: { type: "string", description: "Patient ID (for cancel)" },
                accessCode: { type: "string", description: "Patient access code (for cancel)" }
              }
            }
          },
          required: ["businessId", "locationId", "action", "params"]
        },
        metadata: {
          type: "object",
          description: "Metadata for tenant identification",
          properties: {
            businessId: { type: "string", description: "Business identifier" },
            locationId: { type: "string", description: "Location identifier" }
          },
          required: ["businessId", "locationId"]
        }
      }
    },
    request_headers: {},
    auth_connection: null
  },
  dynamic_variables: {
    dynamic_variable_placeholders: {}
  },
  execution_mode: "immediate"
};

// Tool: log_call_completion
const logCallCompletionToolConfig = {
  type: "webhook",
  name: "log_call_completion",
  description: "Log completed voice calls with metadata. This tool is called automatically when a call ends.",
  response_timeout_secs: 20,
  disable_interruptions: false,
  force_pre_tool_speech: false,
  tool_call_sound: "typing",
  tool_call_sound_behavior: "auto",
  api_schema: {
    url: `${process.env.AI_AGENT_SERVER_URL}/api/elevenlabs/tools/execute`,
    method: "POST",
    request_body_schema: {
      type: "object",
      description: "Schema for logging completed calls",
      required: ["toolName", "parameters", "metadata"],
      properties: {
        toolName: { type: "string", description: "Tool name" },
        parameters: {
          type: "object",
          description: "Call logging parameters",
          required: ["businessId", "locationId", "conversationId", "callDuration", "status"],
          properties: {
            businessId: { type: "string", description: "Business identifier" },
            locationId: { type: "string", description: "Location identifier" },
            conversationId: { type: "string", description: "ElevenLabs conversation ID" },
            callDuration: { type: "integer", description: "Call duration in seconds" },
            cost: { type: "number", description: "Call cost in ElevenLabs units" },
            startTime: { type: "integer", description: "Call start time (Unix timestamp)" },
            status: { type: "string", description: "Call completion status", enum: ["completed", "failed", "abandoned"] },
            transcript: {
              type: "array",
              description: "Full transcript of the call",
              items: {
                type: "object",
                properties: {
                  role: { type: "string", enum: ["agent", "user"], description: "Who spoke this line" },
                  message: { type: "string", description: "Message content" },
                  timeInCallSecs: { type: "number", description: "When this message occurred" }
                }
              }
            },
            metadata: {
              type: "object",
              description: "Additional call metadata"
            }
          }
        },
        metadata: {
          type: "object",
          description: "Metadata for tenant identification",
          required: ["businessId", "locationId"],
          properties: {
            businessId: { type: "string", description: "Business identifier" },
            locationId: { type: "string", description: "Location identifier" }
          }
        }
      }
    }
  },
  execution_mode: "immediate"
};



async function createTool(toolConfig, toolName) {
  console.log(`🔧 Creating ElevenLabs tool: ${toolName}`);
  try {
    const response = await axios.post(
      ELEVENLABS_API_URL,
      { tool_config: toolConfig },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`✅ Tool created successfully: ${toolName}`);
    console.log(`📋 Tool ID: ${response.data.id}`);
    console.log(`🔗 Tool URL: ${toolConfig.api_schema.url}`);
    return {
      name: toolName,
      id: response.data.id,
      url: toolConfig.api_schema.url
    };
  } catch (error) {
    console.error(`❌ Failed to create tool ${toolName}:`, error.response?.data || error.message);
    throw error;
  }
}

async function createAllTools() {
  console.log('🚀 Starting ElevenLabs tools creation...');
  console.log(`📍 AI Agent Server URL: ${process.env.AI_AGENT_SERVER_URL}`);

  const results = [];
  try {
    const r1 = await createTool(logCallCompletionToolConfig, 'log_call_completion');
    results.push(r1);

    console.log('\n🎉 All tools created successfully!');
    console.log('\n📋 Tool IDs for configuration:');
    const idsMap = {
      log_call_completion: r1.id
    };
    console.log(JSON.stringify(idsMap, null, 2));
    console.log('\n🔧 Next steps:');
    console.log('1. Use these tool IDs in your agent configuration');
    console.log('2. Configure webhook for call completion:');
    console.log(`   Event: post_call_transcription`);
    console.log(`   URL: ${process.env.AI_AGENT_SERVER_URL}/api/elevenlabs/webhook`);

  } catch (err) {
    console.error('❌ Tool creation failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  createAllTools().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  createTool,
  createAllTools,
  logCallCompletionToolConfig
};
