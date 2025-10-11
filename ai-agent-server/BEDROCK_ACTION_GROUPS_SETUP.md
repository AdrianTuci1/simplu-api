# AWS Bedrock Action Groups - Ghid de Configurare Completă

## Prezentare Generală

Action Groups permit Bedrock Agent să apeleze funcții (tools) din aplicația ta pentru a executa acțiuni specifice. Fiecare Action Group trebuie configurat în AWS Console cu schema OpenAPI.

## 📋 Pași de Configurare

### Pasul 1: Accesează Bedrock Agent

1. Deschide **AWS Console**
2. Navighează la **Amazon Bedrock** → **Agents**
3. Selectează agent-ul tău (sau creează unul nou)
4. Click pe tab-ul **Action groups**

### Pasul 2: Creează Action Groups

Vei crea **3 Action Groups** principale:

---

## 🔧 Action Group 1: Query Tools (READ-ONLY)

**Scop**: Interogări read-only pentru date (appointments, patients, services, etc.)

### Configurare în AWS Console:

1. Click **Add Action Group**
2. Completează:
   - **Name**: `query_tools`
   - **Description**: `Read-only queries for business data including appointments, patients, services, and resources`
   - **Action group type**: `Define with API schemas`
   - **Action group invocation**: `Return control` (sau `Lambda` dacă vrei callback)
   - **Action group schema**: `Define with in-line OpenAPI schema editor`

