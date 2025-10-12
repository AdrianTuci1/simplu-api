# Ghid Integrare Rating System - Frontend

## 📋 Cuprins
1. [Flow-ul Utilizatorului](#flow-ul-utilizatorului)
2. [Endpoint-uri API](#endpoint-uri-api)
3. [Pagina de Rating - Implementare](#pagina-de-rating)
4. [Componente UI](#componente-ui)
5. [Validări și Error Handling](#validări-și-error-handling)
6. [Exemple Complete de Cod](#exemple-complete-de-cod)

---

## Flow-ul Utilizatorului

```
1. Pacient primește email cu link
   📧 "Oferă-ne un rating: https://api.simplu.io/patient-booking/rating/business-123/location-456/abc123xyz"
   
2. Pacient accesează link-ul
   ↓
   GET /patient-booking/rating/:businessId-:locationId/:token
   ✅ Succes → Afișează formular cu detalii programare
   ❌ Eroare → "Link invalid/expirat/folosit"
   
3. Pacient completează rating
   - Selectează stele (1-5) - OBLIGATORIU
   - Adaugă comentariu (opțional)
   - Evaluează categorii (opțional): service, cleanliness, staff, waitTime
   
4. Pacient submitere rating
   ↓
   POST /patient-booking/rating/:businessId-:locationId/:token/submit
   ✅ Succes → "Mulțumim pentru feedback!"
   ❌ Eroare → Mesaje de eroare specifice
```

---

## Endpoint-uri API

### 1. Verificare Token și Obținere Detalii

**Endpoint:** `GET /patient-booking/rating/:businessId-:locationId/:token`

**URL Example:**
```
https://api.simplu.io/patient-booking/rating/business-123/location-456/abc123-token-uuid
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "appointmentId": "apt-789",
    "patientName": "Ion Popescu",
    "appointmentDate": "15 ianuarie 2024",
    "appointmentTime": "14:30",
    "locationName": "Sediul Central"
  }
}
```

**Response Errors:**
```json
// Token invalid
{
  "statusCode": 400,
  "message": "Invalid rating token"
}

// Token deja folosit
{
  "statusCode": 400,
  "message": "This rating link has already been used"
}

// Token expirat
{
  "statusCode": 400,
  "message": "This rating link has expired"
}
```

---

### 2. Submitere Rating

**Endpoint:** `POST /patient-booking/rating/:businessId-:locationId/:token/submit`

**Request Body:**
```json
{
  "score": 5,                    // OBLIGATORIU: 1-5
  "comment": "Experiență excelentă! Personalul foarte amabil.",  // OPȚIONAL
  "categories": {                // OPȚIONAL
    "service": 5,                // 1-5
    "cleanliness": 5,            // 1-5
    "staff": 5,                  // 1-5
    "waitTime": 4                // 1-5
  }
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Thank you for your feedback!",
  "requestId": "1234567890"
}
```

**Response Errors:**
```json
// Score invalid
{
  "statusCode": 400,
  "message": "Score must be between 1 and 5"
}

// Categorie invalidă
{
  "statusCode": 400,
  "message": "Category scores must be between 1 and 5"
}
```

---

## Pagina de Rating - Implementare

### Structura Paginii

```
┌─────────────────────────────────────┐
│  LOGO CLINICĂ                       │
│                                     │
│  Cum a fost experiența ta?          │
│  la [Numele Locației]               │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Programare pentru:          │   │
│  │  Ion Popescu                 │   │
│  │  15 ianuarie 2024, 14:30     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ⭐⭐⭐⭐⭐  (selectează stele)      │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Comentariu (opțional)      │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  Evaluează categorii (opțional):   │
│  Serviciu:     ⭐⭐⭐⭐⭐          │
│  Curățenie:    ⭐⭐⭐⭐⭐          │
│  Personal:     ⭐⭐⭐⭐⭐          │
│  Timp așteptare: ⭐⭐⭐⭐⭐        │
│                                     │
│  [Trimite Rating]                   │
└─────────────────────────────────────┘
```

---

## Componente UI

### 1. Componenta Star Rating (React)

```tsx
import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  readonly?: boolean;
  size?: number;
}

const StarRating: React.FC<StarRatingProps> = ({ 
  value, 
  onChange, 
  readonly = false,
  size = 32 
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const handleClick = (rating: number) => {
    if (!readonly) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (!readonly) {
      setHoverValue(rating);
    }
  };

  const handleMouseLeave = () => {
    setHoverValue(null);
  };

  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = (hoverValue || value) >= star;
        return (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
            disabled={readonly}
            className={`transition-transform hover:scale-110 ${
              readonly ? 'cursor-default' : 'cursor-pointer'
            }`}
          >
            <Star
              size={size}
              className={`${
                isFilled 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'text-gray-300'
              } transition-colors`}
            />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
```

---

### 2. Pagina Rating Completă (React + TypeScript)

```tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import StarRating from './StarRating';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface RatingData {
  appointmentId: string;
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  locationName: string;
}

interface RatingFormData {
  score: number;
  comment: string;
  categories: {
    service: number;
    cleanliness: number;
    staff: number;
    waitTime: number;
  };
}

const RatingPage: React.FC = () => {
  const { businessId, locationId, token } = useParams<{
    businessId: string;
    locationId: string;
    token: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [ratingData, setRatingData] = useState<RatingData | null>(null);
  
  const [formData, setFormData] = useState<RatingFormData>({
    score: 0,
    comment: '',
    categories: {
      service: 0,
      cleanliness: 0,
      staff: 0,
      waitTime: 0,
    },
  });

  // Verifică token-ul la încărcarea paginii
  useEffect(() => {
    verifyToken();
  }, [businessId, locationId, token]);

  const verifyToken = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `https://api.simplu.io/patient-booking/rating/${businessId}-${locationId}/${token}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Token invalid');
      }

      const data = await response.json();
      setRatingData(data.data);
    } catch (err: any) {
      setError(err.message || 'A apărut o eroare. Verifică link-ul.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validare: score obligatoriu
    if (formData.score === 0) {
      setError('Te rugăm să selectezi un rating (1-5 stele)');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(
        `https://api.simplu.io/patient-booking/rating/${businessId}-${locationId}/${token}/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            score: formData.score,
            comment: formData.comment || undefined,
            categories: Object.values(formData.categories).some(v => v > 0)
              ? formData.categories
              : undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'A apărut o eroare');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'A apărut o eroare la trimiterea feedback-ului');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Se încarcă...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !ratingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Link Invalid
          </h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Mulțumim pentru feedback!
          </h2>
          <p className="text-gray-600 mb-6">
            Apreciem timpul pe care l-ai dedicat pentru a ne evalua serviciile.
          </p>
          <div className="border-t pt-4">
            <p className="text-sm text-gray-500">
              Acest link nu mai este valid.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Rating form
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Cum a fost experiența ta?
            </h1>
            <p className="text-gray-600">
              la {ratingData?.locationName || 'clinica noastră'}
            </p>
          </div>

          {/* Appointment Details */}
          <div className="bg-blue-50 rounded-lg p-4 mb-8">
            <p className="text-sm text-gray-600 mb-1">Programare pentru:</p>
            <p className="font-semibold text-gray-900">
              {ratingData?.patientName}
            </p>
            <p className="text-sm text-gray-600">
              {ratingData?.appointmentDate} · {ratingData?.appointmentTime}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Main Rating */}
            <div className="mb-8">
              <label className="block text-lg font-medium text-gray-900 mb-4 text-center">
                Rating general *
              </label>
              <div className="flex justify-center">
                <StarRating
                  value={formData.score}
                  onChange={(value) =>
                    setFormData({ ...formData, score: value })
                  }
                  size={48}
                />
              </div>
              {formData.score > 0 && (
                <p className="text-center text-gray-600 mt-2">
                  {formData.score === 5 && '⭐ Excelent!'}
                  {formData.score === 4 && '👍 Foarte bine!'}
                  {formData.score === 3 && '😊 Bine'}
                  {formData.score === 2 && '😐 Acceptabil'}
                  {formData.score === 1 && '😞 Nesatisfăcător'}
                </p>
              )}
            </div>

            {/* Comment */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comentariu (opțional)
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) =>
                  setFormData({ ...formData, comment: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Spune-ne mai multe despre experiența ta..."
              />
            </div>

            {/* Categories */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Evaluează categorii (opțional)
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Calitatea serviciului</span>
                  <StarRating
                    value={formData.categories.service}
                    onChange={(value) =>
                      setFormData({
                        ...formData,
                        categories: { ...formData.categories, service: value },
                      })
                    }
                    size={28}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Curățenie</span>
                  <StarRating
                    value={formData.categories.cleanliness}
                    onChange={(value) =>
                      setFormData({
                        ...formData,
                        categories: { ...formData.categories, cleanliness: value },
                      })
                    }
                    size={28}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Personal</span>
                  <StarRating
                    value={formData.categories.staff}
                    onChange={(value) =>
                      setFormData({
                        ...formData,
                        categories: { ...formData.categories, staff: value },
                      })
                    }
                    size={28}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Timp de așteptare</span>
                  <StarRating
                    value={formData.categories.waitTime}
                    onChange={(value) =>
                      setFormData({
                        ...formData,
                        categories: { ...formData.categories, waitTime: value },
                      })
                    }
                    size={28}
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || formData.score === 0}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Se trimite...
                </span>
              ) : (
                'Trimite Rating'
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              * Câmpurile marcate sunt obligatorii
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RatingPage;
```

---

## Validări și Error Handling

### Validări Client-Side

```typescript
// Validare score obligatoriu
if (formData.score === 0) {
  setError('Te rugăm să selectezi un rating (1-5 stele)');
  return;
}

// Validare score în interval
if (formData.score < 1 || formData.score > 5) {
  setError('Rating-ul trebuie să fie între 1 și 5');
  return;
}

// Validare categorii (dacă sunt completate)
if (formData.categories) {
  const invalidCategories = Object.entries(formData.categories)
    .filter(([_, value]) => value > 0 && (value < 1 || value > 5));
  
  if (invalidCategories.length > 0) {
    setError('Categoriile trebuie să fie între 1 și 5 stele');
    return;
  }
}

// Validare lungime comentariu (opțional)
if (formData.comment && formData.comment.length > 1000) {
  setError('Comentariul nu poate depăși 1000 de caractere');
  return;
}
```

### Gestionare Erori API

```typescript
const handleApiError = (error: any) => {
  const errorMessages: Record<string, string> = {
    'Invalid rating token': 'Link-ul de rating nu este valid',
    'This rating link has already been used': 'Acest link a fost deja folosit',
    'This rating link has expired': 'Link-ul a expirat (valabil 30 zile)',
    'Score must be between 1 and 5': 'Rating-ul trebuie să fie între 1 și 5 stele',
    'Category scores must be between 1 and 5': 'Categoriile trebuie evaluate între 1 și 5 stele',
  };

  return errorMessages[error.message] || 'A apărut o eroare. Te rugăm să încerci din nou.';
};
```

---

## Routing (React Router)

```tsx
// App.tsx sau routes.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RatingPage from './pages/RatingPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Alte rute... */}
        
        {/* Rută rating publică (fără autentificare) */}
        <Route 
          path="/rating/:businessId/:locationId/:token" 
          element={<RatingPage />} 
        />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## Styling (Tailwind CSS)

Componentele de mai sus folosesc Tailwind CSS. Dacă folosești alt framework CSS, iată clase echivalente:

```css
/* Alternativă fără Tailwind */
.rating-page {
  min-height: 100vh;
  background-color: #f9fafb;
  padding: 3rem 1rem;
}

.rating-card {
  max-width: 42rem;
  margin: 0 auto;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  padding: 2rem;
}

.star-button {
  background: none;
  border: none;
  cursor: pointer;
  transition: transform 0.2s;
}

.star-button:hover {
  transform: scale(1.1);
}

.star-filled {
  color: #fbbf24;
  fill: #fbbf24;
}

.star-empty {
  color: #d1d5db;
}
```

---

## Best Practices

### 1. **UX Considerations**
- ✅ Afișează detaliile programării pentru context
- ✅ Feedback vizual pentru hover pe stele
- ✅ Mesaje de confirmare clare
- ✅ Disable submit button până când score e selectat
- ✅ Loading states pentru toate request-urile

### 2. **Performance**
- ✅ Lazy load componenta de rating
- ✅ Debounce pentru textarea comment
- ✅ Optimistic UI updates unde e posibil

### 3. **Security**
- ✅ Validare pe client ȘI pe server
- ✅ Nu expune token-uri în logs
- ✅ Rate limiting pe backend (deja implementat)

### 4. **Accessibility**
```tsx
// Exemple de îmbunătățiri accessibility
<button
  type="button"
  onClick={() => handleClick(star)}
  aria-label={`Rate ${star} stars`}
  aria-pressed={value === star}
>
  <Star ... />
</button>

<textarea
  aria-label="Comentariu despre experiența ta"
  aria-describedby="comment-hint"
  ...
/>
<p id="comment-hint" className="text-sm text-gray-500">
  Opțional: Descrie experiența ta
</p>
```

---

## Testing

### Test Scenarios

```typescript
// Test validare token
describe('RatingPage - Token Verification', () => {
  it('should show error for invalid token', async () => {
    // Mock API response cu eroare
    // Verifică că mesajul de eroare se afișează
  });

  it('should show error for expired token', async () => {
    // Mock API response cu token expirat
    // Verifică mesajul corespunzător
  });

  it('should load appointment details for valid token', async () => {
    // Mock API response cu success
    // Verifică că datele se afișează corect
  });
});

// Test submitere rating
describe('RatingPage - Rating Submission', () => {
  it('should not submit without score', async () => {
    // Încearcă submit fără score
    // Verifică că apare eroare de validare
  });

  it('should submit successfully with valid data', async () => {
    // Completează formular valid
    // Mock API success response
    // Verifică mesaj de succes
  });
});
```

---

## Integrare cu Vue.js

Dacă folosești Vue în loc de React:

```vue
<template>
  <div class="rating-page">
    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <LoaderIcon class="animate-spin" />
      <p>Se încarcă...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error && !ratingData" class="error-container">
      <AlertCircleIcon />
      <h2>Link Invalid</h2>
      <p>{{ error }}</p>
    </div>

    <!-- Success -->
    <div v-else-if="success" class="success-container">
      <CheckCircleIcon />
      <h2>Mulțumim pentru feedback!</h2>
    </div>

    <!-- Form -->
    <div v-else class="rating-form-container">
      <form @submit.prevent="handleSubmit">
        <h1>Cum a fost experiența ta?</h1>
        
        <!-- Appointment details -->
        <div class="appointment-info">
          <p>{{ ratingData.patientName }}</p>
          <p>{{ ratingData.appointmentDate }} · {{ ratingData.appointmentTime }}</p>
        </div>

        <!-- Star Rating -->
        <StarRating 
          v-model="formData.score"
          :size="48"
        />

        <!-- Comment -->
        <textarea
          v-model="formData.comment"
          placeholder="Spune-ne mai multe..."
        />

        <!-- Categories -->
        <div class="categories">
          <div class="category">
            <span>Serviciu</span>
            <StarRating v-model="formData.categories.service" />
          </div>
          <!-- ... alte categorii -->
        </div>

        <button type="submit" :disabled="formData.score === 0 || submitting">
          {{ submitting ? 'Se trimite...' : 'Trimite Rating' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import StarRating from './StarRating.vue';

const route = useRoute();
const loading = ref(true);
const submitting = ref(false);
const error = ref<string | null>(null);
const success = ref(false);
const ratingData = ref<any>(null);

const formData = ref({
  score: 0,
  comment: '',
  categories: {
    service: 0,
    cleanliness: 0,
    staff: 0,
    waitTime: 0,
  },
});

const verifyToken = async () => {
  try {
    const { businessId, locationId, token } = route.params;
    const response = await fetch(
      `https://api.simplu.io/patient-booking/rating/${businessId}-${locationId}/${token}`
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message);
    }
    
    const data = await response.json();
    ratingData.value = data.data;
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const handleSubmit = async () => {
  if (formData.value.score === 0) {
    error.value = 'Te rugăm să selectezi un rating';
    return;
  }

  try {
    submitting.value = true;
    const { businessId, locationId, token } = route.params;
    
    const response = await fetch(
      `https://api.simplu.io/patient-booking/rating/${businessId}-${locationId}/${token}/submit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: formData.value.score,
          comment: formData.value.comment || undefined,
          categories: formData.value.categories,
        }),
      }
    );

    if (!response.ok) throw new Error();
    success.value = true;
  } catch {
    error.value = 'A apărut o eroare';
  } finally {
    submitting.value = false;
  }
};

onMounted(verifyToken);
</script>
```

---

## Concluzii

### ✅ Checklist Implementare

- [ ] Configurează routing pentru `/rating/:businessId/:locationId/:token`
- [ ] Implementează componenta `StarRating`
- [ ] Creează pagina `RatingPage`
- [ ] Adaugă validări client-side
- [ ] Gestionează toate states: loading, error, success
- [ ] Testează flow-ul complet
- [ ] Adaugă tracking analytics (opțional)
- [ ] Deploy și testare în producție

### 📞 Support

Pentru întrebări sau probleme:
- Verifică logs în browser console
- Testează endpoint-urile direct cu Postman
- Verifică că token-ul e valid și neexpirat

---

**Succes cu implementarea! 🎉**

