# 🎙️ Eleven Labs API Reference

## Endpoint Overview

Format consistent: **`:businessLocationId`** = `B0100001-L0100001`

---

## 🔐 Admin Endpoints

### **1. Activate (Create Agent)**

```http
POST /api/elevenlabs/activate/:businessLocationId
```

**Description**: Creează agent pe Eleven Labs și salvează config în DynamoDB

**Example**:
```bash
POST /api/elevenlabs/activate/B0100001-L0100001
Content-Type: application/json

{
  "voiceId": "21m00Tcm4TlvDq8ikWAM",  # Optional
  "greeting": "Custom greeting...",    # Optional
  "customPrompt": "Custom prompt..."   # Optional
}
```

**Response**:
```json
{
  "success": true,
  "agentId": "agent_xyz123abc",
  "message": "Eleven Labs conversational AI activated successfully"
}
```

**Ce face**:
1. Obține business info din DynamoDB (`business-info`)
2. Generează greeting și voice automat (dacă nu sunt specificate)
3. Creează agent pe Eleven Labs (API call)
4. Salvează config în DynamoDB (`elevenlabs-agents`)
5. Log în Kinesis (`agent-log`)

---

### **2. Deactivate**

```http
DELETE /api/elevenlabs/deactivate/:businessLocationId
```

**Example**:
```bash
DELETE /api/elevenlabs/deactivate/B0100001-L0100001
```

**Response**:
```json
{
  "success": true,
  "message": "Eleven Labs conversational AI deactivated successfully"
}
```

**Ce face**:
- Set `enabled: false` în DynamoDB
- Păstrează `agentId` pentru reactivare
- NU șterge agent-ul de pe Eleven Labs

---

### **3. List All Agents for Business**

```http
GET /api/elevenlabs/agents/:businessId
```

**Example**:
```bash
GET /api/elevenlabs/agents/B0100001
```

**Response**:
```json
{
  "success": true,
  "count": 2,
  "agents": [
    {
      "businessLocationId": "B0100001-L0100001",
      "locationId": "L0100001",
      "enabled": true,
      "agentId": "agent_xyz123",
      "voiceId": "21m00Tcm4TlvDq8ikWAM",
      "greeting": "Bună ziua!...",
      "conversationSettings": {
        "maxDuration": 300,
        "recordCalls": true,
        "sendTranscripts": false
      },
      "createdAt": "2025-10-15T10:00:00Z",
      "updatedAt": "2025-10-15T12:00:00Z"
    },
    {
      "businessLocationId": "B0100001-L0100002",
      "locationId": "L0100002",
      "enabled": false,
      ...
    }
  ]
}
```

---

### **4. Status Check (Debug)**

```http
GET /api/elevenlabs/status/:businessLocationId
```

**Example**:
```bash
GET /api/elevenlabs/status/B0100001-L0100001
```

**Response**:
```json
{
  "businessLocationId": "B0100001-L0100001",
  "enabled": true,
  "config": {
    "agentId": "agent_xyz123",
    "voiceId": "21m00Tcm4TlvDq8ikWAM",
    "greeting": "...",
    "conversationSettings": { ... }
  }
}
```

---

### **5. Test Configuration**

```http
GET /api/elevenlabs/test/:businessLocationId
```

**Example**:
```bash
GET /api/elevenlabs/test/B0100001-L0100001
```

**Response**:
```json
{
  "success": true,
  "message": "Eleven Labs is properly configured and enabled",
  "businessLocationId": "B0100001-L0100001",
  "config": {
    "agentId": "agent_xyz123",
    "voiceId": "21m00Tcm4TlvDq8ikWAM",
    "enabled": true
  }
}
```

---

## 👥 Business Owner Endpoints

### **1. Get My Configuration**

```http
GET /api/elevenlabs/my-config/:businessLocationId
```

**Description**: Vezi configurația curentă (pentru UI)

**Example**:
```bash
GET /api/elevenlabs/my-config/B0100001-L0100001
```

**Response** (configured):
```json
{
  "configured": true,
  "enabled": true,
  "greeting": "Bună ziua! Sunt asistentul virtual...",
  "customPrompt": "You are a helpful dental assistant...",
  "voiceId": "21m00Tcm4TlvDq8ikWAM",
  "conversationSettings": {
    "maxDuration": 300,
    "recordCalls": true,
    "sendTranscripts": false
  },
  "createdAt": "2025-10-15T10:00:00Z",
  "updatedAt": "2025-10-15T12:30:00Z"
}
```

**Response** (NOT configured):
```json
{
  "configured": false,
  "enabled": false,
  "message": "Eleven Labs not configured for this location. Contact admin to activate."
}
```

**Frontend Use Case**:
```typescript
const config = await fetch(`/api/elevenlabs/my-config/${businessLocationId}`);

if (!config.configured) {
  // Show: "Contact support to activate"
} else {
  // Show toggle, greeting field, prompt field
}
```

---

### **2. Update My Configuration**

```http
POST /api/elevenlabs/my-config/:businessLocationId
```

**Description**: Modifică greeting, prompt, settings

**Example**:
```bash
POST /api/elevenlabs/my-config/B0100001-L0100001
Content-Type: application/json

{
  "greeting": "Salutare! Cum vă pot ajuta?",
  "customPrompt": "You are a friendly dental assistant...",
  "conversationSettings": {
    "maxDuration": 600,
    "recordCalls": true,
    "sendTranscripts": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Configuration updated successfully"
}
```

**Ce poate modifica**:
- ✅ `greeting`
- ✅ `customPrompt`
- ✅ `conversationSettings`
- ❌ `voiceId` (NU)
- ❌ `agentId` (read-only)

---

