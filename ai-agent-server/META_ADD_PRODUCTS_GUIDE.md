# Cum să adaugi Messenger și Instagram la Meta App

## Pasul 1: Accesează Meta for Developers

1. Mergi la [Meta for Developers](https://developers.facebook.com/apps)
2. Click pe **My Apps**
3. Selectează app-ul tău (sau creează unul nou)

---

## Pasul 2: Adaugă Products

În **Dashboard-ul app-ului**, în sidebar stânga, scroll down până la secțiunea **Add Products**:

### Opțiunea A: Prin butonul "Add Product"

1. Click pe **"+ Add Products"** (sau **"Add Product"**)
2. Vei vedea o listă de products disponibile:
   - **Messenger**
   - **Instagram**
   - **WhatsApp**
   - **Facebook Login**
   - etc.

3. Pentru fiecare product pe care vrei să-l adaugi:
   - **Messenger**: Click pe **"Set Up"**
   - **Instagram**: Click pe **"Set Up"**

### Opțiunea B: Direct din secțiunea Products

1. În sidebar stânga, caută secțiunea **Products**
2. Dacă nu vezi un product specific (ex: Messenger sau Instagram):
   - Click pe **"+ Add Product"** din josul listei de products
   - Selectează product-ul dorit

---

## Pasul 3: Setup pentru fiecare Product

### 📱 **WhatsApp Setup** (dacă nu l-ai făcut deja)

1. **Dashboard** → **WhatsApp** → **API Setup**
2. **Add phone number** → Urmează setup wizard
3. **Configuration** → Setează webhook:
   ```
   Callback URL: https://your-ngrok-url.ngrok.io/webhooks/meta/B01L01
   Verify Token: simplu_meta_webhook_2025_secure_token
   ```
4. Subscribe la **messages** webhook field

---

### 💬 **Messenger Setup**

1. **Dashboard** → **Messenger** → **Settings**

2. **Generate Access Token**:
   - Selectează o **Facebook Page** (sau creează una)
   - Click **"Generate Token"**
   - Copiază token-ul (optional, se salvează automat)

3. **Webhooks**:
   - Scroll la **Webhooks** section
   - Click **"Add Callback URL"**
   ```
   Callback URL: https://your-ngrok-url.ngrok.io/webhooks/meta/B01L01
   Verify Token: simplu_meta_webhook_2025_secure_token
   ```
   - Click **"Verify and Save"**

4. **Subscribe to webhook fields**:
   - ✅ **messages**
   - ✅ **messaging_postbacks**
   - ✅ **messaging_optins**
   - Click **"Subscribe"**

5. **Subscribe your Page**:
   - Selectează Page-ul tău
   - Click **"Subscribe"**

---

### 📷 **Instagram Setup**

1. **Dashboard** → **Instagram** → **Basic Display**

2. **Connect Instagram Account**:
   - Click **"Add Instagram Account"**
   - Login cu contul Instagram Business
   - **Important**: Trebuie să fie **Instagram Business Account** (nu personal)
   - Conectează-l cu o **Facebook Page**

3. **Instagram Messaging API**:
   - Înapoi la Dashboard → **Instagram** → **Messenger API**
   - Click **"Get Started"**

4. **Webhooks**:
   - Scroll la **Webhooks**
   - Click **"Add Callback URL"** (dacă nu e deja setat)
   ```
   Callback URL: https://your-ngrok-url.ngrok.io/webhooks/meta/B01L01
   Verify Token: simplu_meta_webhook_2025_secure_token
   ```
   - Click **"Verify and Save"**

5. **Subscribe to webhook fields**:
   - ✅ **messages**
   - ✅ **messaging_postbacks**
   - Click **"Subscribe"**

6. **Subscribe Instagram Account**:
   - Selectează Instagram Account-ul
   - Click **"Subscribe"**

---

## Pasul 4: Verificare Setup

### Test Messenger:

1. Mergi la **Facebook Page**-ul tău
2. Click **"Send Message"** (de pe alt cont Facebook)
3. Trimite un mesaj → Ar trebui să vezi logs în server!

### Test Instagram:

1. Mergi la **Instagram Business Profile**-ul tău
2. Trimite un **Direct Message** de pe alt cont Instagram
3. Ar trebui să vezi logs în server!

### Test WhatsApp:

1. Trimite mesaj pe **WhatsApp** către Business Number
2. Ar trebui să vezi logs în server!

---

## Verificare Logs

În terminal:
```bash
docker-compose logs -f ai-agent-server
```

Pentru fiecare platformă ar trebui să vezi:

**Messenger:**
```
[MetaWebhookController] 📱 Platform: facebook
[MetaWebhookController] 👤 From: John Doe
[MetaWebhookController] 💬 Content: "Hello from Messenger"
```

**Instagram:**
```
[MetaWebhookController] 📱 Platform: instagram
[MetaWebhookController] 👤 From: john_doe
[MetaWebhookController] 💬 Content: "Hello from Instagram"
```

**WhatsApp:**
```
[MetaWebhookController] 📱 Platform: whatsapp
[MetaWebhookController] 👤 From: John Doe (+40787654321)
[MetaWebhookController] 💬 Content: "Hello from WhatsApp"
```

---

## Important: Permissions și App Review

### Development Mode vs Production

**În Development Mode:**
- Doar **admins, developers, și testers** pot interacționa cu app-ul
- Pentru WhatsApp: doar test numbers pot trimite mesaje
- Pentru Messenger: doar test users pot trimite mesaje
- Pentru Instagram: doar test accounts pot trimite mesaje

**Pentru Production:**
- Trebuie să trimiți app-ul la **App Review**
- Solicită permissions necesare:
  - `pages_messaging`
  - `instagram_manage_messages`
  - `whatsapp_business_messaging`

### Cum să adaugi Test Users:

1. **Dashboard** → **Roles** → **Test Users**
2. Click **"Add Test Users"**
3. Creează sau adaugă test users
4. Acești users pot testa app-ul în development mode

---

## Troubleshooting

### Nu găsesc "Add Products"

**Soluție:**
- Scroll în sidebar până jos
- Caută secțiunea **"Products"** sau **"+ Add Products"**
- Dacă nu vezi, verifică dacă ai drepturi de admin pe app

### "Product not available for your app type"

**Soluție:**
- Unele products necesită Business Verification
- **Meta Business Verification**: Dashboard → Settings → Business Verification
- Completează verificarea business-ului

### Instagram nu apare ca opțiune

**Cauze:**
- Nu ai Instagram Business Account
- Instagram nu e conectat la o Facebook Page

**Soluție:**
1. Convertește Instagram Account în **Business Account**
2. Conectează-l la o **Facebook Page**
3. Apoi poți adăuga Instagram product

### Webhook verification failed

**Cauze:**
- Verify token diferit în `.env` vs Meta Dashboard
- Serverul nu e accesibil public (trebuie ngrok!)
- Server-ul nu rulează

**Soluție:**
1. Verifică că `META_WEBHOOK_VERIFY_TOKEN` din `.env` = Verify Token din Meta
2. Folosește ngrok: `ngrok http 3003`
3. Restart server: `docker-compose restart ai-agent-server`

---

## Rezumat Quick Setup

```bash
# 1. Start server
docker-compose up -d ai-agent-server

# 2. Start ngrok
ngrok http 3003
# Copiază URL: https://abc123.ngrok.io

# 3. Meta Dashboard pentru FIECARE product:
# Webhook URL: https://abc123.ngrok.io/webhooks/meta/B01L01
# Verify Token: simplu_meta_webhook_2025_secure_token
# Subscribe: messages ✅

# 4. Test:
# - Trimite mesaj pe Messenger
# - Trimite DM pe Instagram  
# - Trimite mesaj pe WhatsApp
# → Vezi logs în terminal!
```

---

## Ce Product să folosești?

**Depinde de use case:**

- **WhatsApp**: Pentru comunicare cu clienți prin WhatsApp Business
- **Messenger**: Pentru chat de pe Facebook Page
- **Instagram**: Pentru DMs din Instagram Business

**Poți folosi toate 3 simultan!** Același webhook primește mesaje de pe toate platformele! 🎉

