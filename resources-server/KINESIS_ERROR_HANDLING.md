# Kinesis Error Handling

Acest document explică sistemul centralizat de gestionare a erorilor Kinesis din resources-server.

## Problema

Înainte de implementarea acestui sistem, erorile de conexiune la Kinesis erau logate în multiple locuri:
- `KinesisService.sendToStream()`
- `KinesisConsumerService.startPolling()`
- `KinesisConsumerService.initializeShardIterators()`
- `KinesisConsumerService.pollForRecords()`
- `KinesisConsumerService.reinitializeShardIterator()`

Aceasta ducea la multiple mesaje de eroare pentru aceeași problemă de conexiune.

## Soluția

S-a implementat un sistem centralizat de gestionare a erorilor prin `KinesisErrorHandlerService` care:

### 1. Deduplicarea erorilor de conexiune
- Erorile de conexiune sunt logate o singură dată per perioadă de cooldown (60 secunde)
- Erorile non-conexiune sunt logate întotdeauna
- Starea de eroare se resetează când operațiunile Kinesis reușesc

### 2. Detectarea erorilor de conexiune
Erorile sunt detectate ca fiind de conexiune dacă:
- **Code**: `NetworkingError`, `TimeoutError`, `CredentialsError`, `UnauthorizedOperation`, etc.
- **Name**: Aceleași coduri ca mai sus
- **Message**: Conține cuvinte cheie ca "connect", "connection", "timeout", "network", "credentials", etc.

### 3. Context pentru debugging
Fiecare eroare include contextul în care a apărut:
- `KinesisService.sendToStream`
- `KinesisConsumerService.startPolling`
- `KinesisConsumerService.initializeShardIterators`
- `KinesisConsumerService.pollForRecords.shard.{shardId}`
- `KinesisConsumerService.reinitializeShardIterator.{shardId}`

## Implementarea

### KinesisErrorHandlerService
```typescript
@Injectable()
export class KinesisErrorHandlerService {
  handleConnectionError(error: any, context: string): void
  handleSuccess(context: string): void
  resetErrorState(): void
}
```

### Utilizarea în servicii
```typescript
// În loc de:
this.logger.error('Failed to send data to stream:', error);

// Se folosește:
this.errorHandler.handleConnectionError(error, 'KinesisService.sendToStream');
```

## Beneficii

1. **O singură eroare** pentru probleme de conexiune
2. **Debugging mai ușor** cu context specific
3. **Logs mai curate** fără spam de erori
4. **Recuperare automată** când conexiunea se restabilește

## Testare

Sistemul este testat complet în `kinesis-error-handler.service.spec.ts`:

```bash
npm test -- --testPathPattern=kinesis-error-handler.service.spec.ts
```

## Configurare

Nu este necesară configurare suplimentară. Serviciul este injectat automat în:
- `KinesisService`
- `KinesisConsumerService`

## Monitorizare

Pentru a monitoriza starea erorilor de conexiune, urmărește logurile cu:
- `Kinesis connection failed` - când apare o eroare de conexiune
- `Kinesis connection restored` - când conexiunea se restabilește
- `Kinesis operation failed` - pentru erori non-conexiune
