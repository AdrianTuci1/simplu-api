# Meta OAuth Frontend Redirect Guide

## Problema

Meta OAuth necesită ca `redirect_uri` să fie **identic** în ambele cereri:
1. Când se generează URL-ul de autorizare
2. Când se face exchange-ul codului pentru token

**NU poți** să ștergi `redirect_uri` din cererea de token exchange - Meta API va returna eroare 400.

## Soluția: Redirect la Frontend

### Arhitectura Flow-ului

```
User → Frontend → Meta OAuth → Frontend (cu code) → Backend (exchange code) → Success
```

### Configurare

#### 1. Setează `META_REDIRECT_URI` la URL-ul Frontend-ului

```bash
# .env
META_REDIRECT_URI=http://localhost:3000/auth/meta/callback
# sau pentru producție:
META_REDIRECT_URI=https://yourdomain.com/auth/meta/callback
```

#### 2. Configurează în Meta App Dashboard

În **Facebook Login Settings** → **Valid OAuth Redirect URIs**, adaugă:
- `http://localhost:3000/auth/meta/callback` (development)
- `https://yourdomain.com/auth/meta/callback` (production)

### Implementare Frontend

#### Step 1: Obține URL-ul OAuth de la Backend

```typescript
// Frontend: Inițiază autentificarea
async function startMetaAuth(businessId: string, locationId: string) {
  const response = await fetch(
    `http://localhost:3003/external/meta/auth-url?businessId=${businessId}&locationId=${locationId}`
  );
  const data = await response.json();
  
  // data = { url: "...", clientId: "...", redirectUri: "..." }
  
  // Redirecționează utilizatorul la Meta OAuth
  window.location.href = data.url;
}
```

#### Step 2: Creează Pagina de Callback în Frontend

```typescript
// Frontend: /auth/meta/callback
import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export function MetaCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    if (error) {
      console.error('Meta OAuth error:', error);
      navigate('/settings?error=meta_auth_failed');
      return;
    }
    
    if (code && state) {
      // Trimite codul la backend pentru exchange
      exchangeCodeForToken(code, state);
    }
  }, [searchParams, navigate]);
  
  async function exchangeCodeForToken(code: string, state: string) {
    try {
      const response = await fetch(
        `http://localhost:3003/external/meta/callback?code=${code}&state=${state}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to exchange token');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Succes! Redirecționează la settings
        navigate('/settings?success=meta_connected');
      }
    } catch (error) {
      console.error('Token exchange error:', error);
      navigate('/settings?error=meta_token_exchange_failed');
    }
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Conectare Meta în curs...</h2>
        <p className="text-gray-600">Vă rugăm așteptați...</p>
      </div>
    </div>
  );
}
```

#### Step 3: Verifică Status în Settings

```typescript
// Frontend: Settings page
async function checkMetaStatus(businessId: string, locationId: string) {
  const response = await fetch(
    `http://localhost:3003/external/meta/status?businessId=${businessId}&locationId=${locationId}`
  );
  const status = await response.json();
  
  // status = { connected: true/false, hasAccessToken: true/false, ... }
  return status;
}
```

### Flow Complet

1. **User clicks "Connect Meta"** în frontend
2. **Frontend** → `GET /external/meta/auth-url` → primește `{ url, clientId, redirectUri }`
3. **Frontend** → Redirecționează la `url` (Meta OAuth)
4. **User** → Autentificare pe Meta + Acordă permisiuni
5. **Meta** → Redirecționează la `META_REDIRECT_URI` (frontend) cu `?code=...&state=...`
6. **Frontend** → Callback page prinde `code` și `state`
7. **Frontend** → `GET /external/meta/callback?code=...&state=...` (backend)
8. **Backend** → Exchange code pentru token + Salvează în DynamoDB
9. **Backend** → Returnează `{ success: true }`
10. **Frontend** → Redirecționează la settings cu mesaj de succes

### Exemplu Vue.js

```vue
<template>
  <div>
    <button @click="connectMeta" :disabled="loading">
      {{ metaConnected ? 'Meta Connected ✓' : 'Connect Meta' }}
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const loading = ref(false);
const metaConnected = ref(false);
const businessId = 'your-business-id';
const locationId = 'your-location-id';

onMounted(async () => {
  await checkStatus();
});

async function connectMeta() {
  loading.value = true;
  try {
    const response = await fetch(
      `http://localhost:3003/external/meta/auth-url?businessId=${businessId}&locationId=${locationId}`
    );
    const data = await response.json();
    window.location.href = data.url;
  } catch (error) {
    console.error('Failed to start Meta auth:', error);
    loading.value = false;
  }
}

async function checkStatus() {
  try {
    const response = await fetch(
      `http://localhost:3003/external/meta/status?businessId=${businessId}&locationId=${locationId}`
    );
    const status = await response.json();
    metaConnected.value = status.connected;
  } catch (error) {
    console.error('Failed to check Meta status:', error);
  }
}
</script>
```

### Exemplu React

```jsx
import { useState, useEffect } from 'react';

function MetaConnectButton({ businessId, locationId }) {
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    checkStatus();
  }, []);
  
  async function checkStatus() {
    try {
      const response = await fetch(
        `http://localhost:3003/external/meta/status?businessId=${businessId}&locationId=${locationId}`
      );
      const status = await response.json();
      setConnected(status.connected);
    } catch (error) {
      console.error('Failed to check Meta status:', error);
    }
  }
  
  async function handleConnect() {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3003/external/meta/auth-url?businessId=${businessId}&locationId=${locationId}`
      );
      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      console.error('Failed to start Meta auth:', error);
      setLoading(false);
    }
  }
  
  return (
    <button 
      onClick={handleConnect} 
      disabled={loading || connected}
      className={connected ? 'btn-success' : 'btn-primary'}
    >
      {connected ? 'Meta Connected ✓' : 'Connect Meta'}
    </button>
  );
}
```

## Important! 

### redirect_uri TREBUIE să fie prezent în ambele cereri

```javascript
// ❌ GREȘIT - Nu șterge redirect_uri din token exchange
params: { client_id, client_secret, code }

// ✅ CORECT - redirect_uri trebuie să fie identic cu cel din authorization
params: { client_id, client_secret, redirect_uri, code }
```

### Debugging

Dacă primești eroare 400, verifică în logs:
```
Meta OAuth token exchange failed for businessId: xxx
{
  error: "...",
  response: { error: { message: "..." } },
  params: { clientId: "...", redirectUri: "...", hasCode: true }
}
```

Cauze comune pentru eroarea 400:
1. ❌ `redirect_uri` lipsă din cererea de token exchange
2. ❌ `redirect_uri` diferit între authorization și token exchange
3. ❌ `redirect_uri` nu este whitelisted în Meta App Dashboard
4. ❌ `code` expirat (codes expiră după 10 minute)
5. ❌ `code` deja folosit (poate fi folosit o singură dată)

## Testare

1. Start backend: `cd ai-agent-server && npm run start:dev`
2. Start frontend: `cd frontend && npm run dev`
3. Click pe "Connect Meta" button
4. Autentifică-te pe Meta
5. Verifică logs pentru debugging

Logs utile:
```
[MetaService] Meta OAuth URL generated for businessId: xxx, locationId: yyy, clientId: zzz, redirectUri: http://localhost:3000/auth/meta/callback
[MetaService] Processing Meta OAuth callback for businessId: xxx, locationId: yyy
[MetaService] Exchanging code for token with params: clientId=zzz, redirectUri=http://localhost:3000/auth/meta/callback
[MetaService] Short-lived access token obtained for businessId: xxx
[MetaService] Long-lived access token obtained for businessId: xxx
[MetaService] Meta credentials saved successfully for businessId: xxx
```

