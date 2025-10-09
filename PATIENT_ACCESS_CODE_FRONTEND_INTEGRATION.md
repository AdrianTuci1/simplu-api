# Patient Access Code - Frontend Integration Guide

## Overview

Sistemul de cod de acces pentru pacienți permite accesul securizat la datele personale ale pacientului folosind un cod de 6 cifre primit prin SMS și email.

## Architecture

### Data Flow

```
1. App Server (backend)
   ↓ generează access code + patient URL
   ↓ trimite datele la AI Agent Server
2. AI Agent Server
   ↓ include codul și URL-ul în template-uri SMS/Email
   ↓ trimite mesaje pacientului
3. Patient (frontend)
   ↓ primește email/SMS cu cod + link
   ↓ accesează link-ul
   ↓ introduce codul de acces
4. App Server
   ↓ validează codul
   ↓ autorizează accesul la date
```

### Why This Design?

- **App server** generează codul → controlează autentificarea
- **AI Agent server** trimite doar mesaje → separation of concerns
- **App server** validează codul → endpoint-uri unice pentru client

## Backend Endpoints (App Server)

### 1. Validate Access Code

**POST** `/patient-booking/validate-access/:businessId-:locationId`

Validează codul de acces al pacientului.

**Request Body:**
```json
{
  "patientId": "pt-123456",
  "accessCode": "847293"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Access code validated successfully",
  "patientId": "pt-123456"
}
```

**Response (Error):**
```json
{
  "statusCode": 401,
  "message": "Invalid access code"
}
```

### 2. Get Patient Appointments

**GET** `/patient-booking/patient-appointments/:businessId-:locationId`

Obține programările pacientului folosind codul de acces.

**Query Parameters:**
- `patientId` (required): Patient ID
- `accessCode` (required): 6-digit access code
- `from` (optional): YYYY-MM-DD
- `to` (optional): YYYY-MM-DD
- `status` (optional): scheduled|completed|canceled
- `page` (optional): Page number
- `limit` (optional): Items per page

**Example:**
```
GET /patient-booking/patient-appointments/bus-123-loc-001?patientId=pt-123456&accessCode=847293
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "apt-789",
      "date": "2024-01-15",
      "time": "14:30",
      "service": {
        "id": "srv-001",
        "name": "Consult stomatologic",
        "duration": 30
      },
      "medic": {
        "id": "med-001",
        "name": "Dr. Popescu"
      },
      "status": "scheduled"
    }
  ]
}
```

### 3. Cancel Appointment

**POST** `/patient-booking/cancel-appointment/:businessId-:locationId/:appointmentId`

Anulează o programare folosind codul de acces.

**Request Body:**
```json
{
  "patientId": "pt-123456",
  "accessCode": "847293"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment canceled successfully",
  "requestId": "1234567890"
}
```

## Frontend Implementation

### URL Format

Pacientul primește un link de forma:
```
https://clinica-alfa.simplu.io/sediu-central/details?pt-123456
```

### Step 1: Extract Patient ID from URL

```typescript
// În pagina [location]/details
const searchParams = useSearchParams();
const patientIdParam = searchParams.get('patientId'); // sau poate fi doar query string-ul
const patientId = patientIdParam || searchParams.toString(); // "pt-123456"
```

### Step 2: Show Access Code Input

