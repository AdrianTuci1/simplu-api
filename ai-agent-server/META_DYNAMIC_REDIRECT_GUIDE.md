# Meta OAuth cu Redirect URI Dinamic

## Overview

Dacă aplicația ta frontend rulează pe URL-uri dinamice (ex: subdomains per-tenant, multi-domain, etc.), poți specifica `redirect_uri` dinamic la fiecare cerere de autorizare.

## Cum Funcționează

### 1. Frontend-ul specifică `redirect_uri` când cere URL-ul OAuth

```typescript
// Frontend: Construiește redirect_uri dinamic
const currentOrigin = window.location.origin; // ex: https://business1.myapp.com
const redirectUri = `${currentOrigin}/auth/meta/callback`;

// Cerere către backend CU redirect_uri custom
const response = await fetch(
  `http://localhost:3003/external/meta/auth-url?` +
  `businessId=${businessId}&` +
  `locationId=${locationId}&` +
  `redirectUri=${encodeURIComponent(redirectUri)}`
);

const data = await response.json();
// data = { url: "...", clientId: "...", redirectUri: "https://business1.myapp.com/auth/meta/callback" }

// Redirect la Meta OAuth
window.location.href = data.url;
```

### 2. Backend-ul salvează `redirect_uri` în `state`

Backend-ul:
1. Primește `redirect_uri` din query parameter
2. Îl include în `state` (base64url encoded JSON)
3. Generează URL-ul OAuth cu acest `redirect_uri`

```json
state = base64url({
  "businessId": "biz123",
  "locationId": "loc456",
  "redirectUri": "https://business1.myapp.com/auth/meta/callback"
})
```

### 3. Meta redirecționează înapoi cu `state`

```
https://business1.myapp.com/auth/meta/callback?code=ABC123&state=eyJidXNpbmVzc0lk...
```

### 4. Frontend trimite `code` și `state` la backend

```typescript
// Frontend callback page
const code = searchParams.get('code');
const state = searchParams.get('state');

await fetch(
  `http://localhost:3003/external/meta/callback?code=${code}&state=${state}`
);
```

### 5. Backend extrage `redirect_uri` din `state` și face token exchange

Backend-ul:
1. Decodează `state` și extrage `redirectUri`
2. Folosește **ACELAȘI** `redirectUri` pentru token exchange
3. ✅ Meta validează că `redirect_uri` este identic → Success!

## Exemple Complete

### React/Next.js Multi-tenant

```tsx
// hooks/useMetaAuth.ts
import { useState } from 'react';
import { useRouter } from 'next/router';

export function useMetaAuth() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  async function connectMeta(businessId: string, locationId: string) {
    setLoading(true);
    
    try {
      // Construiește redirect_uri dinamic bazat pe current origin
      const redirectUri = `${window.location.origin}/auth/meta/callback`;
      
      const response = await fetch(
        `/api/meta/auth-url?` +
        `businessId=${businessId}&` +
        `locationId=${locationId}&` +
        `redirectUri=${encodeURIComponent(redirectUri)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to get auth URL');
      }
      
      const data = await response.json();
      
      // Redirect la Meta OAuth
      window.location.href = data.url;
    } catch (error) {
      console.error('Failed to start Meta auth:', error);
      setLoading(false);
    }
  }
  
  return { connectMeta, loading };
}

// pages/settings.tsx
import { useMetaAuth } from '@/hooks/useMetaAuth';

export default function SettingsPage() {
  const { connectMeta, loading } = useMetaAuth();
  
  const handleConnect = () => {
    const businessId = 'your-business-id';
    const locationId = 'your-location-id';
    connectMeta(businessId, locationId);
  };
  
  return (
    <button onClick={handleConnect} disabled={loading}>
      Connect Meta
    </button>
  );
}

// pages/auth/meta/callback.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function MetaCallbackPage() {
  const router = useRouter();
  const { code, state, error } = router.query;
  
  useEffect(() => {
    if (error) {
      router.push('/settings?error=meta_auth_failed');
      return;
    }
    
    if (code && state) {
      exchangeToken(code as string, state as string);
    }
  }, [code, state, error]);
  
  async function exchangeToken(code: string, state: string) {
    try {
      const response = await fetch(
        `/api/meta/callback?code=${code}&state=${state}`
      );
      
      if (!response.ok) {
        throw new Error('Token exchange failed');
      }
      
      router.push('/settings?success=meta_connected');
    } catch (error) {
      console.error('Token exchange error:', error);
      router.push('/settings?error=meta_token_exchange_failed');
    }
  }
  
  return <div>Conectare Meta în curs...</div>;
}

// pages/api/meta/auth-url.ts (Next.js API route - proxy la backend)
export default async function handler(req, res) {
  const { businessId, locationId, redirectUri } = req.query;
  
  const backendUrl = 
    `${process.env.BACKEND_URL}/external/meta/auth-url?` +
    `businessId=${businessId}&` +
    `locationId=${locationId}&` +
    `redirectUri=${encodeURIComponent(redirectUri)}`;
  
  const response = await fetch(backendUrl);
  const data = await response.json();
  
  res.json(data);
}

// pages/api/meta/callback.ts (Next.js API route - proxy la backend)
export default async function handler(req, res) {
  const { code, state } = req.query;
  
  const backendUrl = 
    `${process.env.BACKEND_URL}/external/meta/callback?` +
    `code=${code}&state=${state}`;
  
  const response = await fetch(backendUrl);
  const data = await response.json();
  
  res.json(data);
}
```

### Vue.js Multi-domain

```vue
<!-- composables/useMetaAuth.ts -->
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

export function useMetaAuth() {
  const loading = ref(false);
  const router = useRouter();
  
  async function connectMeta(businessId: string, locationId: string) {
    loading.value = true;
    
    try {
      // Redirect URI dinamic
      const redirectUri = `${window.location.origin}/auth/meta/callback`;
      
      const params = new URLSearchParams({
        businessId,
        locationId,
        redirectUri
      });
      
      const response = await fetch(
        `http://localhost:3003/external/meta/auth-url?${params}`
      );
      
      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      console.error('Failed to start Meta auth:', error);
      loading.value = false;
    }
  }
  
  return { connectMeta, loading };
}
</script>

