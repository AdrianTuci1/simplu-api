### API Payment (management-server)

Integrare frontend pentru `@payment/` (Stripe): abonamente, planuri, validare plăți, webhook-uri.

- **Base path**: `/payments`
- **Autentificare**: doar pentru rutele de listare/creare abonamente (dacă aplicația ta face proxy). Webhook-ul NU necesită auth public, dar recomandat un secret/semnătură Stripe la nivel de gateway.

### Configurare și mediu

- **Stripe**: setează `STRIPE_SECRET_KEY` în `.env` (vezi `management-server/env.example`).
- **DynamoDB**: `DYNAMODB_SUBSCRIPTIONS_TABLE_NAME` (implicit: `business-subscriptions`).
- **Planuri implicite**: opțional `STRIPE_BASIC_PLAN_PRICE_ID`, `STRIPE_PREMIUM_PLAN_PRICE_ID`.
- Test mode: folosește cheile de test Stripe și cardurile de test (`4242 4242 4242 4242`).

### DTO-uri

- **CreateSubscriptionDto** (body `POST /payments/create-subscription`):
  ```json
  {
    "priceId": "price_123",           // Stripe price ID
    "customerEmail": "user@example.com",
    "customerName": "User Name",
    "currency": "usd",               // usd | eur | gbp | ron (implicit: usd)
    "customerId": "cus_abc"          // opțional; dacă lipsește se creează client nou
  }
  ```

- **ValidateSubscriptionDto** (body `POST /payments/validate-subscription`):
  ```json
  {
    "customerId": "cus_abc",         // opțional; dacă lipsește -> trebuie email + name
    "email": "user@example.com",     // required dacă nu ai customerId
    "name": "User Name",             // required dacă nu ai customerId
    "subscriptionId": "sub_123",     // opțional; pt validarea/primul payment al subscripției
    "amount": 100,                     // opțional; în cenți; dacă lipsește se folosește prețul subscripției
    "currency": "usd"                // usd | eur | gbp | ron (implicit: usd)
  }
  ```

### Endpoints

- **POST `/payments/webhook`**
  - Primește evenimente Stripe: `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`.
  - Răspuns: `{ "received": true }` la succes.
  - Notă: în producție verificați semnătura Stripe (Stripe-Signature) la edge/gateway.

- **GET `/payments/subscription/:id`**
  - Returnează detalii Stripe Subscription (`sub_...`).

- **POST `/payments/subscription/:id/cancel`**
  - Anulează o subscripție Stripe.

- **GET `/payments/customer/:customerId/subscriptions`**
  - Lista tuturor subscripțiilor clientului (toate statusurile), cu `latest_invoice` și `price` expandate.

- **GET `/payments/customer/:customerId/subscriptions/active`**
  - Doar subscripțiile active ale clientului.

- **GET `/payments/plans`**
  - Listează planurile disponibile din Stripe (Prices + Products) într-un format simplificat: `priceId`, `productName`, `amount`, `currency`, `interval`, `nickname`, `features`.

- **GET `/payments/plans/categories`**
  - Returnează planuri grupate: `basic`, `premium`, `other` (pe baza nickname/name/metadata).

- **GET `/payments/plans/:priceId`**
  - Returnează detaliile unui plan specific (Price + Product expandat).

- **POST `/payments/create-subscription`**
  - Body: `CreateSubscriptionDto`.
  - Creează client (dacă lipsește) și subscripție Stripe. Răspuns include `subscription`, `customer` și, dacă e cazul, `clientSecret` pentru confirmarea payment intent-ului.
  - cURL:
    ```bash
    curl -X POST "$API_URL/payments/create-subscription" \
      -H "Content-Type: application/json" \
      -d '{
        "priceId": "price_123",
        "customerEmail": "user@example.com",
        "customerName": "User Name",
        "currency": "ron"
      }'
    ```

