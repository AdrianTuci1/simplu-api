## Eleven Labs Direct Tools - Mapping and Payloads

Use this document to create Client Tools in Eleven Labs and to provide tool IDs per businessType.

### Base Endpoint
- Execute any tool directly via webhook (optional generic tool): `POST {AI_AGENT_SERVER_URL}/api/elevenlabs/tools/execute`
  - Body: `{ toolName: string, parameters: object, conversationId?: string, metadata: { businessId: string, locationId: string } }`

However, preferred is to create native Client Tools for each action below and attach their `tool_id` to the agent.

---

### Tool: query_patient_booking
Purpose: Patient booking operations (availability, reserve, cancel)

Payload (availability):
```json
{
  "businessId": "B0100001",
  "locationId": "L0100001",
  "action": "available-dates-with-slots",
  "params": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "serviceId": "T0100001", "medicId": "M0100001" }
}
```

Payload (reserve):
```json
{
  "businessId": "B0100001",
  "locationId": "L0100001",
  "action": "reserve",
  "params": {
    "date": "YYYY-MM-DD",
    "time": "HH:mm",
    "serviceId": "T0100001",
    "medicId": "M0100001",
    "duration": 30,
    "customer": { "name": "Ion Popescu", "email": "ion@example.com", "phone": "0712345678" }
  }
}
```

Payload (cancel-appointment):
```json
{
  "businessId": "B0100001",
  "locationId": "L0100001",
  "action": "cancel-appointment",
  "params": { "appointmentId": "A0100123", "patientId": "P010045", "accessCode": "123456" }
}
```

Recommended tool name in Eleven Labs: `query_patient_booking`

---

### Tool: query_resources (optional)
Purpose: List services/treatments or medics to help with booking conversation.

Treatments search specialization (resourceType = "treatment"):
- Default `limit = 60` if not provided
- Friendly filters supported:
  - `treatmentType` → maps to `data.treatmentType`
  - `name` → maps to `data.treatmentName`

Examples (treatments):

1) List by treatment type (default limit 60):
```json
{
  "resourceType": "treatment",
  "action": "list",
  "params": { "treatmentType": "dentistry" }
}
```

2) Search by treatment name (override limit):
```json
{
  "resourceType": "treatment",
  "action": "list",
  "params": { "name": "consultație", "limit": 20 }
}
```

Medics example:
```json
{
  "resourceType": "medic",
  "action": "list",
  "params": { "data.medicName": "Popescu", "data.canTakeAppointments": true }
}
```

Recommended tool name in Eleven Labs: `query_resources`

---

### Tool IDs per businessType (to be provided)
Provide the created Eleven Labs tool IDs you want attached on agent creation:

```json
{
  "dental": {
    "query_patient_booking": "{TOOL_ID}",
    "query_resources": "{TOOL_ID}"
  },
  "gym": {
    "query_patient_booking": "{TOOL_ID}",
    "query_resources": "{TOOL_ID}"
  },
  "hotel": {
    "query_patient_booking": "{TOOL_ID}",
    "query_resources": "{TOOL_ID}"
  }
}
```

Then call:

`POST /api/elevenlabs/activate/{businessId}-{locationId}` with body:
```json
{
  "toolIds": ["{TOOL_ID_1}", "{TOOL_ID_2}"]
}
```

The service will attach `tool_ids` on the agent's prompt configuration on creation.


