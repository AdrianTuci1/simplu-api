# Team Invitations System Guide

## Prezentare Generală

Sistemul de invitații permite adăugarea de noi membri în echipă prin email. Când un admin creează un medic, poate trimite o invitație care permite utilizatorului să se înregistreze și să își creeze contul Cognito.

## Arhitectură

```
┌─────────────────────────────────────────────────────────────┐
│              1. CREAREA ȘI TRIMITEREA INVITAȚIEI             │
└─────────────────────────────────────────────────────────────┘

Admin (Frontend)
      │
      │ 1. Creează medic
      ▼
┌──────────────────┐
│  App Server      │ POST /resources/{business-location}/medics
│  (NestJS)        │ X-Resource-Type: medic
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Kinesis Stream   │ → Resources-Server → RDS
└──────────────────┘

Medic creat cu:
{
  resource_id: "temp-email@example.com",  // sau UUID
  data: {
    name: "Dr. Ion",
    email: "ion@example.com",
    role: "doctor",
    invitationStatus: "not_sent",
    cognitoUserId: null
  }
}

Admin (Frontend)
      │
      │ 2. Click "Trimite invitație"
      ▼
┌──────────────────┐
│  App Server      │ POST /invitations/send
│  (Invitations    │
│   Module)        │
└────┬────────┬────┘
     │        │
     │        │ 3. Generate JWT token
     │        │    + Build invitation URL
     │        ▼
     │   ┌──────────┐
     │   │ AWS SES  │ ━━━> 📧 Email la ion@example.com
     │   └──────────┘
     │
     │ 4. Update medic status
     ▼
┌──────────────────┐
│ Kinesis Stream   │ → Resources-Server → RDS
└──────────────────┘

Medic updated:
{
  invitationStatus: "sent",
  invitationSentAt: "2024-01-15T10:00:00Z"
}


┌─────────────────────────────────────────────────────────────┐
│                   2. ACCEPTAREA INVITAȚIEI                   │
└─────────────────────────────────────────────────────────────┘

User primește email
      │
      │ Click link: https://admin.simplu.io/register?token={JWT}
      ▼
Frontend /register
      │
      │ 1. Verify token
      │    GET /invitations/verify?token={JWT}
      ▼
┌──────────────────┐
│  App Server      │ → Verifică că token e valid
└──────────────────┘    și invitația nu e acceptată

User completează formular
      │
      │ 2. Register with Cognito
      ▼
┌──────────────────┐
│  Frontend        │ Cognito.signUp({
│                  │   email,
│                  │   password,
│                  │   clientMetadata: {
│                  │     invitationToken: JWT
│                  │   }
│                  │ })
└────────┬─────────┘
         │
         │ 3. Cognito creates user
         ▼
┌──────────────────┐
│  AWS Cognito     │
│  User Pool       │
└────────┬─────────┘
         │
         │ 4. Post-Confirmation Trigger (automat!)
         ▼
┌──────────────────┐
│  Lambda Function │
│  (JS)            │
└────────┬─────────┘
         │
         │ 5. Parse JWT from clientMetadata
         │    Extract: businessId, locationId, oldResourceId
         │
         │ 6. Send SQS message
         ▼
┌──────────────────┐
│  AWS SQS         │
│  (resources      │
│   queue)         │
└────────┬─────────┘
         │
         │ 7. SQS Consumer polls
         ▼
┌──────────────────┐
│ Resources-Server │
│ (SQS Consumer)   │
└────────┬─────────┘
         │
         │ 8. Direct SQL UPDATE:
         │    UPDATE resources
         │    SET resource_id = {cognitoUserId}
         │    WHERE resource_id = {oldResourceId}
         ▼
┌──────────────────┐
│  RDS/Citrus      │
└──────────────────┘

Medic updated:
{
  resource_id: "cognito-user-abc123",  // ✅ UPDATED!
  data: {
    ...existing data,
    cognitoUserId: "cognito-user-abc123",
    invitationStatus: "accepted",
    invitationAcceptedAt: "2024-01-15T10:30:00Z"
  }
}
```

## Componente

### 1. AWS SES Service (app server)

**Locație**: `app/src/modules/shared/services/ses.service.ts`

