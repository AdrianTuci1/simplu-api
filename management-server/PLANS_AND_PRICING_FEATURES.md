# Funcționalități Planuri și Prețuri Dinamice

## Prezentare Generală

Am adăugat funcționalități pentru obținerea planurilor și prețurilor direct din Stripe, permițând o gestionare flexibilă a planurilor de abonament fără a fi nevoie să modifici codul.

## Arhitectura

### Produse și Prețuri în Stripe

Sistemul suportă 2 produse principale, fiecare cu 2 prețuri:
- **Basic Plan**: Lunar și Anual
- **Premium Plan**: Lunar și Anual

### Structura în Stripe Dashboard

```
Basic Plan (prod_basic123)
├── Basic Monthly (price_basic_monthly) - 99 RON/lună
└── Basic Yearly (price_basic_yearly) - 990 RON/an

Premium Plan (prod_premium456)
├── Premium Monthly (price_premium_monthly) - 199 RON/lună
└── Premium Yearly (price_premium_yearly) - 1990 RON/an
```

## Endpoint-uri Noi

### 1. Obținerea Tuturor Planurilor

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
        "recurring": { "interval": "month" }
      },
      {
        "id": "price_basic_yearly",
        "currency": "ron",
        "unitAmount": 99000,
        "recurring": { "interval": "year" }
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
        "recurring": { "interval": "month" }
      },
      {
        "id": "price_premium_yearly",
        "currency": "ron",
        "unitAmount": 199000,
        "recurring": { "interval": "year" }
      }
    ]
  }
]
```

### 2. Obținerea Prețurilor pentru un Plan

```http
GET /payments/plans/basic/prices
Authorization: Bearer <token>
```

### 3. Obținerea unui Preț Specific

```http
GET /payments/plans/basic/price?interval=month&currency=ron
Authorization: Bearer <token>
```

## Metode de Plată

### Opțiunea 1: Cu planKey și billingInterval

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

### Opțiunea 2: Cu priceId direct

```javascript
await fetch(`/payments/business/${businessId}/pay-with-saved-card`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    paymentMethodId: selectedCardId,
    priceId: 'price_basic_monthly'
  })
});
```

## Configurare

### 1. Variabile de Mediu

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Product IDs (obligatoriu)
STRIPE_BASIC_PRODUCT_ID=prod_basic123
STRIPE_PREMIUM_PRODUCT_ID=prod_premium456
```

### 2. Configurare în Stripe Dashboard

1. **Creează produsele**:
   - Basic Plan cu ID: `prod_basic123`
   - Premium Plan cu ID: `prod_premium456`

2. **Adaugă prețurile** pentru fiecare produs:
   - Basic Monthly: 99 RON/lună
   - Basic Yearly: 990 RON/an
   - Premium Monthly: 199 RON/lună
   - Premium Yearly: 1990 RON/an

3. **Asigură-te că prețurile sunt active** în Stripe Dashboard

## Implementare Frontend

### Componenta de Selectare Plan

```jsx
import React, { useState, useEffect } from 'react';

const PlanSelector = ({ onPlanSelect }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/payments/plans', {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      const data = await response.json();
      setPlans(data);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (plan, price) => {
    onPlanSelect({
      planKey: plan.name.toLowerCase(),
      priceId: price.id,
      interval: price.recurring.interval,
      amount: price.unitAmount / 100,
      currency: price.currency.toUpperCase()
    });
  };

  if (loading) return <div>Se încarcă planurile...</div>;

  return (
    <div className="plan-selector">
      <h3>Alege Planul Tău</h3>
      <div className="plans-grid">
        {plans.map(plan => (
          <div key={plan.id} className="plan-card">
            <h4>{plan.name}</h4>
            <p>{plan.description}</p>
            <div className="prices">
              {plan.prices.map(price => (
                <button
                  key={price.id}
                  onClick={() => handlePlanSelect(plan, price)}
                  className="price-option"
                >
                  <div className="interval">{price.recurring.interval === 'month' ? 'Lunar' : 'Anual'}</div>
                  <div className="amount">
                    {price.unitAmount / 100} {price.currency.toUpperCase()}
                  </div>
                  {price.recurring.interval === 'year' && (
                    <div className="savings">Economisești 20%</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlanSelector;
```