<!-- pages/Settings.vue -->
<template>
  <div>
    <button @click="handleConnect" :disabled="loading">
      Connect Meta
    </button>
  </div>
</template>

<script setup>
import { useMetaAuth } from '@/composables/useMetaAuth';

const { connectMeta, loading } = useMetaAuth();
const businessId = 'your-business-id';
const locationId = 'your-location-id';

function handleConnect() {
  connectMeta(businessId, locationId);
}
</script>

<!-- pages/auth/MetaCallback.vue -->
<template>
  <div>Conectare Meta în curs...</div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

onMounted(async () => {
  const { code, state, error } = route.query;
  
  if (error) {
    router.push('/settings?error=meta_auth_failed');
    return;
  }
  
  if (code && state) {
    try {
      const response = await fetch(
        `http://localhost:3003/external/meta/callback?code=${code}&state=${state}`
      );
      
      if (!response.ok) throw new Error('Token exchange failed');
      
      router.push('/settings?success=meta_connected');
    } catch (error) {
      router.push('/settings?error=meta_token_exchange_failed');
    }
  }
});
</script>
```

### Vanilla JavaScript / SPA

```javascript
// auth.js
class MetaAuth {
  constructor(backendUrl) {
    this.backendUrl = backendUrl;
  }
  
  async startAuth(businessId, locationId) {
    // Construiește redirect URI dinamic
    const redirectUri = `${window.location.origin}/auth/meta/callback`;
    
    const params = new URLSearchParams({
      businessId,
      locationId,
      redirectUri
    });
    
    const response = await fetch(
      `${this.backendUrl}/external/meta/auth-url?${params}`
    );
    
    const data = await response.json();
    
    // Redirect la Meta OAuth
    window.location.href = data.url;
  }
  
  async handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    
    if (error) {
      window.location.href = '/settings?error=meta_auth_failed';
      return;
    }
    
    if (code && state) {
      try {
        const response = await fetch(
          `${this.backendUrl}/external/meta/callback?code=${code}&state=${state}`
        );
        
        if (!response.ok) throw new Error('Token exchange failed');
        
        window.location.href = '/settings?success=meta_connected';
      } catch (error) {
        console.error('Token exchange error:', error);
        window.location.href = '/settings?error=meta_token_exchange_failed';
      }
    }
  }
}

// Folosire
const metaAuth = new MetaAuth('http://localhost:3003');

// În pagina de settings
document.getElementById('connect-meta-btn').addEventListener('click', () => {
  metaAuth.startAuth('business-id', 'location-id');
});

