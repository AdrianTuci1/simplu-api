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
        "description": "READ-ONLY queries for REAL-TIME BUSINESS DATA. Use this for: Services/treatments, Appointments, Patients, Medics, Time slots. DO NOT use query_management_server for these! Two modules: 1) PATIENT-BOOKING - Get services (what treatments we offer), check time slots, view history. 2) RESOURCES - List/get appointments, patients, treatments, medics. For modifications use call_frontend_function.",
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
    },
    "/query_management_server": {
      "post": {
        "summary": "Query management server for business CONFIGURATION ONLY (NOT for services/appointments/patients)",
        "description": "Use ONLY for business CONFIGURATION and SETTINGS. DO NOT use for: services/treatments (use query_app_server patient-booking), appointments (use query_app_server resources), patients (use query_app_server), medics (use query_app_server). USE ONLY for: Business settings, Subscriptions, User invitations, Administrative config.",
        "operationId": "query_management_server",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["endpoint", "method"],
                "properties": {
                  "endpoint": {
                    "type": "string",
                    "description": "The API endpoint to query (e.g., /api/businesses, /api/subscriptions)"
                  },
                  "method": {
                    "type": "string",
                    "enum": ["GET", "POST", "PUT", "PATCH", "DELETE"],
                    "description": "HTTP method to use"
                  },
                  "params": {
                    "type": "object",
                    "description": "Query parameters for GET requests"
                  },
                  "body": {
                    "type": "object",
                    "description": "Request body for POST/PUT/PATCH requests"
                  },
                  "tenantId": {
                    "type": "string",
                    "description": "Business ID (tenant ID) for multi-tenant queries"
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
        "summary": "Send external message via Meta, Twilio, or Email",
        "description": "Send messages through external channels (Meta WhatsApp, Twilio SMS, Gmail)",
        "operationId": "send_external_message",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["channel", "recipient", "message"],
                "properties": {
                  "channel": {
                    "type": "string",
                    "enum": ["meta", "twilio", "gmail"],
                    "description": "Communication channel to use"
                  },
                  "recipient": {
                    "type": "string",
                    "description": "Recipient identifier (phone number or email)"
                  },
                  "message": {
                    "type": "string",
                    "description": "Message content to send"
                  },
                  "businessId": {
                    "type": "string",
                    "description": "Business ID"
                  },
                  "metadata": {
                    "type": "object",
                    "description": "Additional metadata for the message"
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
        "description": "Send real-time notifications to frontend users through Elixir WebSocket server",
        "operationId": "send_elixir_notification",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["businessId", "userId", "message"],
                "properties": {
                  "businessId": {
                    "type": "string",
                    "description": "Business ID"
                  },
                  "userId": {
                    "type": "string",
                    "description": "User ID to notify"
                  },
                  "message": {
                    "type": "string",
                    "description": "Notification message"
                  },
                  "notificationType": {
                    "type": "string",
                    "description": "Type of notification (info, success, warning, error)"
                  },
                  "metadata": {
                    "type": "object",
                    "description": "Additional notification data"
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
        "summary": "Broadcast message to multiple WebSocket clients",
        "description": "Send broadcast messages to all connected clients or specific rooms",
        "operationId": "broadcast_websocket_message",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["businessId", "message"],
                "properties": {
                  "businessId": {
                    "type": "string",
                    "description": "Business ID"
                  },
                  "locationId": {
                    "type": "string",
                    "description": "Location ID (optional, for specific location)"
                  },
                  "message": {
                    "type": "string",
                    "description": "Broadcast message content"
                  },
                  "event": {
                    "type": "string",
                    "description": "WebSocket event name"
                  },
                  "targetUsers": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    },
                    "description": "Optional list of specific user IDs to broadcast to"
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

