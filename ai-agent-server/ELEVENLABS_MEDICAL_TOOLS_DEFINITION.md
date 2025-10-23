# ElevenLabs Medical Tools - Definirea Exactă

## Overview

Această documentație definește exact tool-urile ElevenLabs pentru sistemul medical, incluzând:
1. **Preluarea tratamentelor și datelor medicale**
2. **Gestionarea rezervărilor** (creare, anulare, reprogramare)
3. **Logging-ul apelurilor** la finalizarea acestora

---

## Tool 1: `query_patient_data` - Preluarea Datelor Medicale

### Scop
Permite agentului ElevenLabs să preia datele medicale ale pacienților, tratamentele și istoricul medical.

### Schema Tool-ului

```json
{
  "name": "query_patient_data",
  "description": "Retrieve patient medical data, treatments, and medical history. Use this to access patient information, treatment plans, and medical records.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "businessId": {
        "type": "string",
        "description": "Business identifier"
      },
      "locationId": {
        "type": "string", 
        "description": "Location identifier"
      },
      "action": {
        "type": "string",
        "enum": [
          "get_patient_info",
          "get_treatments",
          "get_medical_history",
          "search_patients"
        ],
        "description": "Action to perform on patient data"
      },
      "params": {
        "type": "object",
        "properties": {
          "patientId": {
            "type": "string",
            "description": "Patient ID (for specific patient actions)"
          },
          "patientName": {
            "type": "string", 
            "description": "Patient name (for search)"
          },
          "phoneNumber": {
            "type": "string",
            "description": "Patient phone number (for search)"
          },
          "treatmentType": {
            "type": "string",
            "description": "Filter by treatment type (dentistry, general, etc.)"
          },
          "dateFrom": {
            "type": "string",
            "format": "date",
            "description": "Start date for medical history (YYYY-MM-DD)"
          },
          "dateTo": {
            "type": "string", 
            "format": "date",
            "description": "End date for medical history (YYYY-MM-DD)"
          }
        }
      }
    },
    "required": ["businessId", "locationId", "action", "params"]
  }
}
```

### Exemple de Utilizare

#### 1. Căutare Pacient după Nume
```json
{
  "businessId": "B0100001",
  "locationId": "L0100001", 
  "action": "search_patients",
  "params": {
    "patientName": "Ion Popescu"
  }
}
```

#### 2. Informații Pacient Specific
```json
{
  "businessId": "B0100001",
  "locationId": "L0100001",
  "action": "get_patient_info", 
  "params": {
    "patientId": "P010045"
  }
}
```

#### 3. Tratamente Pacient
```json
{
  "businessId": "B0100001",
  "locationId": "L0100001",
  "action": "get_treatments",
  "params": {
    "patientId": "P010045",
    "treatmentType": "dentistry"
  }
}
```

#### 4. Istoric Medical
```json
{
  "businessId": "B0100001", 
  "locationId": "L0100001",
  "action": "get_medical_history",
  "params": {
    "patientId": "P010045",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-12-31"
  }
}
```

---

## Tool 2: `query_patient_booking` - Gestionarea Rezervărilor

### Scop
Permite agentului să gestioneze rezervările: verificare disponibilitate, creare rezervări, anulare și reprogramare.

### Schema Tool-ului