**Funcții**:
- `sendEmail()` - Trimite email generic
- `sendInvitationEmail()` - Template pentru invitații

**Configurare**:
```bash
# app/.env
SES_ENABLED=true
SES_SENDER_EMAIL=no-reply@simplu.io
AWS_REGION=eu-central-1
```

### 2. Invitations Module (app server)

**Locație**: `app/src/modules/invitations/`

**Endpoints**:

```typescript
POST /invitations/send
{
  "businessId": "bus-123",
  "locationId": "loc-001",
  "medicResourceId": "temp-email@example.com"
}

GET /invitations/verify?token={JWT}
// Returns: { valid: true/false, data: {...} }

GET /invitations/status?businessId=...&locationId=...&medicResourceId=...
// Returns: { status: "not_sent" | "sent" | "accepted" }
```

### 3. Lambda Post-Confirmation

**Locație**: `management-server/infra/lambdas/cognito-post-confirmation.mjs`

**Trigger**: Cognito Post-Confirmation

**Flow**:
1. Primește event de la Cognito
2. Extrage `invitationToken` din `clientMetadata`
3. Verifică și decodează JWT token
4. Trimite mesaj SQS cu `UPDATE_RESOURCE_ID`

**Environment Variables**:
```bash
SQS_QUEUE_URL=https://sqs.eu-central-1.amazonaws.com/.../resources-server-queue
JWT_SECRET=your-jwt-secret  # TREBUIE să fie același cu app server
AWS_REGION=eu-central-1
```

### 4. SQS Consumer (resources-server)

**Locație**: `resources-server/src/modules/sqs/sqs-consumer.service.ts`

**Mesaj Nou**: `UPDATE_RESOURCE_ID`

**Flow**:
1. Primește mesaj cu `MessageType: UPDATE_RESOURCE_ID`
2. Apelează `databaseService.updateResourceId()`
3. Face UPDATE direct în SQL
4. Nu creează resursă nouă!

### 5. Database Service (resources-server)

**Locație**: `resources-server/src/modules/resources/services/database.service.ts`

**Funcție Nouă**: `updateResourceId()`

**SQL Query**:
```sql
UPDATE resources 
SET resource_id = $1,
    data = data || $2::jsonb,  -- Merge additionalData
    updated_at = NOW()
WHERE business_location_id = $3 
  AND resource_type = $4 
  AND resource_id = $5
RETURNING *;
```

## Fluxul Complet

### Pas 1: Admin creează medic

```javascript
// Frontend
POST /api/resources/bus-123-loc-001
Headers: X-Resource-Type: medic

{
  "data": {
    "name": "Dr. Ion Popescu",
    "email": "ion.popescu@example.com",
    "specialization": "Ortodont",
    "role": "doctor"
  }
}

// App Server generează resource_id = email sau UUID
// Salvează în RDS prin Kinesis
```

### Pas 2: Admin trimite invitație

```javascript
// Frontend - buton "Trimite invitație"
POST /invitations/send

{
  "businessId": "bus-123",
  "locationId": "loc-001",
  "medicResourceId": "ion.popescu@example.com"
}

// App Server:
// 1. Generează JWT:
const token = jwt.sign({
  email: "ion.popescu@example.com",
  businessId: "bus-123",
  locationId: "loc-001",
  medicResourceId: "ion.popescu@example.com",
  invitedBy: "admin-user"
}, JWT_SECRET, { expiresIn: '7d' });

// 2. Trimite email prin SES:
await sesService.sendInvitationEmail({
  to: "ion.popescu@example.com",
  businessName: "Clinica Alfa",
  inviterName: "Admin User",
  invitationUrl: "https://admin.simplu.io/register?token={JWT}"
});

// 3. Update status prin Kinesis:
PATCH medic: { invitationStatus: "sent", invitationSentAt: "..." }
```

### Pas 3: User primește email

```html
Subject: Invitație de la Clinica Alfa

Salut!

Admin User te-a invitat să te alături echipei Clinica Alfa pe platforma simplu.io.

[Acceptă Invitația] - https://admin.simplu.io/register?token=eyJhbGc...

Linkul este valabil 7 zile.
```

