# Frontend Integration Guide - Team Invitations

## API Endpoints

### 1. Send Invitation (Protected)
```typescript
POST /api/invitations/send
Headers: 
  Authorization: Bearer {cognito-token}
  Content-Type: application/json
Body:
  {
    "businessId": "bus-123",
    "locationId": "loc-001",
    "medicResourceId": "email@example.com"
  }
```

### 2. Verify Invitation (PUBLIC - No Auth!)
```typescript
GET /api/invitations/verify?invitation={UUID}&email={email}&businessId={id}&locationId={id}
Headers: 
  Content-Type: application/json
// ✅ No Authorization header needed!
```

### 3. Get Status (Protected)
```typescript
GET /api/invitations/status?businessId=...&locationId=...&medicResourceId=...
Headers:
  Authorization: Bearer {cognito-token}
```

## Frontend URLs Generated

Based on `businessType`, the system generates different URLs:

| Business Type | Invitation URL |
|---------------|----------------|
| `dental` | `https://dental.simplu.io/register?token=...` |
| `gym` | `https://gym.simplu.io/register?token=...` |
| `hotel` | `https://hotel.simplu.io/register?token=...` |
| default | `https://admin.simplu.io/register?token=...` |

## React Components

### Component 1: Invitation Button

```tsx
// components/MedicInvitationButton.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner'; // or your toast library
import { useAuth } from '@/hooks/useAuth'; // your auth hook

interface MedicResource {
  resource_id: string;
  data: {
    name: string;
    email: string;
    role: string;
    cognitoUserId?: string;
    invitationStatus?: 'not_sent' | 'sent' | 'accepted';
    invitationSentAt?: string;
  };
}

interface Props {
  medic: MedicResource;
  businessId: string;
  locationId: string;
  onInvitationSent?: () => void;
}

export function MedicInvitationButton({ 
  medic, 
  businessId, 
  locationId,
  onInvitationSent 
}: Props) {
  const { getToken } = useAuth(); // Your auth context
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(medic.data.invitationStatus || 'not_sent');

  const handleSendInvitation = async () => {
    if (medic.data.cognitoUserId) {
      toast.error('Acest utilizator are deja cont');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      
      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId,
          locationId,
          medicResourceId: medic.resource_id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Invitație trimisă la ${medic.data.email}`);
        setStatus('sent');
        onInvitationSent?.();
      } else {
        toast.error(result.error || 'Eroare la trimitere invitație');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Eroare la trimitere invitație');
    } finally {
      setLoading(false);
    }
  };

  const getButtonConfig = () => {
    if (medic.data.cognitoUserId) {
      return {
        text: '✓ Are cont',
        disabled: true,
        variant: 'secondary' as const,
      };
    }
    if (status === 'sent') {
      return {
        text: '↻ Retrimite invitație',
        disabled: loading,
        variant: 'outline' as const,
      };
    }
    return {
      text: '📧 Trimite invitație',
      disabled: loading,
      variant: 'default' as const,
    };
  };

  const config = getButtonConfig();

  return (
    <Button
      onClick={handleSendInvitation}
      disabled={config.disabled}
      variant={config.variant}
      size="sm"
    >
      {loading ? (
        <>
          <span className="animate-spin mr-2">⏳</span>
          Se trimite...
        </>
      ) : (
        config.text
      )}
    </Button>
  );
}
```

### Component 2: Register Page

```tsx
// pages/register.tsx
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Auth } from '@aws-amplify/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface InvitationData {
  email: string;
  businessId: string;
  locationId: string;
  medicResourceId: string;
  businessType: string;
  invitedBy: string;
}

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get params from URL
  const invitationId = searchParams.get('invitation');
  const email = searchParams.get('email');
  const businessId = searchParams.get('businessId');
  const locationId = searchParams.get('locationId');

  const [verification, setVerification] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (invitationId && email && businessId && locationId) {
      verifyInvitationToken(invitationId, email, businessId, locationId);
    } else {
      setLoading(false);
    }
  }, [invitationId, email, businessId, locationId]);

  const verifyInvitationToken = async (
    invitationId: string,
    email: string,
    businessId: string,
    locationId: string
  ) => {
    try {
      // ✅ PUBLIC endpoint - no auth needed!
      const params = new URLSearchParams({
        invitation: invitationId,
        email,
        businessId,
        locationId,
      });

      const response = await fetch(
        `/api/invitations/verify?${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (result.valid) {
        setVerification(result.data);
        console.log('Invitation verified:', result.data);
      } else {
        toast.error(result.error || 'Invitație invalidă sau expirată');
        setTimeout(() => navigate('/'), 3000);
      }
    } catch (error) {
      console.error('Error verifying invitation:', error);
      toast.error('Eroare la verificarea invitației');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verification) return;

    if (password !== confirmPassword) {
      toast.error('Parolele nu coincid');
      return;
    }

    if (password.length < 8) {
      toast.error('Parola trebuie să aibă minim 8 caractere');
      return;
    }

    setRegistering(true);
    try {
      // ✅ Register cu Cognito și trimite invitation details în clientMetadata
      const result = await Auth.signUp({
        username: verification.email,
        password,
        attributes: {
          email: verification.email,
        },
        clientMetadata: {
          invitationId: invitationId!, // ✅ CRITICAL!
          businessId: businessId!,
          locationId: locationId!,
        },
      });

      console.log('Cognito signUp result:', result);

      toast.success('Cont creat cu succes! Verifică email-ul pentru confirmare.');
      
      // Redirect la login
      navigate('/login', { 
        state: { 
          email: verification.email,
          message: 'Verifică email-ul pentru a confirma contul' 
        } 
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.code === 'UsernameExistsException') {
        toast.error('Acest email există deja. Te poți autentifica.');
      } else if (error.code === 'InvalidPasswordException') {
        toast.error('Parolă invalidă. Trebuie: 8+ caractere, majusculă, minusculă, cifră, caracter special.');
      } else {
        toast.error(error.message || 'Eroare la crearea contului');
      }
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p>Se verifică invitația...</p>
        </div>
      </div>
    );
  }

  if (!verification) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Invitație invalidă</h1>
          <p className="text-gray-600">
            Această invitație nu mai este validă sau a expirat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2">Bine ai venit!</h1>
        <p className="text-gray-600 mb-6">
          Ai fost invitat de <strong>{verification.invitedBy}</strong> să te alături echipei.
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input
              type="email"
              value={verification.email}
              disabled
              className="bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Parolă</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minim 8 caractere"
              required
              minLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">
              Trebuie să conțină: majusculă, minusculă, cifră, caracter special
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirmă Parola</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repetă parola"
              required
            />
          </div>

          <Button 
            type="submit" 
            disabled={registering}
            className="w-full"
          >
            {registering ? 'Se creează contul...' : 'Creează Cont'}
          </Button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          Prin crearea contului, accepți termenii și condițiile platformei simplu.io
        </p>
      </div>
    </div>
  );
}
```

### Component 3: Medic List (folosește butonul)

```tsx
// pages/medics.tsx sau similar
import { MedicInvitationButton } from '@/components/MedicInvitationButton';

function MedicsList() {
  const { businessId, locationId } = useParams();
  const [medics, setMedics] = useState<MedicResource[]>([]);

  const refreshMedics = async () => {
    // Re-fetch medics list to get updated invitationStatus
    // ... your fetch logic
  };

  return (
    <div>
      <h1>Echipa Medicală</h1>
      
      <table>
        <thead>
          <tr>
            <th>Nume</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Status</th>
            <th>Acțiuni</th>
          </tr>
        </thead>
        <tbody>
          {medics.map((medic) => (
            <tr key={medic.resource_id}>
              <td>{medic.data.name}</td>
              <td>{medic.data.email}</td>
              <td>{medic.data.role}</td>
              <td>
                {medic.data.cognitoUserId ? (
                  <span className="text-green-600">✓ Activ</span>
                ) : medic.data.invitationStatus === 'sent' ? (
                  <span className="text-yellow-600">⏳ Invitație trimisă</span>
                ) : (
                  <span className="text-gray-400">○ Fără cont</span>
                )}
              </td>
              <td>
                <MedicInvitationButton
                  medic={medic}
                  businessId={businessId!}
                  locationId={locationId!}
                  onInvitationSent={refreshMedics}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## AWS Amplify Configuration

```typescript
// src/config/amplify.ts
import { Amplify } from '@aws-amplify/core';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'eu-central-1_XXXXX',
      userPoolClientId: 'your-client-id',
      // Optional: dacă folosiți Hosted UI
      loginWith: {
        oauth: {
          domain: 'auth.simplu.io',
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [
            'https://dental.simplu.io/',
            'https://gym.simplu.io/',
            'https://hotel.simplu.io/',
            'http://localhost:3000/',
          ],
          redirectSignOut: [
            'https://dental.simplu.io/',
            'https://gym.simplu.io/',
            'https://hotel.simplu.io/',
            'http://localhost:3000/',
          ],
          responseType: 'code',
        },
      },
    },
  },
});
```

## Auth Hook Example

```typescript
// hooks/useAuth.ts
import { Auth } from '@aws-amplify/auth';
import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await Auth.currentAuthenticatedUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const getToken = async (): Promise<string> => {
    const session = await Auth.currentSession();
    return session.getAccessToken().getJwtToken();
  };

  const signOut = async () => {
    await Auth.signOut();
    setUser(null);
  };

  return {
    user,
    loading,
    getToken,
    signOut,
    isAuthenticated: !!user,
  };
}
```

## API Client Example

```typescript
// utils/api.ts
import { Auth } from '@aws-amplify/auth';

