# Meta Instagram Messaging Setup Guide

## Overview

Acest ghid explică cum să configurezi Instagram Messaging pentru aplicația ta multi-tenant. Instagram messaging funcționează diferit față de WhatsApp și necesită câțiva pași suplimentari.

## Diferențe majore: WhatsApp vs Instagram

| Feature | WhatsApp | Instagram |
|---------|----------|-----------|
| **Account Type** | WhatsApp Business Account | Instagram Business/Creator Account |
| **Connection** | Standalone | Conectat la o Facebook Page |
| **Identifier** | `phone_number_id` | `page_id` (Instagram-connected Page) |
| **API Endpoint** | `/v19.0/{phone_number_id}/messages` | `/v19.0/{page_id}/messages` |
| **Message Format** | `messaging_product: 'whatsapp'` | `recipient: { id: <igsid> }` |
| **Webhook URL** | Global (identificare din payload) | Global (identificare din payload) |
| **Permissions** | Disponibile instant | Necesită Business Verification + App Review |

## Prerequisites

### 1. **Meta App Setup**

În [Meta for Developers](https://developers.facebook.com/):

1. Creează sau folosește o aplicație Meta existentă
2. Adaugă produsele:
   - ✅ **WhatsApp** (opțional, dacă vrei și WhatsApp)
   - ✅ **Instagram** (obligatoriu pentru Instagram messaging)
   - ✅ **Facebook Login** (necesar pentru OAuth)

### 2. **Instagram Business Account**

**IMPORTANT:** Instagram messaging funcționează DOAR cu Instagram Business sau Creator Accounts.

#### Verifică tipul contului:
1. Deschide Instagram mobile app
2. Mergi la **Settings** → **Account**
3. Verifică dacă vezi opțiunea **Switch to Professional Account**
   - Dacă DA → ai cont personal, trebuie să îl convertești
   - Dacă NU → ai deja cont business/creator ✅

#### Convertește la Business (dacă e necesar):
1. **Settings** → **Account** → **Switch to Professional Account**
2. Alege **Business** (recomandat pentru companii) sau **Creator**
3. Completează detaliile afacerii
4. ✅ Gata! Contul tău este acum Business

### 3. **Conectează Instagram la Facebook Page**

Instagram **TREBUIE** conectat la o Facebook Page pentru messaging API.

#### Pași:
1. Creează o Facebook Page (dacă nu ai):
   - Mergi la [facebook.com/pages/create](https://www.facebook.com/pages/create)
   - Completează detaliile business-ului
   
2. Conectează Instagram la Page:
   - Mergi pe Facebook Page
   - **Settings** → **Instagram** → **Connect Account**
   - SAU din Instagram app: **Settings** → **Business** → **Connect to Facebook Page**
   
3. Verifică conexiunea:
   ```bash
   # Folosind Graph API Explorer
   GET https://graph.facebook.com/v19.0/{PAGE_ID}?fields=instagram_business_account&access_token={TOKEN}
   
   # Response:
   {
     "instagram_business_account": {
       "id": "1234567890" // Instagram Business Account ID (IGBAID)
     }
   }
   ```

## Configurare Permisiuni OAuth

### Permisiunile necesare

Pentru Instagram Messaging ai nevoie de următoarele permisiuni (scopes):

```javascript
// În configuration.ts
scopes: 'pages_show_list,pages_messaging,pages_manage_metadata,instagram_basic,instagram_manage_messages'
```

### Explicație Scopes:

| Scope | Descriere | Status |
|-------|-----------|--------|
| `pages_show_list` | Listează Facebook Pages ale user-ului | ✅ Standard |
| `pages_messaging` | Trimite/primește mesaje prin Page | ✅ Standard |
| `pages_manage_metadata` | Configurează webhooks pentru Page | ✅ Standard |
| `instagram_basic` | Acces basic la profil Instagram | ⚠️ Necesită App Review |
| `instagram_manage_messages` | Trimite/primește mesaje Instagram | ⚠️ Necesită App Review |

### ⚠️ IMPORTANT: Business Verification & App Review

Scopurile `instagram_*` **NU** sunt disponibile instant. Necesită:

#### 1. **Business Verification** (dacă nu ai făcut-o deja)
   - Meta Dashboard → **Settings** → **Business Verification**
   - Furnizează documente oficiale ale companiei
   - Poate dura 1-3 zile lucrătoare

#### 2. **App Review** (pentru production)
   - Meta Dashboard → **App Review** → **Permissions and Features**
   - Solicită review pentru:
     - `instagram_basic`
     - `instagram_manage_messages`
   - Furnizează:
     - Screencast video demonstrând cum folosești permisiunile
     - Instrucțiuni de testare pentru reviewers
     - Use case detaliat
   - Poate dura 3-7 zile lucrătoare

#### 3. **Development Mode** (pentru testing)
   - În timp ce aștepți approval, poți testa cu:
     - Admins, Developers, Testers adăugați în aplicație
     - Meta Dashboard → **Roles** → **Add People**
   - ⚠️ Funcționează DOAR pentru acești useri!

## Flow OAuth pentru Instagram

### 1. Frontend generează URL OAuth

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

// Redirect user to Meta OAuth
window.location.href = data.url;
```

### 2. User acordă permisiuni

User-ul va vedea un dialog Meta care solicită:
- Acces la Facebook Pages
- Permisiune să trimită mesaje în numele lor
- (Dacă e aprobat) Acces la Instagram

### 3. Backend primește code și face token exchange

```typescript
// Backend: meta.service.ts
async handleCallback(code: string, state: string) {
  // Exchange code for access token
  const tokenResp = await axios.get(
    'https://graph.facebook.com/v19.0/oauth/access_token',
    {
      params: { 
        client_id: clientId, 
        client_secret: clientSecret, 
        redirect_uri: redirectUri,
        code 
      }
    }
  );
  
  const accessToken = tokenResp.data.access_token;
  
  // Get user's Pages with Instagram accounts
  const pagesResp = await axios.get(
    'https://graph.facebook.com/v19.0/me/accounts',
    {
      params: { access_token: accessToken }
    }
  );
  
  // For each page, check if it has Instagram connected
  for (const page of pagesResp.data.data) {
    const pageAccessToken = page.access_token;
    const pageId = page.id;
    
    // Check for Instagram Business Account
    const igResp = await axios.get(
      `https://graph.facebook.com/v19.0/${pageId}`,
      {
        params: {
          fields: 'instagram_business_account',
          access_token: pageAccessToken
        }
      }
    );
    
    if (igResp.data.instagram_business_account) {
      const instagramAccountId = igResp.data.instagram_business_account.id;
      
      console.log('Found Instagram connection:');
      console.log('  - Page ID:', pageId);
      console.log('  - Instagram Account ID:', instagramAccountId);
      console.log('  - Page Name:', page.name);
    }
  }
  
  // Salvează credentials în DynamoDB
  await this.externalApis.saveMetaCredentials(businessId, {
    accessToken: pageAccessToken, // Page access token!
    pageId: pageId,
    instagramAccountId: instagramAccountId,
    appSecret: clientSecret,
  });
}
```

### 4. Salvare în DynamoDB

După OAuth, salvăm:

```typescript
// Tabelul: business-external-credentials
{
  businessId: "B0100001",
  serviceType: "meta",
  credentials: {
    accessToken: "page-access-token", // ⚠️ Page token, NU user token!
    pageId: "123456789", // Facebook Page ID
    instagramAccountId: "987654321", // Instagram Business Account ID
    appSecret: "app-secret",
    phoneNumberId: "111222333", // (opțional, pentru WhatsApp)
  },
  isActive: true,
  createdAt: "2025-10-20T...",
  updatedAt: "2025-10-20T..."
}
```

**PLUS** mapping pentru webhook routing:

```typescript
// Tabelul: meta-platform-identifiers
{
  identifierId: "123456789", // Page ID
  identifierType: "instagram",
  businessLocationId: "B0100001L0100001",
  businessId: "B0100001",
  locationId: "L0100001",
  platform: "instagram"
}
```

## Configurare Webhook

### 1. Configurare în Meta Dashboard

#### Pentru Instagram:
1. Mergi la **Meta Dashboard** → **Products** → **Instagram** → **Configuration**
2. În secțiunea **Webhooks**:
   - **Callback URL**: `https://api.your-domain.com/webhooks/meta`
   - **Verify Token**: Același token din `META_WEBHOOK_VERIFY_TOKEN`
   
3. Subscribe la evenimente:
   - ✅ `messages` - Mesaje primite
   - ✅ `messaging_postbacks` - Răspunsuri la quick replies/buttons
   - ✅ `message_echoes` - Confirmări mesaje trimise

4. Click **Verify and Save**

### 2. Verificare Webhook (GET)

Meta va trimite:
```http
GET /webhooks/meta?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=RANDOM_STRING
```

Backend răspunde cu `challenge` → Webhook activat ✅

### 3. Primire Mesaje Instagram (POST)

Când un user trimite mesaj pe Instagram Direct:

```json
{
  "object": "instagram",
  "entry": [{
    "id": "PAGE_ID",
    "time": 1234567890,
    "messaging": [{
      "sender": {
        "id": "INSTAGRAM_SCOPED_ID" // IGSID - ID-ul user-ului
      },
      "recipient": {
        "id": "PAGE_ID"
      },
      "timestamp": 1234567890,
      "message": {
        "mid": "message_id",
        "text": "Vreau să fac o programare"
      }
    }]
  }]
}
```

**⚠️ IMPORTANT:** Formatul este diferit față de WhatsApp!
- WhatsApp folosește `entry[].changes[]`
- Instagram folosește `entry[].messaging[]`

## Actualizare Webhook Controller

Webhook controller-ul nostru deja suportă Instagram! Când primește un mesaj:

1. **Identifică platforma** din `messaging_product` sau structura payload-ului
2. **Extrage identifierul**:
   - WhatsApp: `phone_number_id`
   - Instagram: `page_id`
3. **Lookup în DynamoDB** pentru `businessId`
4. **Validează signature** HMAC SHA256
5. **Procesează prin Bedrock Agent**
6. **Trimite răspuns** folosind API-ul corect:
   - WhatsApp: `POST /v19.0/{phone_number_id}/messages`
   - Instagram: `POST /v19.0/{page_id}/messages`

## Trimitere Mesaj Instagram

```typescript
// Instagram message format
const url = `https://graph.facebook.com/v19.0/${pageId}/messages`;

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${pageAccessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    recipient: {
      id: instagramScopedId, // IGSID din webhook
    },
    message: {
      text: "Bună ziua! Pot să vă ajut cu o programare..."
    }
  })
});

