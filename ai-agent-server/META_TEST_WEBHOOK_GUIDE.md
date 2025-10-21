# Meta Test Webhooks - Ghid Rapid

## Problema: Development Mode Restricții

Când aplicația Meta este în **Development Mode (unpublished)**, Meta **NU trimite** webhook-uri pentru mesaje reale, chiar dacă sunt de la admini, developeri sau testeri.

> ⚠️ "Apps will only be able to receive test webhooks sent from the dashboard while the app is unpublished."

## Soluție 1: Folosește Test Webhooks (Recomandat pentru Development)

### Pentru WhatsApp:

1. **Mergi în Meta Dashboard:**
   - https://developers.facebook.com/apps/
   - Selectează app-ul tău
   - **Products** → **WhatsApp** → **Configuration**

2. **Scroll jos la secțiunea "Webhooks"**

3. **Găsește butonul "Test" lângă Callback URL:**
   ```
   Callback URL: https://your-domain.com/webhooks/meta [Test]
   ```

4. **Click pe "Test"** → Se deschide un modal

5. **Selectează webhook field:**
   - Dropdown: Alege **"messages"**

6. **Payload-ul de test** (editabil):
   ```json
   {
     "object": "whatsapp_business_account",
     "entry": [{
       "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
       "changes": [{
         "value": {
           "messaging_product": "whatsapp",
           "metadata": {
             "display_phone_number": "15550000000",
             "phone_number_id": "PHONE_NUMBER_ID"
           },
           "contacts": [{
             "profile": {
               "name": "Test User"
             },
             "wa_id": "15551234567"
           }],
           "messages": [{
             "from": "15551234567",
             "id": "wamid.test123",
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

7. **Click "Send to My Server"**

8. **Verifică logs:**
   ```bash
   docker-compose logs -f ai-agent-server | grep -A 50 "META WEBHOOK POST"
   ```

### Pentru Messenger:

1. **Products** → **Messenger** → **Settings** → **Webhooks**

2. **Click "Test" lângă Callback URL**

3. **Selectează "messages"** din dropdown

4. **Payload de test:**
   ```json
   {
     "object": "page",
     "entry": [{
       "id": "PAGE_ID",
       "time": 1234567890,
       "messaging": [{
         "sender": {
           "id": "USER_ID"
         },
         "recipient": {
           "id": "PAGE_ID"
         },
         "timestamp": 1234567890,
         "message": {
           "mid": "mid.test123",
           "text": "Hello from test"
         }
       }]
     }]
   }
   ```

5. **Click "Send to My Server"**

### Verificare Success:

Ar trebui să vezi în logs:

```bash
================================================================================
📨 META WEBHOOK POST REQUEST RECEIVED
================================================================================
⏰ Timestamp: 2025-10-20T22:00:00.000Z
📋 Headers: {
  "x-hub-signature-256": "sha256=...",
  "content-type": "application/json"
}
📦 Full Payload: {
  "object": "whatsapp_business_account",
  "entry": [...]
}
================================================================================

🔍 Identifying business from payload:
   - Messaging Product: whatsapp
   - Phone Number ID: 123456789
⚠️ Using default businessLocationId: B0100001L0100001
⚠️ SIGNATURE VALIDATION DISABLED FOR DEBUGGING
📨 MESSAGE #1: Processing incoming message
📱 Platform: whatsapp
👤 From: Test User (+15551234567)
💬 Content: "Vreau să fac o programare"
🤖 Sending to Bedrock Agent for processing...
✅ Bedrock Agent processed message
📤 Sending response back to user via Meta API...
✅ Response sent successfully!
```

## Soluție 2: Publică App-ul (Pentru Production)

### Prerequisites pentru publicare:

#### 1. **Privacy Policy** (OBLIGATORIU)

Creează un document Privacy Policy care să includă:
- Ce date colectezi
- Cum le folosești
- Cum le protejezi
- Drepturile utilizatorilor (GDPR)

**Template rapid:**
```markdown
# Privacy Policy

## Data Collection
We collect the following information:
- Messages sent through WhatsApp/Messenger/Instagram
- User phone numbers/IDs for identification
- Message timestamps

## Data Usage
We use this data to:
- Provide AI-powered customer service
- Improve our services
- Maintain conversation history

## Data Storage
- Data is stored securely in AWS DynamoDB
- Encrypted in transit and at rest
- Retained for [X] days/months

## User Rights
Users can request:
- Access to their data
- Deletion of their data
- Export of their data

Contact: privacy@your-domain.com
```

Găzduiește-l pe:
- Site-ul tău: `https://your-domain.com/privacy`
- GitHub Pages (gratuit)
- Google Docs (public link)