- **POST `/payments/validate-subscription`**
  - Body: `ValidateSubscriptionDto`.
  - Creează un PaymentIntent pentru validarea subscripției / prima plată.
  - Răspuns tipic:
  ```json
  {
    "paymentIntent": {
      "id": "pi_...",
      "client_secret": "pi_..._secret_...",
      "amount": 1234,
      "currency": "ron"
    }
  }
  ```

### Salvarea metodei de plată pentru plăți viitoare

Scop: să salvezi cardul clientului pentru plăți off-session viitoare.

- Recomandat (abonamente): folosește `POST /payments/create-subscription` cu `priceId`. Serverul creează subscripția cu `payment_settings.save_default_payment_method = on_subscription`, iar după confirmarea plății, metoda de plată devine default pentru clientul Stripe.
  - Pași frontend (Stripe.js):
    1) Apelează backend-ul: `POST /payments/create-subscription` și preia `client_secret` (din `subscription.latest_invoice.payment_intent.client_secret`).
    2) Confirmă pe client:
       ```typescript
       import { loadStripe } from '@stripe/stripe-js';

       const stripe = await loadStripe('<PUBLISHABLE_KEY>');
       const elements = stripe!.elements();
       const card = elements.create('card');
       card.mount('#card-element');

       const { error, paymentIntent } = await stripe!.confirmCardPayment(clientSecret, {
         payment_method: { card },
       });
       ```
    3) La succes, cardul este salvat ca default pe customer; subscripția va rula plăți viitoare off-session automat.

- Alternativ (doar salvare card, fără abonament): fluxul Stripe recomandă un SetupIntent. Backend-ul expune deja logică internă pentru `SetupIntent` (vezi service), dar nu există endpoint public dedicat. Dacă ai nevoie, adăugăm rapid `POST /payments/setup-intent` (care creează `setup_intent` pentru un `customerId`) — spune-ne și îl expunem.

### Mapare la șablonul Stripe „setup future payments”

1) Create a new customer
   - În API-ul nostru: nu există endpoint separat pentru asta; la `POST /payments/create-subscription` sau `POST /payments/validate-subscription`, dacă omiteți `customerId`, serverul creează automat clientul Stripe pe baza `customerEmail`/`customerName` (sau `email`/`name`).

2) Create a checkout interface (mode: setup)
   - Noi nu folosim Stripe Checkout Sessions pentru setup în acest API. Echivalentul pentru salvare card este `create-subscription` + confirmare `payment_intent` pe client (salvează metoda pe customer prin `save_default_payment_method=on_subscription`). Dacă preferi SetupIntent cu Checkout, e posibil dar neceistă expunerea unui endpoint dedicat.

3) Retrieve the SetupIntent
   - Momentan, fără endpoint public. Se poate adăuga `POST /payments/setup-intent` care creează și returnează `setup_intent` (serverul are deja `setupIntent(customerId)` în service).

4) Charge the payment method later
   - Pentru abonamente, Stripe va taxa automat la reînnoiri off-session folosind metoda default salvată.
   - Pentru plăți one-off off-session, e nevoie de un endpoint suplimentar care să creeze un `payment_intent` cu `off_session: true, confirm: true` (similar șablonului Stripe) — îl putem adăuga la cerere.

### Integrare cu `@business/`

- La crearea unui business, serverul creează automat `customer` și `subscription` în Stripe folosind `priceId` transmis sau pe cel implicit (`STRIPE_BASIC_PLAN_PRICE_ID`).
- Dacă business-ul este configurat pentru alt email (`configureForEmail`), infrastructura se creează după confirmarea plății; altfel imediat.
- Webhook-urile Stripe actualizează statusul subscripției și pot declanșa crearea infrastructurii dacă plata reușește pentru un business suspendat.

### Observații frontend

- Pentru fluxul de checkout/confirmare:
  - Folosește `client_secret` din răspunsul `create-subscription` sau `validate-subscription` cu Stripe.js pentru confirmare.
  - După confirmare, reîncarcă statusul business-ului: `GET /businesses/:id/status` sau Stripe customer/subscription.
- Afișare planuri: consumă `/payments/plans` sau `/payments/plans/categories` și mapează `amount` (cents) și `interval`.

