# Meta Webhook Troubleshooting Guide

## Problema: "Nu primesc mesaje la webhook"

Dacă trimiți mesaje pe WhatsApp/Facebook/Instagram dar nu ajung la server, verifică următoarele:

---

## ✅ CHECKLIST - Verifică fiecare pas

### 1. **Serverul rulează?**

```bash
cd ai-agent-server
npm run start:dev
```

Ar trebui să vezi:
```
[Nest] 12345  - 10/16/2025, 2:30:25 PM     LOG [NestApplication] Nest application successfully started +2ms
[Nest] 12345  - 10/16/2025, 2:30:25 PM     LOG [Bootstrap] Server is running on http://localhost:3003
```

**✅ Check:** Serverul ascultă pe portul 3003

---

### 2. **Serverul este expus public? (CRUCIAL!)**

Meta NU poate trimite webhook la `localhost`. Trebuie să folosești:

#### Opțiunea A: ngrok (pentru development/testing)

```bash
# În alt terminal
ngrok http 3003
```

Vei vedea:
```
Session Status                online
Account                       your-account
Forwarding                    https://abc123xyz.ngrok.io -> http://localhost:3003
```

**✅ Check:** Ai un URL public (ex: `https://abc123xyz.ngrok.io`)

#### Opțiunea B: Server în cloud (pentru producție)

- EC2, DigitalOcean, etc.
- Cu domeniu public și SSL (ex: `https://api.your-domain.com`)

---

### 3. **Webhook configurat în Meta Dashboard?**

#### Verifică în [Meta for Developers](https://developers.facebook.com/):

1. **My Apps** → Selectează app-ul tău
2. **WhatsApp** → **Configuration**
3. Verifică **Callback URL**:

```
✅ CORECT: https://abc123xyz.ngrok.io/webhooks/meta/B0100001L01
❌ GREȘIT: http://localhost:3003/webhooks/meta/B0100001L01  (Meta NU poate accesa localhost!)
```

**Format URL:** `https://YOUR_PUBLIC_URL/webhooks/meta/YOUR_BUSINESS_LOCATION_ID`

4. **Verify Token** trebuie să fie același cu `META_WEBHOOK_VERIFY_TOKEN` din `.env`

#### Subscribed to events:
- ✅ `messages` - OBLIGATORIU
- ✅ `message_status` - Opțional (pentru delivery status)

---

### 4. **Webhook verificat de Meta?**

Când salvezi webhook-ul în Meta Dashboard, Meta trimite un GET request pentru verificare.

#### Cum să verifici:

**În logs ar trebui să vezi:**
```
[MetaWebhookController] 📋 Webhook verification request for businessLocationId: B0100001L01
[MetaWebhookController] Mode: subscribe, Verify Token: your-token-here, Challenge: 123456789
[MetaWebhookController] ✅ Webhook verification successful
```

**În Meta Dashboard ar trebui să vezi:**
```
✅ Verified (green checkmark)
```

**Dacă vezi eroare:**
- `❌ Invalid verify token` → `META_WEBHOOK_VERIFY_TOKEN` nu se potrivește
- `❌ Connection failed` → URL-ul nu este accesibil public

---

### 5. **Ai făcut OAuth și ai credentials salvate?**

Meta nu poate trimite mesaje dacă nu ai access token.

#### Verifică credentials:

```bash
# Check în DynamoDB table: business-external-credentials
# Caută: businessId + serviceType: "meta"
# Trebuie să existe: accessToken, phoneNumberId, appSecret
```

#### Dacă NU ai credentials:

1. **Frontend** → Navigate la pagina de settings
2. **Click pe "Connect Meta"** button
3. **Autentifică-te** pe Meta și acordă permisiuni
4. Credențialele vor fi salvate automat în DynamoDB

**Test OAuth flow:**
```bash
curl "http://localhost:3003/external/meta/auth-url?businessId=B0100001&locationId=L01&redirectUri=http://localhost:3000/auth/callback"
```

---

### 6. **Trimiți mesaje de pe numărul/pagina corectă?**

#### Pentru WhatsApp:
- Trebuie să trimiți de pe un număr care NU este Business Number-ul tău
- Trebuie să trimiți către Business Number-ul configurat în Meta

#### Pentru Facebook/Instagram:
- Trebuie să trimiți ca user normal către Pagina/Profilul business-ului

---

## 🔧 DEBUGGING PAS CU PAS

### Test 1: Verifică că endpoint-ul funcționează

```bash
# Simulează un webhook de la Meta
curl -X POST http://localhost:3003/webhooks/meta/B0100001L01 \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=test" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "test",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": { "phone_number_id": "123" },
          "contacts": [{ "profile": { "name": "Test" }, "wa_id": "+40700000000" }],
          "messages": [{
            "from": "+40700000000",
            "id": "test123",
            "timestamp": "1697458800",
            "type": "text",
            "text": { "body": "Hello test" }
          }]
        },
        "field": "messages"
      }]
    }]
  }'
```

**Dacă funcționează local**, ar trebui să vezi logs:
```
[MetaWebhookController] 📨 Meta webhook received...
[MetaWebhookController] 🔐 Validating webhook signature...
[MetaWebhookController] ❌ Invalid signature (NORMAL pentru test local)
```

---

### Test 2: Verifică webhook-ul prin ngrok

1. **Start ngrok:**
```bash
ngrok http 3003
```

2. **Copiază URL-ul public** (ex: `https://abc123.ngrok.io`)

3. **Configurează în Meta Dashboard:**
   - Webhook URL: `https://abc123.ngrok.io/webhooks/meta/B0100001L01`
   - Verify Token: `<META_WEBHOOK_VERIFY_TOKEN>`
   - Click **"Verify and Save"**