### Pas 4: User se înregistrează

```javascript
// Frontend /register page
// 1. Verify token
const verification = await api.get(`/invitations/verify?token=${token}`);

if (!verification.valid) {
  // Show error
  return;
}

// 2. Show register form pre-filled with email
<RegisterForm 
  email={verification.data.email}  // Read-only
  onSubmit={async (password) => {
    // 3. Register with Cognito
    await Auth.signUp({
      username: verification.data.email,
      password,
      attributes: {
        email: verification.data.email
      },
      clientMetadata: {
        invitationToken: token  // ✅ IMPORTANT!
      }
    });
  }}
/>
```

### Pas 5: Cognito trigger Lambda

```javascript
// Lambda is triggered AUTOMATICALLY by Cognito
// Event contains:
{
  userName: "cognito-user-abc123",  // Cognito user ID
  request: {
    userAttributes: {
      email: "ion.popescu@example.com"
    },
    clientMetadata: {
      invitationToken: "eyJhbGc..."  // ✅ JWT token
    }
  }
}

// Lambda:
// 1. Decode JWT
const decoded = jwt.verify(invitationToken, JWT_SECRET);

// 2. Send SQS message
await sqs.send(new SendMessageCommand({
  QueueUrl: SQS_QUEUE_URL,
  MessageBody: JSON.stringify({
    messageType: 'UPDATE_RESOURCE_ID',
    businessId: decoded.businessId,
    locationId: decoded.locationId,
    resourceType: 'medic',
    oldResourceId: decoded.medicResourceId,  // "ion.popescu@example.com"
    newResourceId: "cognito-user-abc123",    // Cognito user ID
    additionalData: {
      cognitoUserId: "cognito-user-abc123",
      invitationStatus: "accepted",
      invitationAcceptedAt: new Date().toISOString()
    }
  }),
  MessageAttributes: {
    MessageType: {
      DataType: 'String',
      StringValue: 'UPDATE_RESOURCE_ID'
    }
  }
}));
```

### Pas 6: SQS Consumer procesează

```javascript
// Resources-Server SQS Consumer
// Receive message from SQS

await databaseService.updateResourceId(
  "bus-123",
  "loc-001",
  "medic",
  "ion.popescu@example.com",     // oldResourceId
  "cognito-user-abc123",          // newResourceId
  {
    cognitoUserId: "cognito-user-abc123",
    invitationStatus: "accepted",
    invitationAcceptedAt: "..."
  }
);

// Direct SQL UPDATE:
UPDATE resources 
SET resource_id = 'cognito-user-abc123',
    data = data || '{"cognitoUserId": "cognito-user-abc123", ...}'::jsonb,
    updated_at = NOW()
WHERE business_location_id = 'bus-123-loc-001'
  AND resource_type = 'medic'
  AND resource_id = 'ion.popescu@example.com';
```

### Pas 7: User se autentifică

```javascript
// User login
const tokens = await Auth.signIn(email, password);

// Permission check (app server)
// Caută medic cu resource_id = cognitoUserId
const medic = await resourceQuery.getResourceById(
  businessId,
  locationId,
  'medic',
  'cognito-user-abc123'  // ✅ Găsește medicul!
);

// Extract permissions from role
const role = medic.data.role;  // "doctor"
// Query role resource → get permissions
// ✅ Access granted!
```

## De Ce SQS în Loc de Kinesis?

### Kinesis
❌ **Problemă**: TypeORM `.save()` cu `resourceId` modificat ar crea resursă nouă  
❌ Complicat de gestionat UPDATE-uri speciale

### SQS
✅ **Avantaj**: Permite mesaje speciale (UPDATE_RESOURCE_ID)  
✅ Consumer poate face UPDATE direct în SQL  
✅ Sigur că nu creează resurse duplicate  
✅ Merge și cu Citrus și cu RDS

## Environment Variables

### App Server

```bash
# JWT pentru invitation tokens
JWT_SECRET=your-secure-jwt-secret-min-32-chars

# AWS SES pentru email
SES_ENABLED=true
SES_SENDER_EMAIL=no-reply@simplu.io
AWS_REGION=eu-central-1

# Frontend URL pentru link-uri
FRONTEND_URL=https://admin.simplu.io
```

