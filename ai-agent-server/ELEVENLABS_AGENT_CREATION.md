# 🎙️ Eleven Labs Agent Creation - Data Collection

## 📊 Откуда берем данные pentru crearea агента

### **Surse de Date**

```
┌─────────────────────────────────────────────────────────────┐
│  1. Request Body (Manual Admin Input)                       │
│  - locationId (REQUIRED)                                    │
│  - voiceId (OPTIONAL - default per limbă)                   │
│  - greeting (OPTIONAL - generat automat)                    │
│  - customPrompt (OPTIONAL)                                  │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  2. DynamoDB: business-info (Automatic)                     │
│  businessId → GetItem → BusinessInfo                        │
│  - businessName: "Clinica Dentara XYZ"                      │
│  - businessType: "dental" | "gym" | "hotel"                 │
│  - settings.language: "ro" | "en"                           │
│  - locations: [{                                            │
│      locationId: "L0100001",                                │
│      name: "Sediul Central",                                │
│      address: "Str. Principală Nr. 1",                      │
│      phone: "+40712345678",                                 │
│      email: "contact@clinica.ro"                            │
│    }]                                                       │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Generated Data (Automatic)                              │
│  - greeting: generat per businessType                       │
│  - systemPrompt: generat per businessType                   │
│  - voiceId: selectat per settings.language                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 API Call Example

### **Minimal Request** (Toate datele sunt auto-generate)

```bash
POST /api/elevenlabs/activate/B0100001
Content-Type: application/json

{
  "locationId": "L0100001"
}
```

**Ce se întâmplă:**

1. ✅ Service obține `BusinessInfo` din DynamoDB (`business-info` table)
   ```typescript
   const businessInfo = await businessInfoService.getBusinessInfo('B0100001');
   // Result:
   {
     businessId: 'B0100001',
     businessName: 'Clinica Dentara XYZ',
     businessType: 'dental',
     locations: [{
       locationId: 'L0100001',
       name: 'Sediul Central',
       address: 'Str. Principală Nr. 1',
       phone: '+40712345678'
     }],
     settings: {
       language: 'ro',
       currency: 'RON'
     }
   }
   ```

2. ✅ Generează **greeting** automat bazat pe `businessType`:
   ```typescript
   // Pentru dental:
   "Bună ziua! Sunt asistentul virtual al Clinica Dentara XYZ, locația Sediul Central. 
    Cu ce vă pot ajuta astăzi? Puteți programa o consultație, puteți întreba despre 
    serviciile noastre sau puteți verifica disponibilitatea."
   ```

3. ✅ Selectează **voiceId** bazat pe `settings.language`:
   ```typescript
   // Pentru limba română:
   voiceId = '21m00Tcm4TlvDq8ikWAM' // Rachel (neutral, professional)
   ```

4. ✅ Generează **systemPrompt** bazat pe `businessType`:
   ```typescript
   // Pentru dental - prompt specific pentru clinică dentară
   // Include: servicii dentare, workflow programări, limbaj medical, etc.
   ```

5. ✅ Creează agent pe Eleven Labs:
   ```javascript
   {
     name: "Clinica Dentara XYZ - Sediul Central",
     prompt: {
       system: "[Generated prompt for dental]",
       greeting: "[Generated greeting]"
     },
     voice: {
       voice_id: "21m00Tcm4TlvDq8ikWAM"
     },
     webhook: {
       url: "https://ai-agent-server.com/api/elevenlabs/webhook",
       metadata: {
         businessId: "B0100001"
       }
     }
   }
   ```

6. ✅ Salvează config în DynamoDB (`elevenlabs-agents` table):
   ```json
   {
     "businessId": "B0100001",
     "locationId": "L0100001",
     "enabled": true,
     "agentId": "agent_xyz123",
     "voiceId": "21m00Tcm4TlvDq8ikWAM",
     "greeting": "[Generated greeting]",
     "conversationSettings": {
       "maxDuration": 300,
       "recordCalls": true,
       "sendTranscripts": false
     }
   }
   ```

---

### **Custom Request** (Override defaults)

```bash
POST /api/elevenlabs/activate/B0100001
Content-Type: application/json

