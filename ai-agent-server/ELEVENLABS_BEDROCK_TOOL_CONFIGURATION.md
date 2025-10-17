# 🔧 Eleven Labs → Bedrock Tool Configuration Guide

## Overview

După ce creezi agent-ul prin API, trebuie să-l configurezi manual în **Eleven Labs UI** pentru a comunica cu **Bedrock Agent**.

---

## 🎯 Flow Complet

```
1. Admin apelează API pentru creare agent
   POST /api/elevenlabs/activate/:businessId
   → Agent creat pe Eleven Labs cu system prompt care include instrucțiuni

2. Admin deschide Eleven Labs UI
   → Găsește agent-ul creat
   → Configurează Custom Tools (vezi mai jos)

3. Customer sună
   → Eleven Labs Agent răspunde
   → Pentru orice query → apelează tool "query_bedrock"
   → Bedrock procesează → răspunde
   → Eleven Labs citește răspunsul vocal

4. Conversația continuă
   → Multiple tool calls dacă e necesar
   → Bedrock ține session state
   → Eleven Labs gestionează voice interaction
```

---

## ⚙️ Custom Tools Configuration în Eleven Labs UI

### **Tool 1: query_bedrock** (Main Tool)

**Name**: `query_bedrock`

**Description**: 
```
Query the Bedrock AI agent for any information or action. 
Use this tool for checking availability, getting service information, 
creating appointments, or any other business operation.
```

**Configuration**:
```json
{
  "type": "webhook",
  "webhook": {
    "url": "https://your-ai-agent-server.com/api/elevenlabs/bedrock-query",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    }
  },
  "parameters": [
    {
      "name": "message",
      "type": "string",
      "required": true,
      "description": "The user's question or request to send to Bedrock"
    },
    {
      "name": "conversationId",
      "type": "string",
      "required": true,
      "description": "Current conversation ID"
    },
    {
      "name": "metadata",
      "type": "object",
      "required": true,
      "description": "Business context",
      "properties": {
        "businessId": { "type": "string" },
        "locationId": { "type": "string" }
      }
    }
  ],
  "response": {
    "type": "object",
    "properties": {
      "success": { "type": "boolean" },
      "response": { "type": "string" },
      "actions": { "type": "array" }
    }
  }
}
```

---

### **Tool 2: check_availability** (Optional - Shortcut)

**Name**: `check_availability`

**Description**: 
```
Quick check for appointment availability on a specific date and time.
```

**Configuration**:
```json
{
  "type": "webhook",
  "webhook": {
    "url": "https://your-ai-agent-server.com/api/elevenlabs/bedrock-query",
    "method": "POST"
  },
  "parameters": [
    {
      "name": "message",
      "type": "string",
      "required": true,
      "description": "Availability query (e.g., 'Check availability for tomorrow at 10:00')"
    },
    {
      "name": "conversationId",
      "type": "string",
      "required": true
    },
    {
      "name": "metadata",
      "type": "object",
      "required": true
    }
  ]
}
```

---

### **Tool 3: create_booking** (Optional - Shortcut)

**Name**: `create_booking`

**Description**: 
```
Create a new appointment/booking with all required details.
```

**Configuration**:
```json
{
  "type": "webhook",
  "webhook": {
    "url": "https://your-ai-agent-server.com/api/elevenlabs/bedrock-query",
    "method": "POST"
  },
  "parameters": [
    {
      "name": "message",
      "type": "string",
      "required": true,
      "description": "Complete booking details (name, phone, date, time, service)"
    },
    {
      "name": "conversationId",
      "type": "string",
      "required": true
    },
    {
      "name": "metadata",
      "type": "object",
      "required": true
    }
  ]
}
```

---

## 🔄 Tool Call Examples

### **Single Tool Call**