### Utilizarea în Componenta de Plată

```jsx
const PaymentComponent = () => {
  const [selectedPlan, setSelectedPlan] = useState(null);

  const handlePlanSelect = (planData) => {
    setSelectedPlan(planData);
  };

  const handlePayment = async () => {
    if (!selectedPlan) return;

    try {
      const response = await fetch(`/payments/business/${businessId}/pay-with-saved-card`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          paymentMethodId: selectedCardId,
          priceId: selectedPlan.priceId // Folosește priceId direct
        })
      });

      const result = await response.json();
      if (result.success) {
        console.log('Plata completă!');
      }
    } catch (error) {
      console.error('Eroare la plată:', error);
    }
  };

  return (
    <div>
      <PlanSelector onPlanSelect={handlePlanSelect} />
      {selectedPlan && (
        <div className="selected-plan">
          <h4>Plan Selectat: {selectedPlan.planKey}</h4>
          <p>{selectedPlan.amount} {selectedPlan.currency} / {selectedPlan.interval}</p>
          <button onClick={handlePayment}>Plătește Acum</button>
        </div>
      )}
    </div>
  );
};
```

## Beneficii

### 1. **Flexibilitate**
- Modifică prețurile direct în Stripe Dashboard
- Adaugă planuri noi fără a modifica codul
- Suportă multiple monede

### 2. **Simplitate**
- Frontend-ul obține automat planurile disponibile
- Nu mai este nevoie să hardcodezi prețurile
- Actualizări în timp real

### 3. **Scalabilitate**
- Ușor de adăugat planuri noi
- Suport pentru multiple regiuni/monede
- Gestionare centralizată în Stripe

### 4. **Securitate**
- Prețurile sunt validate în Stripe
- Nu există risc de manipulare a prețurilor
- Audit trail complet în Stripe

## Testare

### Script de Testare

```bash
node scripts/test-payment-improvements.js
```

### Teste Manuale

1. **Testează obținerea planurilor**:
   ```bash
   curl -H "Authorization: Bearer <token>" \
        http://localhost:3001/payments/plans
   ```

2. **Testează obținerea prețurilor pentru un plan**:
   ```bash
   curl -H "Authorization: Bearer <token>" \
        http://localhost:3001/payments/plans/basic/prices
   ```

3. **Testează obținerea unui preț specific**:
   ```bash
   curl -H "Authorization: Bearer <token>" \
        "http://localhost:3001/payments/plans/basic/price?interval=month&currency=ron"
   ```

## Monitorizare

### Logs Importante

1. **Plan Fetching**: Obținerea planurilor din Stripe
2. **Price Resolution**: Rezolvarea prețurilor pentru plăți
3. **Fallback Usage**: Când se folosesc prețuri fallback

### Metrice

- Numărul de cereri pentru planuri
- Timpul de răspuns pentru endpoint-urile de planuri
- Rate-ul de succes pentru rezolvarea prețurilor

## Migrare

### De la Sistemul Vechi

1. **Configurare**: Adaugă `STRIPE_BASIC_PRODUCT_ID` și `STRIPE_PREMIUM_PRODUCT_ID`
2. **Frontend**: Actualizează pentru a folosi `/payments/plans`
3. **Plăți**: Poți folosi fie `planKey` + `billingInterval`, fie `priceId` direct

### Compatibilitate

- Endpoint-urile vechi funcționează în continuare
- Poți folosi ambele metode de plată
- Migrarea este graduală

## Suport

Pentru probleme sau întrebări:
- Verifică logs-urile pentru erori de conectare la Stripe
- Asigură-te că produsele și prețurile sunt active în Stripe Dashboard
- Verifică că variabilele de mediu sunt configurate corect 