{
  "locationId": "L0100001",
  "voiceId": "pNInz6obpgDQGcFmaJgB",  // Adam (deep, masculine voice)
  "greeting": "Salutare! Bine ați venit la clinică!",
  "customPrompt": "You are a friendly dental assistant who uses casual language..."
}
```

**Ce se override:**
- ✅ `voiceId` → folosește vocea specificată (Adam)
- ✅ `greeting` → folosește greeting-ul custom
- ✅ `systemPrompt` → folosește prompt-ul custom
- ✅ Restul datelor (`businessName`, `location`, etc.) → din DynamoDB

---

## 🎨 Default Greetings per Business Type

### **Dental** (Professional, rassuring)
```
Bună ziua! Sunt asistentul virtual al {businessName}, locația {locationName}. 
Cu ce vă pot ajuta astăzi? Puteți programa o consultație, puteți întreba despre 
serviciile noastre sau puteți verifica disponibilitatea.
```

### **Gym** (Energetic, motivational)
```
Salut! Sunt asistentul virtual al {businessName}, sala {locationName}. 
Te pot ajuta cu programări la antrenamente, informații despre abonamente 
sau cursurile noastre.
```

### **Hotel** (Welcoming, elegant)
```
Bună ziua! Bine ați venit la {businessName}, locația {locationName}. 
Vă pot ajuta cu rezervări, informații despre camere sau serviciile 
hotelului nostru.
```

---

## 🎙️ Voice Selection

### **Voice IDs** (Eleven Labs)

```typescript
const voices = {
  // Neutral, professional (unisex)
  rachel: '21m00Tcm4TlvDq8ikWAM',      // DEFAULT pentru RO
  
  // Feminine voices
  bella: 'EXAVITQu4vr4xnSDxMaL',       // Friendly, warm
  elli: 'MF3mGyEYCl7XYWbV9V6O',        // Soft, professional
  
  // Masculine voices  
  adam: 'pNInz6obpgDQGcFmaJgB',        // Deep, authoritative
  callum: 'N2lVS1w4EtoT3dr4eOWO',     // Strong, confident
  
  // Character voices
  antoni: 'ErXwobaYiN019PkySvjV',      // Well-rounded, friendly
  josh: 'TxGEqnHWrfWFTfGW9XjX',       // Deep, smooth
};
```

### **Selection Logic**

```typescript
// Automatic selection based on language
if (language === 'ro' || language === 'romanian') {
  voiceId = 'rachel'; // Neutral, professional
}

// Override with custom voiceId if provided
if (params.voiceId) {
  voiceId = params.voiceId;
}
```

---

## 📝 System Prompt Generation

### **Template Structure**

```typescript
const promptTemplate = `
You are a helpful AI voice assistant for {businessName}, location {locationName}.

{BUSINESS_TYPE_SPECIFIC_INSTRUCTIONS}

Important Guidelines:
- Be friendly, professional, and concise
- Keep responses SHORT for voice (2-3 sentences maximum)
- Speak naturally and conversationally, avoid bullet points or lists
- Use simple language, avoid technical jargon
- If you don't have information, offer to have staff call them back
- Always confirm important details by repeating them back

When helping with bookings:
1. Ask for their preferred date and time
2. Check availability using the system (you have access to tools)
3. Collect their name and phone number
4. Confirm all details clearly
5. Let them know they'll receive a confirmation message

You have access to the booking system and can query availability and create appointments.
Keep the conversation natural and flowing, as if speaking to a friend.

IMPORTANT: Always respond in Romanian (limba română) unless the customer speaks another language.
`;
```

### **Business Type Instructions**

**Dental:**
```
You are assisting at a dental clinic. Your role:
- Help patients book appointments
- Answer questions about dental services (consultations, cleanings, treatments)
- Check doctor availability
- Provide general clinic information

Common services: dental consultations, teeth cleanings, fillings, root canals, 
whitening, orthodontics.
```

**Gym:**
```
You are assisting at a gym/fitness center. Your role:
- Help members book training sessions
- Answer questions about membership plans and classes
- Check trainer and class availability
- Provide information about facilities and equipment

