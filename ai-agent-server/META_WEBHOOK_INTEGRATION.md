# Meta Webhook Integration - Complete Guide

## Overview

Integrarea completă Meta include:
1. **OAuth Flow** - Autentificare și obținere token-uri de acces
2. **Webhook Reception** - Primirea mesajelor de la Meta (WhatsApp/Instagram/Facebook)
3. **Bedrock Processing** - Procesarea mesajelor prin AI Agent
4. **Response Sending** - Trimiterea răspunsurilor înapoi prin Meta API

## Arhitectura

```
User (WhatsApp/Instagram) 
  → Meta Servers
  → Webhook: POST /webhooks/meta/:businessId
  → Validare Signature HMAC SHA256
  → AgentService.processWebhookMessage()
  → Bedrock Agent (AI Processing)
  → Meta Graph API (Send Response)
  → User primește răspuns
```

## 1. Setup - Configurare Meta App

### A. Creează Meta App

1. Mergi la [Meta for Developers](https://developers.facebook.com/)
2. **My Apps** → **Create App**
3. Selectează **Business** ca tip de app
4. Completează detaliile app-ului

### B. Adaugă Products

În dashboard-ul app-ului, adaugă:
- **Facebook Login** (pentru OAuth)
- **WhatsApp** (pentru mesaje WhatsApp)
- **Instagram** (opțional, pentru mesaje Instagram)

### C. Configurează Webhook-ul

1. În **WhatsApp** → **Configuration**:
   - **Webhook URL**: `https://your-domain.com/webhooks/meta/YOUR_BUSINESS_LOCATION_ID`
     - Format: `B01L01` (businessId: B01, locationId: L01)
     - Exemplu: `https://your-domain.com/webhooks/meta/B0100001L01`
   - **Verify Token**: Setează un token custom (va fi folosit în `.env`)

2. Subscribe la evenimente:
   - `messages` ✅
   - `message_status` ✅ (opțional, pentru delivery status)

3. Meta va trimite un GET request pentru verificare → Endpoint-ul nostru răspunde cu challenge

## 2. Configurare Environment Variables

```bash
# Meta OAuth (pentru autentificare)
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_REDIRECT_URI=https://your-domain.com/auth/meta/callback

# Meta OAuth Scopes
META_OAUTH_SCOPES=pages_show_list,business_management

# Meta Webhook
META_WEBHOOK_VERIFY_TOKEN=your-custom-verify-token-here
META_ACCESS_TOKEN=your-long-lived-access-token
META_PHONE_NUMBER_ID=your-whatsapp-phone-number-id

# AWS & Kinesis (pentru logging)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
KINESIS_STREAM_NAME=resources-stream
```

## 3. Obținere Credențiale per Business

### Flow OAuth Complete

#### Step 1: Frontend generează URL OAuth

```typescript
// Frontend
const response = await fetch(
  `https://api.your-domain.com/external/meta/auth-url?` +
  `businessId=${businessId}&` +
  `locationId=${locationId}&` +
  `redirectUri=${encodeURIComponent('https://your-app.com/auth/callback')}`
);

const data = await response.json();
// { url: "...", clientId: "...", redirectUri: "..." }

window.location.href = data.url; // Redirect la Meta OAuth
```

#### Step 2: User acordă permisiuni pe Meta

#### Step 3: Meta redirectează cu code

```
https://your-app.com/auth/callback?code=ABC123&state=XYZ
```

#### Step 4: Frontend trimite code la backend

```typescript
await fetch(
  `https://api.your-domain.com/external/meta/callback?` +
  `code=${code}&state=${state}`
);
```

#### Step 5: Backend face token exchange și salvează în DynamoDB

```typescript
// Backend salvează:
{
  businessId: "B0100001",
  serviceType: "meta",
  credentials: {
    accessToken: "long-lived-token",
    phoneNumberId: "123456789",
    appSecret: "app-secret"
  }
}
```

## 4. Primirea și Procesarea Mesajelor

### A. Verificare Webhook (GET)

Când configurezi webhook-ul în Meta Dashboard, Meta trimite:

```http
GET /webhooks/meta/:businessLocationId?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=RANDOM_STRING
```

Backend primește `businessLocationId` în format `B01L01` și îl parsează automat în:
- `businessId`: `B01`
- `locationId`: `L01`

**Backend răspuns**:
- Validează `hub.verify_token` cu `META_WEBHOOK_VERIFY_TOKEN`
- Returnează `hub.challenge` ca răspuns → Webhook activat ✅

### B. Primire Mesaj (POST)

Când un user trimite mesaj pe WhatsApp:

```http
POST /webhooks/meta/:businessLocationId
Content-Type: application/json
x-hub-signature-256: sha256=<signature>

