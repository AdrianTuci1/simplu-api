## React client integration guide for external API endpoints

This guide shows how to integrate the new external endpoints in a React app.

Base API URL examples:
- Local: `http://localhost:3001`

Prerequisites in your app state/context:
- `businessId`: string (current tenant/business)
- `userId`: string (current user performing the connection)

### 1) Gmail OAuth connect flow

Steps:
1. Call backend to get the Google auth URL
2. Redirect the browser to that URL
3. Google redirects back to the backend callback which stores tokens
4. Show success state in UI

Example component:
```tsx
import React, { useState } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

export function ConnectGmail({ businessId, userId }: { businessId: string; userId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/external/gmail/auth-url?businessId=${encodeURIComponent(businessId)}&userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (!data?.url) throw new Error('Failed to obtain auth URL');
      window.location.href = data.url; // Redirect to Google
    } catch (e: any) {
      setError(e?.message || 'Unexpected error');
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleConnect} disabled={loading}>
        {loading ? 'Connecting…' : 'Connect Gmail'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

Notes:
- Redirect URI must match the backend’s `GOOGLE_REDIRECT_URI` (e.g. `http://localhost:3001/external/gmail/callback`).
- After successful callback, you can show a "Connected" badge or re-fetch a profile/settings endpoint if you expose one.

### 2) Meta (Facebook/Instagram) connect flow

Steps:
1. Call backend to get the Meta auth URL
2. Redirect to that URL
3. Meta redirects back to backend callback which stores tokens

Example hook/button:
```tsx
export function ConnectMeta({ businessId, userId }: { businessId: string; userId: string }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const connect = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/external/meta/auth-url?businessId=${encodeURIComponent(businessId)}&userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (!data?.url) throw new Error('Failed to obtain Meta URL');
      window.location.href = data.url;
    } catch (e: any) {
      setError(e?.message || 'Unexpected error');
      setLoading(false);
    }
  };

  return (
    <button onClick={connect} disabled={loading}>
      {loading ? 'Connecting…' : 'Connect Meta'}
    </button>
  );
}
```

Notes:
- Redirect URI must match `META_REDIRECT_URI` (e.g. `http://localhost:3001/external/meta/callback`).
- Required scopes are requested by the backend; ensure your app is approved for the scopes you use in production.

### 3) ElevenLabs realtime session (voice agent)

Steps:
1. Request an ephemeral key from backend
2. Use it to create a WebRTC/WebSocket session with ElevenLabs Realtime API in the browser

Minimal example (WebSocket):
```ts
async function createElevenLabsSession() {
  const res = await fetch(`${API_BASE}/external/voice/elevenlabs/session`);
  const data = await res.json(); // { key: string }
  const ephemeralKey = data.key;

  // Example: connect via WebSocket. Adjust per ElevenLabs docs.
  const ws = new WebSocket(`wss://api.elevenlabs.io/v1/realtime?key=${encodeURIComponent(ephemeralKey)}`);
  ws.onopen = () => console.log('ElevenLabs connected');
  ws.onmessage = (msg) => console.log('EL event:', msg.data);
  ws.onerror = (err) => console.error('EL error:', err);
  ws.onclose = () => console.log('EL closed');
}
```

Notes:
- For full voice pipeline, prefer WebRTC with microphone capture; follow ElevenLabs Realtime docs for browser.
- The backend uses `ELEVENLABS_API_KEY` to mint ephemeral session keys.

### 4) CORS and security

- Ensure API server allows your frontend origin.
- Do not expose long-lived credentials on the client; the client only triggers OAuth redirects and uses short-lived/ephemeral keys.

### 5) Troubleshooting

- 400 on callback: verify `redirect_uri` exactly matches the one configured in the provider dashboard and backend env.
- Meta scope errors: your app may need to be in development mode with tester accounts or go through App Review.
- Gmail: if no refresh_token is returned, ensure `access_type=offline` and `prompt=consent` are set (they are in backend).


