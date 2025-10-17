# 🎙️ Eleven Labs Complete Setup Guide

## 📋 Rezumat Complet

Integrarea Eleven Labs Conversational AI cu Bedrock Agent este configurată astfel:

```
Eleven Labs Agent (Voice Layer)
    ↓ Custom Tool: "query_bedrock"
Bedrock Agent (Business Logic)
    ↓ Tools: query_app_server, create_appointment, etc.
RDS/DynamoDB (Data)
```

---

## 🚀 Setup Flow

### **Step 1: Create DynamoDB Table**

```bash
cd ai-agent-server
./scripts/create-elevenlabs-agents-table.sh
```

**Table**: `elevenlabs-agents`
- **PK**: businessId
- **SK**: locationId
- **Attributes**: enabled, agentId, voiceId, greeting, customPrompt, settings

---

### **Step 2: Configure Environment Variables**

```bash
# ai-agent-server/.env
ELEVENLABS_API_KEY=sk_your_global_api_key  # UN SINGUR KEY pentru toți tenanții
AI_AGENT_SERVER_URL=https://your-ai-agent-server.com
DYNAMODB_ELEVENLABS_AGENTS_TABLE=elevenlabs-agents
AWS_REGION=eu-central-1
```

---

### **Step 3: Activate pentru Tenant (API Call)**

```bash
POST /api/elevenlabs/activate/B0100001-L0100001
Content-Type: application/json

{
  # Optional - toate au defaults:
  "voiceId": "21m00Tcm4TlvDq8ikWAM",
  "greeting": "Custom greeting...",
  "customPrompt": "Custom instructions..."
}
```

**Ce se întâmplă:**
1. Fetch business info din DynamoDB (`business-info`)
2. Generate greeting automat (dacă nu e specificat)
3. Generate system prompt cu instrucțiuni pentru tool config
4. **Create agent pe Eleven Labs** (API call)
5. Save config în DynamoDB (`elevenlabs-agents`)
6. Log în Kinesis (`agent-log`)

**Response:**
```json
{
  "success": true,
  "agentId": "agent_xyz123abc",
  "message": "Eleven Labs conversational AI activated successfully"
}
```

---

### **Step 4: Configure Tools în Eleven Labs UI**

#### 4.1. Open Eleven Labs Dashboard
1. Navigate to: https://elevenlabs.io/app/conversational-ai
2. Find agent: `{businessName} - {locationName}`
3. Click "Edit Agent"

#### 4.2. Read System Prompt
- System prompt-ul conține secțiune:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ POST-CREATION CONFIGURATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Configure this Custom Client Tool:
Tool Name: "query_bedrock"
URL: https://your-server.com/api/elevenlabs/bedrock-query
Method: POST
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 4.3. Add Custom Client Tool
1. Go to **Workflow** section
2. Click **Add Tool** → **Client Tool**
3. Configure:

**Tool Configuration:**
```json
{
  "name": "query_bedrock",
  "description": "Communicate with Bedrock AI agent for all data queries and actions",
  "type": "webhook",
  "config": {
    "url": "https://your-ai-agent-server.com/api/elevenlabs/bedrock-query",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    }
  },
  "parameters": {
    "type": "object",
    "properties": {
      "message": {
        "type": "string",
        "description": "The user's request or question to send to Bedrock"
      },
      "conversationId": {
        "type": "string",
        "description": "Current conversation ID"
      },
      "metadata": {
        "type": "object",
        "properties": {
          "businessId": {
            "type": "string",
            "default": "B0100001"
          },
          "locationId": {
            "type": "string",
            "default": "L0100001"
          }
        }
      }
    },
    "required": ["message", "conversationId", "metadata"]
  }
}
```

4. **Save Tool**

#### 4.4. Test Tool
1. Use "Test Conversation" în Eleven Labs UI
2. Say: "Vreau o programare"
3. Agent ar trebui să apeleze `query_bedrock` tool
4. Verify în server logs că request-ul ajunge

---

## 🔄 Complete Integration Flow

### **Voice Call Example:**