```json
{
  "name": "query_patient_booking",
  "description": "Manage patient appointments: check availability, create bookings, cancel appointments, and reschedule. Essential for appointment management.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "businessId": {
        "type": "string",
        "description": "Business identifier"
      },
      "locationId": {
        "type": "string",
        "description": "Location identifier" 
      },
      "action": {
        "type": "string",
        "enum": [
          "available-dates-with-slots",
          "reserve",
          "cancel-appointment", 
          "reschedule-appointment",
          "get-appointment-details"
        ],
        "description": "Booking action to perform"
      },
      "params": {
        "type": "object",
        "properties": {
          "appointmentId": {
            "type": "string",
            "description": "Appointment ID (for cancel/reschedule/get details)"
          },
          "patientId": {
            "type": "string", 
            "description": "Patient ID"
          },
          "accessCode": {
            "type": "string",
            "description": "Patient access code (for cancel/reschedule)"
          },
          "date": {
            "type": "string",
            "format": "date",
            "description": "Appointment date (YYYY-MM-DD)"
          },
          "time": {
            "type": "string",
            "pattern": "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
            "description": "Appointment time (HH:mm)"
          },
          "serviceId": {
            "type": "string",
            "description": "Service/treatment ID"
          },
          "medicId": {
            "type": "string",
            "description": "Doctor/medic ID"
          },
          "duration": {
            "type": "integer",
            "minimum": 15,
            "maximum": 240,
            "description": "Appointment duration in minutes"
          },
          "customer": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string",
                "description": "Customer name"
              },
              "email": {
                "type": "string",
                "format": "email",
                "description": "Customer email"
              },
              "phone": {
                "type": "string",
                "description": "Customer phone number"
              }
            },
            "required": ["name", "phone"]
          },
          "from": {
            "type": "string",
            "format": "date",
            "description": "Start date for availability search (YYYY-MM-DD)"
          },
          "to": {
            "type": "string", 
            "format": "date",
            "description": "End date for availability search (YYYY-MM-DD)"
          },
          "newDate": {
            "type": "string",
            "format": "date", 
            "description": "New date for rescheduling (YYYY-MM-DD)"
          },
          "newTime": {
            "type": "string",
            "pattern": "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
            "description": "New time for rescheduling (HH:mm)"
          }
        }
      }
    },
    "required": ["businessId", "locationId", "action", "params"]
  }
}
```

### Exemple de Utilizare

#### 1. Verificare Disponibilitate
```json
{
  "businessId": "B0100001",
  "locationId": "L0100001",
  "action": "available-dates-with-slots",
  "params": {
    "from": "2024-12-01",
    "to": "2024-12-31", 
    "serviceId": "T0100001",
    "medicId": "M0100001"
  }
}
```

#### 2. Creare Rezervare
```json
{
  "businessId": "B0100001",
  "locationId": "L0100001",
  "action": "reserve",
  "params": {
    "date": "2024-12-15",
    "time": "10:30",
    "serviceId": "T0100001", 
    "medicId": "M0100001",
    "duration": 30,
    "customer": {
      "name": "Ion Popescu",
      "email": "ion@example.com",
      "phone": "0712345678"
    }
  }
}
```

#### 3. Anulare Rezervare
```json
{
  "businessId": "B0100001",
  "locationId": "L0100001", 
  "action": "cancel-appointment",
  "params": {
    "appointmentId": "A0100123",
    "patientId": "P010045",
    "accessCode": "123456"
  }
}
```

#### 4. Reprogramare Rezervare
```json
{
  "businessId": "B0100001",
  "locationId": "L0100001",
  "action": "reschedule-appointment", 
  "params": {
    "appointmentId": "A0100123",
    "patientId": "P010045",
    "accessCode": "123456",
    "newDate": "2024-12-20",
    "newTime": "14:00"
  }
}
```

#### 5. Detalii Rezervare
```json
{
  "businessId": "B0100001",
  "locationId": "L0100001",
  "action": "get-appointment-details",
  "params": {
    "appointmentId": "A0100123"
  }
}
```

---

## Tool 3: `log_call_completion` - Logging Apeluri Finalizate

### Scop
Permite agentului ElevenLabs să logheze automat apelurile când acestea se finalizează, cu toate metadatele relevante.

### Schema Tool-ului

```json
{
  "name": "log_call_completion",
  "description": "Log completed voice calls with metadata including duration, cost, transcript, and call details. This tool is automatically called by ElevenLabs when a call ends.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "businessId": {
        "type": "string",
        "description": "Business identifier"
      },
      "locationId": {
        "type": "string",
        "description": "Location identifier"
      },
      "conversationId": {
        "type": "string",
        "description": "ElevenLabs conversation ID"
      },
      "callDuration": {
        "type": "integer",
        "description": "Call duration in seconds"
      },
      "cost": {
        "type": "number",
        "description": "Call cost in ElevenLabs units"
      },
      "startTime": {
        "type": "integer",
        "description": "Call start time (Unix timestamp)"
      },
      "status": {
        "type": "string",
        "enum": ["completed", "failed", "abandoned"],
        "description": "Call completion status"
      },
      "transcript": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "role": {
              "type": "string",
              "enum": ["agent", "user"]
            },
            "message": {
              "type": "string"
            },
            "timeInCallSecs": {
              "type": "number"
            }
          }
        },
        "description": "Call transcript"
      },
      "metadata": {
        "type": "object",
        "description": "Additional call metadata"
      }
    },
    "required": ["businessId", "locationId", "conversationId", "callDuration", "status"]
  }
}
```

