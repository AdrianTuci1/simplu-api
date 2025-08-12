# Integrare Frontend - Sistem Plăți Îmbunătățit

## Prezentare Generală

Acest document descrie cum să integrezi noile funcționalități de plată în frontend-ul tău. Sistemul permite plăți cu cardurile salvate și actualizări automate ale statusului business-ului.

## Configurare Stripe

### 1. Instalare Dependințe

```bash
npm install @stripe/stripe-js
```

### 2. Inițializare Stripe

```javascript
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_test_your_publishable_key_here');
```

## Componente React

### 1. Componenta de Listare Carduri Salvate

```jsx
import React, { useState, useEffect } from 'react';

const SavedCardsList = ({ onCardSelect }) => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSavedCards();
  }, []);

  const fetchSavedCards = async () => {
    try {
      const response = await fetch('/users/me/payment-methods', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch saved cards');
      }

      const data = await response.json();
      setCards(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCardSelect = (cardId) => {
    onCardSelect(cardId);
  };

  if (loading) return <div>Se încarcă cardurile...</div>;
  if (error) return <div>Eroare: {error}</div>;

  return (
    <div className="saved-cards">
      <h3>Carduri Salvate</h3>
      {cards.length === 0 ? (
        <p>Nu ai carduri salvate. Adaugă un card nou pentru plăți rapide.</p>
      ) : (
        <div className="cards-grid">
          {cards.map((card) => (
            <div
              key={card.id}
              className="card-item"
              onClick={() => handleCardSelect(card.id)}
            >
              <div className="card-brand">{card.card.brand}</div>
              <div className="card-number">•••• {card.card.last4}</div>
              <div className="card-expiry">
                {card.card.exp_month}/{card.card.exp_year}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedCardsList;
```

### 2. Componenta de Adăugare Card Nou

```jsx
import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const AddNewCard = ({ onCardAdded }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!stripe || !elements) {
      setError('Stripe nu este inițializat');
      setLoading(false);
      return;
    }

    try {
      // Creează PaymentMethod
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
      });

      if (pmError) {
        setError(pmError.message);
        setLoading(false);
        return;
      }

      // Atașează cardul la cont
      const response = await fetch('/users/me/payment-methods', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to attach payment method');
      }

      const result = await response.json();
      
      if (result.success) {
        onCardAdded(paymentMethod);
        // Resetează formularul
        elements.getElement(CardElement).clear();
      } else {
        setError('Eroare la salvarea cardului');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-card-form">
      <h3>Adaugă Card Nou</h3>
      
      <div className="card-element-container">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="submit-button"
      >
        {loading ? 'Se salvează...' : 'Salvează Cardul'}
      </button>
    </form>
  );
};

export default AddNewCard;
```

### 3. Componenta de Plată cu Cardul Salvat

```jsx
import React, { useState } from 'react';

const PayWithSavedCard = ({ businessId, selectedCardId, onPaymentComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState({
    planKey: 'basic',
    billingInterval: 'month',
    currency: 'ron'
  });

  const handlePayment = async () => {
    if (!selectedCardId) {
      setError('Selectează un card pentru plată');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/payments/business/${businessId}/pay-with-saved-card`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentMethodId: selectedCardId,
          ...paymentConfig
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Eroare la plată');
      }

      const result = await response.json();
      
      if (result.success) {
        onPaymentComplete(result);
      } else {
        setError('Plata a eșuat');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pay-with-saved-card">
      <h3>Plată cu Cardul Salvat</h3>
      
      <div className="payment-config">
        <label>
          Plan:
          <select
            value={paymentConfig.planKey}
            onChange={(e) => setPaymentConfig(prev => ({
              ...prev,
              planKey: e.target.value
            }))}
          >
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
          </select>
        </label>

        <label>
          Interval Facturare:
          <select
            value={paymentConfig.billingInterval}
            onChange={(e) => setPaymentConfig(prev => ({
              ...prev,
              billingInterval: e.target.value
            }))}
          >
            <option value="month">Lunar</option>
            <option value="year">Anual</option>
          </select>
        </label>
      </div>

      {error && <div className="error-message">{error}</div>}

      <button
        onClick={handlePayment}
        disabled={!selectedCardId || loading}
        className="pay-button"
      >
        {loading ? 'Se procesează plata...' : 'Plătește Acum'}
      </button>
    </div>
  );
};