{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "entry_id",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "phone_number_id": "123456789",
          "display_phone_number": "+40712345678"
        },
        "contacts": [{
          "profile": { "name": "John Doe" },
          "wa_id": "+40787654321"
        }],
        "messages": [{
          "from": "+40787654321",
          "id": "msg_123",
          "timestamp": "1234567890",
          "type": "text",
          "text": {
            "body": "Vreau să fac o programare"
          }
        }]
      },
      "field": "messages"
    }]
  }]
}
```

### C. Validare Signature

```typescript
// Backend validează HMAC SHA256
const expectedSignature = crypto
  .createHmac('sha256', appSecret)
  .update(JSON.stringify(payload))
  .digest('hex');

// Compară cu x-hub-signature-256 header
if (expectedSignature !== receivedSignature) {
  throw new UnauthorizedException('Invalid signature');
}
```

### D. Procesare prin Bedrock

```typescript
// Extract message
const message = payload.entry[0].changes[0].value.messages[0];
const messageContent = message.text.body;
const userId = message.from;

// Generate session ID (group by user per day)
const sessionId = `meta_${businessId}_${userId}_${today}`;

// Process through Bedrock Agent
const result = await agentService.processWebhookMessage({
  businessId,
  locationId: 'default',
  userId,
  sessionId,
  message: messageContent,
  source: 'meta',
  metadata: {
    messagingProduct: 'whatsapp',
    messageId: message.id,
    contactName: 'John Doe',
  }
});

// result = {
//   shouldRespond: true,
//   response: "Bună ziua! Pot să vă ajut cu o programare..."
// }
```

### E. Trimitere Răspuns

```typescript
// Send response back via Meta Graph API
const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messaging_product: 'whatsapp',
    to: userId, // +40787654321
    type: 'text',
    text: {
      body: result.response
    }
  })
});
```

## 5. Testing

### A. Test OAuth Flow

```bash
# 1. Get auth URL
curl "http://localhost:3003/external/meta/auth-url?businessId=B0100001&locationId=L01"

# 2. Open URL in browser → Autentifică-te
# 3. După redirect, copiază code și state din URL
# 4. Exchange code pentru token
curl "http://localhost:3003/external/meta/callback?code=ABC123&state=XYZ"
```

### B. Test Webhook (Local Development)

#### Folosind ngrok

```bash
# 1. Start server local
cd ai-agent-server
npm run start:dev

# 2. Expoziți serverul cu ngrok
ngrok http 3003

# 3. Copiază URL-ul ngrok (ex: https://abc123.ngrok.io)
# 4. În Meta Dashboard → WhatsApp → Configuration:
#    Webhook URL: https://abc123.ngrok.io/webhooks/meta/B0100001L01
#    Verify Token: <META_WEBHOOK_VERIFY_TOKEN>
#    businessLocationId format: B[businessId]L[locationId]

# 5. Click "Verify and Save" → Verificare webhook ✅
```

#### Trimitere Mesaj Test

```bash
# Simulează webhook de la Meta
curl -X POST http://localhost:3003/webhooks/meta/B0100001L01 \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=<computed-signature>" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "entry_id",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "phone_number_id": "123456789",
            "display_phone_number": "+40712345678"
          },
          "contacts": [{
            "profile": { "name": "Test User" },
            "wa_id": "+40787654321"
          }],
          "messages": [{
            "from": "+40787654321",
            "id": "msg_test",
            "timestamp": "1234567890",
            "type": "text",
            "text": { "body": "Hello" }
          }]
        },
        "field": "messages"
      }]
    }]
  }'
