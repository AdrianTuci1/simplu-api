# Îmbunătățiri Sistem Plăți

## Prezentare Generală

Sistemul de plăți a fost îmbunătățit pentru a oferi o experiență mai bună și actualizări automate ale statusului business-urilor. Principalele îmbunătățiri includ:

1. **Plăți cu cardul salvat** - Posibilitatea de a plăti direct din interfață cu cardurile salvate
2. **Webhook-uri Stripe** - Actualizări automate ale statusului business-ului și tabelului de abonamente
3. **Gestionarea cardurilor salvate** - API-uri pentru atașarea și listarea cardurilor de plată
4. **Planuri și prețuri dinamice** - Obținerea planurilor și prețurilor direct din Stripe

## Noi Endpoint-uri

### 1. Obținerea Planurilor Disponibile

```http
GET /payments/plans
Authorization: Bearer <token>
```

**Răspuns:**
```json
[
  {
    "id": "prod_basic123",
    "name": "Basic",
    "description": "Planul de bază pentru business-uri mici",
    "prices": [
      {
        "id": "price_basic_monthly",
        "currency": "ron",
        "unitAmount": 9900,
        "recurring": {
          "interval": "month"
        }
      },
      {
        "id": "price_basic_yearly",
        "currency": "ron",
        "unitAmount": 99000,
        "recurring": {
          "interval": "year"
        }
      }
    ]
  },
  {
    "id": "prod_premium456",
    "name": "Premium",
    "description": "Planul premium cu funcționalități avansate",
    "prices": [
      {
        "id": "price_premium_monthly",
        "currency": "ron",
        "unitAmount": 19900,
        "recurring": {
          "interval": "month"
        }
      },
      {
        "id": "price_premium_yearly",
        "currency": "ron",
        "unitAmount": 199000,
        "recurring": {
          "interval": "year"
        }
      }
    ]
  }
]
```

### 2. Obținerea Prețurilor pentru un Plan Specific

```http
GET /payments/plans/basic/prices
Authorization: Bearer <token>
```

**Răspuns:**
```json
[
  {
    "id": "price_basic_monthly",
    "currency": "ron",
    "unitAmount": 9900,
    "recurring": {
      "interval": "month"
    }
  },
  {
    "id": "price_basic_yearly",
    "currency": "ron",
    "unitAmount": 99000,
    "recurring": {
      "interval": "year"
    }
  }
]
```

### 3. Obținerea unui Preț Specific

```http
GET /payments/plans/basic/price?interval=month&currency=ron
Authorization: Bearer <token>
```

**Răspuns:**
```json
{
  "id": "price_basic_monthly",
  "currency": "ron",
  "unitAmount": 9900,
  "recurring": {
    "interval": "month"
  }
}
```

### 4. Plăți cu Cardul Salvat

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

**Sau cu priceId direct:**
```json
{
  "paymentMethodId": "pm_1234567890",
  "priceId": "price_basic_monthly"
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

### 5. Listarea Cardurilor Salvate

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

### 6. Atașarea unui Card Nou

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

### 7. Webhook Stripe (Pentru Actualizări Automate)

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

## Configurare Stripe

### 1. Variabile de Mediu

Adaugă în fișierul `.env`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Product IDs (opțional - dacă nu sunt configurate, se folosesc planKey)
STRIPE_BASIC_PRODUCT_ID=prod_basic123
STRIPE_PREMIUM_PRODUCT_ID=prod_premium456
```

### 2. Configurare în Stripe Dashboard

1. **Creează produsele** în Stripe Dashboard:
   - Basic Plan (prod_basic123)
   - Premium Plan (prod_premium456)

2. **Adaugă prețurile** pentru fiecare produs:
   - Basic Monthly: 99 RON/lună
   - Basic Yearly: 990 RON/an
   - Premium Monthly: 199 RON/lună
   - Premium Yearly: 1990 RON/an

3. **Configurează webhook-urile**:
   - URL: `https://your-domain.com/webhooks/stripe`
   - Evenimente: `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`

## Fluxul de Plăți Îmbunătățit

### 1. Prima Plată (Card Nou)
1. Frontend-ul obține planurile disponibile prin `GET /payments/plans`
2. Utilizatorul selectează un plan și interval
3. Utilizatorul introduce datele cardului în frontend
4. Frontend-ul creează un `PaymentMethod` în Stripe
5. Se apelează `POST /users/me/payment-methods` pentru a atașa cardul
6. Se apelează `POST /payments/business/:id/pay-with-saved-card` cu `priceId` sau `planKey` + `billingInterval`
7. Business-ul se activează automat dacă plata reușește

