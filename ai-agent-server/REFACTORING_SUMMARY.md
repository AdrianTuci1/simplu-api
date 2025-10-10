# Refactoring Summary - Tools & Knowledge Base

**Data:** 10 octombrie 2025  
**Scop:** Eliminare drafts, corectare tool-uri, structură corectă resurse

## 🔧 Modificări Efectuate

### 1. ✅ Eliminat Sistemul de Drafts

**Șters:**
- `src/modules/tools/websocket-tools/draft-management.tool.ts`

**Actualizat:**
- `src/modules/tools/tools.module.ts` - eliminat DraftManagementTool din providers
- `src/modules/tools/tools.service.ts` - eliminat din constructor și setWebSocketGateway

**Motivație:**
- Drafts-urile creează confuzie pentru utilizatori
- Fluxul direct (AI execută acțiunea imediat) este mai intuitiv
- Frontend gestionează confirmările prin UI propriu

### 2. ✅ Refăcut `app-server.tool.ts` (READ-ONLY)

**Nou comportament:**
- Tool-ul este **READ-ONLY** - DOAR pentru citire date
- Pentru modificări se folosește `call_frontend_function`

**2 Module:**

**a) patient-booking** (pentru customers):
```typescript
// Servicii disponibile
GET /patient-booking/services/:businessId-:locationId

// Sloturi disponibile
GET /patient-booking/slots/:date/:businessId-:locationId?serviceId=...

// Istoric programări
GET /patient-booking/appointments/history/:businessId-:locationId
Header: x-access-code (pentru autentificare pacient)
```

**b) resources** (pentru operators):
```typescript
// Listare resurse
GET /resources/:businessId-:locationId
Headers: X-Resource-Type, ai-server-key

// Get resursă specifică
GET /resources/:businessId-:locationId/:resourceId
Headers: X-Resource-Type, ai-server-key
```

**Autentificare:**
- Header: `ai-server-key` (nu Bearer token)
- Valoare: `process.env.AI_SERVER_KEY`
- **IMPORTANT:** Același key trebuie în `ai-agent-server/.env` și `app/.env`

**Actions disponibile:**
- `patient-booking`: `services`, `slots`, `history`
- `resources`: `list`, `get`

**Resource Types** (din base-resource.ts):
- `appointment`, `patient`, `medic`, `treatment`, `product`
- `dental-chart`, `plan`, `invoice`, `role`, `setting`
- `statistics`, `recent-activities`, etc.

### 3. ✅ Actualizat `frontend-interaction.tool.ts`

**Redenumit tool:** `interact_with_frontend` → `call_frontend_function`

**Comportament nou:**
- Apelează funcții JavaScript în frontend
- Frontend-ul execută API calls către app server
- AI ia locul acțiunilor manuale ale user-ului

**Funcții disponibile:**
- `createResource(type, data)` - Creează resursă nouă
- `updateResource(type, id, data)` - Actualizează resursă
- `deleteResource(type, id)` - Șterge resursă
- `submitForm()` - Trimite formularul deschis
- `navigateTo(view)` - Navighează către view
- `selectResource(type, id)` - Selectează resursă în UI
- `closeModal()` - Închide modal

**Flux:**
```
AI → call_frontend_function → WebSocket → Frontend
→ Frontend execută funcția JS → API call la app server
→ Result actualizat în UI
```

### 4. ✅ Creat `dental-knowledge-base.json`

Knowledge base specializat pentru dental cu:

**Structura BaseResource:**
```typescript
{
  id: "businessId-locationId-resourceId",
  businessId: string,
  locationId: string,
  resourceType: string,
  resourceId: string,  // AUTO-GENERATED
  data: {...},         // TOATE datele AICI
  timestamp: string,
  lastUpdated: string
}
```

**Resource Types complete:**

1. **appointment** (programare):
```json
{
  "data": {
    "date": "2025-10-01",
    "time": "08:40",
    "doctor": {"id": "UUID", "name": "Dr. Name"},
    "patient": {"id": "pa2508-00007", "name": "Patient Name"},
    "service": {"id": "tr2508-00005", "name": "Service Name", "duration": "15"},
    "price": 0,
    "status": "scheduled",
    "serviceDuration": "15",
    "prescription": "",
    "postOperativeNotes": "",
    "images": []
  }
}
```

2. **medic** (doctor):
```json
{
  "data": {
    "medicName": "Dr. Tucean",
    "email": "tucean@test.com",
    "phone": "0736999960",
    "role": "Administrator",
    "dutyDays": ["Luni", "Miercuri", "Vineri"]
  }
}
```
**IMPORTANT:** `resourceId` pentru medic = `userId` din conversație (UUID)

3. **patient** (pacient):
```json
{
  "data": {
    "patientName": "Drobre Ioana",
    "phone": "07999999999",
    "email": "dobre.io@test.com",
    "gender": "female",
    "birthYear": 1994,
    "address": "Iasi",
    "status": "active",
    "notes": null,
    "tags": []
  }
}
```
**Format resourceId:** `paYYMM-XXXXX`

4. **treatment** (tratament):
```json
{
  "data": {
    "treatmentType": "Gutieră de protecție",
    "price": 200,
    "duration": 15,
    "category": "Tratamente conservatoare",
    "description": ""
  }
}
```
**Format resourceId:** `trYYMM-XXXXX`

