# 🎙️ Eleven Labs - User Management Guide

## Overview

Această documentație explică diferența între **Admin Actions** și **Business Owner Actions** pentru managementul Eleven Labs.

---

## 👥 User Roles

### **1. Admin** (Management Server)
- **Poate**: Activa/Dezactiva/Șterge agent-ul complet
- **Acces**: Toate endpoint-urile
- **Use case**: Setup inițial, troubleshooting, delete agent

### **2. Business Owner** (Frontend User)
- **Poate**: Enable/Disable agent, modifica greeting și prompt
- **NU poate**: Crea agent nou (trebuie admin), șterge agent complet
- **Use case**: Management zilnic, personalizare mesaje

---

## 🔐 API Endpoints

### **Admin Endpoints** (Require AdminGuard)

#### 1. **Activate** (Create Agent)
```bash
POST /api/elevenlabs/activate/:businessId
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "locationId": "L0100001"
  # Optional:
  "voiceId": "...",
  "greeting": "...",
  "customPrompt": "..."
}

# Response:
{
  "success": true,
  "agentId": "agent_xyz123",
  "message": "Eleven Labs conversational AI activated successfully"
}
```

**Ce face:**
- Creează agent NOU pe Eleven Labs (API call)
- Salvează config în DynamoDB
- Generează greeting și prompt automat (dacă nu sunt specificate)

---

#### 2. **Delete Configuration**
```bash
DELETE /api/elevenlabs/deactivate/:businessId?locationId=L0100001
Authorization: Bearer <admin_token>

# Response:
{
  "success": true,
  "message": "Eleven Labs conversational AI deactivated successfully"
}
```

**Ce face:**
- Setează `enabled: false` în DynamoDB
- PĂSTREAZĂ agentId pentru reactivare
- NU șterge agent-ul de pe Eleven Labs

---

#### 3. **List All Agents for Business**
```bash
GET /api/elevenlabs/agents/:businessId
Authorization: Bearer <admin_token>

# Response:
{
  "success": true,
  "count": 2,
  "agents": [
    {
      "locationId": "L0100001",
      "enabled": true,
      "agentId": "agent_xyz123",
      "voiceId": "21m00Tcm4TlvDq8ikWAM",
      "greeting": "...",
      "conversationSettings": { ... },
      "createdAt": "2025-10-15T10:00:00Z",
      "updatedAt": "2025-10-15T10:00:00Z"
    },
    {
      "locationId": "L0100002",
      "enabled": false,
      "agentId": "agent_abc456",
      ...
    }
  ]
}
```

---

### **Business Owner Endpoints** (Public/Protected by BusinessAuth)

#### 1. **Get My Configuration**
```bash
GET /api/elevenlabs/my-config/:businessId?locationId=L0100001
Authorization: Bearer <user_token>

# Response (if configured):
{
  "configured": true,
  "enabled": true,
  "greeting": "Bună ziua! Sunt asistentul virtual...",
  "customPrompt": "You are a helpful assistant...",
  "voiceId": "21m00Tcm4TlvDq8ikWAM",
  "conversationSettings": {
    "maxDuration": 300,
    "recordCalls": true,
    "sendTranscripts": false
  },
  "createdAt": "2025-10-15T10:00:00Z",
  "updatedAt": "2025-10-15T12:30:00Z"
}

# Response (if NOT configured):
{
  "configured": false,
  "enabled": false,
  "message": "Eleven Labs not configured for this location. Contact admin to activate."
}
```

**Use case pentru Frontend:**
```typescript
// Check if Eleven Labs is available
const response = await fetch('/api/elevenlabs/my-config/B0100001?locationId=L0100001');
const config = await response.json();

if (!config.configured) {
  // Show message: "Contact support to activate voice assistant"
} else if (!config.enabled) {
  // Show toggle: "Voice assistant is disabled. Enable?"
} else {
  // Show: "Voice assistant is active"
  // Show edit buttons for greeting and prompt
}
```

---