### Exemple de Utilizare

#### 1. Logging Apel Completat
```json
{
  "businessId": "B0100001",
  "locationId": "L0100001",
  "conversationId": "conv_abc456",
  "callDuration": 180,
  "cost": 350,
  "startTime": 1739537297,
  "status": "completed",
  "transcript": [
    {
      "role": "agent",
      "message": "Bună ziua! Cum vă pot ajuta?",
      "timeInCallSecs": 0
    },
    {
      "role": "user", 
      "message": "Vreau o programare pentru mâine.",
      "timeInCallSecs": 5
    }
  ],
  "metadata": {
    "callType": "appointment_booking",
    "outcome": "successful_booking",
    "appointmentCreated": true
  }
}
```

#### 2. Logging Apel Eșuat
```json
{
  "businessId": "B0100001",
  "locationId": "L0100001", 
  "conversationId": "conv_def789",
  "callDuration": 45,
  "cost": 120,
  "startTime": 1739537400,
  "status": "failed",
  "metadata": {
    "failureReason": "no_availability",
    "callType": "appointment_booking"
  }
}
```

---

## Tool 4: `query_resources` - Resurse Medicale

### Scop
Permite agentului să acceseze resursele medicale: servicii, tratamente, medici disponibili.

### Schema Tool-ului

```json
{
  "name": "query_resources",
  "description": "Query medical resources: services, treatments, available doctors. Use this to help patients understand available options.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "businessId": {
        "type": "string",
        "description": "Business identifier"
      },
      "locationId": {
        "type": "string",
        "description": "Location identifier"
      },
      "resourceType": {
        "type": "string",
        "enum": ["treatment", "medic", "service"],
        "description": "Type of resource to query"
      },
      "action": {
        "type": "string",
        "enum": ["list", "search", "get_details"],
        "description": "Action to perform on resources"
      },
      "params": {
        "type": "object",
        "properties": {
          "treatmentType": {
            "type": "string",
            "description": "Filter by treatment type (dentistry, general, etc.)"
          },
          "name": {
            "type": "string",
            "description": "Search by name"
          },
          "medicName": {
            "type": "string", 
            "description": "Search by doctor name"
          },
          "canTakeAppointments": {
            "type": "boolean",
            "description": "Filter doctors who can take appointments"
          },
          "limit": {
            "type": "integer",
            "minimum": 1,
            "maximum": 100,
            "description": "Maximum number of results"
          }
        }
      }
    },
    "required": ["businessId", "locationId", "resourceType", "action", "params"]
  }
}
```

### Exemple de Utilizare

#### 1. Lista Tratamente
```json
{
  "businessId": "B0100001",
  "locationId": "L0100001",
  "resourceType": "treatment",
  "action": "list",
  "params": {
    "treatmentType": "dentistry",
    "limit": 20
  }
}
```

#### 2. Căutare Medic
```json
{
  "businessId": "B0100001", 
  "locationId": "L0100001",
  "resourceType": "medic",
  "action": "search",
  "params": {
    "medicName": "Popescu",
    "canTakeAppointments": true
  }
}
```

---

## Configurare ElevenLabs

### 1. Crearea Tool-urilor în ElevenLabs Dashboard

Pentru fiecare tool, creează un Client Tool în ElevenLabs cu următoarele configurații:

#### Tool 1: query_patient_data
- **Name**: `query_patient_data`
- **Description**: Retrieve patient medical data and treatments
- **Webhook URL**: `{AI_AGENT_SERVER_URL}/api/elevenlabs/tools/execute`
- **Method**: POST
- **Headers**: `Content-Type: application/json`

#### Tool 2: query_patient_booking  
- **Name**: `query_patient_booking`
- **Description**: Manage patient appointments and bookings
- **Webhook URL**: `{AI_AGENT_SERVER_URL}/api/elevenlabs/tools/execute`
- **Method**: POST
- **Headers**: `Content-Type: application/json`