// Response:
// {
//   "recipient_id": "IGSID",
//   "message_id": "mid.123456"
// }
```

## Testing

### 1. Test OAuth Flow

```bash
# 1. Obține auth URL
curl "http://localhost:3003/external/meta/auth-url?businessId=B0100001&locationId=L01"

# 2. Deschide URL-ul în browser → Autentifică-te
# 3. După redirect, backend va salva credentials
```

### 2. Test Webhook cu ngrok

```bash
# 1. Start server
cd ai-agent-server
npm run start:dev

# 2. Expune cu ngrok
ngrok http 3003

# 3. Configurează în Meta Dashboard:
Webhook URL: https://abc123.ngrok.io/webhooks/meta

# 4. Trimite mesaj de test pe Instagram Direct
# 5. Verifică logs în consolă
```

### 3. Verificare Logs

```bash
[MetaWebhookController] 📨 Meta webhook received (global endpoint)
[MetaWebhookController] 🔍 Identifying business from payload:
[MetaWebhookController]    - Messaging Product: instagram
[MetaWebhookController]    - Phone Number ID (WhatsApp): N/A
[MetaWebhookController]    - Page ID (Instagram/Messenger): 123456789
[MetaWebhookController] 🔍 Looking up business using page_id: 123456789
[MetaWebhookController] ✅ Mapped to businessLocationId: B0100001L0100001
[MetaWebhookController] 📨 MESSAGE #1: Processing incoming message
[MetaWebhookController] 📱 Platform: instagram
[MetaWebhookController] 👤 From: John Doe (IGSID_123)
[MetaWebhookController] 💬 Content: "Hello"
[AgentService] 📨 Processing customer webhook message...
[MetaWebhookController] 📤 Sending response back to user via Meta API...
[MetaWebhookController]    - Platform: instagram
[MetaWebhookController]    - URL: https://graph.facebook.com/v19.0/123456789/messages
[MetaWebhookController] ✅ Meta message sent successfully!
[MetaWebhookController]    - Message ID: mid.123456
```

## Troubleshooting

### ❌ "instagram_basic permission not granted"

**Cauză:** Aplicația nu are permission approval de la Meta.

**Soluție:**
1. Development Mode: Adaugă user-ul ca **Tester** în Meta Dashboard → **Roles**
2. Production: Solicită App Review pentru `instagram_basic` și `instagram_manage_messages`

### ❌ "No Instagram Business Account found"

**Cauză:** Page-ul Facebook nu are Instagram Business Account conectat.

**Soluție:**
1. Conectează Instagram la Page (vezi secțiunea Prerequisites)
2. Verifică cu Graph API Explorer:
   ```
   GET /{page_id}?fields=instagram_business_account
   ```

### ❌ "Invalid OAuth access token"

**Cauză:** Token-ul expirat sau Page access token incorect.

**Soluție:**
1. Folosește **Page Access Token**, NU user access token
2. Exchange pentru long-lived page token:
   ```
   GET /oauth/access_token?
     grant_type=fb_exchange_token&
     client_id={app_id}&
     client_secret={app_secret}&
     fb_exchange_token={short_lived_token}
   ```

### ❌ "Webhook not receiving messages"

**Cauză:** Webhook nu este configurat corect sau subscribe-ul nu e activ.

**Soluție:**
1. Verifică că webhook-ul e "Active" în Meta Dashboard
2. Verifică că ai subscribe la `messages` event
3. Testează cu ngrok pentru debugging local
4. Verifică că Instagram account-ul e Business/Creator, NU personal

## Environment Variables

```bash
# .env
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_REDIRECT_URI=https://your-domain.com/external/meta/callback