#### 2. **Update My Configuration**
```bash
POST /api/elevenlabs/my-config/:businessId
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "locationId": "L0100001",
  "greeting": "Salutare! Bine ați venit la clinică!",
  "customPrompt": "You are a friendly dental assistant...",
  "conversationSettings": {
    "maxDuration": 600,
    "recordCalls": true,
    "sendTranscripts": true
  }
}

# Response:
{
  "success": true,
  "message": "Configuration updated successfully"
}
```

**Ce poate modifica Business Owner:**
- ✅ `greeting` - mesajul de început
- ✅ `customPrompt` - system prompt
- ✅ `conversationSettings` - setări convorbiri
- ❌ `voiceId` - NU (ar necesita recreare agent)
- ❌ `agentId` - NU (read-only)

---

#### 3. **Toggle Enable/Disable**
```bash
POST /api/elevenlabs/toggle/:businessId
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "locationId": "L0100001",
  "enabled": true  # or false
}

# Response (success):
{
  "success": true,
  "message": "Configuration updated successfully"
}

# Response (not configured):
{
  "success": false,
  "message": "Agent not configured yet. Please activate first (admin only)."
}
```

**Flow:**
```typescript
// User toggles switch in UI
const toggleVoiceAssistant = async (enabled: boolean) => {
  const response = await fetch(`/api/elevenlabs/toggle/B0100001`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locationId: 'L0100001',
      enabled
    })
  });
  
  const result = await response.json();
  
  if (!result.success) {
    // Show error: "Agent not configured. Contact support."
  } else {
    // Update UI: "Voice assistant is now " + (enabled ? "active" : "disabled")
  }
};
```

---

## 🎨 Frontend UI Example

### **Settings Page - Voice Assistant Section**

```typescript
interface VoiceAssistantSettings {
  configured: boolean;
  enabled: boolean;
  greeting?: string;
  customPrompt?: string;
  conversationSettings?: {
    maxDuration: number;
    recordCalls: boolean;
    sendTranscripts: boolean;
  };
}

function VoiceAssistantPanel() {
  const [config, setConfig] = useState<VoiceAssistantSettings | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  useEffect(() => {
    fetchConfig();
  }, []);
  
  const fetchConfig = async () => {
    const response = await fetch(`/api/elevenlabs/my-config/${businessId}?locationId=${locationId}`);
    const data = await response.json();
    setConfig(data);
  };
  
  if (!config?.configured) {
    return (
      <div className="voice-assistant-panel">
        <h3>🎙️ Asistent Vocal (Eleven Labs)</h3>
        <p>Serviciul nu este activat pentru această locație.</p>
        <p>Contactați suportul pentru activare.</p>
      </div>
    );
  }
  
  return (
    <div className="voice-assistant-panel">
      <div className="header">
        <h3>🎙️ Asistent Vocal</h3>
        <Toggle
          checked={config.enabled}
          onChange={(enabled) => toggleEnabled(enabled)}
          label={config.enabled ? "Activ" : "Dezactivat"}
        />
      </div>
      
      {config.enabled && (
        <div className="config-details">
          <div className="field">
            <label>Mesaj de Întâmpinare</label>
            {isEditing ? (
              <textarea
                value={config.greeting}
                onChange={(e) => setConfig({ ...config, greeting: e.target.value })}
                rows={3}
              />
            ) : (
              <p>{config.greeting}</p>
            )}
          </div>
          
          <div className="field">
            <label>System Prompt (Instrucțiuni pentru Agent)</label>
            {isEditing ? (
              <textarea
                value={config.customPrompt}
                onChange={(e) => setConfig({ ...config, customPrompt: e.target.value })}
                rows={6}
              />
            ) : (
              <p>{config.customPrompt}</p>
            )}
          </div>
          
          <div className="field">
            <label>Setări Convorbiri</label>
            <div className="settings-grid">
              <label>
                <input
                  type="checkbox"
                  checked={config.conversationSettings?.recordCalls}
                  onChange={(e) => updateSetting('recordCalls', e.target.checked)}
                />
                Înregistrează apelurile
              </label>
              
              <label>
                <input
                  type="checkbox"
                  checked={config.conversationSettings?.sendTranscripts}
                  onChange={(e) => updateSetting('sendTranscripts', e.target.checked)}
                />
                Trimite transcrierile clientului
              </label>
              
              <label>
                Durată maximă:
                <input
                  type="number"
                  value={config.conversationSettings?.maxDuration || 300}
                  onChange={(e) => updateSetting('maxDuration', parseInt(e.target.value))}
                />
                secunde
              </label>
            </div>
          </div>
          
          <div className="actions">
            {isEditing ? (
              <>
                <button onClick={saveChanges}>Salvează</button>
                <button onClick={() => setIsEditing(false)}>Anulează</button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)}>Editează</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 🔄 User Flow Diagrams

### **Setup Flow (Admin → User)**

```
1. Admin activează Eleven Labs pentru business
   POST /api/elevenlabs/activate/B0100001
   → Agent creat pe Eleven Labs
   → Config salvat în DynamoDB (enabled: true)

