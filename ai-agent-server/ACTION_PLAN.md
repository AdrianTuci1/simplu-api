# 🎯 Action Plan - Rezolvare Completă

## 📋 Ce trebuie făcut pentru a rezolva problema tool usage

Agent folosește `query_management_server` greșit. Trebuie 3 acțiuni în AWS Console + 1 sync:

---

## ✅ Acțiunea 1: Sync Knowledge Base (CRITICAL!)

### De ce?
Am adăugat `tool-usage-guide.json` care explică agentului când să folosească fiecare tool.

### Cum:

**Opțiunea A - Folosind scriptul**:
```bash
cd ai-agent-server

# Verifică documentul
cat data/kb-documents/dental/tool-usage-guide.json | head -20

# Sync (înlocuiește cu ID-urile tale reale)
./scripts/sync-kb-documents.sh YOUR_KB_ID YOUR_DS_ID
```

**Opțiunea B - Manual**:
```bash
# Upload în S3
aws s3 sync data/kb-documents/dental/ s3://your-bucket/dental/

# Apoi în AWS Console:
# Bedrock → Knowledge bases → Selectează KB → Data sources → Click "Sync"
# Așteaptă ~2-5 minute până Status = AVAILABLE
```

**Verificare**:
```bash
# Check în S3
aws s3 ls s3://your-bucket/dental/ --recursive | grep tool-usage-guide

# Ar trebui să vezi:
# dental/tool-usage-guide.json
```

---

## ✅ Acțiunea 2: Update Action Group Schemas

### De ce?
Schema-urile OpenAPI au descriptions actualizate care îi spun agentului când să folosească fiecare tool.

### Cum:

1. **Deschide**: AWS Console → Bedrock → Agents → Selectează agent-ul
2. **Click**: Tab "Action groups"
3. **Pentru query_tools**:
   - Click **Edit** pe `query_tools`
   - Scroll la **Action group schema**
   - **Delete** schema veche
   - **Copiază** schema nouă din:
     ```bash
     # Pe local:
     cat bedrock-schemas/query-tools-schema.json
     ```
   - **Paste** în AWS Console
   - **Save**

4. **Repetă** pentru `frontend_tools` și `notification_tools` dacă ai

**Verificare schema nouă**:
Ar trebui să vezi în schema description:
```
"description": "READ-ONLY queries for REAL-TIME BUSINESS DATA. Use this for: Services/treatments, Appointments, Patients, Medics, Time slots. DO NOT use query_management_server for these!"
```

---

## ✅ Acțiunea 3: Update Agent Instructions

### De ce?
Instructions actualizate clarifică când să folosești fiecare tool cu exemple concrete.

### Cum:

1. **Deschide**: AWS Console → Bedrock → Agents → Selectează agent-ul
2. **Click**: "Edit Agent" sau butonul de edit
3. **Scroll** la **Agent Instructions**
4. **Delete** instructions vechi
5. **Copiază** instructions noi:
   ```bash
   # Pe local, deschide:
   ai-agent-server/BEDROCK_AGENT_INSTRUCTIONS.md
   
   # Copiază tot conținutul din tag-ul ```...``` (liniile 8-240)
   ```
6. **Paste** în AWS Console
7. **Save and exit**

**Verificare**:
Ar trebui să vezi în instructions:
```
#### query_app_server - For REAL-TIME BUSINESS DATA
Use for:
- Services and treatments (what we offer, prices, descriptions)
- Appointments (list, get details, today's schedule)
...

DO NOT use for services, appointments, patients, or medics - use query_app_server instead!
```

---

## ✅ Acțiunea 4: Prepare Agent

### De ce?
Orice modificare la Action Groups sau Instructions necesită Prepare pentru a intra în vigoare.

### Cum:

1. În pagina agent-ului, **Click** butonul **Prepare** (sus-dreapta)
2. **Așteaptă** ~1-2 minute
3. **Verifică** că status devine **Prepared**

**Notă**: Dacă butonul e disabled:
- Verifică că ai salvat toate modificările
- Refresh pagina
- Dacă persistă, folosește AWS CLI:
  ```bash
  aws bedrock-agent prepare-agent --agent-id YOUR_AGENT_ID --region YOUR_REGION
  ```

---

## ✅ Acțiunea 5: Restart Server (Opțional)

```bash
cd /Users/adriantucicovenco/Proiecte/simplu-api
docker-compose restart ai-agent-server
```

---

## 🧪 Testing Final

```bash
# Test 1: Services (ar trebui să folosească query_app_server)
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "user-123",
    "session_id": "test-services-'$(date +%s)'",
    "message_id": "msg_1",
    "payload": {
      "content": "Ce tratamente oferă clinica?"
    }
  }'

# Verifică în log-uri:
# ✅ Ar trebui: query_tools::query_app_server
# ❌ NU ar trebui: query_tools::query_management_server

# Test 2: Appointments (ar trebui query_app_server resources)
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "user-123",
    "session_id": "test-appointments-'$(date +%s)'",
    "message_id": "msg_1",
    "payload": {
      "content": "Câte programări avem azi?"
    }
  }'

# Verifică: query_app_server cu module="resources", resourceType="appointment"
```

---

## 📊 Log-uri Așteptate După Fix

### Pentru "Ce tratamente avem?":

```
📋 Adding context prefix to first message
📤 Invoking Bedrock Agent
📚 Knowledge Base retrieved 1 references  ← Tool usage guide!
🔄 Return control event received
🔧 Processing 1 invocation inputs
🔧 Executing tool locally: query_tools::query_app_server  ← CORECT!
📝 Tool parameters (parsed): {
  "module": "patient-booking",  ← CORECT!
  "action": "services",
  "businessId": "B0100001",
  "locationId": "L0100001"
}
⚙️ Executing tool: query_app_server
📡 Querying patient-booking: GET /patient-booking/services/B0100001-L0100001
✅ App server query successful: 200
✅ Tool executed successfully
📤 Sending tool results back to Bedrock
✅ Conversation continued successfully
```

---

## ⏱️ Timp Estimat

- Sync KB: 2-5 minute (depending on document size)
- Update schemas în Console: 5 minute
- Update instructions în Console: 2 minute
- Prepare agent: 1-2 minute
- **Total: ~10-15 minute**

---

## 🎯 Priority Order

1. **🔴 CRITICAL**: Sync Knowledge Base (altfel agent nu știe când să folosească ce tool)
2. **🟡 IMPORTANT**: Update Action Group schemas (descriptions mai clare)
3. **🟡 IMPORTANT**: Update Agent Instructions (exemplu concrete)
4. **🟢 REQUIRED**: Prepare Agent (activează toate modificările)
5. **🟢 OPTIONAL**: Restart server (dacă ai modificat cod local)

---

## ✅ Success Criteria

După toate acțiunile, pentru "Ce tratamente avem?":

- ✅ Agent folosește `query_app_server` NU `query_management_server`
- ✅ Parametri: `module="patient-booking"`, `action="services"`
- ✅ Request merge la app server NU management server
- ✅ Primești listă de tratamente cu prețuri
- ✅ Conversație continuă cu răspuns generat de Bedrock

---

**Începe cu Sync Knowledge Base - e cel mai important! 🚀**