// În pagina de callback
if (window.location.pathname === '/auth/meta/callback') {
  metaAuth.handleCallback();
}
```

## Scenarii de Folosire

### 1. Multi-tenant cu Subdomains

```
business1.myapp.com → redirectUri: https://business1.myapp.com/auth/meta/callback
business2.myapp.com → redirectUri: https://business2.myapp.com/auth/meta/callback
business3.myapp.com → redirectUri: https://business3.myapp.com/auth/meta/callback
```

### 2. Multi-domain

```
mybusiness.com      → redirectUri: https://mybusiness.com/auth/meta/callback
another-site.com    → redirectUri: https://another-site.com/auth/meta/callback
custom-domain.net   → redirectUri: https://custom-domain.net/auth/meta/callback
```

### 3. Development vs Production

```javascript
const redirectUri = 
  process.env.NODE_ENV === 'production'
    ? `https://${window.location.hostname}/auth/meta/callback`
    : 'http://localhost:3000/auth/meta/callback';
```

## Important: Meta App Configuration

În **Meta App Dashboard** → **Facebook Login** → **Valid OAuth Redirect URIs**, trebuie să adaugi:

### Pentru Development
```
http://localhost:3000/auth/meta/callback
http://localhost:3001/auth/meta/callback
```

### Pentru Production (cu wildcards NU funcționează!)
Trebuie să adaugi **fiecare** redirect URI exact:
```
https://business1.myapp.com/auth/meta/callback
https://business2.myapp.com/auth/meta/callback
https://mybusiness.com/auth/meta/callback
https://another-site.com/auth/meta/callback
```

**Notă**: Meta nu acceptă wildcards (ex: `https://*.myapp.com/*`), trebuie să adaugi fiecare URL exact!

### Soluție pentru Multi-tenant Scalabil

Dacă ai foarte multe tenants și nu vrei să adaugi manual fiecare URL:

#### Opțiunea 1: Centralized Redirect (Recomandat)
Folosește un singur redirect URI pentru toți tenants:
```
https://auth.myapp.com/meta/callback
```

După callback, redirectezi la tenant-specific frontend cu rezultatul.

#### Opțiunea 2: Backend Endpoint ca Redirect
```bash
META_REDIRECT_URI=https://api.myapp.com/external/meta/callback
```

Backend-ul primește callback-ul și redirectează la frontend cu rezultatul:

```typescript
// În meta.controller.ts
@Get('callback')
async callback(
  @Query('code') code: string, 
  @Query('state') state: string,
  @Res() res: Response
) {
  const result = await this.meta.handleCallback(code, state);
  
  // Decodează state pentru a obține frontend URL-ul
  const stateData = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
  const frontendUrl = stateData.frontendUrl || 'http://localhost:3000';
  
  // Redirect înapoi la frontend cu rezultat
  if (result.success) {
    res.redirect(`${frontendUrl}/settings?success=meta_connected`);
  } else {
    res.redirect(`${frontendUrl}/settings?error=meta_connection_failed`);
  }
}
```

## Debugging

Dacă primești eroare 400 cu redirect_uri, verifică în logs:

```
[MetaService] Meta OAuth URL generated for businessId: xxx, locationId: yyy, clientId: zzz, redirectUri: https://business1.myapp.com/auth/meta/callback
[MetaService] Processing Meta OAuth callback for businessId: xxx, locationId: yyy, redirectUri: https://business1.myapp.com/auth/meta/callback
[MetaService] Exchanging code for token with params: clientId=zzz, redirectUri=https://business1.myapp.com/auth/meta/callback
```

Asigură-te că:
- ✅ `redirectUri` este **identic** în toate 3 logs
- ✅ `redirectUri` este whitelisted în Meta App Dashboard
- ✅ `redirectUri` este URL-encoded corect în query params

## Testare

```bash
# Test cu redirect URI custom
curl "http://localhost:3003/external/meta/auth-url?\
businessId=test-biz&\
locationId=test-loc&\
redirectUri=https://mybusiness.com/auth/meta/callback"

# Response
{
  "url": "https://www.facebook.com/v19.0/dialog/oauth?client_id=...&redirect_uri=https%3A%2F%2Fmybusiness.com%2Fauth%2Fmeta%2Fcallback&...",
  "clientId": "123456789",
  "redirectUri": "https://mybusiness.com/auth/meta/callback"
}
```

## Fallback la Config

Dacă nu specifici `redirectUri` în query params, se folosește valoarea din `.env`:

```bash
META_REDIRECT_URI=http://localhost:3000/auth/meta/callback
```

```javascript
// Fără redirectUri parameter → folosește din .env
fetch('http://localhost:3003/external/meta/auth-url?businessId=x&locationId=y')
```

