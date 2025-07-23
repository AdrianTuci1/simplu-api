# Webhooks Module

Acest modul gestionează procesarea webhook-urilor de la servicii externe precum Meta (WhatsApp Business API) și Twilio.

## Componente

### WebhooksService
Serviciul principal care procesează webhook-urile și integrează cu Agent Service pentru procesare autonomă.

**Metode principale:**
- `processMetaWebhook()` - Procesează webhook-urile de la Meta
- `processTwilioWebhook()` - Procesează webhook-urile de la Twilio

### WebhooksController
Controller-ul care expune endpoint-urile pentru webhook-uri.

**Endpoint-uri:**
- `POST /webhooks/meta/:businessId` - Webhook Meta
- `POST /webhooks/twilio/:businessId` - Webhook Twilio
- `GET /webhooks/meta/:businessId` - Verificare webhook Meta
- `POST /webhooks/test/:businessId` - Testare webhook-uri

### WebhookSecurityMiddleware
Middleware pentru validarea securității webhook-urilor.

## Funcționalități

### 1. Validare Signature (Meta)
- Validare HMAC SHA256 pentru webhook-urile Meta
- Verificare app secret din credențialele business-ului

### 2. Descoperire Locație
- Descoperire automată a locației din contextul webhook-ului
- Fallback la prima locație activă

### 3. Procesare Autonomă
- Integrare cu Agent Service pentru procesare autonomă
- Răspuns automat prin API-urile externe

### 4. Salvare Mesaje
- Salvare mesaje în sesiune pentru istoric
- Metadata pentru tracking

## Configurare

### Variabile de Mediu
```env
META_WEBHOOK_VERIFY_TOKEN=your_verify_token
```

### Credențiale Business
Fiecare business trebuie să aibă configurate credențialele pentru serviciile externe:
- Meta: appSecret, accessToken, phoneNumberId
- Twilio: accountSid, authToken, phoneNumber

## Testare

### Rulare Teste Unitare
```bash
npm test -- --testPathPattern=webhooks
```

### Testare Manuală
```bash
# Compilare script de testare
npx tsc src/modules/webhooks/scripts/test-webhooks.ts

# Rulare script
node src/modules/webhooks/scripts/test-webhooks.js
```

### Exemple de Testare

#### Meta Webhook
```bash
curl -X POST http://localhost:3001/webhooks/meta/test-business \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=test-signature" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "test-entry",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "+40712345678",
            "phone_number_id": "test-phone-id"
          },
          "messages": [{
            "from": "+40787654321",
            "id": "test-message-id",
            "timestamp": "1234567890",
            "type": "text",
            "text": { "body": "Vreau să fac o rezervare" }
          }]
        },
        "field": "messages"
      }]
    }]
  }'
```

#### Twilio Webhook
```bash
curl -X POST http://localhost:3001/webhooks/twilio/test-business \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=test-sid&From=%2B40787654321&To=%2B40712345678&Body=Vreau%20s%C4%83%20fac%20o%20rezervare"
```

## Integrare cu Agent Service

Webhook-urile sunt procesate prin Agent Service pentru:
1. Analiza intenției utilizatorului
2. Execuția acțiunilor autonome
3. Generarea răspunsurilor
4. Notificarea coordonatorilor când este necesar

## Securitate

- Validare signature pentru Meta webhook-uri
- Validare payload pentru Twilio webhook-uri
- Middleware de securitate pentru toate endpoint-urile
- Logging pentru debugging și audit

## Monitorizare

- Logging pentru toate webhook-urile procesate
- Metrici pentru rate limiting
- Alerting pentru erori de validare
- Tracking pentru răspunsuri automate 