```
User: "Ce program aveți mâine?"

Eleven Labs Agent:
1. Recunoaște nevoia de informație
2. Apelează tool: query_bedrock
   {
     "message": "What are the business hours for tomorrow?",
     "conversationId": "conv_123",
     "metadata": {
       "businessId": "B0100001",
       "locationId": "L0100001"
     }
   }
3. Primește răspuns de la Bedrock:
   {
     "success": true,
     "response": "Mâine suntem deschiși de la 9:00 la 18:00."
   }
4. Răspunde vocal: "Mâine suntem deschiși de la 9 dimineața până la 6 seara."
```

---

### **Multiple Tool Calls** (Conversation Flow)

```
User: "Vreau o programare"

Step 1: Collect information
Agent: "Desigur! Pentru ce dată doriți programarea?"
User: "Mâine la 10"

Step 2: Check availability
Agent: [Call query_bedrock]
  {
    "message": "Check availability for tomorrow at 10:00",
    "conversationId": "conv_123",
    "metadata": { ... }
  }
  
Bedrock răspunde:
  {
    "success": true,
    "response": "Available slots: 10:00, 10:30, 11:00"
  }

Agent: "Da, avem liber mâine la 10. Cum vă numiți?"
User: "Ion Popescu"

Agent: "Și numărul de telefon?"
User: "0712345678"

Step 3: Create appointment
Agent: [Call query_bedrock]
  {
    "message": "Create appointment for Ion Popescu on 2025-10-16 at 10:00, phone 0712345678",
    "conversationId": "conv_123",
    "metadata": { ... }
  }
  
Bedrock răspunde:
  {
    "success": true,
    "response": "Appointment created successfully with ID AP-001. Confirmation SMS sent.",
    "actions": [
      {
        "type": "appointment_created",
        "appointmentId": "AP-001"
      }
    ]
  }

Agent: "Perfect! V-am înregistrat programarea pentru mâine la 10. Veți primi o confirmare prin SMS la numărul 0712345678."
```

---

## 📋 System Prompt Structure

System prompt-ul generat automat include:

### **1. Agent Behavior** (Public)
- Rol și responsabilități
- Tipul de business (dental/gym/hotel)
- Guidelines pentru conversații vocale

### **2. Tool Configuration Instructions** (For Admin)
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ CONFIGURATION INSTRUCTIONS FOR ADMIN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After creating this agent, configure these Custom Tools:

1️⃣ TOOL: "query_bedrock"
   URL: https://your-server.com/api/elevenlabs/bedrock-query
   Method: POST
   Parameters:
   - message (string, required)
   - conversationId (string, required)
   - metadata (object, required)
   
   Use for: ALL queries and actions

IMPORTANT RULES:
- ALWAYS use tool for booking/availability queries
- DO NOT make up information
- Bedrock handles all business logic
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔌 Bridge Endpoint Implementation

### **POST `/api/elevenlabs/bedrock-query`**

**Request** (de la Eleven Labs):
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

**Processing**:
1. Extract businessId, locationId, conversationId
2. Verify Eleven Labs is enabled pentru acest tenant
3. Get or create session (conversationId = sessionId)
4. Call `AgentService.processMessage()` → Bedrock
5. Log la Kinesis (agent-log resource)
6. Return response

**Response** (către Eleven Labs):
```json
{
  "success": true,
  "response": "Da, avem disponibilitate mâine la 10:00 și 10:30.",
  "actions": []
}
```

---

## 🎨 Eleven Labs UI Configuration Steps

### **Step 1: Create Agent** (via API)
```bash
POST /api/elevenlabs/activate/B0100001
{
  "locationId": "L0100001"
}

# Agent creat cu agentId: "agent_xyz123"
# System prompt include instrucțiuni pentru tool configuration
```

### **Step 2: Open Eleven Labs Dashboard**
1. Navigate to: https://elevenlabs.io/app/conversational-ai
2. Find agent: "Clinica Dentara XYZ - Sediul Central"
3. Click "Edit Agent"