Common services: personal training, group classes (yoga, spinning, crossfit), 
gym memberships.
```

**Hotel:**
```
You are assisting at a hotel. Your role:
- Help guests make room reservations
- Answer questions about rooms, amenities, and services
- Check room availability
- Provide information about hotel facilities

Common services: room bookings, spa services, restaurant reservations, room service.
```

---

## 🔄 Complete Flow Diagram

```
┌───────────────────────────────────────────────────────────────┐
│  Admin Request                                                │
│  POST /api/elevenlabs/activate/B0100001                       │
│  { locationId: "L0100001" }                                   │
└───────────────────────────────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────────┐
│  1. Validate Request                                          │
│  - Check ELEVENLABS_API_KEY exists                            │
│  - Check if already activated                                 │
└───────────────────────────────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────────┐
│  2. Fetch Business Info                                       │
│  businessInfoService.getBusinessInfo(businessId)              │
│  → DynamoDB: business-info table                              │
│  ✅ businessName, businessType, locations, settings           │
└───────────────────────────────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────────┐
│  3. Validate Location                                         │
│  businessInfo.locations.find(locationId)                      │
│  ✅ locationName, address, phone                              │
└───────────────────────────────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────────┐
│  4. Generate Defaults (if not provided)                       │
│  - greeting = generateDefaultGreeting(businessInfo, location) │
│  - voiceId = getDefaultVoiceId(settings.language)             │
│  - systemPrompt = buildDefaultPrompt(businessType)            │
└───────────────────────────────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────────┐
│  5. Create Agent on Eleven Labs                               │
│  POST https://api.elevenlabs.io/v1/convai/agents             │
│  {                                                            │
│    name: "BusinessName - LocationName",                       │
│    prompt: { system, greeting },                              │
│    voice: { voice_id },                                       │
│    webhook: { url, metadata: { businessId } }                 │
│  }                                                            │
│  → Returns: agentId                                           │
└───────────────────────────────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────────┐
│  6. Save Config to DynamoDB                                   │
│  PutItem: elevenlabs-agents table                             │
│  {                                                            │
│    businessId, locationId, enabled: true,                     │
│    agentId, voiceId, greeting, conversationSettings           │
│  }                                                            │
└───────────────────────────────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────────┐
│  7. Log Activation to Kinesis                                 │
│  → agent-log resource for audit trail                         │
└───────────────────────────────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────────┐
│  8. Return Success                                            │
│  {                                                            │
│    success: true,                                             │
│    agentId: "agent_xyz123",                                   │
│    message: "Eleven Labs conversational AI activated"         │
│  }                                                            │
└───────────────────────────────────────────────────────────────┘
```

---

## 📋 Summary: Data Requirements

| Field | Source | Required | Default | Example |
|-------|--------|----------|---------|---------|
| **businessId** | URL param | ✅ Yes | - | `B0100001` |
| **locationId** | Request body | ✅ Yes | - | `L0100001` |
| **businessName** | DynamoDB | Auto | - | `Clinica Dentara XYZ` |
| **businessType** | DynamoDB | Auto | `dental` | `dental` / `gym` / `hotel` |
| **locationName** | DynamoDB | Auto | - | `Sediul Central` |
| **language** | DynamoDB | Auto | `ro` | `ro` / `en` |
| **voiceId** | Request body | ❌ No | Per language | `21m00Tcm4TlvDq8ikWAM` |
| **greeting** | Request body | ❌ No | Per type | Auto-generated |
| **customPrompt** | Request body | ❌ No | Per type | Auto-generated |

---

## ✅ Avantaje ale acestui sistem

1. **🚀 Zero friction** - Admin doar specifică `businessId` + `locationId`
2. **🎯 Context-aware** - Greeting și prompt personalizate per business type
3. **🌍 Multi-language** - Voice selectat automat pe limbă
4. **🔄 Flexible** - Poți override orice field dacă vrei customizare
5. **📊 Consistent** - Toate datele din DynamoDB (single source of truth)
6. **🔐 Secure** - Un singur API key global (în env, nu în database)

---

**Totul este automatizat cu minim input de la admin! 🎉**