#### Tool 3: log_call_completion
- **Name**: `log_call_completion` 
- **Description**: Log completed voice calls with metadata
- **Webhook URL**: `{AI_AGENT_SERVER_URL}/api/elevenlabs/tools/execute`
- **Method**: POST
- **Headers**: `Content-Type: application/json`

#### Tool 4: query_resources
- **Name**: `query_resources`
- **Description**: Query medical resources and services
- **Webhook URL**: `{AI_AGENT_SERVER_URL}/api/elevenlabs/tools/execute`
- **Method**: POST
- **Headers**: `Content-Type: application/json`

### 2. Activarea Tool-urilor pe Agent

După ce ai creat tool-urile, obține `tool_id`-urile și activează-le pe agent:

```bash
POST /api/elevenlabs/activate/{businessId}-{locationId}
Content-Type: application/json

{
  "toolIds": [
    "{TOOL_ID_query_patient_data}",
    "{TOOL_ID_query_patient_booking}", 
    "{TOOL_ID_log_call_completion}",
    "{TOOL_ID_query_resources}"
  ]
}
```

### 3. Configurare Webhook pentru Call Completion

Pentru logging automat al apelurilor, configurează webhook-ul în ElevenLabs:

```
Event Type: post_call_transcription
URL: {AI_AGENT_SERVER_URL}/api/elevenlabs/webhook
```

---

## Implementare Tehnică

### 1. Endpoint-ul Generic

Tool-urile folosesc endpoint-ul generic `/api/elevenlabs/tools/execute` care procesează:

```typescript
POST /api/elevenlabs/tools/execute
{
  "toolName": "query_patient_data",
  "parameters": {
    "businessId": "B0100001",
    "locationId": "L0100001", 
    "action": "get_patient_info",
    "params": { "patientId": "P010045" }
  },
  "conversationId": "conv_abc456",
  "metadata": {
    "businessId": "B0100001",
    "locationId": "L0100001"
  }
}
```

### 2. Logging Automat

Când un apel se finalizează, ElevenLabs trimite automat webhook către:

```
POST /api/elevenlabs/webhook
{
  "type": "post_call_transcription",
  "data": {
    "agent_id": "agent_xyz123",
    "conversation_id": "conv_abc456", 
    "status": "done",
    "transcript": [...],
    "metadata": {
      "start_time_unix_secs": 1739537297,
      "call_duration_secs": 180,
      "cost": 350
    }
  }
}
```

### 3. Integrare cu Sistemul Existent

Tool-urile se integrează cu:
- **App Server**: Pentru datele medicale și rezervări
- **Resources Server**: Pentru resursele medicale  
- **Kinesis**: Pentru logging-ul apelurilor
- **Elixir**: Pentru notificări în timp real

---

## Testing

### 1. Test Manual cu cURL

```bash
# Test query_patient_data
curl -X POST http://localhost:3003/api/elevenlabs/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "query_patient_data",
    "parameters": {
      "businessId": "B0100001",
      "locationId": "L0100001",
      "action": "search_patients", 
      "params": { "patientName": "Ion Popescu" }
    },
    "metadata": {
      "businessId": "B0100001",
      "locationId": "L0100001"
    }
  }'
```

### 2. Test Call Completion Webhook

```bash
# Test webhook post_call_transcription
curl -X POST http://localhost:3003/api/elevenlabs/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "post_call_transcription",
    "data": {
      "agent_id": "agent_xyz123",
      "conversation_id": "conv_test_123",
      "status": "done",
      "transcript": [
        {
          "role": "agent",
          "message": "Bună ziua!",
          "time_in_call_secs": 0
        }
      ],
      "metadata": {
        "start_time_unix_secs": 1739537297,
        "call_duration_secs": 180,
        "cost": 350
      }
    }
  }'
```

---

## Concluzie

Aceste 4 tool-uri ElevenLabs oferă funcționalitatea completă pentru sistemul medical:

1. ✅ **Preluarea datelor medicale** (`query_patient_data`)
2. ✅ **Gestionarea rezervărilor** (`query_patient_booking`) 
3. ✅ **Logging-ul apelurilor** (`log_call_completion`)
4. ✅ **Accesul la resurse** (`query_resources`)

Tool-urile sunt configurate pentru a funcționa cu sistemul existent și oferă toate funcționalitățile necesare pentru un agent medical complet.
