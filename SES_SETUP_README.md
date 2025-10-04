# AWS SES Setup pentru Simplu

Acest ghid te va ajuta să configurezi AWS SES pentru serviciul de email din Simplu.

## 📋 Ce face scriptul

Scriptul `setup-ses.js` configurează automat:
- ✅ Verifică statusul SES (quota, rate, sandbox mode)
- ✅ Verifică email-ul sender
- ✅ Verifică email-uri adiționale (opțional)
- ✅ Generează configurația pentru `.env`
- ✅ Trimite email de test (opțional)

## 🚀 Cum să rulezi setup-ul

### Opțiunea 1: Script bash (recomandat)
```bash
./scripts/setup-ses.sh
```

### Opțiunea 2: Direct cu Node.js
```bash
node scripts/setup-ses.js
```

### Opțiunea 3: Cu variabile de mediu
```bash
AWS_REGION=us-east-1 \
AWS_ACCESS_KEY_ID=your_key \
AWS_SECRET_ACCESS_KEY=your_secret \
SES_SENDER_EMAIL=noreply@simplu.io \
node scripts/setup-ses.js
```

## ⚙️ Configurare necesară

### 1. AWS Credentials
Ai nevoie de:
- AWS Access Key ID
- AWS Secret Access Key
- AWS Region (recomandat: us-east-1)

### 2. Email Sender
Ai nevoie de un email sender, de exemplu:
- `noreply@simplu.io`
- `hello@simplu.io`
- `support@simplu.io`

### 3. Permisiuni IAM
Rolul tău AWS trebuie să aibă permisiunile:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:VerifyEmailIdentity",
        "ses:GetSendQuota",
        "ses:GetSendRate"
      ],
      "Resource": "*"
    }
  ]
}
```

## 📧 Verificare Email-uri

După ce rulezi scriptul:
1. ✅ Verifică inbox-ul pentru email-urile de verificare
2. ✅ Dă click pe link-urile de verificare
3. ✅ Toate email-urile trebuie să fie verificate înainte de a trimite

## 🏭 Pentru Producție

### 1. Ieșire din Sandbox Mode
Dacă SES este în sandbox mode (limitat la 200 emails/zi):
1. Mergi la AWS Console → SES → Account dashboard
2. Dă click pe "Request production access"
3. Completează formularul cu detaliile aplicației

### 2. Configurare DNS
Pentru domeniul tău, configurează:
- **SPF Record**: `v=spf1 include:amazonses.com ~all`
- **DKIM**: Activează DKIM în AWS Console pentru domeniul tău
- **DMARC**: `v=DMARC1; p=quarantine; rua=mailto:dmarc@simplu.io`

### 3. Monitorizare
- Monitorizează bounce rate (trebuie să fie < 5%)
- Monitorizează complaint rate (trebuie să fie < 0.1%)
- Configurează SNS pentru notificări

## 🔧 Configurare în .env

După setup, adaugă în fișierul `.env`:

```bash
# Email (SES)
SES_SENDER_EMAIL=noreply@simplu.io
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

## 🧪 Test Email

Scriptul poate trimite un email de test pentru a verifica că totul funcționează corect.

## ❗ Probleme Comune

### "Email address not verified"
- Verifică că ai dat click pe link-ul de verificare din inbox
- Verifică că email-ul este exact același (case-sensitive)

### "Daily sending quota exceeded"
- Ești în sandbox mode - cere access la producție
- Sau ai depășit limita de 200 emails/zi

### "InvalidUserPoolConfigurationException"
- Verifică AWS credentials
- Verifică regiunea AWS
- Verifică permisiunile IAM

### "MessageRejected"
- Email-ul destinatar nu este verificat (în sandbox mode)
- Sau email-ul sender nu este verificat

## 📞 Suport

Pentru probleme:
1. Verifică logs-urile din AWS CloudWatch
2. Verifică AWS SES console pentru detalii
3. Contactează AWS Support pentru probleme cu SES

## 🎯 Următorii Pași

După ce SES este configurat:
1. ✅ Testează crearea unui business nou
2. ✅ Verifică că email-urile se trimit corect
3. ✅ Configurează monitoring și alerting
4. ✅ Documentează procesul pentru echipă