#### 2. **App Icon** (OBLIGATORIU)

- Minim 1024x1024 pixels
- Format: PNG
- Nu poate fi logo Meta/Facebook/WhatsApp

#### 3. **Configurează App Settings**

```
Meta Dashboard → App Settings → Basic:

✅ Display Name: [Numele app-ului tău]
✅ App Icon: [Upload icon 1024x1024]
✅ Privacy Policy URL: https://your-domain.com/privacy
✅ Terms of Service URL: https://your-domain.com/terms (opțional)
✅ App Domain: your-domain.com
✅ Category: Business (sau relevant pentru tine)
```

### Pași de publicare:

#### Pas 1: Completează informațiile de bază

```
App Settings → Basic → Complete toate câmpurile obligatorii (*)
```

#### Pas 2: Switch to Live Mode

```
1. App Settings → Basic
2. Scroll jos la "App Mode"
3. Click switch-ul de la "Development" → "Live"
```

**⚠️ Meta va cere confirmări:**

```
☑️ Confirm Privacy Policy is accurate
☑️ Confirm Terms of Service (if provided)
☑️ Confirm app complies with Meta Platform Policies
☑️ Confirm data handling practices
```

#### Pas 3: Click "Switch Mode"

**🎉 APP-UL ESTE ACUM LIVE!**

### ⚠️ Restricții după publicare:

- **Webhook URL** nu mai poate fi schimbat ușor (necesită re-verificare)
- **Permissions** - unele necesită App Review
- **Versioning** - schimbări majore pot necesita review

### Rollback (dacă ceva merge prost):

Poți reveni la Development Mode:
```
App Settings → Basic → App Mode → Switch back to "Development"
```

## Best Practices

### Pentru Development:
1. ✅ Folosește **Test Webhooks** din Dashboard
2. ✅ Testează cu **curl** pentru debugging local
3. ✅ Ține app-ul în **Development Mode**
4. ✅ Adaugă testeri în **Roles** → **Test Users**

### Pentru Staging:
1. ✅ Publică app-ul pentru staging environment
2. ✅ Testează cu utilizatori reali (echipa ta)
3. ✅ Monitorizează logs și rate limits
4. ✅ Testează error handling

### Pentru Production:
1. ✅ **App Review complet** pentru toate permissions
2. ✅ **Business Verification** (pentru Instagram)
3. ✅ **SSL certificate valid** pentru webhook URL
4. ✅ **Monitoring & alerting** (CloudWatch, Sentry, etc.)
5. ✅ **Rate limiting** implementat
6. ✅ **Error handling** robust
7. ✅ **Backup & recovery** plan

## Troubleshooting

### "Test webhook failed to send"

**Cauze:**
- Webhook URL nu e accesibil public (localhost nu merge!)
- SSL certificate invalid
- Server nu răspunde în < 5 secunde
- Firewall blochează request-urile Meta

**Soluție:**
1. Folosește **ngrok** pentru development:
   ```bash
   ngrok http 3003
   # Use: https://abc123.ngrok.io/webhooks/meta
   ```

2. Verifică că serverul răspunde:
   ```bash
   curl -X GET "https://your-domain.com/webhooks/meta?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test"
   ```

### "Signature validation failed"

**Cauză:** Meta calculează signature folosind `app_secret`.

**Soluție temporară (development):**
- Am dezactivat signature validation pentru debugging
- Vezi logs pentru payload complet

**Soluție production:**
- Salvează credentials corect în DynamoDB după OAuth
- Re-activează signature validation

### "No webhooks received after publishing"

**Cauză:** Subscription la evenimente nu e activă.

**Soluție:**
```
1. Products → WhatsApp/Messenger → Configuration
2. Webhooks → Verify status is "Active"
3. Webhook fields → Check "messages" is subscribed
4. Try send test webhook from Dashboard
```

## Resources

- [Meta Webhooks Documentation](https://developers.facebook.com/docs/graph-api/webhooks)
- [WhatsApp Business Platform Webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Messenger Platform Webhooks](https://developers.facebook.com/docs/messenger-platform/webhooks)
- [Meta App Review Process](https://developers.facebook.com/docs/app-review)

## Summary

📝 **Development Mode:**
- ✅ Test webhooks din Dashboard funcționează
- ❌ Mesaje reale NU ajung (chiar de la testeri)
- ✅ Perfect pentru development local

📝 **Live Mode (Published):**
- ✅ Mesaje reale ajung
- ✅ Funcționează pentru toți utilizatorii
- ⚠️ Necesită Privacy Policy și App Icon

**Recomandare:** Începe cu test webhooks, apoi publică când ești gata pentru production!