export default PayWithSavedCard;
```

### 4. Componenta Principală de Plăți

```jsx
import React, { useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import SavedCardsList from './SavedCardsList';
import AddNewCard from './AddNewCard';
import PayWithSavedCard from './PayWithSavedCard';

const PaymentManager = ({ businessId, stripePromise }) => {
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  const handleCardSelect = (cardId) => {
    setSelectedCardId(cardId);
  };

  const handleCardAdded = (newCard) => {
    setShowAddCard(false);
    setSelectedCardId(newCard.id);
    // Reîncarcă lista de carduri
    window.location.reload();
  };

  const handlePaymentComplete = (result) => {
    setPaymentResult(result);
    // Poți redirecționa utilizatorul sau afișa un mesaj de succes
    console.log('Plata completă:', result);
  };

  return (
    <Elements stripe={stripePromise}>
      <div className="payment-manager">
        <h2>Gestionare Plăți</h2>

        {paymentResult && (
          <div className="payment-success">
            <h3>✅ Plată Completă!</h3>
            <p>Status: {paymentResult.status}</p>
            <p>Subscription ID: {paymentResult.subscriptionId}</p>
          </div>
        )}

        <div className="payment-sections">
          <div className="saved-cards-section">
            <SavedCardsList onCardSelect={handleCardSelect} />
            
            <button
              onClick={() => setShowAddCard(!showAddCard)}
              className="add-card-button"
            >
              {showAddCard ? 'Anulează' : 'Adaugă Card Nou'}
            </button>
          </div>

          {showAddCard && (
            <div className="add-card-section">
              <AddNewCard onCardAdded={handleCardAdded} />
            </div>
          )}

          {selectedCardId && (
            <div className="payment-section">
              <PayWithSavedCard
                businessId={businessId}
                selectedCardId={selectedCardId}
                onPaymentComplete={handlePaymentComplete}
              />
            </div>
          )}
        </div>
      </div>
    </Elements>
  );
};

export default PaymentManager;
```

## Stiluri CSS

```css
/* Stiluri pentru componentele de plată */
.payment-manager {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.payment-sections {
  display: grid;
  gap: 20px;
  margin-top: 20px;
}

.saved-cards {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.card-item {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-item:hover {
  border-color: #007bff;
  transform: translateY(-2px);
}

.card-item.selected {
  border-color: #007bff;
  background-color: #f8f9ff;
}

.card-brand {
  font-weight: bold;
  text-transform: uppercase;
  color: #007bff;
}

.card-number {
  font-family: monospace;
  font-size: 16px;
  margin: 5px 0;
}

.card-expiry {
  font-size: 14px;
  color: #666;
}

.add-card-form {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
}

.card-element-container {
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  padding: 12px;
  margin: 15px 0;
}

.pay-with-saved-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  background-color: #f8f9fa;
}

.payment-config {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin: 15px 0;
}

.payment-config label {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.payment-config select {
  padding: 8px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
}

.submit-button,
.pay-button,
.add-card-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s ease;
}

.submit-button:hover,
.pay-button:hover,
.add-card-button:hover {
  background-color: #0056b3;
}

.submit-button:disabled,
.pay-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.error-message {
  color: #dc3545;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  padding: 10px;
  margin: 10px 0;
}

.payment-success {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  color: #155724;
}

.payment-success h3 {
  margin: 0 0 10px 0;
  color: #155724;
}
```

## Utilizare în Aplicație

```jsx
import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import PaymentManager from './components/PaymentManager';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

function App() {
  return (
    <div className="App">
      <Elements stripe={stripePromise}>
        <PaymentManager 
          businessId="your-business-id"
          stripePromise={stripePromise}
        />
      </Elements>
    </div>
  );
}

export default App;
```

## Funcții Helper

```javascript
// Funcție pentru obținerea token-ului de autentificare
export const getAuthToken = () => {
  // Implementează logica ta pentru obținerea token-ului
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
};

// Funcție pentru formatarea sumelor
export const formatAmount = (amount, currency = 'RON') => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: currency
  }).format(amount / 100); // Stripe folosește cenți
};

// Funcție pentru validarea cardului
export const validateCard = (card) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  if (card.exp_year < currentYear) return false;
  if (card.exp_year === currentYear && card.exp_month < currentMonth) return false;
  
  return true;
};
```

## Testare

1. **Testare Locală**: Folosește cardurile de test Stripe
2. **Testare Webhook-uri**: Folosește Stripe CLI pentru testare locală
3. **Testare Integrare**: Verifică că toate endpoint-urile funcționează corect

## Securitate

1. **HTTPS**: Asigură-te că toate comunicările sunt pe HTTPS
2. **Validare**: Validează toate datele de intrare
3. **Token-uri**: Nu expune token-urile în frontend
4. **CORS**: Configurează CORS corect pe backend

## Suport

Pentru probleme sau întrebări, consultă:
- Documentația Stripe
- Fișierul `PAYMENT_IMPROVEMENTS.md`
- Logs-urile serverului pentru debugging 