class ApiClient {
  private baseUrl = '/api';

  private async getAuthHeaders() {
    try {
      const session = await Auth.currentSession();
      const token = session.getAccessToken().getJwtToken();
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    } catch (error) {
      return {
        'Content-Type': 'application/json',
      };
    }
  }

  async sendInvitation(params: {
    businessId: string;
    locationId: string;
    medicResourceId: string;
  }) {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.baseUrl}/invitations/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  async verifyInvitation(token: string) {
    // ✅ Public endpoint - no auth
    const response = await fetch(
      `${this.baseUrl}/invitations/verify?token=${encodeURIComponent(token)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.json();
  }

  async getInvitationStatus(params: {
    businessId: string;
    locationId: string;
    medicResourceId: string;
  }) {
    const headers = await this.getAuthHeaders();
    
    const queryParams = new URLSearchParams(params);
    const response = await fetch(
      `${this.baseUrl}/invitations/status?${queryParams}`,
      {
        method: 'GET',
        headers,
      }
    );

    return response.json();
  }
}

export const api = new ApiClient();
```

## TypeScript Types

```typescript
// types/invitations.ts

export interface MedicResource {
  id: number;
  resource_id: string;
  resource_type: 'medic';
  business_location_id: string;
  data: {
    name: string;
    email: string;
    role: string;
    specialization?: string;
    phone?: string;
    cognitoUserId?: string;
    invitationStatus?: 'not_sent' | 'sent' | 'accepted';
    invitationSentAt?: string;
    invitationAcceptedAt?: string;
  };
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvitationVerification {
  valid: boolean;
  data?: {
    email: string;
    businessId: string;
    locationId: string;
    medicResourceId: string;
    businessType: 'dental' | 'gym' | 'hotel';
    invitedBy: string;
  };
  error?: string;
}

export interface InvitationStatus {
  status: 'not_sent' | 'sent' | 'accepted';
  sentAt?: string;
  acceptedAt?: string;
  hasCognitoAccount: boolean;
}
```

## Testing Flow

### 1. Test Send Invitation (în browser console)

```javascript
// Get auth token
const session = await Auth.currentSession();
const token = session.getAccessToken().getJwtToken();

// Send invitation
const response = await fetch('/api/invitations/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    businessId: 'bus-123',
    locationId: 'loc-001',
    medicResourceId: 'test@example.com'
  })
});

const result = await response.json();
console.log(result);
// Expected: { success: true, message: "Invitation sent..." }
```

### 2. Test Verify Token

```javascript
// Extract token from URL or use test token
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// Verify (no auth needed)
const response = await fetch(`/api/invitations/verify?token=${token}`);
const result = await response.json();
console.log(result);
// Expected: { valid: true, data: { email, businessId, ... } }
```

### 3. Test Register

```javascript
// Register with Cognito
const result = await Auth.signUp({
  username: 'test@example.com',
  password: 'Test1234!',
  attributes: {
    email: 'test@example.com',
  },
  clientMetadata: {
    invitationToken: token, // ✅ Important!
  },
});

console.log('User created:', result);
// Check email for confirmation code
// Lambda will run automatically and update resource_id
```

## Flow Diagram pentru Frontend

```
┌─────────────────────────────────────────┐
│ Admin Dashboard (authenticated)         │
├─────────────────────────────────────────┤
│ Medics List                             │
│ ┌─────────────────────────────────────┐ │
│ │ Dr. Ion - ion@ex.com [Trimite inv.] │ │
│ │ Dr. Ana - ana@ex.com [✓ Are cont]   │ │
│ │ Dr. Dan - dan@ex.com [↻ Retrimite]  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
              │ Click "Trimite inv."
              ▼
       POST /api/invitations/send
              ↓
       Email sent → 📧 User
              ↓
              
┌─────────────────────────────────────────┐
│ User clicks email link                  │
│ https://dental.simplu.io/register?token │
└─────────────────────────────────────────┘
              ↓
       GET /api/invitations/verify
              ↓
┌─────────────────────────────────────────┐
│ Register Page (public)                  │
├─────────────────────────────────────────┤
│ Email: ion@example.com (read-only)      │
│ Password: _______________               │
│ Confirm:  _______________               │
│ [Creează Cont]                          │
└─────────────────────────────────────────┘
              ↓ Submit
       Auth.signUp() cu clientMetadata
              ↓
       Cognito → Lambda → SQS → RDS ✅
```

## Checklist Frontend

- [ ] Instalează AWS Amplify (`npm install @aws-amplify/auth`)
- [ ] Configurează Amplify cu Cognito pool
- [ ] Creează `MedicInvitationButton` component
- [ ] Creează `/register` page
- [ ] Adaugă `@Public()` decorator pe verify endpoint (✅ deja făcut!)
- [ ] Implementează error handling
- [ ] Testează flow-ul complet

Gata! Ai tot ce îți trebuie pentru frontend! 🚀
