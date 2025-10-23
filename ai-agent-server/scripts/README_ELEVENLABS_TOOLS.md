# ElevenLabs Tools Management Scripts

Aceste scripturi permit crearea, testarea și activarea tool-urilor ElevenLabs programatic.

## 📋 Scripturi Disponibile

### 1. `create-elevenlabs-tools.js`
Creează toate tool-urile ElevenLabs necesare pentru sistemul medical.

**Utilizare:**
```bash
node scripts/create-elevenlabs-tools.js
```

**Output:**
- Creează 3 tool-uri: `query_resources`, `query_patient_booking`, `log_call_completion`
- Returnează tool IDs pentru configurarea agentului

### 2. `test-elevenlabs-tools.js`
Testează tool-urile create pentru a verifica funcționalitatea.

**Utilizare:**
```bash
node scripts/test-elevenlabs-tools.js
```

**Teste:**
- Testează `query_resources` cu căutare pacienți
- Testează `query_patient_booking` cu verificare disponibilitate
- Testează `log_call_completion` cu date de apel

### 3. `activate-elevenlabs-tools.js`
Activează tool-urile pe un agent ElevenLabs specific.

**Utilizare:**
```bash
node scripts/activate-elevenlabs-tools.js <businessId> <locationId> <toolId1> <toolId2> <toolId3>
```

**Exemplu:**
```bash
node scripts/activate-elevenlabs-tools.js B0100001 L0100001 tool_123 tool_456 tool_789
```

## 🔧 Configurare

### Variabile de Mediu Necesare

```bash
# ElevenLabs API Key
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# AI Agent Server URL
AI_AGENT_SERVER_URL=https://your-ai-agent-server.com
```

### Instalare Dependențe

```bash
npm install axios dotenv
```

## 🚀 Workflow Complet

### 1. Creează Tool-urile
```bash
node scripts/create-elevenlabs-tools.js
```

**Output așteptat:**
```json
{
  "query_resources": "tool_abc123",
  "query_patient_booking": "tool_def456", 
  "log_call_completion": "tool_ghi789"
}
```

### 2. Testează Tool-urile
```bash
node scripts/test-elevenlabs-tools.js
```

### 3. Activează pe Agent
```bash
node scripts/activate-elevenlabs-tools.js B0100001 L0100001 tool_abc123 tool_def456 tool_ghi789
```

## 📊 Tool-uri Create

### 1. `query_resources`
- **Scop**: Căutare pacienți, tratamente, medici
- **Endpoint**: `/resources/{businessId}-{locationId}` cu `X-Resource-Type`
- **Custom fields**: `data.patientName`, `data.treatmentType`, `data.medicName`

### 2. `query_patient_booking`
- **Scop**: Gestionarea programărilor
- **Acțiuni**: `available-dates-with-slots`, `reserve`, `cancel-appointment`
- **Endpoint**: Existing booking endpoints

### 3. `log_call_completion`
- **Scop**: Logging automat al apelurilor
- **Trigger**: Automat de ElevenLabs când apelul se termină
- **Date**: Durată, cost, transcriere, metadata

## 🔍 Debugging

### Verifică Tool-urile Create
```bash
curl -H "xi-api-key: $ELEVENLABS_API_KEY" \
  https://api.elevenlabs.io/v1/convai/tools
```

### Verifică Agent Configuration
```bash
curl -H "xi-api-key: $ELEVENLABS_API_KEY" \
  https://api.elevenlabs.io/v1/convai/agents/{agent_id}
```

### Testează Endpoint-ul Direct
```bash
curl -X POST $AI_AGENT_SERVER_URL/api/elevenlabs/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "query_resources",
    "parameters": {
      "businessId": "B0100001",
      "locationId": "L0100001",
      "resourceType": "patient",
      "action": "list",
      "params": {"data.patientName": "Ion Popescu"}
    },
    "metadata": {
      "businessId": "B0100001",
      "locationId": "L0100001"
    }
  }'
```

## 📝 Logs

Toate scripturile afișează:
- ✅ Succes cu detalii
- ❌ Erori cu mesaje descriptive
- 📊 Răspunsuri JSON pentru debugging

## 🔄 Recreare Tool-uri

Pentru a recrea tool-urile (dacă sunt șterse):
```bash
# 1. Creează din nou
node scripts/create-elevenlabs-tools.js

# 2. Notează noile tool IDs

# 3. Activează pe agent
node scripts/activate-elevenlabs-tools.js B0100001 L0100001 <new_tool_ids>
```

## 🎯 Next Steps

După crearea tool-urilor:

1. **Configurează webhook-ul** în ElevenLabs Dashboard:
   - Event: `post_call_transcription`
   - URL: `{AI_AGENT_SERVER_URL}/api/elevenlabs/webhook`

2. **Testează agentul** cu conversații reale

3. **Monitorizează logs** pentru debugging

4. **Optimizează** tool-urile bazat pe utilizare
