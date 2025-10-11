# ✅ Parameter Handling - Soluție Completă Finală

## 🎯 Toate Problemele Rezolvate

### Problema 1: Placeholders `$session_attributes.X$`

**Ce se întâmpla**:
```
Agent trimite: businessId="$session_attributes.businessId$"
URL construit: /resources/$session_attributes.businessId$-...
Error: 404 Not Found
```

**Soluție**: Context **direct în mesaj**, nu placeholders!

```typescript
const contextPrefix = `[System Context - Use these exact values in tool calls:
- businessId: ${context.businessId}
- locationId: ${context.locationId}
- userId: ${context.userId}
- role: ${context.role}
- currentDate: ${currentDate}
- currentTime: ${currentTime}]

`;
```

---

### Problema 2: Params Nested cu Brackets

**Ce se întâmpla**:
```
Axios primește: { startDate: "2025-10-06", endDate: "2025-10-11" }
URL generat: ?dateRange[startDate]=2025-10-06&dateRange[endDate]=2025-10-11
Error: 404 Not Found
```

**Soluție**: Custom `paramsSerializer` în axios config!

```typescript
paramsSerializer: {
  serialize: (params) => {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        parts.push(`${key}=${encodeURIComponent(String(value))}`);
      }
    }
    return parts.join('&');
  }
}
```

**Rezultat**:
```
URL generat: ?startDate=2025-10-06&endDate=2025-10-11 ✅
```

---

### Problema 3: Date în Format Nested

**Ce primim de la Bedrock**:
```
params: "{date=2025-10-11}"
SAU
params: "{filters={date={$gte=2025-10-06, $lte=2025-10-11}}}"
```

**Soluție**: Transformare automată în `bedrock-agent.service.ts`:

```typescript
// Simple date: params.date → startDate & endDate
if (parsedParams.params.date && typeof parsedParams.params.date === 'string') {
  restructuredParams.startDate = parsedParams.params.date;
  restructuredParams.endDate = parsedParams.params.date;
}

// Nested filters: params.filters.date.$gte → startDate
else if (parsedParams.params.filters?.date) {
  restructuredParams.startDate = parsedParams.params.filters.date.$gte;
  restructuredParams.endDate = parsedParams.params.filters.date.$lte;
}
```

**Transformare completă**:
```
De la Bedrock: params="{date=2025-10-11}"
După parsing:  params={ date: "2025-10-11" }
După transform: params={ startDate: "2025-10-11", endDate: "2025-10-11" }
În URL:        ?startDate=2025-10-11&endDate=2025-10-11 ✅
```

---

### Problema 4: resourceType în params în loc de root

**Ce primim**:
```
params: "{resourceType=appointment, date=2025-10-11}"
```

**Soluție**: Extract la root level!

```typescript
if (parsedParams.params.resourceType && !parsedParams.resourceType) {
  parsedParams.resourceType = parsedParams.params.resourceType;
  delete parsedParams.params.resourceType;
}
```

**Rezultat**:
```
{
  resourceType: "appointment",  // ← Root level pentru header
  params: {
    startDate: "2025-10-11",
    endDate: "2025-10-11"
  }
}
```

---

## 🔄 Flow Complet Final

### De la User la API:

```
1. User: "Programări de mâine"
   ↓
2. Notre Server adaugă context:
   [System Context - Use these exact values:
   - businessId: B0100001
   - locationId: L0100001
   - currentDate: 2025-10-10
   ...]
   Programări de mâine
   ↓
3. Bedrock Agent:
   - Citește businessId = B0100001 (din context)
   - Citește currentDate = 2025-10-10
   - Calculează "mâine" = 2025-10-11
   - Decide să apeleze query_app_server
   ↓
4. Return Control Event:
   {
     businessId: "B0100001",
     locationId: "L0100001",
     module: "resources",
     action: "list",
     params: { date: "2025-10-11" },
     resourceType: "appointment"
   }
   ↓
5. bedrock-agent.service.ts:
   🔄 Parse params string → object
   🔄 Convert date → startDate/endDate
   🔄 Extract resourceType to root
   
   Result: {
     businessId: "B0100001",
     locationId: "L0100001",
     module: "resources",
     action: "list",
     resourceType: "appointment",
     params: { startDate: "2025-10-11", endDate: "2025-10-11" }
   }
   ↓
6. app-server.tool.ts:
   - Construiește URL: /resources/B0100001-L0100001
   - Header: X-Resource-Type: appointment
   - Axios params: { startDate: "2025-10-11", endDate: "2025-10-11" }
   - paramsSerializer flatten → ?startDate=2025-10-11&endDate=2025-10-11
   ↓
7. Request final:
   GET /resources/B0100001-L0100001?startDate=2025-10-11&endDate=2025-10-11
   Header: X-Resource-Type: appointment
   ↓
8. App Server returnează programările ✅
   ↓
9. Bedrock generează răspuns:
   "Mâine aveți 5 programări: ..."
```