```
┌─────────────────────────────────────────┐
│ Customer Phone Call                     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Eleven Labs Agent                       │
│ - Voice recognition (ASR)               │
│ - Understand intent                     │
│ - Decide to use tool                    │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Tool Call: query_bedrock                │
│ POST /api/elevenlabs/bedrock-query      │
│ {                                       │
│   message: "Check availability...",     │
│   conversationId: "conv_123",           │
│   metadata: { businessId, locationId }  │
│ }                                       │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Bridge Controller                       │
│ - Extract params                        │
│ - Get/create session                    │
│ - Call AgentService.processMessage()    │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Bedrock Agent                           │
│ - Understand request                    │
│ - Call tools: query_app_server          │
│ - Get availability from RDS             │
│ - Return structured response            │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Response to Eleven Labs                 │
│ {                                       │
│   success: true,                        │
│   response: "Available times: 10:00..." │
│ }                                       │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Eleven Labs TTS                         │
│ - Convert text to speech                │
│ - Stream to customer                    │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Customer hears response                 │
└─────────────────────────────────────────┘
```

---

## 📊 API Endpoints Summary

### **Admin Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/activate/:businessLocationId` | POST | Create agent on Eleven Labs + save to DynamoDB |
| `/deactivate/:businessLocationId` | DELETE | Disable agent (set enabled=false) |
| `/agents/:businessId` | GET | List all agents for business |
| `/status/:businessLocationId` | GET | Check agent status |
| `/test/:businessLocationId` | GET | Test configuration |

### **Business Owner Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/my-config/:businessLocationId` | GET | View configuration |
| `/my-config/:businessLocationId` | POST | Update greeting/prompt |
| `/toggle/:businessLocationId` | POST | Enable/disable agent |

### **System Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/bedrock-query` | POST | Tool call bridge (Eleven Labs → Bedrock) |
| `/webhook` | POST | Webhook events from Eleven Labs |

---

## 🔑 Key Concepts

### **1. Un singur API Key**
- Toate agent-urile pe același cont Eleven Labs
- API key în environment variable (`ELEVENLABS_API_KEY`)
- NU salvăm API key per tenant

### **2. Agent per Tenant**
- Fiecare `businessId-locationId` are propriul agent
- Config stocat în DynamoDB (`elevenlabs-agents`)
- Diferențiere prin `agentId` + `metadata.businessId`

### **3. Agent-to-Agent Communication**
- Eleven Labs (voice layer) ↔ Bedrock (business logic)
- Tool call: `query_bedrock` → bridge → Bedrock
- Session persistence prin `conversationId`

### **4. Logging Centralizat**
- Toate acțiunile loguite în Kinesis
- Resource type: `agent-log`
- Flow: Kinesis → Resources Server → Elixir → WebSocket → RDS

---

## 📚 Documentation Files

1. **ELEVENLABS_API_REFERENCE.md** - Complete API reference
2. **ELEVENLABS_BEDROCK_TOOL_CONFIGURATION.md** - Tool setup guide
3. **ELEVENLABS_USER_MANAGEMENT.md** - Admin vs Owner permissions
4. **ELEVENLABS_AGENT_CREATION.md** - Data sources explained
5. **DYNAMODB_ELEVENLABS_AGENTS.md** - DynamoDB schema
6. **EXTERNAL_API_LOGGING_AND_ELEVENLABS.md** - Overall integration
7. **ELEVENLABS_SETUP_GUIDE.md** - This file (complete setup)

---

## ✅ Checklist pentru Production

- [ ] Create DynamoDB table (`elevenlabs-agents`)
- [ ] Set environment variables (ELEVENLABS_API_KEY, AI_AGENT_SERVER_URL)
- [ ] Deploy ai-agent-server cu noile endpoint-uri
- [ ] Test activation: `POST /activate/B0100001-L0100001`
- [ ] Configure tool în Eleven Labs UI
- [ ] Test tool call în Eleven Labs test console
- [ ] Test real phone call
- [ ] Monitor Kinesis logs
- [ ] Verify WebSocket broadcast
- [ ] Check RDS pentru agent-log entries

---

**Setup complet! Ready for production! 🚀**

