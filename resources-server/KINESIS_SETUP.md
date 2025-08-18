# Kinesis Setup în Resources Server

## Configurația actuală

Resources-server este configurat să primească date din stream-ul Kinesis `resources-stream` prin `KinesisConsumerService`.

### Servicii Kinesis

1. **KinesisConsumerService** - Pentru primirea datelor din stream

### Configurația simplificată

- `AppModule` importă atât `ResourcesModule` cât și `KinesisModule` separat
- `KinesisModule` conține doar `KinesisConsumerService` (consumer)
- `KinesisModule` nu trimite date către stream, doar consumă
- `KinesisConsumerService` loghează mesajele primite din stream

### Configurația de mediu

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# Kinesis Configuration
KINESIS_STREAM_NAME=resources-stream
```

### Autentificarea AWS

Consumer-ul suportă multiple metode de autentificare AWS:

1. **Credențiale explicite** - prin variabilele de mediu `AWS_ACCESS_KEY_ID` și `AWS_SECRET_ACCESS_KEY`
2. **IAM Roles** - pentru instanțe EC2 sau containere
3. **AWS Credential Provider Chain** - verifică automat multiple surse de credențiale

Consumer-ul va încerca să folosească credential provider chain-ul AWS dacă credențialele explicite nu sunt configurate.

### Structura mesajelor

Mesajele din stream trebuie să aibă următoarea structură:

```typescript
interface KinesisResourceMessage {
  operation: 'create' | 'update' | 'delete' | 'patch';
  resourceType: string;
  businessId: string;
  locationId: string;
  resourceId?: string;
  shardId?: string;
  data?: any;
  timestamp: string;
}
```

### Funcționalitatea Consumer-ului

`KinesisConsumerService`:

1. **Se inițializează automat** la pornirea aplicației
2. **Polling continuu** - verifică stream-ul la fiecare secundă
3. **Gestionarea shard-urilor** - inițializează și gestionează iteratorii pentru toate shard-urile
4. **Procesarea mesajelor** - parsează și procesează mesajele prin ResourcesService
5. **Gestionarea erorilor** - folosește `KinesisErrorHandlerService` pentru erori centralizate

### Procesarea datelor

Când un mesaj este primit din stream:

1. **Parsing** - mesajul JSON este parsat și validat
2. **Logging** - se loghează detaliile mesajului pentru debugging
3. **Logging suplimentar** - se loghează că mesajul ar fi procesat prin ResourcesService

**Notă:** Din cauza dependențelor circulare, `KinesisConsumerService` doar loghează mesajele pentru moment. Pentru procesarea completă, este necesară implementarea unui serviciu intermediar sau refactorizarea arhitecturii.

### Logging

Consumer-ul va loga:
- Începerea polling-ului
- Numărul de shard-uri inițializate
- Numărul de înregistrări procesate per shard
- Detaliile mesajelor primite (inclusiv requestId, businessId, locationId)
- Sample data pentru debugging (primele 3 câmpuri)
- Erorile de conexiune și procesare

**Exemplu de log pentru mesaj primit:**
```
Processing create operation for rooms
Business: b1, Location: loc1, RequestId: 49ce66c6-5fa8-498d-9abf-90893a00a424
Received Kinesis message: {
  operation: 'create',
  resourceType: 'rooms',
  businessId: 'b1',
  locationId: 'loc1',
  requestId: '49ce66c6-5fa8-498d-9abf-90893a00a424',
  timestamp: '2025-08-17T22:55:42.237Z',
  dataKeys: ['roomNumber', 'floor', 'type', ...],
  dataSize: 245
}
Sample data fields: { roomNumber: '201', floor: 2, type: 'deluxe' }
Would process create operation for rooms through ResourcesService
Successfully processed create operation for rooms
```

### Verificarea funcționării

Pentru a verifica dacă consumer-ul funcționează:

1. Asigură-te că AWS credentials sunt configurate
2. Verifică logurile la pornirea aplicației pentru mesajele:
   - "Kinesis Consumer Configuration:"
   - "Starting Kinesis consumer polling for stream: resources-stream"
   - "Attempting to connect to Kinesis stream: resources-stream"
   - "Kinesis consumer polling started successfully"
   - "Initialized X shard iterators"

3. Trimite un mesaj de test către stream și verifică logurile pentru:
   - "Processing X records from shard Y"
   - "Processing create operation for rooms"
   - "Business: b1, Location: loc1, RequestId: ..."
   - "Received Kinesis message: {...}"
   - "Sample data fields: {...}"
   - "Successfully processed create operation for rooms"

### Verificarea stream-ului

Pentru a verifica dacă stream-ul există:

1. **AWS CLI:**
   ```bash
   aws kinesis describe-stream --stream-name resources-stream --region us-east-1
   ```

2. **AWS Console:**
   - Mergi la AWS Kinesis Console
   - Verifică că stream-ul `resources-stream` există
   - Verifică că este în regiunea corectă (us-east-1)

### Troubleshooting

**Eroare: "AWS credentials not configured"**
- Verifică variabilele de mediu `AWS_ACCESS_KEY_ID` și `AWS_SECRET_ACCESS_KEY`
- Sau asigură-te că folosești IAM roles sau alte metode de autentificare AWS
- Consumer-ul va încerca să folosească credential provider chain-ul AWS

**Eroare: "ResourceNotFoundException" sau "Failed to describe stream"**
- Verifică dacă stream-ul `resources-stream` există în AWS Kinesis
- Verifică că stream-ul este în aceeași regiune AWS configurată
- Verifică permisiunile AWS pentru accesul la Kinesis
- Verifică că variabila `KINESIS_STREAM_NAME` este configurată corect în `.env`

**Nu se primesc mesaje**
- Verifică dacă stream-ul are shard-uri active
- Verifică logurile pentru erori de conexiune
- Verifică dacă mesajele sunt trimise cu structura corectă

**Eroare: "UndefinedModuleException" sau "circular dependency"**
- Verifică că toate importurile sunt corecte
- Asigură-te că `AppModule` importă atât `ResourcesModule` cât și `KinesisModule`
