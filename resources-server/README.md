# Resources Server

Serverul de resurse pentru gestionarea operațiunilor CREATE, UPDATE, DELETE cu integrare AWS Kinesis și Citrus sharding.

## Descriere

Acest server gestionează operațiunile de modificare a resurselor (CREATE, UPDATE, DELETE) și trimite datele prin AWS Kinesis Data Streams pentru procesare. Serverul folosește Citrus pentru shard-uri și trimite direct în stream-uri pentru procesare.

## Funcționalități

- **CREATE**: Creează resurse noi și trimite în stream-ul Kinesis
- **UPDATE**: Actualizează resurse existente (înlocuire completă)
- **PATCH**: Actualizează parțial resurse existente
- **DELETE**: Șterge resurse și trimite notificări

## Arhitectură

### Flux de date:
1. **Validare**: Verifică parametrii de bază
2. **Citrus Sharding**: Determină shard-ul potrivit pentru business+location
3. **Kinesis Streams**: Trimite datele pentru procesare
4. **Elixir Notifications**: Trimite notificări către serverul Elixir

### Integrări:
- **Citrus**: Pentru shard-uri și distribuția datelor
- **AWS Kinesis**: Pentru stream-uri de date

## Endpoints

### POST /resources/:businessId-:locationId
Creează o resursă nouă

### PUT /resources/:businessId-:locationId
Actualizează complet o resursă existentă

### PATCH /resources/:businessId-:locationId
Actualizează parțial o resursă existentă

### DELETE /resources/:businessId-:locationId
Șterge o resursă

## Headers necesare

- `X-Business-ID`: ID-ul business-ului
- `X-Location-ID`: ID-ul locației
- `X-Resource-Type`: Tipul resursei

## Configurare

Copiați `env.example` în `.env` și configurați variabilele:

```bash
# Server
PORT=3001
NODE_ENV=development

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# Kinesis
KINESIS_STREAM_NAME=resources-stream
ELIXIR_STREAM_NAME=elixir-notifications

# Citrus
CITRUS_SERVER_URL=http://localhost:8080
CITRUS_API_KEY=your-citrus-key
```

## Instalare și rulare

```bash
# Instalare dependențe
npm install

# Rulare în development
npm run start:dev

# Rulare în production
npm run start:prod

# Build
npm run build
```

## Stream-uri Kinesis

### resources-stream
Primă toate operațiunile de modificare a resurselor pentru procesare. Serverul care procesează acest stream se va ocupa de verificarea permisiunilor, rolurilor și validărilor.

### elixir-notifications
Trimite notificări către serverul Elixir pentru actualizări în timp real.

## Loguri

Serverul generează loguri detaliate pentru:
- Operațiunile de shard-uri Citrus
- Trimiterea datelor în Kinesis
- Erorile de procesare

## Securitate

- Validare parametri pentru toate operațiunile
- Logging pentru audit
- **Notă**: Verificarea permisiunilor, rolurilor și validările se fac în serverul care procesează stream-urile Kinesis

## Monitorizare

- Health checks pentru toate serviciile
- Metrice pentru Kinesis streams
- Loguri structurate pentru debugging
- Error handling comprehensiv