2. User accesează Settings → Voice Assistant
   GET /api/elevenlabs/my-config/B0100001
   → configured: true, enabled: true
   → Afișează UI cu greeting și prompt

3. User modifică greeting-ul
   POST /api/elevenlabs/my-config/B0100001
   { greeting: "Nou greeting..." }
   → Update în DynamoDB

4. User dezactivează temporar
   POST /api/elevenlabs/toggle/B0100001
   { enabled: false }
   → enabled: false în DynamoDB
   → Agent rămâne pe Eleven Labs (nu e șters)

5. User reactivează
   POST /api/elevenlabs/toggle/B0100001
   { enabled: true }
   → enabled: true în DynamoDB
   → Agent imediat funcțional (fără recreare)
```

---

### **Permission Matrix**

| Action | Admin | Business Owner | Notes |
|--------|-------|----------------|-------|
| **Create Agent** | ✅ Yes | ❌ No | Necesită API call la Eleven Labs |
| **Delete Agent** | ✅ Yes | ❌ No | Șterge complet din DynamoDB |
| **Enable/Disable** | ✅ Yes | ✅ Yes | Toggle flag în DynamoDB |
| **Update Greeting** | ✅ Yes | ✅ Yes | Update DynamoDB |
| **Update Prompt** | ✅ Yes | ✅ Yes | Update DynamoDB |
| **Update Voice** | ✅ Yes | ❌ No | Ar necesita recreare agent |
| **View Config** | ✅ Yes | ✅ Yes | Read DynamoDB |
| **List All Agents** | ✅ Yes | ❌ No | Query all locations |

---

## 📝 Example API Calls

### **Complete User Workflow**

```bash
# 1. Check configuration
GET /api/elevenlabs/my-config/B0100001?locationId=L0100001

# Response:
{
  "configured": true,
  "enabled": true,
  "greeting": "Bună ziua! Sunt asistentul virtual...",
  "customPrompt": "You are a helpful dental assistant...",
  ...
}

# 2. Update greeting
POST /api/elevenlabs/my-config/B0100001
{
  "locationId": "L0100001",
  "greeting": "Salutare! Cum vă pot ajuta astăzi?"
}

# 3. Disable temporarily
POST /api/elevenlabs/toggle/B0100001
{
  "locationId": "L0100001",
  "enabled": false
}

# 4. Re-enable
POST /api/elevenlabs/toggle/B0100001
{
  "locationId": "L0100001",
  "enabled": true
}
```

---

## ✅ Benefits

1. **Clear Separation**: Admin setup vs User management
2. **Self-Service**: Business owners pot personaliza fără suport
3. **Safe**: Users nu pot șterge sau corupe agent-ul
4. **Flexible**: Enable/disable rapid fără recreare
5. **Audit**: Toate modificările loguite în updatedAt

---

## 🚀 Frontend Integration Points

### **Required API Calls**

1. **On Settings Page Load**:
   ```typescript
   GET /api/elevenlabs/my-config/:businessId?locationId=:locationId
   ```

2. **On Toggle Switch**:
   ```typescript
   POST /api/elevenlabs/toggle/:businessId
   { locationId, enabled }
   ```

3. **On Save Configuration**:
   ```typescript
   POST /api/elevenlabs/my-config/:businessId
   { locationId, greeting, customPrompt, conversationSettings }
   ```

---

**Gata pentru integrare în frontend! 🎉**

