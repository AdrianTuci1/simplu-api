# Webhooks API Documentation

## Overview

Acest document descrie endpoint-urile pentru webhook-uri disponibile în AI Agent Server.

## Base URL

```
http://localhost:3001/webhooks
```

## Endpoints

### 1. Meta Webhook

#### POST /webhooks/meta/:businessId

Procesează webhook-urile de la Meta (WhatsApp Business API).

**Headers:**
```
Content-Type: application/json
x-hub-signature-256: sha256=<signature>
```

**Query Parameters:**
- `hub.mode` (optional) - Mode pentru verificare webhook
- `hub.verify_token` (optional) - Token pentru verificare
- `hub.challenge` (optional) - Challenge pentru verificare

**Request Body:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "entry_id",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "+40712345678",
              "phone_number_id": "phone_number_id"
            },
            "contacts": [
              {
                "profile": {
                  "name": "User Name"
                },
                "wa_id": "+40787654321"
              }
            ],
            "messages": [
              {
                "from": "+40787654321",
                "id": "message_id",
                "timestamp": "1234567890",
                "type": "text",
                "text": {
                  "body": "Vreau să fac o rezervare"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "status": "ok",
  "processed": 1,
  "results": [
    {
      "messageId": "message_id",
      "userId": "+40787654321",
      "processed": true,
      "autonomousAction": true,
      "response": true
    }
  ]
}
```

### 2. Twilio Webhook

#### POST /webhooks/twilio/:businessId

Procesează webhook-urile de la Twilio (SMS).

**Headers:**
```
Content-Type: application/x-www-form-urlencoded
```

**Request Body (form data):**
```
MessageSid=SM1234567890abcdef&From=%2B40787654321&To=%2B40712345678&Body=Vreau%20s%C4%83%20fac%20o%20rezervare&NumMedia=0&AccountSid=AC1234567890abcdef&ApiVersion=2010-04-01
```

**Response:**
```json
{
  "status": "ok",
  "processed": 1,
  "result": {
    "messageId": "SM1234567890abcdef",
    "userId": "+40787654321",
    "processed": true,
    "autonomousAction": true,
    "response": true
  }
}
```

### 3. Meta Webhook Verification

#### GET /webhooks/meta/:businessId

Verifică webhook-ul Meta pentru setup.

**Query Parameters:**
- `hub.mode=subscribe` - Mode de verificare
- `hub.verify_token=<token>` - Token de verificare
- `hub.challenge=<challenge>` - Challenge de returnat

**Response:**
```
<challenge_string>
```

### 4. Test Webhook

#### POST /webhooks/test/:businessId

Endpoint pentru testarea webhook-urilor.

**Request Body:**
```json
{
  "source": "meta",
  "message": "Vreau să fac o rezervare pentru mâine",
  "userId": "+40787654321"
}
```

**Response:**
```json
{
  "status": "test_completed",
  "result": {
    "success": true,
    "shouldRespond": true,
    "response": "Test response"
  }
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Invalid webhook signature",
  "error": "Unauthorized"
}
```

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid Twilio webhook payload",
  "error": "Bad Request"
}
```

## Security

### Meta Webhook Security
- Validare HMAC SHA256 signature
- Verificare app secret din credențialele business-ului
- Validare token pentru verificare webhook

### Twilio Webhook Security
- Validare payload format
- Verificare prezența câmpurilor obligatorii
- Rate limiting

## Rate Limiting

- **Meta Webhooks:** 100 requests per 15 minutes
- **Twilio Webhooks:** 100 requests per 15 minutes
- **Test Endpoints:** 50 requests per 15 minutes

## Logging

Toate webhook-urile sunt logate cu următoarele informații:
- Business ID
- Source (meta/twilio)
- Message ID
- User ID
- Processing time
- Success/failure status

## Testing

### Testare cu cURL

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

### Testare cu Script

```bash
# Compilare script
npx tsc src/modules/webhooks/scripts/test-webhooks.ts

# Rulare script
node src/modules/webhooks/scripts/test-webhooks.js
```

## Configuration

### Environment Variables

```env
# Meta Configuration
META_WEBHOOK_VERIFY_TOKEN=your_verify_token
META_ACCESS_TOKEN=your_access_token
META_PHONE_NUMBER_ID=your_phone_number_id
META_APP_SECRET=your_app_secret

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token

# Logging
WEBHOOK_LOG_LEVEL=info
```

### Business Credentials

Fiecare business trebuie să aibă configurate credențialele în baza de date:

```json
{
  "businessId": "business-123",
  "meta": {
    "appSecret": "app_secret",
    "accessToken": "access_token",
    "phoneNumberId": "phone_number_id"
  },
  "twilio": {
    "accountSid": "account_sid",
    "authToken": "auth_token",
    "phoneNumber": "+40712345678"
  }
}
``` 