```tsx
function PatientAccessPage() {
  const [accessCode, setAccessCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  
  const patientId = extractPatientIdFromUrl(); // "pt-123456"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);
    setError('');

    try {
      const response = await fetch(
        `/api/patient-booking/validate-access/${businessId}-${locationId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId, accessCode })
        }
      );

      if (!response.ok) {
        throw new Error('Invalid access code');
      }

      const data = await response.json();
      
      // Store authentication in session/localStorage
      sessionStorage.setItem('patientAuth', JSON.stringify({
        patientId: data.patientId,
        accessCode,
        timestamp: Date.now()
      }));

      setIsAuthenticated(true);
    } catch (err) {
      setError('Cod de acces invalid. Te rugăm să verifici codul primit prin email/SMS.');
    } finally {
      setIsValidating(false);
    }
  };

  if (isAuthenticated) {
    return <PatientDashboard patientId={patientId} accessCode={accessCode} />;
  }

  return (
    <div className="patient-access-form">
      <h1>Acces Pacient</h1>
      <p>Introdu codul de acces primit prin SMS sau email</p>
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          placeholder="123456"
          maxLength={6}
          pattern="[0-9]{6}"
          required
          autoFocus
        />
        
        <button type="submit" disabled={isValidating}>
          {isValidating ? 'Verificare...' : 'Accesează'}
        </button>
        
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
}
```

### Step 3: Patient Dashboard

```tsx
function PatientDashboard({ patientId, accessCode }: { patientId: string; accessCode: string }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const response = await fetch(
        `/api/patient-booking/patient-appointments/${businessId}-${locationId}?patientId=${patientId}&accessCode=${accessCode}`
      );
      
      const data = await response.json();
      setAppointments(data.data);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('Ești sigur că vrei să anulezi această programare?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/patient-booking/cancel-appointment/${businessId}-${locationId}/${appointmentId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId, accessCode })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to cancel appointment');
      }

      // Reload appointments
      await loadAppointments();
      alert('Programarea a fost anulată cu succes!');
    } catch (error) {
      alert('Eroare la anularea programării. Te rugăm să încerci din nou.');
    }
  };

  return (
    <div className="patient-dashboard">
      <h1>Programările Mele</h1>
      
      {loading ? (
        <div>Se încarcă...</div>
      ) : appointments.length === 0 ? (
        <div>Nu ai programări active.</div>
      ) : (
        <div className="appointments-list">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="appointment-card">
              <h3>{appointment.service.name}</h3>
              <p><strong>Data:</strong> {appointment.date}</p>
              <p><strong>Ora:</strong> {appointment.time}</p>
              <p><strong>Doctor:</strong> {appointment.medic.name}</p>
              <p><strong>Status:</strong> {appointment.status}</p>
              
              {appointment.status === 'scheduled' && (
                <button 
                  onClick={() => handleCancelAppointment(appointment.id)}
                  className="cancel-button"
                >
                  Anulează Programarea
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Step 4: Session Management

```typescript
// utils/patientAuth.ts

interface PatientAuth {
  patientId: string;
  accessCode: string;
  timestamp: number;
}

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function getPatientAuth(): PatientAuth | null {
  const authData = sessionStorage.getItem('patientAuth');
  if (!authData) return null;

  const auth: PatientAuth = JSON.parse(authData);
  
  // Check if session expired
  if (Date.now() - auth.timestamp > SESSION_DURATION) {
    clearPatientAuth();
    return null;
  }

  return auth;
}

export function setPatientAuth(patientId: string, accessCode: string) {
  const auth: PatientAuth = {
    patientId,
    accessCode,
    timestamp: Date.now()
  };
  sessionStorage.setItem('patientAuth', JSON.stringify(auth));
}

export function clearPatientAuth() {
  sessionStorage.removeItem('patientAuth');
}

export function isAuthenticated(): boolean {
  return getPatientAuth() !== null;
}
```

### Step 5: Protected Routes

```typescript
// components/PatientAuthGuard.tsx

export function PatientAuthGuard({ children }: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const auth = getPatientAuth();
    
    if (!auth) {
      router.push('/patient-login');
      return;
    }

    // Optionally verify the access code is still valid
    verifyAccessCode(auth.patientId, auth.accessCode)
      .then(valid => {
        if (valid) {
          setIsAuthorized(true);
        } else {
          clearPatientAuth();
          router.push('/patient-login');
        }
      })
      .finally(() => setIsChecking(false));
  }, []);

  if (isChecking) {
    return <div>Verificare...</div>;
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
```

## Security Considerations

### Access Code Properties

- **6 digits numeric** (000000 - 999999)
- **Deterministic** - same `patientId` generates same code
- **No expiration** (by default) - code is valid forever
- **Rate limiting** - consider implementing on backend

### Recommendations for Production

1. **Add TTL (Time To Live)**
   - Store codes in database with expiration timestamp
   - Expire codes after 30-90 days

2. **Use JWT instead of plain codes**
   ```typescript
   // Generate JWT with expiration
   const token = jwt.sign({ patientId }, secret, { expiresIn: '90d' });
   ```

3. **Implement Rate Limiting**
   - Limit validation attempts (e.g., 5 attempts per 15 minutes)
   - Block after too many failed attempts

4. **Add Logging**
   - Log all access code validation attempts
   - Monitor for suspicious patterns

5. **HTTPS Only**
   - Always use HTTPS in production
   - Set secure cookies/session storage

6. **Session Management**
   - Use HTTP-only cookies for auth tokens
   - Implement proper session expiration
   - Clear sessions on logout

## Testing

### Test Access Code Generation

```bash
# In app server terminal
curl -X POST http://localhost:3000/patient-booking/validate-access/bus-123-loc-001 \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "pt-123456",
    "accessCode": "847293"
  }'
```

### Test Get Appointments

```bash
curl "http://localhost:3000/patient-booking/patient-appointments/bus-123-loc-001?patientId=pt-123456&accessCode=847293"
```

### Test Cancel Appointment

```bash
curl -X POST http://localhost:3000/patient-booking/cancel-appointment/bus-123-loc-001/apt-789 \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "pt-123456",
    "accessCode": "847293"
  }'
```

## Troubleshooting

### "Invalid access code" error

1. Verify the `patientId` extracted from URL is correct
2. Check the access code entered matches exactly (6 digits)
3. Verify backend is running and accessible
4. Check browser console for network errors

### Appointments not loading

1. Verify authentication succeeded
2. Check patientId and accessCode are passed correctly
3. Verify business and location IDs are correct
4. Check backend logs for errors

### Session expires too quickly

1. Increase `SESSION_DURATION` in session management
2. Implement "remember me" functionality
3. Use refresh tokens for longer sessions

## Next Steps

1. Implement access code input UI
2. Create patient dashboard
3. Add appointment cancellation feature
4. Implement treatment plan view
5. Add invoice/billing view
6. Consider adding 2FA for extra security