4. **Verifică logs:**
```
[MetaWebhookController] 📋 Webhook verification request...
[MetaWebhookController] ✅ Webhook verification successful
```

5. **Trimite mesaj test** pe WhatsApp → Ar trebui să vezi logs complete!

---

### Test 3: Verifică credentials

```bash
# Test status endpoint
curl "http://localhost:3003/external/meta/status?businessId=B0100001&locationId=L01"
```

**Răspuns așteptat:**
```json
{
  "connected": true,
  "hasAccessToken": true,
  "hasPhoneNumberId": true,
  "hasPhoneNumber": false,
  "phoneNumber": null
}
```

**Dacă vezi `connected: false`:**
→ Trebuie să faci OAuth flow!

---

## 🚨 ERORI COMUNE

### Eroare: "Webhook verification failed"

**Cauze:**
- Verify Token diferit în `.env` vs Meta Dashboard
- Server-ul nu este accesibil public
- Server-ul nu rulează

**Fix:**
1. Verifică că `META_WEBHOOK_VERIFY_TOKEN` din `.env` este identic cu cel din Meta Dashboard
2. Verifică că folosești ngrok sau un URL public valid
3. Restart server după modificări în `.env`

---

### Eroare: "Invalid signature"

**Cauze:**
- `META_APP_SECRET` greșit
- Payload-ul este modificat înainte de validare

**Fix:**
1. Verifică că `META_APP_SECRET` din `.env` este același cu cel din Meta App Dashboard
2. Asigură-te că validarea se face pe RAW body (nu parsed JSON)

---

### Eroare: "Meta credentials not found"

**Cauze:**
- Nu ai făcut OAuth flow
- Credentials salvate pentru alt businessId

**Fix:**
1. Fă OAuth flow prin frontend
2. Verifică că businessId-ul este corect în webhook URL

---

### Nu primesc niciun webhook

**Cauze posibile:**

1. **Server nu este expus public**
   - ❌ `http://localhost:3003` → Meta NU poate accesa
   - ✅ `https://abc123.ngrok.io` → Accesibil public

2. **Webhook nu este subscribed la evenimente**
   - Du-te în Meta Dashboard → WhatsApp → Configuration
   - Verifică că `messages` este bifat

3. **Webhook nu este verified**
   - Status ar trebui să fie ✅ Verde
   - Dacă e roșu, click pe "Edit" și re-verify

4. **Trimiți mesaje de pe numărul greșit**
   - Nu poți trimite de pe Business Number către Business Number
   - Trebuie să trimiți de pe un alt număr către Business Number

5. **App-ul Meta este în Development Mode**
   - În development mode, doar Test Users pot trimite mesaje
   - Adaugă test users în Meta Dashboard → Roles → Test Users

---

## ✅ SETUP CORECT - CHECKLIST FINAL

```
□ 1. Server rulează: npm run start:dev
□ 2. Server expus public: ngrok http 3003
□ 3. Webhook configurat în Meta: https://ngrok-url/webhooks/meta/B01L01
□ 4. Verify Token corect în .env și Meta Dashboard
□ 5. Webhook verified (✅ green în Meta Dashboard)
□ 6. Subscribed la "messages" event
□ 7. OAuth făcut: credentials salvate în DynamoDB
□ 8. Test message trimis de pe alt număr → Vezi logs
```

---

## 📝 Logs așteptate (când funcționează)

```
[MetaWebhookController] 📨 Meta webhook received for businessLocationId: B0100001L01
[MetaWebhookController] ✅ Parsed: businessId=B0100001, locationId=L01
[MetaWebhookController] 🔐 Validating webhook signature...
[MetaWebhookController] ✅ Signature validated successfully
[MetaWebhookController] 📦 Processing 1 webhook entries...
[MetaWebhookController] 💬 Found 1 incoming message(s) from whatsapp
============================================================
[MetaWebhookController] 📨 MESSAGE #1: Processing incoming message
============================================================
[MetaWebhookController] 📱 Platform: whatsapp
[MetaWebhookController] 👤 From: John Doe (+40787654321)
[MetaWebhookController] 💬 Content: "Hello"
[MetaWebhookController] 🤖 Sending to Bedrock Agent for processing...
[AgentService] 📨 Processing customer webhook message...
[MetaWebhookController] ✅ Bedrock Agent processed message
[MetaWebhookController] 📤 Sending response back to user via Meta API...
[MetaWebhookController] ✅ Meta message sent successfully!
[MetaWebhookController] ✅ Meta webhook processed in 1250ms, 1 messages processed
```

---

## 🆘 Încă nu funcționează?

### Debug cu logs detaliate:

1. **Verifică logs Meta Dashboard:**
   - Meta Dashboard → WhatsApp → Configuration → Webhook
   - Click pe "Test" button
   - Verifică response-ul

2. **Verifică ngrok logs:**
   - Accesează `http://127.0.0.1:4040` (ngrok web interface)
   - Vezi toate request-urile primite
   - Verifică dacă Meta trimite request-uri

3. **Verifică server logs:**
   - Dacă vezi request în ngrok DAR nu în server logs
   - → Problema e la routing sau controller

4. **Check firewall/security groups:**
   - Dacă folosești EC2/Cloud server
   - Permite inbound traffic pe port 3003 (sau portul tău)

---

## 📞 Contact Support

Dacă ai urmat toți pașii și încă nu funcționează:

1. **Share logs** din:
   - Server console
   - ngrok web interface (`http://127.0.0.1:4040`)
   - Meta Dashboard errors

2. **Verifică:**
   - Ce URL ai configurat în Meta Dashboard?
   - Webhook status în Meta (verified/not verified)?
   - Credentials status: `curl http://localhost:3003/external/meta/status?businessId=X&locationId=Y`