### Lambda (Cognito Post-Confirmation)

```bash
# SQS Queue URL
SQS_QUEUE_URL=https://sqs.eu-central-1.amazonaws.com/123456789/resources-server-queue

# JWT Secret (ACELAȘI cu app server!)
JWT_SECRET=your-secure-jwt-secret-min-32-chars

# AWS Region
AWS_REGION=eu-central-1
```

### Resources-Server

```bash
# SQS Queue URL (same as Lambda)
SQS_QUEUE_URL=https://sqs.eu-central-1.amazonaws.com/123456789/resources-server-queue

# AWS Region
AWS_SQS_REGION=eu-central-1
```

## Deployment

### 1. Deploy Lambda

```bash
cd management-server/infra/lambdas

# Install dependencies
npm install --prefix . @aws-sdk/client-sqs jsonwebtoken

# Zip Lambda
zip -r cognito-post-confirmation.zip cognito-post-confirmation.mjs node_modules/

# Upload to AWS Lambda
aws lambda create-function \
  --function-name cognito-post-confirmation \
  --runtime nodejs20.x \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role \
  --handler cognito-post-confirmation.handler \
  --zip-file fileb://cognito-post-confirmation.zip \
  --environment Variables="{
    SQS_QUEUE_URL=https://sqs....,
    JWT_SECRET=your-secret,
    AWS_REGION=eu-central-1
  }"
```

### 2. Configure Cognito Trigger

```bash
# Add Lambda trigger to Cognito User Pool
aws cognito-idp update-user-pool \
  --user-pool-id us-east-1_XXXXX \
  --lambda-config PostConfirmation=arn:aws:lambda:REGION:ACCOUNT:function:cognito-post-confirmation
```

### 3. IAM Permissions pentru Lambda

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage"
      ],
      "Resource": "arn:aws:sqs:*:*:resources-server-queue"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

## Frontend Integration

### Component: InvitationButton

```typescript
interface MedicResource {
  resource_id: string;
  data: {
    email: string;
    name: string;
    cognitoUserId?: string;
    invitationStatus?: 'not_sent' | 'sent' | 'accepted';
    invitationSentAt?: string;
  };
}

function InvitationButton({ medic, businessId, locationId }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(medic.data.invitationStatus || 'not_sent');

  const handleSendInvitation = async () => {
    if (medic.data.cognitoUserId) {
      toast.error('Utilizatorul are deja cont');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/invitations/send', {
        businessId,
        locationId,
        medicResourceId: medic.resource_id
      });

      if (response.data.success) {
        toast.success('Invitație trimisă cu succes!');
        setStatus('sent');
      } else {
        toast.error(response.data.error || 'Eroare la trimitere');
      }
    } catch (error) {
      toast.error('Eroare la trimitere invitație');
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (medic.data.cognitoUserId) return 'Are cont';
    if (status === 'sent') return 'Retrimite invitație';
    return 'Trimite invitație';
  };

  return (
    <Button
      onClick={handleSendInvitation}
      disabled={loading || !!medic.data.cognitoUserId}
      variant={medic.data.cognitoUserId ? 'secondary' : 'primary'}
    >
      {loading ? 'Se trimite...' : getButtonText()}
    </Button>
  );
}
```

### Page: Register

```typescript
function RegisterPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [verification, setVerification] = useState(null);

  useEffect(() => {
    if (token) {
      // Verify invitation token
      api.get(`/invitations/verify?token=${token}`)
        .then(res => {
          if (res.data.valid) {
            setVerification(res.data.data);
          } else {
            toast.error(res.data.error || 'Invitație invalidă');
          }
        });
    }
  }, [token]);

  const handleRegister = async (password: string) => {
    if (!verification) return;

    try {
      // Register with Cognito
      await Auth.signUp({
        username: verification.email,
        password,
        attributes: {
          email: verification.email
        },
        clientMetadata: {
          invitationToken: token  // ✅ CRITICAL!
        }
      });

      toast.success('Cont creat cu succes! Verifică email-ul pentru confirmare.');
      navigate('/login');
    } catch (error) {
      toast.error('Eroare la crearea contului');
    }
  };

  return (
    <div>
      <h1>Acceptă invitația</h1>
      {verification && (
        <>
          <p>Bine ai venit la {verification.businessName}!</p>
          <RegisterForm
            email={verification.email}
            onSubmit={handleRegister}
          />
        </>
      )}
    </div>
  );
}
```