### **3. Toggle Enable/Disable**

```http
POST /api/elevenlabs/toggle/:businessLocationId
```

**Description**: Enable/Disable rapid fără recreare agent

**Example**:
```bash
POST /api/elevenlabs/toggle/B0100001-L0100001
Content-Type: application/json

{
  "enabled": true  # or false
}
```

**Response** (success):
```json
{
  "success": true,
  "message": "Eleven Labs conversational AI reactivated successfully"
}
```

**Response** (not configured):
```json
{
  "success": false,
  "message": "Agent not configured yet. Please activate first (admin only)."
}
```

**Frontend Use Case**:
```typescript
<Toggle
  checked={config.enabled}
  onChange={async (enabled) => {
    await fetch(`/api/elevenlabs/toggle/B0100001-L0100001`, {
      method: 'POST',
      body: JSON.stringify({ enabled })
    });
  }}
/>
```

---

## 🔄 Eleven Labs → Bedrock Bridge

### **1. Bedrock Query Tool Endpoint**

```http
POST /api/elevenlabs/bedrock-query
```

**Description**: Tool call de la Eleven Labs către Bedrock Agent

**Request** (de la Eleven Labs tool):
```json
{
  "message": "Check availability for tomorrow at 10:00",
  "conversationId": "conv_abc123",
  "metadata": {
    "businessId": "B0100001",
    "locationId": "L0100001"
  }
}
```

**Response** (către Eleven Labs):
```json
{
  "success": true,
  "response": "Da, avem disponibilitate mâine la 10:00, 10:30 și 11:00.",
  "actions": []
}
```

**Processing Flow**:
1. Extract businessId, locationId, conversationId
2. Verify Eleven Labs is enabled
3. Get/create session (conversationId = sessionId)
4. Call `AgentService.processMessage()` → Bedrock
5. Log la Kinesis
6. Return response

---

### **2. Webhook Handler**

```http
POST /api/elevenlabs/webhook
```

**Description**: Webhook de la Eleven Labs pentru evenimente

**Events**:
- `message` - mesaj nou de procesat
- `conversation_start` - conversație începută
- `conversation_end` - conversație încheiată

**Request Example** (message event):
```json
{
  "event": "message",
  "conversationId": "conv_123",
  "message": {
    "content": "Vreau o programare"
  },
  "metadata": {
    "businessId": "B0100001",
    "locationId": "L0100001"
  },
  "duration": 5
}
```

**Response**:
```json
{
  "response": "Desigur! Pentru ce dată doriți programarea?",
  "continueConversation": true,
  "actions": []
}
```

---

## 📊 Complete API Flow Examples

### **Example 1: Admin Setup**

```bash
# 1. Activate
POST /api/elevenlabs/activate/B0100001-L0100001
{}

# Response:
{
  "success": true,
  "agentId": "agent_xyz123",
  "message": "Eleven Labs conversational AI activated successfully"
}

# 2. Admin configurează tool-urile în Eleven Labs UI
# - Adaugă custom tool "query_bedrock"
# - URL: https://ai-server.com/api/elevenlabs/bedrock-query

# 3. Test
GET /api/elevenlabs/test/B0100001-L0100001

# Response:
{
  "success": true,
  "message": "Eleven Labs is properly configured and enabled"
}
```

---

### **Example 2: Business Owner Usage**

```bash
# 1. Check configuration
GET /api/elevenlabs/my-config/B0100001-L0100001

# Response:
{
  "configured": true,
  "enabled": true,
  "greeting": "Bună ziua!...",
  ...
}

# 2. Update greeting
POST /api/elevenlabs/my-config/B0100001-L0100001
{
  "greeting": "Salutare! Cum te pot ajuta?"
}

# 3. Disable temporarily
POST /api/elevenlabs/toggle/B0100001-L0100001
{
  "enabled": false
}

# 4. Re-enable
POST /api/elevenlabs/toggle/B0100001-L0100001
{
  "enabled": true
}
```

---

### **Example 3: Voice Call Flow**

```bash
# Customer sună → Eleven Labs răspunde
# Customer: "Vreau o programare"

# Eleven Labs apelează tool:
POST /api/elevenlabs/bedrock-query
{
  "message": "Customer wants to book an appointment",
  "conversationId": "conv_123",
  "metadata": {
    "businessId": "B0100001",
    "locationId": "L0100001"
  }
}

# Bedrock procesează → răspunde:
{
  "success": true,
  "response": "Desigur! Pentru ce dată doriți?"
}

# Eleven Labs citește răspunsul vocal
```

---

## 🔑 Environment Variables

```bash
# AI Agent Server
ELEVENLABS_API_KEY=sk_your_global_api_key
AI_AGENT_SERVER_URL=https://your-ai-agent-server.com
DYNAMODB_ELEVENLABS_AGENTS_TABLE=elevenlabs-agents
```

---

## 📋 Quick Reference

| Endpoint | Method | Role | Purpose |
|----------|--------|------|---------|
| `/activate/:businessLocationId` | POST | Admin | Create agent |
| `/deactivate/:businessLocationId` | DELETE | Admin | Disable agent |
| `/agents/:businessId` | GET | Admin | List all agents |
| `/status/:businessLocationId` | GET | Admin | Debug status |
| `/test/:businessLocationId` | GET | Admin | Test config |
| `/my-config/:businessLocationId` | GET | Owner | View config |
| `/my-config/:businessLocationId` | POST | Owner | Update config |
| `/toggle/:businessLocationId` | POST | Owner | Enable/disable |
| `/bedrock-query` | POST | System | Tool call bridge |
| `/webhook` | POST | System | Eleven Labs events |

---

**All endpoints ready! 🚀**