3. **OpenAPI Schema** - copiază următoarea schemă:

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Query Tools API",
    "version": "1.0.0",
    "description": "Read-only queries for business data"
  },
  "paths": {
    "/query_app_server": {
      "post": {
        "summary": "Query app server for resources and patient booking data",
        "description": "READ-ONLY queries to app server. For modifications use call_frontend_function instead. Supports two modules: 1) PATIENT-BOOKING (for customers/patients) - Get available services, check time slots, view appointment history. 2) RESOURCES (for operators) - List and get resources (appointments, patients, treatments, medics, etc.)",
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
        "summary": "Query management server for business configuration",
        "description": "Queries the management server for business configuration, settings, subscriptions, invitations, and administrative data",
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
}
```

4. Click **Save**

---

## 🖥️ Action Group 2: Frontend Interaction Tools

**Scop**: Apelează funcții în frontend pentru modificări (CREATE, UPDATE, DELETE)

### Configurare în AWS Console:

1. Click **Add Action Group**
2. Completează:
   - **Name**: `frontend_tools`
   - **Description**: `Call JavaScript functions in frontend that handle API operations for creating, updating, and deleting resources`
   - **Action group type**: `Define with API schemas`
   - **Action group invocation**: `Return control`
   - **Action group schema**: `Define with in-line OpenAPI schema editor`

3. **OpenAPI Schema**:

```json
{
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
}
```

4. Click **Save**

---

## 📢 Action Group 3: Notification Tools

**Scop**: Trimite notificări și mesaje externe (Meta, Twilio, Email, WebSocket)

### Configurare în AWS Console:

1. Click **Add Action Group**
2. Completează:
   - **Name**: `notification_tools`
   - **Description**: `Send notifications and external messages via Meta, Twilio, Email, and WebSocket`
   - **Action group type**: `Define with API schemas`
   - **Action group invocation**: `Return control`
   - **Action group schema**: `Define with in-line OpenAPI schema editor`

3. **OpenAPI Schema**:

```json
{
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
}
```

4. Click **Save**

---

## 📚 Pasul 3: Asociază Knowledge Base la Agent

**De ce este necesar?** Knowledge Base permite agentului să acceseze:
- Documentație specifică business-ului (dental, gym, hotel)
- Instrucțiuni pentru operatori și clienți
- Structuri de date și configurări
- Context și best practices

### Configurare în AWS Console:

1. În pagina Agent-ului, mergi la tab-ul **Knowledge bases**
2. Click **Add** sau **Associate knowledge base**

### Opțiunea A: Creează Knowledge Base Nou

Dacă nu ai încă un Knowledge Base:

1. Click **Create and add knowledge base**
2. Completează:
   - **Name**: `simplu-dental-kb` (sau numele business-ului tău)
   - **Description**: `Knowledge base for dental clinic operations and documentation`
   - **IAM role**: Create new service role

3. **Data source configuration**:
   - **Data source type**: Amazon S3
   - **S3 URI**: `s3://your-bucket-name/dental/` (bucketul unde ai documentele)
   - **Chunking strategy**: Default (300 tokens with 20% overlap)

4. **Embeddings model**:
   - Selectează: `amazon.titan-embed-text-v2:0` (recomandat pentru cost/performanță)
   - Alternativ: `amazon.titan-embed-text-v1` sau `cohere.embed-english-v3`

5. **Vector database**:
   - **Recommended**: Amazon OpenSearch Serverless (Quick create)
   - Alternativ: Pinecone, Redis Enterprise, MongoDB Atlas

6. Click **Create knowledge base**

7. După creare, click **Sync** pentru a procesa documentele

8. **Copiază Knowledge Base ID** → `.env` la `BEDROCK_KNOWLEDGE_BASE_ID`

### Opțiunea B: Asociază Knowledge Base Existent

Dacă ai deja un Knowledge Base:

1. Click **Add existing knowledge base**
2. Selectează Knowledge Base-ul din listă
3. **Instructions for Agent** (opțional dar recomandat):
   ```
   Use this knowledge base to answer questions about:
   - Dental procedures and treatments
   - Appointment booking policies
   - Patient care instructions
   - Clinic operating procedures
   - Resource management guidelines
   
   Always cite the knowledge base when providing specific information about clinic policies or procedures.
   ```

4. Click **Associate**

### Verifică Documentele în S3

Asigură-te că ai documentele necesare în S3:

```bash
# Listează documentele din S3
aws s3 ls s3://your-bucket-name/dental/ --recursive

# Ar trebui să vezi:
# dental/_metadata.json
# dental/dental-customer-instructions.json
# dental/dental-operator-instructions.json
# dental/dental-resource-structure.json
# dental/dental-data-field-structure.json
# dental/dental-resource-setting.json
```

### Pregătește Documente pentru Knowledge Base

Dacă nu ai încă documentele în S3, rulează scriptul:

```bash
cd ai-agent-server

# Verifică documentele locale
ls data/kb-documents/dental/

# Sync documentele în S3 (dacă ai configurat scriptul)
./scripts/sync-kb-documents.sh dental

# SAU folosește setup-ul complet
./scripts/setup-s3-vectors-kb.sh
```

### Test Knowledge Base

După sincronizare, testează că funcționează:

1. În AWS Console → Bedrock → Knowledge bases
2. Selectează knowledge base-ul tău
3. Click pe **Test** tab
4. Introdu o întrebare: "Care sunt instrucțiunile pentru programări?"
5. Verifică că returnează rezultate relevante

### Configurează Agent să folosească Knowledge Base

1. În pagina Agent-ului, mergi la **Agent instructions**
2. Adaugă instrucțiuni despre când să folosească KB:

```
You are an AI assistant for a dental clinic management system.

When answering questions:
1. First check the knowledge base for clinic-specific policies and procedures
2. Use the knowledge base for information about:
   - Treatment types and procedures
   - Booking policies and availability rules
   - Patient care instructions
   - Data structures and field meanings
   
3. For real-time data (appointments, patients), use the query_app_server tool
4. For modifications (create, update, delete), use call_frontend_function tool
5. For notifications, use notification tools

Always prioritize accuracy. If unsure, ask for clarification rather than guessing.
```

3. Click **Save and exit**

### Monitorizare Knowledge Base Usage

În log-urile aplicației vei vedea când KB este folosit:

```
📚 Knowledge Base retrieved 3 references
```

În trace events vei vedea detalii:

```json
{
  "knowledgeBaseLookupOutput": {
    "retrievedReferences": [
      {
        "content": { "text": "..." },
        "location": { "s3Location": { "uri": "s3://..." } },
        "metadata": { ... }
      }
    ]
  }
}
```

---

## 🔄 Pasul 4: Configurează Return Control (Opțional)

Dacă ai ales **"Return control"** la Action group invocation, Bedrock va returna controlul aplicației tale când vrea să execute un tool. Trebuie să:

1. **Procesezi evenimentul `returnControl`** în `bedrock-agent.service.ts`
2. **Execuți tool-ul** folosind `ToolExecutorService`
3. **Răspunzi înapoi** la Bedrock cu rezultatul

### Opțiunea 1: Return Control (Recommended)

Avantaje:
- Mai mult control asupra execuției
- Logging detaliat în aplicația ta
- Posibilitate de validare înainte de execuție

Cod modificat în `bedrock-agent.service.ts`:

```typescript
if (event.returnControl) {
  // Agent is requesting to invoke an action group
  const invocationInputs = event.returnControl.invocationInputs;
  
  for (const input of invocationInputs) {
    if (input.actionGroupInvocationInput) {
      const { actionGroupName, function: functionName, parameters } = input.actionGroupInvocationInput;
      
      this.logger.log(`🔧 Bedrock requests tool execution: ${actionGroupName}::${functionName}`);
      
      // Execute tool locally
      const toolResult = await this.toolExecutorService.executeTool({
        toolName: functionName,
        parameters,
        context,
      });
      
      // Send result back to Bedrock (requires InvokeAgent with sessionState)
      // ... continue conversation with tool result
    }
  }
}
```

### Opțiunea 2: Lambda Function

Alternativ, poți configura un **AWS Lambda** care execută tools-urile:

1. Creează Lambda function
2. Configurează Action Group să folosească Lambda ARN
3. Lambda primește request de la Bedrock și execută tool-ul
4. Lambda returnează rezultatul la Bedrock

---

## 📊 Pasul 5: Prepare & Deploy Agent

După ce ai configurat toate Action Groups:

1. Click **Prepare** (în partea de sus a paginii Agent)
   - Aceasta compilează agent-ul cu noile Action Groups
   - Procesul durează ~1-2 minute

2. După prepare, verifică:
   - ✅ Agent status: **Prepared**
   - ✅ Action groups: 3 active
   - ✅ Knowledge base: Associated (dacă ai)

3. **Creează Alias** (pentru production):
   - Click **Create Alias**
   - Name: `production` sau `v1`
   - Associate cu versiunea pregătită
   - Copiază **Alias ID** în `.env` → `BEDROCK_AGENT_ALIAS_ID`

**Pentru testing**, poți folosi direct `TSTALIASID` (draft alias)

---

## 🧪 Pasul 6: Test Configurația

### Test în AWS Console:

1. Mergi la tab-ul **Test** din Bedrock Agent
2. Scrie un mesaj: "Vreau să văd lista de pacienți"
3. Verifică:
   - Agent invocă `query_app_server`
   - Trace arată tool call și rezultat
   - Răspunsul include date prelucrate

### Test în Aplicație:

```bash
# Start server
cd ai-agent-server
npm run start:dev

# Trimite mesaj
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "test-user-123",
    "session_id": "test-session",
    "message_id": "msg_1",
    "payload": {
      "content": "Câte programări am azi?"
    }
  }'
```

**Log-uri așteptate:**

```
📤 Invoking Bedrock Agent for session: test-session
📡 Bedrock response received, processing stream...
🔄 Starting to process event stream...
📦 Event received: ["trace"]
📊 Trace event received: { "orchestrationTrace": { ... }}
🔧 Tool called: query_tools -> query_app_server
📝 Tool parameters: { "module": "resources", "action": "list", ... }
✅ Tool output: {"success": true, "data": [...]}
✨ Stream processing complete. Tools used: 1, Actions: 0
🔧 Tools used in this invocation: ["query_tools:query_app_server"]
✅ Bedrock Agent invoked successfully in 2345ms
```

---

## 🔍 Troubleshooting

### Agent nu apelează tools

**Cauze posibile:**
1. Action Groups nu sunt **Prepared**
2. Schema OpenAPI are erori de sintaxă
3. Agent instructions nu menționează când să folosească tools
4. Knowledge Base răspunde suficient de bine

**Soluție:**
```bash
# Verifică agent status
aws bedrock-agent get-agent --agent-id YOUR_AGENT_ID

# Prepare agent din nou
aws bedrock-agent prepare-agent --agent-id YOUR_AGENT_ID
```

### Eroare: "Action group not found"

**Cauză:** Agent-ul nu a fost pregătit după adăugarea Action Groups

**Soluție:** Click **Prepare** în AWS Console

### Nu văd trace logs

**Cauză:** `enableTrace: true` nu este setat

**Verifică în cod:**
```typescript
const command = new InvokeAgentCommand({
  enableTrace: true, // ← Asigură-te că e true
  // ...
});
```

### Tool execution failed

**Verifică:**
1. **Permissions**: Agent role are acces la Lambda (dacă folosești)
2. **Schema mismatch**: Parametrii trimiși de agent match schema
3. **Network**: ai-agent-server e accesibil pentru Lambda
4. **API Keys**: Verifică `AI_SERVER_KEY` și alte credențiale

---

## 📚 Resurse Suplimentare

- **AWS Documentation**: [Bedrock Agents User Guide](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html)
- **OpenAPI Spec**: [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- **Project Docs**: 
  - `BEDROCK_SETUP.md` - Setup complet Bedrock
  - `QUICK_START.md` - Quick start guide
  - `src/modules/tools/README.md` - Tools architecture

---

## ✅ Checklist Final

- [ ] Agent creat în AWS Bedrock
- [ ] Action Group 1 (Query Tools) configurat cu schema OpenAPI
- [ ] Action Group 2 (Frontend Tools) configurat cu schema OpenAPI
- [ ] Action Group 3 (Notification Tools) configurat cu schema OpenAPI
- [ ] **Knowledge Base creat și asociat la Agent**
- [ ] **Documente sincronizate în S3**
- [ ] **Knowledge Base testat în AWS Console**
- [ ] Agent **Prepared** cu succes
- [ ] Alias creat și `BEDROCK_AGENT_ALIAS_ID` setat în `.env`
- [ ] `BEDROCK_AGENT_ID` setat în `.env`
- [ ] `BEDROCK_KNOWLEDGE_BASE_ID` setat în `.env`
- [ ] Test în AWS Console reușit (vezi tool calls și KB retrieval în trace)
- [ ] Test în aplicație reușit (vezi log-uri detaliate)

**Gata! 🎉** Acum Bedrock Agent poate apela toate tools-urile din aplicația ta!