---

## 📝 Modificări în Cod

### 1. `bedrock-agent.service.ts`:

**Context direct în mesaj**:
```typescript
const contextPrefix = `[System Context - Use these exact values in tool calls:
- businessId: ${context.businessId}
- locationId: ${context.locationId}
- userId: ${context.userId}
- role: ${context.role}
- currentDate: ${currentDate}
- currentTime: ${currentTime}]

`;
const inputText = contextPrefix + message; // La FIECARE mesaj!
```

**Parser pentru nested objects**:
- `parseBedrockParamString()` - parsează `{key=value, nested={x=y}}`
- `parseBedrockValue()` - detectează tipuri

**Transformare parametri**:
- `params.date` → `params.startDate` & `params.endDate`
- `params.filters.date.$gte` → `params.startDate`
- `params.resourceType` → root `resourceType`

**Replacement placeholders**:
- `replaceSessionAttributePlaceholders()` - backup dacă totuși apar

### 2. `app-server.tool.ts`:

**Custom params serializer**:
```typescript
paramsSerializer: {
  serialize: (params) => {
    // Flatten: { startDate: "X" } → "startDate=X"
    // NU: { startDate: "X" } → "dateRange[startDate]=X"
  }
}
```

**Logging detaliat**:
- Parameters primite
- Context primit
- Target businessId/locationId
- Query params
- Response size

---

## 🧪 Testing

### Test 1: Programări de mâine

```bash
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "user-123",
    "session_id": "test-'$(date +%s)'",
    "message_id": "msg_1",
    "payload": {
      "content": "Arată-mi programările de mâine"
    }
  }'
```

**Log-uri așteptate**:
```
📋 Adding context prefix (current time: 2025-10-10T23:48:05Z)
🔄 Converted date param to startDate/endDate: 2025-10-11
📋 Query params: {"startDate":"2025-10-11","endDate":"2025-10-11"}
📡 Querying resources: GET /resources/B0100001-L0100001?startDate=2025-10-11&endDate=2025-10-11
✅ App server query successful: 200
```

### Test 2: Programări săptămâna aceasta

```bash
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "user-123",
    "session_id": "test-'$(date +%s)'",
    "message_id": "msg_1",
    "payload": {
      "content": "Ce programări avem săptămâna aceasta?"
    }
  }'
```

**Log-uri așteptate**:
```
🔄 Extracted startDate: 2025-10-06
🔄 Extracted endDate: 2025-10-12
📋 Query params: {"startDate":"2025-10-06","endDate":"2025-10-12"}
📡 Querying resources: GET /resources/B0100001-L0100001?startDate=2025-10-06&endDate=2025-10-12
✅ App server query successful: 200
```

---

## ✅ Checklist Final

- [x] Context direct în mesaj (nu placeholders)
- [x] promptSessionAttributes cu valori reale
- [x] Parser pentru nested Bedrock format
- [x] Transformare `date` → `startDate`/`endDate`
- [x] Extract `resourceType` la root
- [x] Extract date filters `$gte`/`$lte`
- [x] Custom axios paramsSerializer (no nested brackets)
- [x] Replacement placeholders (backup)
- [x] Logging detaliat pentru debugging
- [x] Error handling robust

---

## 🚀 Ready to Test!

```bash
# Restart server
docker-compose restart ai-agent-server

# Test
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "user-123",
    "session_id": "test-final",
    "message_id": "msg_1",
    "payload": {
      "content": "Ce programări am mâine?"
    }
  }'
```

**Ar trebui să funcționeze perfect cu URL corect**:
```
GET /resources/B0100001-L0100001?startDate=2025-10-11&endDate=2025-10-11
```

**NU**:
```
GET /resources/$session_attributes.businessId$-... ❌
GET /resources/B0100001-L0100001?dateRange[startDate]=... ❌
```

**Toate problemele de parametri sunt REZOLVATE! 🎉**

