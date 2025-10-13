#!/usr/bin/env node

/**
 * Generate Action Group OpenAPI Schemas from Tool Definitions
 * 
 * Acest script extrage definițiile tools-urilor din cod și generează
 * schema-urile OpenAPI necesare pentru configurarea Action Groups în AWS Bedrock.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Generating Action Group OpenAPI Schemas...\n');

// Tool definitions (copied from actual tool files)
const queryTools = {
  "openapi": "3.0.0",
  "info": {
    "title": "Query Tools API",
    "version": "1.0.0",
    "description": "Read-only queries for business data"
  },
  "paths": {
    "/query_app_server": {
      "post": {
        "summary": "Query app server for real-time business data (services, appointments, patients, medics)",
        "description": "READ-ONLY queries for REAL-TIME BUSINESS DATA. Use this for: Services/treatments, Appointments, Patients, Medics, Time slots, Business settings. Two modules: 1) PATIENT-BOOKING - Get services (what treatments we offer), check time slots, view history. 2) RESOURCES - List/get appointments, patients, treatments, medics, settings. For modifications use call_frontend_function.",
        "operationId": "query_app_server",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["module", "action", "businessId", "locationId"],
                "properties": {
                  "module": {
                    "type": "string",
                    "enum": ["patient-booking", "resources"],
                    "description": "Module to query: patient-booking (for customers) or resources (for operators)"
                  },
                  "action": {
                    "type": "string",
                    "description": "READ-ONLY action: services, slots, history (patient-booking) or list, get (resources with resourceType)"
                  },
                  "businessId": {
                    "type": "string",
                    "description": "Business ID"
                  },
                  "locationId": {
                    "type": "string",
                    "description": "Location ID"
                  },
                  "resourceType": {
                    "type": "string",
                    "description": "Resource type (REQUIRED for resources module): appointment, patient, treatment, medic, service, etc."
                  },
                  "resourceId": {
                    "type": "string",
                    "description": "Resource ID (for get action only)"
                  },
                  "params": {
                    "type": "object",
                    "description": "Query parameters (filters, pagination, date ranges, etc.)"
                  },
                  "accessCode": {
                    "type": "string",
                    "description": "Patient access code (for patient-booking history)"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful query",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "data": {
                      "type": "object"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

const frontendTools = {
  "openapi": "3.0.0",
  "info": {
    "title": "Frontend Interaction Tools API",
    "version": "1.0.0",
    "description": "Tools for calling frontend functions that handle API operations"
  },
  "paths": {
    "/call_frontend_function": {
      "post": {
        "summary": "Call JavaScript functions in the frontend",
        "description": "Call JavaScript functions in the frontend that handle API operations. The frontend sends context with each message (current menu, edited resource). Based on conversation, AI calls frontend functions to complete actions. Common functions: createResource, updateResource, deleteResource, submitForm, navigateTo, selectResource, closeModal",
        "operationId": "call_frontend_function",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["functionName"],
                "properties": {
                  "functionName": {
                    "type": "string",
                    "description": "Function to call in frontend (createResource, updateResource, deleteResource, submitForm, navigateTo, selectResource, closeModal, etc.)"
                  },
                  "parameters": {
                    "type": "object",
                    "description": "Parameters to pass to the function",
                    "properties": {
                      "resourceType": {
                        "type": "string",
                        "description": "Resource type (appointment, patient, treatment, medic, service, etc.)"
                      },
                      "resourceId": {
                        "type": "string",
                        "description": "Resource ID (for update, delete, select)"
                      },
                      "data": {
                        "type": "object",
                        "description": "Data to create or update (resource fields)"
                      },
                      "view": {
                        "type": "string",
                        "description": "View to navigate to (appointments, patients, calendar, etc.)"
                      }
                    }
                  },
                  "businessId": {
                    "type": "string",
                    "description": "Business ID"
                  },
                  "locationId": {
                    "type": "string",
                    "description": "Location ID"
                  },
                  "sessionId": {
                    "type": "string",
                    "description": "Session ID"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Function call sent to frontend",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "data": {
                      "type": "object"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

const notificationTools = {
  "openapi": "3.0.0",
  "info": {
    "title": "Notification Tools API",
    "version": "1.0.0",
    "description": "Tools for sending notifications and external messages"
  },
  "paths": {
    "/send_external_message": {
      "post": {
        "summary": "Send external message via Meta WhatsApp, SMS, or Email",
        "description": "Send messages through external channels (WhatsApp via Meta, SMS via Twilio/SNS, Email via Gmail)",
        "operationId": "send_external_message",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["provider", "to", "message", "businessId"],
                "properties": {
                  "provider": {
                    "type": "string",
                    "enum": ["meta", "sms", "email"],
                    "description": "The external provider to use (meta for WhatsApp, sms for SMS, email for Gmail)"
                  },
                  "to": {
                    "type": "string",
                    "description": "Recipient phone number (for meta/sms) or email address (for email)"
                  },
                  "message": {
                    "type": "string",
                    "description": "The message content to send"
                  },
                  "subject": {
                    "type": "string",
                    "description": "Email subject (only for email provider)"
                  },
                  "businessId": {
                    "type": "string",
                    "description": "Business ID to use for credentials lookup"
                  },
                  "locationId": {
                    "type": "string",
                    "description": "Location ID (for email provider)"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Message sent successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "messageId": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/send_elixir_notification": {
      "post": {
        "summary": "Send notification to frontend via Elixir server",
        "description": "Send real-time notifications to frontend users through Elixir WebSocket server. Used for AI responses, drafts, and streaming chunks.",
        "operationId": "send_elixir_notification",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["businessId", "userId", "sessionId", "content"],
                "properties": {
                  "businessId": {
                    "type": "string",
                    "description": "Business ID (tenant_id)"
                  },
                  "userId": {
                    "type": "string",
                    "description": "User ID to notify"
                  },
                  "sessionId": {
                    "type": "string",
                    "description": "Session ID for the conversation"
                  },
                  "messageId": {
                    "type": "string",
                    "description": "Message ID (optional, auto-generated if not provided)"
                  },
                  "content": {
                    "type": "string",
                    "description": "The notification content/message"
                  },
                  "context": {
                    "type": "object",
                    "description": "Additional context data (actions, drafts, streaming info, etc.)"
                  },
                  "draft": {
                    "type": "object",
                    "description": "Draft data if creating/updating a draft"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Notification sent successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/broadcast_websocket_message": {
      "post": {
        "summary": "Broadcast message to WebSocket clients",
        "description": "Broadcasts a message to WebSocket clients connected to a specific business or user. Use this to send real-time updates, notifications, or AI responses to operators or customers.",
        "operationId": "broadcast_websocket_message",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["target", "event", "data"],
                "properties": {
                  "target": {
                    "type": "string",
                    "enum": ["business", "user"],
                    "description": "Broadcast target: \"business\" broadcasts to all business connections, \"user\" broadcasts to specific user"
                  },
                  "businessId": {
                    "type": "string",
                    "description": "Business ID to broadcast to (required if target is \"business\")"
                  },
                  "userId": {
                    "type": "string",
                    "description": "User ID to broadcast to (required if target is \"user\")"
                  },
                  "event": {
                    "type": "string",
                    "description": "Event name for the WebSocket message"
                  },
                  "data": {
                    "type": "object",
                    "description": "Payload data to send"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Broadcast sent successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "recipientCount": {
                      "type": "number"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

// Generate output directory
const outputDir = path.join(__dirname, '..', 'bedrock-schemas');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write schemas to files
const schemas = {
  'query-tools-schema.json': queryTools,
  'frontend-tools-schema.json': frontendTools,
  'notification-tools-schema.json': notificationTools,
};

console.log('📝 Writing schemas to files...\n');

Object.entries(schemas).forEach(([filename, schema]) => {
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(schema, null, 2));
  console.log(`✅ Generated: ${filename}`);
});

// Create combined schema for reference
const combinedSchema = {
  actionGroups: [
    {
      name: 'query_tools',
      description: 'Read-only queries for business data including appointments, patients, services, and resources',
      schema: queryTools,
    },
    {
      name: 'frontend_tools',
      description: 'Call JavaScript functions in frontend that handle API operations for creating, updating, and deleting resources',
      schema: frontendTools,
    },
    {
      name: 'notification_tools',
      description: 'Send notifications and external messages via Meta, Twilio, Email, and WebSocket',
      schema: notificationTools,
    },
  ],
};

const combinedFilepath = path.join(outputDir, 'all-action-groups.json');
fs.writeFileSync(combinedFilepath, JSON.stringify(combinedSchema, null, 2));
console.log(`✅ Generated: all-action-groups.json (combined reference)`);

console.log('\n📦 Output directory:', outputDir);
console.log('\n🎉 Action Group schemas generated successfully!');
console.log('\n📖 Next steps:');
console.log('1. Go to AWS Console → Bedrock → Agents');
console.log('2. Select your agent');
console.log('3. Add Action Groups and paste the schemas from:');
console.log(`   - ${path.join(outputDir, 'query-tools-schema.json')}`);
console.log(`   - ${path.join(outputDir, 'frontend-tools-schema.json')}`);
console.log(`   - ${path.join(outputDir, 'notification-tools-schema.json')}`);
console.log('\n📚 See BEDROCK_ACTION_GROUPS_SETUP.md for detailed instructions');

