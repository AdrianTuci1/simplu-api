# SMS Service Guide - AWS SNS & Twilio Integration

## 📋 Overview

Serviciul SMS permite trimiterea de mesaje SMS prin AWS SNS (serviciu principal) cu fallback la Twilio. Serviciul suportă trimiterea individuală și în bulk.

## 🔧 AWS SNS Configuration

### 1. Permisiuni AWS IAM necesare

Creează o policy IAM cu următoarele permisiuni:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "sns:Publish",
                "sns:GetSMSAttributes",
                "sns:SetSMSAttributes"
            ],
            "Resource": "*"
        }
    ]
}
```

### 2. Variabile de mediu necesare

```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=eu-central-1

# Optional: Twilio fallback
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
```

### 3. Configurare AWS SNS

1. **Activează SMS în AWS SNS:**
   ```bash
   aws sns set-sms-attributes --attributes MonthlySpendLimit=100
   ```

2. **Verifică configurația:**
   ```bash
   aws sns get-sms-attributes
   ```

## 🚀 API Endpoints

### 1. Trimitere SMS Individual

**Endpoint:** `POST /sms/send`

**Request Body:**
```json
{
  "to": "+40700000000",
  "message": "Mesajul tău aici",
  "businessId": "business-123"
}
```

**HTTPie Example:**
```bash
http POST localhost:3001/sms/send \
  to="+40700000000" \
  message="Salut! Programarea ta este confirmată pentru mâine la ora 10:00." \
  businessId="business-123"
```

### 2. Trimitere SMS în Bulk

**Endpoint:** `POST /sms/send-bulk`

**Request Body:**
```json
{
  "recipients": [
    {
      "phoneNumber": "+40700000001",
      "message": "Mesaj personalizat 1"
    },
    {
      "phoneNumber": "+40700000002", 
      "message": "Mesaj personalizat 2"
    }
  ],
  "businessId": "business-123"
}
```

**HTTPie Example:**
```bash
http POST localhost:3001/sms/send-bulk \
  recipients:='[
    {
      "phoneNumber": "+40700000001",
      "message": "Reminder: Programarea ta este mâine la 10:00"
    },
    {
      "phoneNumber": "+40700000002", 
      "message": "Reminder: Programarea ta este mâine la 11:00"
    }
  ]' \
  businessId="business-123"
```

### 3. Testare Serviciu SMS

**Endpoint:** `GET /sms/test/:businessId`

**HTTPie Example:**
```bash
http GET localhost:3001/sms/test/business-123
```

## 📱 Exemple de Utilizare

### 1. Testare Rapidă
```bash
# Testează configurația SMS
http GET localhost:3001/sms/test/business-123
```

### 2. Trimitere SMS Simplu
```bash
# Trimite SMS de confirmare
http POST localhost:3001/sms/send \
  to="+40700000000" \
  message="Programarea ta la Cabinetul Medical Dr. Popescu este confirmată pentru 15 Ianuarie 2024, ora 10:00." \
  businessId="business-123"
```

### 3. Trimitere Reminder-uri în Bulk
```bash
# Trimite reminder-uri pentru mai mulți pacienți
http POST localhost:3001/sms/send-bulk \
  recipients:='[
    {
      "phoneNumber": "+40700000001",
      "message": "Reminder: Programarea ta la Cabinetul Medical Dr. Popescu este mâine la 10:00. Te rugăm să confirmi prezența."
    },
    {
      "phoneNumber": "+40700000002",
      "message": "Reminder: Programarea ta la Cabinetul Medical Dr. Popescu este mâine la 11:00. Te rugăm să confirmi prezența."
    }
  ]' \
  businessId="business-123"
```

### 4. Trimitere cu Headers personalizați
```bash
# Cu headers pentru autentificare
http POST localhost:3001/sms/send \
  Authorization:"Bearer your-token" \
  Content-Type:"application/json" \
  to="+40700000000" \
  message="Mesaj important" \
  businessId="business-123"
```

## 🔍 Răspunsuri API

### Răspuns Succes (SMS Individual)
```json
{
  "success": true,
  "messageId": "12345678-1234-1234-1234-123456789012",
  "data": {
    "MessageId": "12345678-1234-1234-1234-123456789012",
    "ResponseMetadata": {
      "RequestId": "abc123-def456-ghi789"
    }
  }
}
```

### Răspuns Succes (SMS Bulk)
```json
{
  "success": true,
  "results": [
    {
      "phoneNumber": "+40700000001",
      "success": true,
      "messageId": "12345678-1234-1234-1234-123456789012"
    },
    {
      "phoneNumber": "+40700000002",
      "success": true,
      "messageId": "87654321-4321-4321-4321-210987654321"
    }
  ],
  "totalSent": 2,
  "successfulSends": 2,
  "failedSends": 0
}
```

### Răspuns Eroare
```json
{
  "success": false,
  "error": "SMS credentials not configured or API unavailable",
  "data": null
}
```

## ⚠️ Limitări și Considerații

### 1. AWS SNS Limitări
- **Rate Limit:** 200 SMS/secundă per regiune
- **Cost:** ~$0.75 per SMS (România)
- **Caractere:** Max 160 caractere per SMS

### 2. Twilio Fallback
- Se activează automat dacă AWS SNS eșuează
- Necesită credențiale Twilio configurate
- Rate limit: 1 SMS/secundă (trial account)

### 3. Best Practices
- Folosește numere de telefon în format internațional (+40...)
- Limitează mesajele la 160 caractere
- Implementează retry logic pentru mesajele eșuate
- Monitorizează costurile AWS SNS

## 🛠️ Debugging

### 1. Verifică Logs
```bash
# Verifică logs pentru erori SMS
tail -f logs/application.log | grep "SMS"
```

### 2. Testează Configurația AWS
```bash
# Testează credențialele AWS
aws sts get-caller-identity

# Testează SNS direct
aws sns publish --phone-number "+40700000000" --message "Test SMS"
```

### 3. Verifică Status Serviciu
```bash
# Verifică status-ul serviciului
http GET localhost:3001/sms/test/business-123
```

## 📞 Suport

Pentru probleme cu serviciul SMS:
1. Verifică logs-urile aplicației
2. Testează configurația AWS SNS
3. Verifică credențialele în variabilele de mediu
4. Contactează echipa de dezvoltare

---

**Notă:** Acest serviciu folosește AWS SNS ca serviciu principal cu fallback la Twilio. Asigură-te că ai configurat corect credențialele AWS pentru funcționarea optimă.