**Context Usage:**
- `userId` din conversație poate fi `resourceId` al medicului
- Întrebare: "Când am următorul implant?" → caută programări cu `data.doctor.id === userId`
- Frontend trimite context (ce editează, ce formular e deschis)

**Query Examples:**
- Filtrare cu dot notation: `params: {'data.doctor.id': userId, date: today}`
- Get medic curent: `get(medic, resourceId: userId)`

### 5. ✅ Alte fișiere create/actualizate

**Nou:**
- `data/dental-knowledge-base.json` - KB complet pentru dental
- `data/KNOWLEDGE_BASE_SETUP.md` - Ghid setup AWS KB
- `data/README.md` - Overview date KB
- `scripts/prepare-knowledge-base.js` - Script preparare documente
- `ENV_SETUP.md` - Ghid complet environment variables

**Actualizat:**
- `package.json` - adăugat script `prepare-kb`
- `QUICKSTART.md` - adăugat AI_SERVER_KEY

## 🎯 Fluxul Complet Nou

### Pentru CITIRE:
```
User: "Câte programări avem astăzi?"
↓
AI → query_app_server({
  module: 'resources',
  action: 'list',
  resourceType: 'appointment',
  params: {startDate: today, endDate: today}
})
↓
App Server → returnează lista
↓
AI → "Astăzi: 12 programări (8 consultații, 3 tratamente, 1 implant)"
```

### Pentru SCRIERE:
```
User: "Creează programare pentru Ion Popescu mâine la 14:00"
↓
AI → call_frontend_function({
  functionName: 'createResource',
  parameters: {
    resourceType: 'appointment',
    data: {date, time, doctor, patient, service, ...}
  }
})
↓
WebSocket → Frontend
↓
Frontend → appointmentAPI.create(data) → App Server
↓
UI actualizat, user vede rezultatul
↓
AI → "Done! Programare creată pentru Ion Popescu mâine la 14:00. Confirmată!"
```

### Pentru Query-uri Personalizate (medicul curent):
```
User (medic): "Când am următorul implant?"
↓
Context: userId = "33948842-b061-7036-f02f-79b9c0b4225b"
↓
AI → query_app_server({
  module: 'resources',
  action: 'list',
  resourceType: 'appointment',
  params: {
    'data.doctor.id': userId,
    'data.service.name': 'implant',  // sau filtrare după category
    startDate: today,
    sortBy: 'date'
  }
})
↓
AI → "Următorul implant este pe 25 octombrie la 10:00 cu Ion Popescu."
```

## 📦 Tools Disponibile (6 total)

1. **query_app_server** - READ-ONLY queries
   - patient-booking: services, slots, history
   - resources: list, get (cu resourceType)

2. **call_frontend_function** - Execută funcții în frontend
   - createResource, updateResource, deleteResource
   - submitForm, navigateTo, selectResource, closeModal

3. **send_elixir_notification** - Notificări către frontend

4. **broadcast_websocket_message** - Broadcast real-time

5. **send_external_message** - Meta/Twilio/Gmail

6. **query_management_server** - Config business

## ✅ Verificare Finală

### Test 1: Verifică că tool-urile sunt înregistrate

```bash
npm run start:dev
```

Logs:
```
✅ Registered 6 tools: query_app_server, call_frontend_function, ...
✅ WebSocket Gateway set for WebSocket tools
🤖 Bedrock Agent Service initialized
```

### Test 2: Test query read

```bash
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "33948842-b061-7036-f02f-79b9c0b4225b",
    "session_id": "test",
    "message_id": "msg1",
    "payload": {"content": "Câte programări am astăzi?"}
  }'
```

Expected:
- AI folosește `query_app_server` cu `data.doctor.id === userId`
- Răspuns: număr programări pentru medicul respectiv

### Test 3: Test create (prin frontend)

Frontend trebuie să asculte event-ul `ai_function_call` și să execute funcția.

## 🚀 Next Steps

1. ✅ **Setup AWS Bedrock:**
   - Creează Agent cu BEDROCK_AGENT_ID
   - Folosește TSTALIASID ca alias
   - Configurează Action Groups cu tool definitions

2. ✅ **Setup Knowledge Base:**
   ```bash
   npm run prepare-kb
   aws s3 sync data/kb-documents/ s3://simplu-ai-rag-embeddings/documents/
   # Creează KB în AWS Console
   # Sync data source
   # Copy KB ID în .env
   ```

3. ✅ **Setup Environment:**
   - Generează `AI_SERVER_KEY` random (32 chars)
   - Setează în **ambele** servere (ai-agent-server și app)
   - Verifică toate env vars din `ENV_SETUP.md`

4. ✅ **Test Integration:**
   - Test query read
   - Test create prin frontend
   - Test context usage (userId === medicId)
   - Test error handling

## 📝 Important Notes

### Structura Resurse
- Toate datele în câmpul `data`
- `resourceId` este auto-generated
- Pentru queries: dot notation `'data.doctor.id'`
- Pentru create: trimiți doar `data`, nu businessId/locationId/resourceId

### Context Usage
- `userId` din conversație = `resourceId` pentru medici
- Frontend trimite context (ce editează, ce formular)
- AI folosește context pentru acțiuni precise

### Autentificare
- patient-booking: public, nu necesită auth
- resources: necesită `ai-server-key` header
- `AI_SERVER_KEY` trebuie identic în ambele servere

---

**Status:** ✅ COMPLET  
**Files Modified:** 7  
**Files Created:** 5  
**Ready for:** AWS Bedrock setup și testing