# Scopes pentru WhatsApp + Instagram
META_OAUTH_SCOPES=pages_show_list,pages_messaging,pages_manage_metadata,instagram_basic,instagram_manage_messages

# Webhook verification
META_WEBHOOK_VERIFY_TOKEN=your-strong-random-token

# DynamoDB
DYNAMODB_EXTERNAL_CREDENTIALS_TABLE=business-external-credentials

# AWS (pentru Kinesis logging)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

## Multi-Tenant Architecture

### Flow complet:

1. **User A (Business 1)** face OAuth → Salvăm `pageId` + `businessId` în DynamoDB
2. **User B (Business 2)** face OAuth → Salvăm alt `pageId` + `businessId`
3. **Meta trimite webhook** cu `pageId` în payload
4. **Backend caută** în DynamoDB: `pageId` → `businessId`
5. **Folosim credentials-urile** business-ului respectiv pentru răspuns
6. ✅ **Izolare perfectă** între tenants!

### Structură DynamoDB:

```typescript
// Table 1: business-external-credentials
{
  businessId: "B0100001" (PK),
  serviceType: "meta" (SK),
  credentials: {
    accessToken: "page-token",
    pageId: "123456789",
    instagramAccountId: "987654321",
    appSecret: "secret"
  }
}

// Table 2: meta-platform-identifiers (pentru lookup rapid)
{
  identifierId: "123456789" (PK), // page_id
  businessId: "B0100001",
  platform: "instagram",
  businessLocationId: "B0100001L0100001"
}
```

## Resources

- [Instagram Messaging API Documentation](https://developers.facebook.com/docs/messenger-platform/instagram)
- [Instagram Platform API](https://developers.facebook.com/docs/instagram-api)
- [Meta Business Verification](https://developers.facebook.com/docs/development/release/business-verification)
- [App Review Process](https://developers.facebook.com/docs/app-review)
- [Webhook Setup for Instagram](https://developers.facebook.com/docs/messenger-platform/instagram/features/webhook)

## Summary

✅ **Instagram Business Account** conectat la Facebook Page
✅ **OAuth flow** pentru obținere Page Access Token
✅ **Salvare pageId** în DynamoDB cu mapping la businessId
✅ **Webhook global** care identifică business-ul din `page_id`
✅ **Suport multi-tenant** prin lookup în DynamoDB
✅ **Trimitere mesaje** folosind Instagram Messaging API
✅ **Business Verification** + **App Review** pentru production

**Important:** Pentru development poți testa doar cu useri adăugați ca Testers în aplicație. Pentru production AI NEVOIE de App Review pentru permisiunile Instagram!

