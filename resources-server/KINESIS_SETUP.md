# Kinesis Setup în Resources Server

## Configurația actuală

Resources-server este configurat să primească date din stream-ul Kinesis `resources-stream` prin `KinesisConsumerService`.

### Servicii Kinesis

1. **KinesisService** - Pentru trimiterea datelor către stream
2. **KinesisConsumerService** - Pentru primirea datelor din stream
3. **KinesisErrorHandlerService** - Pentru gestionarea centralizată a erorilor

### Dependențe circulare

Pentru a evita dependențele circulare între `KinesisModule` și `ResourcesModule`, se folosește `forwardRef()`:

- `KinesisModule` importă `ResourcesModule` cu `forwardRef(() => ResourcesModule)`
- `ResourcesModule` importă `KinesisModule` cu `forwardRef(() => KinesisModule)`
- `KinesisConsumerService` injectează `ResourcesService` cu `@Inject(forwardRef(() => ResourcesService))`
- `AppModule` importă doar `ResourcesModule` (nu și `KinesisModule` direct)

**Notă:** `KinesisModule` este accesibil prin `ResourcesModule`, deci nu trebuie importat direct în `AppModule`.

### Configurația de mediu

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# Kinesis Configuration
KINESIS_STREAM_NAME=resources-stream
```

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
3. **Procesare** - se apelează metoda corespunzătoare din `ResourcesService`:
   - `createResource()` pentru operația 'create'
   - `updateResource()` pentru operația 'update'
   - `patchResource()` pentru operația 'patch'
   - `deleteResource()` pentru operația 'delete'
4. **Salvare** - datele sunt salvate în baza de date prin `DatabaseService`
5. **Notificare** - se trimit notificări către Elixir prin `NotificationService`

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
Processing resource operation: create for rooms (b1-loc1)
Successfully processed resource operation: create for rooms
Successfully processed create operation for rooms
```

### Verificarea funcționării

Pentru a verifica dacă consumer-ul funcționează:

1. Asigură-te că AWS credentials sunt configurate
2. Verifică logurile la pornirea aplicației pentru mesajele:
   - "Starting Kinesis consumer polling..."
   - "Kinesis consumer polling started successfully"
   - "Initialized X shard iterators"

3. Trimite un mesaj de test către stream și verifică logurile pentru:
   - "Processing X records from shard Y"
   - "Processing create operation for rooms"
   - "Business: b1, Location: loc1, RequestId: ..."
   - "Received Kinesis message: {...}"
   - "Sample data fields: {...}"
   - "Successfully processed create operation for rooms"

### Troubleshooting

**Eroare: "AWS credentials not configured"**
- Verifică variabilele de mediu `AWS_ACCESS_KEY_ID` și `AWS_SECRET_ACCESS_KEY`

**Eroare: "Failed to describe stream"**
- Verifică dacă stream-ul `resources-stream` există în AWS Kinesis
- Verifică permisiunile AWS pentru accesul la Kinesis

**Nu se primesc mesaje**
- Verifică dacă stream-ul are shard-uri active
- Verifică logurile pentru erori de conexiune
- Verifică dacă mesajele sunt trimise cu structura corectă

**Eroare: "UndefinedModuleException" sau "circular dependency"**
- Verifică că `forwardRef()` este folosit corect în ambele module
- Verifică că `@Inject(forwardRef(() => ResourcesService))` este folosit în `KinesisConsumerService`
- Asigură-te că `AppModule` importă doar `ResourcesModule`, nu și `KinesisModule` direct
- Verifică că toate importurile sunt corecte
