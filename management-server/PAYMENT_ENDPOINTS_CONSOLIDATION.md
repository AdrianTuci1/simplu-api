# Consolidarea Endpoint-urilor de Plăți

## Decizia Luată

Am decis să **păstrăm endpoint-urile existente** din `UsersController` și să **eliminăm duplicatele** din `PaymentController` pentru a menține o arhitectură curată și consistentă.

## Structura Finală

### ✅ Endpoint-uri Păstrate (Existente)

#### Gestionarea Cardurilor - `UsersController`
```http
GET /users/me/payment-methods
POST /users/me/payment-methods
```

#### Plăți - `PaymentController`
```http
POST /payments/business/:id/pay-with-saved-card
POST /payments/business/:id/subscription
GET /payments/invoices
GET /payments/business/:id/subscription/status
```

#### Webhook-uri - `WebhookController`
```http
POST /webhooks/stripe
```

### ❌ Endpoint-uri Eliminate (Duplicate)

```http
GET /payments/payment-methods          ❌ Eliminat
POST /payments/attach-payment-method   ❌ Eliminat
```

## Motivele Deciziei

### 1. **Consistență cu Arhitectura Existentă**
- Endpoint-urile pentru utilizatori sunt în `UsersController`
- Endpoint-urile pentru plăți sunt în `PaymentController`
- Separarea clară a responsabilităților

### 2. **Compatibilitate cu Frontend-ul Existent**
- Frontend-ul probabil folosește deja `/users/me/payment-methods`
- Nu este nevoie de modificări în frontend

### 3. **Simplitate**
- Evită confuzia între endpoint-uri similare
- O singură sursă de adevăr pentru gestionarea cardurilor

## Implementarea în Frontend

### Gestionarea Cardurilor
```javascript
// Listarea cardurilor
const cards = await fetch('/users/me/payment-methods', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Adăugarea unui card nou
await fetch('/users/me/payment-methods', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ paymentMethodId: 'pm_123' })
});
```

### Plăți cu Cardul Salvat
```javascript
// Plata cu cardul salvat
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

## Beneficii

1. **Arhitectură Curată**: Separarea clară a responsabilităților
2. **Compatibilitate**: Nu strică codul existent
3. **Mentenabilitate**: Mai ușor de întreținut și debugat
4. **Consistență**: Toate endpoint-urile pentru utilizatori sunt în același controller

## Migrare

Nu este nevoie de migrare - endpoint-urile existente funcționează în continuare. Noile funcționalități (webhook-uri, plăți cu cardul salvat) sunt adăugate pe lângă cele existente.

## Testare

Scriptul de testare a fost actualizat pentru a folosi endpoint-urile corecte:

```bash
node scripts/test-payment-improvements.js
```

## Documentație Actualizată

- `PAYMENT_IMPROVEMENTS.md` - Documentația tehnică actualizată
- `FRONTEND_PAYMENT_INTEGRATION.md` - Ghidul de integrare frontend actualizat
- `BUSINESS_CREATION_FLOW.md` - Fluxul existent rămâne neschimbat 