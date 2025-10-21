# Meta Integration - Quick Start Guide

## ✅ Ce am implementat:

### 1. **Multi-Location Support** (ca Gmail)
- Credentials Meta sunt salvate per `locationId`
- Format DynamoDB: `serviceType: "meta#L0100001"`
- Backwards compatible cu cod existent

### 2. **OAuth Flow Automat**
După OAuth, sistemul obține automat:
- ✅ **Page Access Token** (nu user token!)
- ✅ **Page ID** (pentru Instagram/Messenger)
- ✅ **Phone Number ID** (pentru WhatsApp, dacă există)
- ✅ **Phone Number** (display name)
- ✅ **App Secret** (pentru signature validation)

### 3. **Webhook Multi-Tenant**
- URL global: `/webhooks/meta`
- Identifică business-ul din `phone_number_id` sau `page_id`
- Suport WhatsApp, Instagram, Messenger

## 🚀 Cum să folosești:

### Pas 1: Configurează `.env`

```bash
# Meta App Configuration
META_APP_ID=your-app-id
META_APP_SECRET=your-app-secret
META_REDIRECT_URI=https://your-domain.com/external/meta/callback
META_WEBHOOK_VERIFY_TOKEN=your-random-token-123456

# Meta OAuth Scopes (already configured)
META_OAUTH_SCOPES=pages_show_list,pages_messaging,pages_manage_metadata

# AWS & DynamoDB
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
DYNAMODB_EXTERNAL_CREDENTIALS_TABLE=business-external-credentials
```

### Pas 2: OAuth Flow (pentru fiecare location)

```bash
# Frontend generează URL OAuth
GET /external/meta/auth-url?businessId=B0100001&locationId=L0100001

# Response:
{
  "url": "https://www.facebook.com/v19.0/dialog/oauth?...",
  "clientId": "...",
  "redirectUri": "..."
}

# User se autentifică pe Meta → Redirect la callback
# Backend salvează automat credentials în DynamoDB
```

### Pas 3: Configurează Webhook în Meta Dashboard

```
1. Meta Dashboard → Your App
2. Products → WhatsApp/Messenger/Instagram → Configuration
3. Webhooks:
   - Callback URL: https://your-domain.com/webhooks/meta
   - Verify Token: (same as META_WEBHOOK_VERIFY_TOKEN)
   - Subscribe to: messages
4. Save
```

### Pas 4: Publică App-ul (pentru mesaje REALE)

```
1. App Settings → Basic:
   - Add Privacy Policy URL
   - Add App Icon (1024x1024)
   - Complete all required fields

2. App Settings → Basic → App Mode:
   - Toggle from "Development" → "Live"
   - Confirm

3. ✅ Done! Acum primești mesaje reale!
```

## 📋 Structură DynamoDB

### Credentials salvate:

```json
{
  "businessId": "B0100001",
  "serviceType": "meta#L0100001",
  "credentials": {
    "accessToken": "page-access-token...",
    "pageId": "123456789",
    "phoneNumberId": "987654321",
    "phoneNumber": "+40712345678",
    "appSecret": "app-secret...",
    "businessAccountId": ""
  },
  "isActive": true,
  "createdAt": "2025-10-20T...",
  "updatedAt": "2025-10-20T...",
  "metadata": {
    "permissions": ["pages_messaging", "pages_manage_metadata", "pages_show_list"]
  }
}
```

## 🧪 Testing

### Test cu ngrok (Development):

```bash
# 1. Start ngrok
ngrok http 3003

# 2. Copiază URL-ul (ex: https://abc123.ngrok.io)

# 3. Actualizează în Meta Dashboard:
Webhook URL: https://abc123.ngrok.io/webhooks/meta

# 4. Trimite Test Webhook din Meta Dashboard:
Products → WhatsApp → Configuration → Webhooks → Test

# 5. Verifică logs:
docker-compose logs -f ai-agent-server | grep "META WEBHOOK"
```

### Test OAuth Flow:

```bash
# 1. Get auth URL
curl "http://localhost:3003/external/meta/auth-url?businessId=B0100001&locationId=L0100001"

# 2. Open URL in browser

# 3. Authorize app

# 4. Check credentials status
curl "http://localhost:3003/external/meta/status?businessId=B0100001&locationId=L0100001"
```

## 🔧 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/external/meta/auth-url` | GET | Generează OAuth URL |
| `/external/meta/callback` | GET | Primește OAuth code |
| `/external/meta/status` | GET | Verifică credentials status |
| `/webhooks/meta` | GET | Verificare webhook (Meta) |
| `/webhooks/meta` | POST | Primește mesaje |

### Query Parameters:

**OAuth URLs:**
```
?businessId=B0100001&locationId=L0100001&redirectUri=https://your-app.com/callback
```

**Status Check:**
```
?businessId=B0100001&locationId=L0100001
```

## 💡 Features

### ✅ Backwards Compatible
```javascript
// Old API (still works, uses default locationId)
await externalApisService.sendMetaMessage(
  phone,
  message,
  businessId
);

// New API (with locationId)
await externalApisService.sendMetaMessage(
  phone,
  message,
  businessId,
  locationId
);
```

### ✅ Auto-Detection în Webhook
```javascript
// Webhook primește mesaj
// → Extract phone_number_id sau page_id din payload
// → Lookup businessId din DynamoDB (TODO: implement)
// → Folosește credentials per location
// → Trimite răspuns automat
```

### ✅ Multi-Platform Support
- **WhatsApp** - folosește `phone_number_id`
- **Instagram** - folosește `page_id`  
- **Messenger** - folosește `page_id`

## ⚠️ Known Issues & TODO

### 1. **Development Mode Restricții**
- ❌ App unpublished → Mesaje reale NU ajung
- ✅ Test webhooks din Dashboard → Funcționează
- **Fix:** Publică app-ul

### 2. **Lookup Business din phone_number_id**
```javascript
// TODO: Implementează în meta-webhook.controller.ts
private async lookupBusinessLocationId(phoneNumberId, pageId) {
  // Query DynamoDB table: meta-platform-identifiers
  // Key: phoneNumberId sau pageId
  // Return: businessLocationId
}
```

**Table structure needed:**
```json
{
  "identifierId": "phone_number_id_123", // PK
  "businessLocationId": "B0100001L0100001",
  "businessId": "B0100001",
  "locationId": "L0100001",
  "platform": "whatsapp"
}
```

### 3. **Signature Validation**
- ⚠️ Currently DISABLED for debugging
- **Enable:** Uncomment line 157 în `meta-webhook.controller.ts`

### 4. **Instagram Permissions**
- ⚠️ `instagram_basic` și `instagram_manage_messages` necesită App Review
- ✅ Messenger funcționează fără review
- **Workaround:** Adaugă useri ca Testers în development mode

## 📚 Resources

- [META_INSTAGRAM_SETUP_GUIDE.md](./META_INSTAGRAM_SETUP_GUIDE.md) - Setup Instagram
- [META_TEST_WEBHOOK_GUIDE.md](./META_TEST_WEBHOOK_GUIDE.md) - Testing guide
- [META_WEBHOOK_INTEGRATION.md](./META_WEBHOOK_INTEGRATION.md) - Detailed webhook docs

## 🎉 Summary

✅ **OAuth funcționează** - Obține automat toate credentials  
✅ **Webhook funcționează** - Primește mesaje (dacă app e published)  
✅ **Multi-location support** - Fiecare location are credentials proprii  
✅ **Backwards compatible** - Cod existent funcționează  
✅ **Multi-platform** - WhatsApp, Instagram, Messenger  

**Next Steps:**
1. Publică app-ul pentru mesaje reale
2. Implementează DynamoDB lookup pentru phone_number_id → businessId
3. Re-activează signature validation
4. (Opțional) Solicită App Review pentru Instagram permissions