```

### C. Verificare Logs

```bash
# Logs în consola serverului
[MetaWebhookController] 📨 Meta webhook received for businessLocationId: B0100001L01
[MetaWebhookController] Parsed: businessId=B0100001, locationId=L01
[MetaWebhookController] 📩 Processing whatsapp message from Test User (+40787654321): "Hello"
[AgentService] 📨 Processing customer webhook message for session: meta_B0100001_L01_+40787654321_2025-10-16
[BedrockAgentService] 📡 Bedrock response received, processing stream...
[MetaWebhookController] 📤 Sending Meta message to +40787654321: "Bună ziua! Cu ce vă pot ajuta?"
[MetaWebhookController] ✅ Meta message sent successfully: wamid.ABC123
[MetaWebhookController] ✅ Meta webhook processed in 1250ms, 1 messages processed
```

## 6. Production Deployment

### A. Configurare DNS și SSL

```bash
# 1. Webhook URL trebuie să fie HTTPS
# 2. Certificat SSL valid (Let's Encrypt, Cloudflare, etc.)
# 3. Setează în Meta Dashboard:
Webhook URL: https://api.your-domain.com/webhooks/meta/:businessLocationId
# Format: https://api.your-domain.com/webhooks/meta/B0100001L01
```

### B. Environment Variables Production

```bash
META_APP_ID=production-app-id
META_APP_SECRET=production-app-secret
META_REDIRECT_URI=https://your-app.com/auth/meta/callback
META_WEBHOOK_VERIFY_TOKEN=strong-random-token-here
```

### C. Monitoring

- Logs → CloudWatch / ELK Stack
- Kinesis Stream → Tracking acțiuni agent
- DynamoDB → Credențiale și sesiuni
- Alerting → Erori de procesare, rate limiting, etc.

## 7. Features Avansate

### A. Suport Multiple Tipuri de Mesaje

```typescript
// Text message
if (message.type === 'text') {
  messageContent = message.text.body;
}

// Image cu caption
else if (message.type === 'image') {
  messageContent = `[Image${message.image.caption ? `: ${message.image.caption}` : ''}]`;
  // Poți descărca imaginea folosind Media ID
}

// Location
else if (message.type === 'location') {
  messageContent = `[Location: ${message.location.latitude}, ${message.location.longitude}]`;
}
```

### B. Message Status Updates

```typescript
// În webhook payload poți primi și status updates
if (change.value.statuses) {
  for (const status of change.value.statuses) {
    console.log(`Message ${status.id} → ${status.status}`);
    // sent | delivered | read | failed
    // Update în DB pentru tracking
  }
}
```

### C. Multi-tenant Support

```typescript
// Fiecare business are propriile credențiale în DynamoDB
const credentials = await externalApisService.getMetaCredentials(businessId);

// Use business-specific access token
headers: {
  'Authorization': `Bearer ${credentials.accessToken}`
}
```

## 8. Troubleshooting

### Eroare: "Invalid signature"
- Verifică că `META_APP_SECRET` este corect
- Verifică că payload-ul nu este modificat înainte de validare
- Signature se calculează pe RAW body, nu parsed JSON

### Eroare: "Meta credentials not found"
- Business-ul nu a făcut OAuth flow
- Credențialele au expirat → Re-autentificare necesară

### Mesajele nu ajung la webhook
- Verifică că webhook-ul este "Active" în Meta Dashboard
- Verifică că subscribe-ezi la evenimentul `messages`
- Testează cu ngrok pentru debugging local

### Rate Limiting
- Meta are limite de mesaje pe minut
- Implementează queue dacă trimiți multe mesaje
- Monitorizează response headers pentru rate limit info

## 9. Security Best Practices

1. ✅ **Validare Signature** - ÎNTOTDEAUNA validează HMAC SHA256
2. ✅ **HTTPS Only** - Webhook-ul TREBUIE să fie HTTPS în producție
3. ✅ **Credentials per Business** - Fiecare business are propriile token-uri
4. ✅ **Token Refresh** - Monitorizează expirarea token-urilor
5. ✅ **Rate Limiting** - Protecție împotriva abuzului
6. ✅ **Logging** - Log toate webhook-urile pentru audit

## 10. API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/external/meta/auth-url` | GET | Generează URL OAuth pentru autentificare |
| `/external/meta/callback` | GET | Primește code OAuth și face token exchange |
| `/external/meta/status` | GET | Verifică statusul credențialelor |
| `/webhooks/meta/:businessId` | GET | Verificare webhook (Meta validation) |
| `/webhooks/meta/:businessId` | POST | Primește mesaje de la Meta |

## Resources

- [Meta Graph API Documentation](https://developers.facebook.com/docs/graph-api)
- [WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp)
- [Instagram Messaging API](https://developers.facebook.com/docs/messenger-platform)
- [Webhook Security](https://developers.facebook.com/docs/graph-api/webhooks/getting-started)

