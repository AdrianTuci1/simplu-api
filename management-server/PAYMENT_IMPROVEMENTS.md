# Îmbunătățiri Sistem Plăți

## Prezentare Generală

Sistemul de plăți a fost îmbunătățit pentru a oferi o experiență mai bună și actualizări automate ale statusului business-urilor. Principalele îmbunătățiri includ:

1. **Plăți cu cardul salvat** - Posibilitatea de a plăti direct din interfață cu cardurile salvate
2. **Webhook-uri Stripe** - Actualizări automate ale statusului business-ului și tabelului de abonamente
3. **Gestionarea cardurilor salvate** - API-uri pentru atașarea și listarea cardurilor de plată

## Noi Endpoint-uri

### 1. Plăți cu Cardul Salvat

```http
POST /payments/business/:id/pay-with-saved-card
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentMethodId": "pm_1234567890",
  "planKey": "basic",
  "billingInterval": "month",
  "currency": "ron"
}
```

**Răspuns:**
```json
{
  "subscriptionId": "sub_1234567890",
  "status": "active",
  "success": true
}
```

### 2. Listarea Cardurilor Salvate

```http
GET /users/me/payment-methods
Authorization: Bearer <token>
```

**Răspuns:**
```json
[
  {
    "id": "pm_1234567890",
    "type": "card",
    "card": {
      "brand": "visa",
      "last4": "4242",
      "expMonth": 12,
      "expYear": 2025
    },
    "billingDetails": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "isDefault": true
  }
]
```

### 3. Atașarea unui Card Nou

```http
POST /users/me/payment-methods
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentMethodId": "pm_1234567890"
}
```

**Răspuns:**
```json
{
  "ok": true
}
```

### 4. Webhook Stripe (Pentru Actualizări Automate)

```http
POST /webhooks/stripe
Content-Type: application/json
Stripe-Signature: <signature>

{
  "type": "invoice.payment_succeeded",
  "data": {
    "object": {
      "id": "in_1234567890",
      "subscription": "sub_1234567890",
      "customer": "cus_1234567890",
      "status": "paid"
    }
  }
}
```

## Configurare Webhook Stripe

### 1. În Dashboard-ul Stripe

1. Mergi la **Developers > Webhooks**
2. Creează un nou webhook cu URL-ul: `https://your-domain.com/webhooks/stripe`
3. Selectează următoarele evenimente:
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copiază **Signing secret** și adaugă-l în `.env` ca `STRIPE_WEBHOOK_SECRET`

### 2. Variabile de Mediu

Adaugă în fișierul `.env`:

```bash
# Stripe Webhook
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Fluxul de Plăți Îmbunătățit

### 1. Prima Plată (Card Nou)
1. Utilizatorul introduce datele cardului în frontend
2. Frontend-ul creează un `PaymentMethod` în Stripe
3. Se apelează `POST /users/me/payment-methods` pentru a atașa cardul
4. Se apelează `POST /payments/business/:id/pay-with-saved-card` pentru a plăti
5. Business-ul se activează automat dacă plata reușește

### 2. Plăți Următoare (Card Salvat)
1. Utilizatorul selectează un card salvat din interfață
2. Se apelează direct `POST /payments/business/:id/pay-with-saved-card`
3. Business-ul se activează automat

### 3. Actualizări Automate
1. Stripe trimite webhook-uri la fiecare schimbare de status
2. Sistemul actualizează automat:
   - Statusul business-ului în baza de date
   - Tabelul `business-subscriptions`
   - Statusul de plată (`active`, `past_due`, `unpaid`, `canceled`)

## Tipuri de Evenimente Webhook

### `invoice.payment_succeeded`
- Actualizează statusul business-ului la `active`
- Activează business-ul automat
- Actualizează tabelul de abonamente

### `invoice.payment_failed`
- Setează statusul de plată la `unpaid`
- Pornește perioada de grație (7 zile)
- Nu dezactivează business-ul imediat

### `customer.subscription.updated`
- Actualizează statusul abonamentului
- Activează/dezactivează business-ul în funcție de status

### `customer.subscription.deleted`
- Șterge înregistrarea din tabelul de abonamente
- Setează statusul de plată la `canceled`

## Beneficii

1. **Experiență Utilizator Îmbunătățită**
   - Plăți rapide cu cardurile salvate
   - Nu mai este nevoie să reintroduci datele cardului

2. **Actualizări Automate**
   - Statusul business-ului se actualizează în timp real
   - Nu mai este nevoie de refresh manual

3. **Gestionare Mai Bună a Plăților**
   - Perioadă de grație pentru plățile eșuate
   - Actualizări automate ale statusului de plată

4. **Securitate**
   - Verificarea semnăturii webhook-urilor
   - Cardurile sunt salvate în Stripe, nu în baza noastră de date

## Implementare Frontend

### 1. Salvarea Cardului

```javascript
// Creează PaymentMethod în Stripe
const { paymentMethod } = await stripe.createPaymentMethod({
  type: 'card',
  card: cardElement,
});

// Atașează cardul la cont
await fetch('/users/me/payment-methods', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ paymentMethodId: paymentMethod.id })
});
```

### 2. Listarea Cardurilor Salvate

```javascript
const paymentMethods = await fetch('/users/me/payment-methods', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// Afișează cardurile în interfață
paymentMethods.forEach(pm => {
  console.log(`${pm.card.brand} ending in ${pm.card.last4}`);
});
```

### 3. Plata cu Cardul Salvat

```javascript
await fetch(`/payments/business/${businessId}/pay-with-saved-card`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    paymentMethodId: selectedCardId,
    planKey: 'basic',
    billingInterval: 'month'
  })
});
```

## Monitorizare și Debugging

### Logs Importante

1. **Webhook Events**: Toate evenimentele webhook sunt logate
2. **Payment Failures**: Erorile de plată sunt logate cu detalii
3. **Business Activation**: Activarea business-urilor este logată

### Testare Webhook-uri

Poți testa webhook-urile folosind Stripe CLI:

```bash
stripe listen --forward-to localhost:3001/webhooks/stripe
```

## Migrare de la Sistemul Vechi

1. **Compatibilitate**: Toate endpoint-urile vechi funcționează în continuare
2. **Webhook-uri**: Trebuie configurate manual în Stripe Dashboard
3. **Variabile de Mediu**: Adaugă `STRIPE_WEBHOOK_SECRET` în `.env`

## Securitate

1. **Webhook Signature Verification**: Toate webhook-urile sunt verificate
2. **Payment Method Ownership**: Se verifică că cardul aparține utilizatorului
3. **Business Ownership**: Doar proprietarul business-ului poate plăti
4. **HTTPS Required**: Toate comunicările trebuie să fie pe HTTPS

## Structura Endpoint-urilor

### Gestionarea Cardurilor (UsersController)
- `GET /users/me/payment-methods` - Listarea cardurilor salvate
- `POST /users/me/payment-methods` - Atașarea unui card nou

### Plăți (PaymentController)
- `POST /payments/business/:id/pay-with-saved-card` - Plată cu cardul salvat
- `POST /payments/business/:id/subscription` - Crearea abonamentului
- `GET /payments/invoices` - Listarea facturilor
- `GET /payments/business/:id/subscription/status` - Statusul abonamentului

### Webhook-uri (WebhookController)
- `POST /webhooks/stripe` - Webhook Stripe pentru actualizări automate 