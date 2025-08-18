# Kinesis Setup în Resources Server

## Configurația actuală

Resources-server este configurat să primească date din stream-ul Kinesis `resources-stream` prin `KinesisConsumerService`.

### Servicii Kinesis

1. **KinesisService** - Pentru trimiterea datelor către stream
2. **KinesisConsumerService** - Pentru primirea datelor din stream
3. **KinesisErrorHandlerService** - Pentru gestionarea centralizată a erorilor

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
4. **Procesarea mesajelor** - parsează și loghează mesajele primite
5. **Gestionarea erorilor** - folosește `KinesisErrorHandlerService` pentru erori centralizate

### Logging

Consumer-ul va loga:
- Începerea polling-ului
- Numărul de shard-uri inițializate
- Numărul de înregistrări procesate per shard
- Detaliile mesajelor primite
- Erorile de conexiune și procesare

### Verificarea funcționării

Pentru a verifica dacă consumer-ul funcționează:

1. Asigură-te că AWS credentials sunt configurate
2. Verifică logurile la pornirea aplicației pentru mesajele:
   - "Starting Kinesis consumer polling..."
   - "Kinesis consumer polling started successfully"
   - "Initialized X shard iterators"

3. Trimite un mesaj de test către stream și verifică logurile pentru:
   - "Processing X records from shard Y"
   - "Received Kinesis message: {...}"

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
