# 🔧 Fix: Agent folosește tool-ul greșit

## ❌ Problema

Agent apelează `query_management_server` pentru services/treatments când ar trebui să folosească `query_app_server`:

```
User: "Ce tratamente avem?"
Agent apelează: query_management_server(endpoint="/api/services")
           ❌ GREȘIT!
Ar trebui: query_app_server(module="patient-booking", action="services")
           ✅ CORECT!
```

## 🔍 Cauze

1. **Tool descriptions nu sunt suficient de clare** în AWS Console
2. **Agent nu are în Knowledge Base** ghid despre când să folosească fiecare tool
3. **Schema OpenAPI** din AWS nu reflectă descriptions actualizate

## ✅ Soluții Implementate

### 1. Tool Descriptions Actualizate

**Fișiere modificate**:
- `app-server.tool.ts` - description mult mai clară
- `management-server.tool.ts` - DO NOT USE pentru services/appointments
- `scripts/generate-action-group-schemas.js` - schemas actualizate

### 2. Knowledge Base Guide

Creat: `data/kb-documents/dental/tool-usage-guide.json`

Conține:
- Decision tree pentru când să folosești fiecare tool
- Exemple concrete CORRECT vs WRONG
- Common mistakes to avoid
- Summary cu reguli clare

### 3. Error Handling Îmbunătățit

**Fix**: Returnăm 200 cu `success: false` în body în loc de 500

```typescript
httpStatusCode: 200, // Always 200, errors are in response body
responseBody: {
  'application/json': {
    body: JSON.stringify({
      success: false,  // ← Eroarea e aici
      error: "...",
      data: {}
    })
  }
}
```

**De ce?** Când returnăm 500, Bedrock aruncă `DependencyFailedException` și nu poate continua conversația. Cu 200 + success:false, Bedrock poate să informeze user-ul elegant.

---

## 🎯 Pași de Rezolvare

### Pasul 1: Sync Knowledge Base

```bash
cd ai-agent-server

# Verifică că tool-usage-guide.json există
ls -la data/kb-documents/dental/tool-usage-guide.json

# Sync în S3 (dacă ai scriptul configurat)
./scripts/sync-kb-documents.sh YOUR_KB_ID YOUR_DS_ID

# SAU manual
aws s3 cp data/kb-documents/dental/tool-usage-guide.json \
  s3://your-bucket/dental/tool-usage-guide.json

# Apoi sync Knowledge Base în AWS Console
# AWS Console → Bedrock → Knowledge bases → Selectează KB → Data sources → Sync
```

### Pasul 2: Update Action Group Schemas în AWS Console

1. **AWS Console** → **Bedrock** → **Agents** → Selectează agent
2. **Action groups** → Selectează `query_tools`
3. **Edit**
4. **Action group schema** → Copiază din:
   ```
   bedrock-schemas/query-tools-schema.json
   ```
5. **Save**
6. Repetă pentru toate Action Groups

### Pasul 3: Update Agent Instructions

1. **Edit Agent** → **Agent Instructions**
2. Copiază instrucțiunile actualizate din `BEDROCK_AGENT_INSTRUCTIONS.md`
3. **Save**

### Pasul 4: Prepare Agent

1. Click **Prepare** (buton în partea de sus)
2. Așteaptă ~1-2 minute
3. Verifică status: **Prepared**

### Pasul 5: Restart Server

```bash
docker-compose restart ai-agent-server
```

### Pasul 6: Test

```bash
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "user-123",
    "session_id": "test-'$(date +%s)'",
    "message_id": "msg_1",
    "payload": {
      "content": "Ce tratamente oferă clinica?"
    }
  }'
```

**Verifică în log-uri**:
```
✅ Ar trebui să vezi:
🔧 Executing tool locally: query_tools::query_app_server
📝 Tool parameters (parsed): {
  "module": "patient-booking",
  "action": "services",
  ...
}

❌ NU ar trebui să vezi:
🔧 Executing tool locally: query_tools::query_management_server
```

---

## 📊 Comparație Înainte/După

### Înainte ❌:

```
User: "Ce tratamente avem?"
   ↓
Agent: query_management_server(endpoint="/api/services")
   ↓
Error: ECONNREFUSED (management server nu e pornit)
   ↓
Status 500 → DependencyFailedException
   ↓
Conversație OPRITĂ
```

### După ✅:

```
User: "Ce tratamente avem?"
   ↓
Agent: query_app_server(module="patient-booking", action="services")
   ↓
Success: [{ name: "Consultație", price: 150 }, ...]
   ↓
Status 200 → Bedrock continuă
   ↓
User: "Clinica oferă: Consultații (150 RON), Igienizări (200 RON), ..."
```

**SAU** dacă eșuează (app server offline):

```
User: "Ce tratamente avem?"
   ↓
Agent: query_app_server(module="patient-booking", action="services")
   ↓
Error: ECONNREFUSED
   ↓
Status 200 + success: false → Bedrock continuă ✅
   ↓
User: "Ne pare rău, nu am putut accesa informațiile despre tratamente. Vă rugăm încercați din nou."
```

---

## 🔍 Debugging

### Verifică ce tool folosește agent-ul:

```bash
# În log-uri, caută:
grep "Executing tool locally" logs/app.log

# Ar trebui să vezi:
🔧 Executing tool locally: query_tools::query_app_server

# NU:
🔧 Executing tool locally: query_tools::query_management_server
```

### Verifică Knowledge Base:

```bash
# Test KB direct
curl -X POST http://localhost:3003/agent/test-kb \
  -H "Content-Type: application/json" \
  -d '{
    "query": "When should I use query_app_server?",
    "numberOfResults": 3
  }'

# Ar trebui să returneze tool-usage-guide.json
```

### Verifică Schema în AWS:

1. AWS Console → Bedrock → Agents → Action Groups
2. Verifică că description pentru `query_app_server` include:
   ```
   "Use this for: Services/treatments, Appointments, Patients..."
   ```
3. Verifică că description pentru `query_management_server` include:
   ```
   "DO NOT use for: services/treatments..."
   ```

---

## 📝 Checklist

- [x] Tool descriptions actualizate în cod
- [x] Schema-uri regenerate cu descriptions noi
- [x] Knowledge Base guide creat (tool-usage-guide.json)
- [ ] **Knowledge Base sync-uit** ← TREBUIE FĂCUT!
- [ ] **Action Group schemas update în AWS Console** ← TREBUIE FĂCUT!
- [ ] **Agent Instructions update în AWS Console** ← TREBUIE FĂCUT!
- [ ] **Agent prepared din nou** ← TREBUIE FĂCUT!
- [ ] Server restartat
- [ ] Testat cu "Ce tratamente avem?"

---

## 🚀 Next Steps Imediate

1. **Sync Knowledge Base** (cel mai important!):
   ```bash
   ./scripts/sync-kb-documents.sh YOUR_KB_ID YOUR_DS_ID
   ```

2. **Update AWS Console**:
   - Copy schemas din `bedrock-schemas/query-tools-schema.json`
   - Copy instructions din `BEDROCK_AGENT_INSTRUCTIONS.md`
   - Prepare agent

3. **Restart & Test**:
   ```bash
   docker-compose restart ai-agent-server
   # Test cu "Ce tratamente avem?"
   ```

**După acești pași, agent-ul ar trebui să folosească tool-ul corect!** 🎉