### 2. Plăți Următoare (Card Salvat)
1. Frontend-ul obține planurile disponibile prin `GET /payments/plans`
2. Utilizatorul selectează un plan și interval
3. Utilizatorul selectează un card salvat din interfață
4. Se apelează direct `POST /payments/business/:id/pay-with-saved-card`
5. Business-ul se activează automat

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
   - Planuri și prețuri dinamice din Stripe

2. **Actualizări Automate**
   - Statusul business-ului se actualizează în timp real
   - Nu mai este nevoie de refresh manual

3. **Gestionare Mai Bună a Plăților**
   - Perioadă de grație pentru plățile eșuate
   - Actualizări automate ale statusului de plată
   - Flexibilitate în gestionarea planurilor

4. **Securitate**
   - Verificarea semnăturii webhook-urilor
   - Cardurile sunt salvate în Stripe, nu în baza noastră de date

## Implementare Frontend

### 1. Obținerea Planurilor

```javascript
// Obține toate planurile disponibile
const plans = await fetch('/payments/plans', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// Afișează planurile în interfață
plans.forEach(plan => {
  console.log(`Plan: ${plan.name}`);
  plan.prices.forEach(price => {
    console.log(`  ${price.recurring.interval}: ${price.unitAmount / 100} ${price.currency.toUpperCase()}`);
  });
});
```

### 2. Salvarea Cardului

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

### 3. Listarea Cardurilor Salvate

```javascript
const paymentMethods = await fetch('/users/me/payment-methods', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// Afișează cardurile în interfață
paymentMethods.forEach(pm => {
  console.log(`${pm.card.brand} ending in ${pm.card.last4}`);
});
```

### 4. Plata cu Cardul Salvat

```javascript
// Opțiunea 1: Cu planKey și billingInterval
await fetch(`/payments/business/${businessId}/pay-with-saved-card`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    paymentMethodId: selectedCardId,
    planKey: 'basic',
    billingInterval: 'month'
  })
});

// Opțiunea 2: Cu priceId direct
await fetch(`/payments/business/${businessId}/pay-with-saved-card`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    paymentMethodId: selectedCardId,
    priceId: 'price_basic_monthly'
  })
});
```

## Monitorizare și Debugging

### Logs Importante

1. **Webhook Events**: Toate evenimentele webhook sunt logate
2. **Payment Failures**: Erorile de plată sunt logate cu detalii
3. **Business Activation**: Activarea business-urilor este logată
4. **Plan Fetching**: Obținerea planurilor din Stripe este logată
5. **DynamoDB Operations**: Operațiunile cu tabelul business-subscriptions sunt logate
6. **GSI Usage**: Avertismente când se folosește scan în loc de GSI

### Tabelul Business-Subscriptions

Tabelul `business-subscriptions` trebuie configurat cu un GSI (Global Secondary Index) pe `subscriptionId` pentru căutări eficiente. Vezi `DYNAMODB_SUBSCRIPTIONS_SETUP.md` pentru instrucțiuni complete.

### Testare Webhook-uri

Poți testa webhook-urile folosind Stripe CLI:

```bash
stripe listen --forward-to localhost:3001/webhooks/stripe
```

## Migrare de la Sistemul Vechi

1. **Compatibilitate**: Toate endpoint-urile vechi funcționează în continuare
2. **Webhook-uri**: Trebuie configurate manual în Stripe Dashboard
3. **Variabile de Mediu**: Adaugă `STRIPE_WEBHOOK_SECRET` și opțional `STRIPE_BASIC_PRODUCT_ID`, `STRIPE_PREMIUM_PRODUCT_ID` în `.env`

## Securitate

1. **Webhook Signature Verification**: Toate webhook-urile sunt verificate
2. **Payment Method Ownership**: Se verifică că cardul aparține utilizatorului
3. **Business Ownership**: Doar proprietarul business-ului poate plăti
4. **HTTPS Required**: Toate comunicările trebuie să fie pe HTTPS

## Structura Endpoint-urilor

### Planuri și Prețuri (PaymentController)
- `GET /payments/plans` - Toate planurile disponibile
- `GET /payments/plans/:planKey/prices` - Prețurile pentru un plan
- `GET /payments/plans/:planKey/price` - Un preț specific

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