### **Step 3: Add Custom Tools**
1. Go to "Tools" section
2. Click "Add Custom Tool"
3. Configure "query_bedrock":
   - **Name**: `query_bedrock`
   - **Description**: "Query Bedrock AI for information and actions"
   - **Type**: Webhook
   - **URL**: `https://your-ai-agent-server.com/api/elevenlabs/bedrock-query`
   - **Method**: POST
   - **Parameters**:
     ```json
     {
       "message": {
         "type": "string",
         "required": true,
         "description": "User request"
       },
       "conversationId": {
         "type": "string",
         "required": true,
         "description": "Conversation ID"
       },
       "metadata": {
         "type": "object",
         "required": true,
         "properties": {
           "businessId": { "type": "string" },
           "locationId": { "type": "string" }
         }
       }
     }
     ```

4. Save tool

### **Step 4: Test Tool**
1. Use "Test Conversation" în Eleven Labs UI
2. Say: "Vreau o programare"
3. Agent ar trebui să apeleze `query_bedrock` tool
4. Verify în logs că request-ul ajunge la `/api/elevenlabs/bedrock-query`

### **Step 5: Configure Metadata**
1. În "Conversation Config" section
2. Set default metadata:
   ```json
   {
     "businessId": "B0100001",
     "locationId": "L0100001"
   }
   ```

---

## 📊 Monitoring Tool Calls

### **Server Logs**
```
📞 Bedrock query from Eleven Labs: {"message":"Check availability...","conversationId":"conv_123"}
🎙️ Processing Bedrock query for conversation conv_123
📝 Message: Check availability for tomorrow at 10:00
✅ Created new session for conversation conv_123
📤 Invoking Bedrock Agent for session: conv_123
🔧 Tool called: query_tools -> query_app_server
✅ Bedrock response: Da, avem disponibilitate mâine la...
```

### **Kinesis Logs**
```json
{
  "resourceType": "agent-log",
  "operation": "create",
  "data": {
    "actionType": "voice_call",
    "subAction": "receive",
    "agentSessionId": "conv_123",
    "provider": "elevenlabs",
    "metadata": {
      "conversationId": "conv_123"
    }
  }
}
```

---

## ⚠️ Important Notes

1. **Metadata Configuration**: businessId și locationId TREBUIE configurate în Eleven Labs webhook metadata
2. **Tool Name Consistency**: Numele tool-ului în Eleven Labs trebuie să matchuiască cu ce așteaptă agent-ul
3. **URL**: Asigură-te că `AI_AGENT_SERVER_URL` în env este corect
4. **Session Persistence**: conversationId se folosește ca sessionId pentru Bedrock continuity

---

## 🧪 Testing

### **Test 1: Simple Query**
```
Eleven Labs Tool Call:
{
  "message": "What services do you offer?",
  "conversationId": "test_123",
  "metadata": {
    "businessId": "B0100001",
    "locationId": "L0100001"
  }
}

Expected Response:
{
  "success": true,
  "response": "Oferim consultații dentare, igienizări, tratamente carii, albiri dentare și ortodonție."
}
```

### **Test 2: Multi-turn Booking**
```
Call 1:
{
  "message": "Check availability for tomorrow at 14:00",
  "conversationId": "test_123",
  "metadata": { ... }
}

Response:
{
  "success": true,
  "response": "Yes, available at 14:00"
}

Call 2 (same conversation):
{
  "message": "Create appointment for Ion Popescu at 14:00 tomorrow, phone 0712345678",
  "conversationId": "test_123",  // SAME conversation ID
  "metadata": { ... }
}

Response:
{
  "success": true,
  "response": "Appointment created successfully. Confirmation sent via SMS."
}
```

---

## 🚀 Quick Setup Checklist

- [ ] 1. Create agent via API (`POST /api/elevenlabs/activate/:businessId`)
- [ ] 2. Copy `agentId` from response
- [ ] 3. Open Eleven Labs UI → Find agent
- [ ] 4. Read system prompt → vezi instrucțiunile pentru tool config
- [ ] 5. Add custom tool "query_bedrock" cu URL-ul specificat
- [ ] 6. Configure metadata cu businessId și locationId
- [ ] 7. Test conversation în Eleven Labs UI
- [ ] 8. Verify logs în AI Agent Server
- [ ] 9. Test real phone call
- [ ] 10. Monitor Kinesis logs pentru tracking

---

**Gata pentru production! 🎉**