## Testing

### 1. Test Send Invitation

```bash
# Get auth token
TOKEN="your-cognito-token"

# Send invitation
curl -X POST http://localhost:3001/api/invitations/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "bus-123",
    "locationId": "loc-001",
    "medicResourceId": "test@example.com"
  }'

# Expected response:
{
  "success": true,
  "message": "Invitation sent successfully to test@example.com"
}
```

### 2. Test Verify Token

```bash
curl "http://localhost:3001/api/invitations/verify?token=eyJhbGc..."

# Expected response:
{
  "valid": true,
  "data": {
    "email": "test@example.com",
    "businessId": "bus-123",
    "locationId": "loc-001",
    "medicResourceId": "test@example.com"
  }
}
```

### 3. Test Lambda (local)

```bash
# Install dependencies
cd management-server/infra/lambdas
npm install

# Test locally
node -e '
import("./cognito-post-confirmation.mjs").then(m => {
  m.handler({
    userName: "test-cognito-user-123",
    request: {
      userAttributes: { email: "test@example.com" },
      clientMetadata: { invitationToken: "your-test-token" }
    }
  }).then(console.log);
});
'
```

### 4. Monitor SQS

```bash
# Check queue
aws sqs get-queue-attributes \
  --queue-url https://sqs.../resources-server-queue \
  --attribute-names All

# Receive messages manually
aws sqs receive-message \
  --queue-url https://sqs.../resources-server-queue
```

## Securitate

### JWT Token
- ✅ Expiră după 7 zile
- ✅ Signed cu JWT_SECRET
- ✅ Conține doar date necesare (nu credentials)
- ✅ Verificat înainte de înregistrare

### Email Validation
- ✅ Lambda verifică că email-ul din token match email-ul din Cognito
- ✅ Verifică că medic-ul există și nu are deja cont

### Resource_id Update
- ✅ UPDATE direct în SQL (nu poate crea duplicate)
- ✅ Verifică că resource-ul există
- ✅ Atomic operation

## Troubleshooting

### Invitația nu se trimite

**Verifică**:
- [ ] `SES_SENDER_EMAIL` este verificat în AWS SES
- [ ] `SES_ENABLED=true`
- [ ] Medic are email în `data.email`
- [ ] Medic nu are deja `cognitoUserId`

### Token invalid sau expirat

**Cauze**:
- JWT_SECRET diferit între app server și Lambda
- Token expirat (>7 zile)
- Invitația deja acceptată

### Resource_id nu se update-ază

**Verifică**:
- [ ] Lambda trimite mesaj în SQS (check CloudWatch Logs)
- [ ] SQS Consumer rulează (check logs)
- [ ] `SQS_QUEUE_URL` este corect configurat
- [ ] DatabaseService are metoda `updateResourceId()`

### User nu poate login după acceptare

**Verifică**:
- [ ] `resource_id` a fost actualizat la `cognitoUserId`
- [ ] Check în RDS: `SELECT * FROM resources WHERE resource_type='medic'`
- [ ] Permission check caută după `cognitoUserId`

## Best Practices

1. **Email validation**: Validează format email înainte de creare medic
2. **Resend limit**: Limitează câte invitații pot fi trimise (anti-spam)
3. **Token rotation**: După acceptare, invalidate token-ul
4. **Logging**: Monitorizează toate trimiteri de invitații
5. **Error handling**: Nu bloca înregistrarea dacă Lambda eșuează

## Conclusion

Sistemul de invitații folosește o arhitectură robustă:
- **AWS SES** pentru email-uri profesionale
- **JWT** pentru token-uri securizate
- **Cognito Trigger** pentru procesare automată
- **SQS + SQL UPDATE** pentru schimbarea resource_id fără duplicate

Fluxul este complet automat după ce admin-ul trimite invitația! 🎉

