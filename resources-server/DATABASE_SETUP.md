# Database Setup Guide

Acest ghid explică cum să configurezi sistemul de resurse pentru a funcționa cu atât Citrus (PostgreSQL pe shard-uri) cât și Amazon RDS.

## Configurare Generală

### 1. Variabile de Mediu

Copiază `.env.example` în `.env` și configurează variabilele:

```bash
cp .env.example .env
```

### 2. Configurare Database Type

Setează tipul de bază de date în `.env`:

```bash
# Pentru Amazon RDS
DATABASE_TYPE=rds

# Pentru Citrus Sharding
DATABASE_TYPE=citrus
```

## Configurare Amazon RDS

### 1. Creează o instanță RDS PostgreSQL

```bash
# Prin AWS CLI
aws rds create-db-instance \
  --db-instance-identifier resources-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password your_password \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxxxxx
```

### 2. Configurează variabilele RDS în `.env`

```bash
DATABASE_TYPE=rds
RDS_HOST=your-rds-endpoint.amazonaws.com
RDS_PORT=5432
RDS_USERNAME=postgres
RDS_PASSWORD=your_password
RDS_DATABASE=resources_db
RDS_SSL=true
RDS_SYNCHRONIZE=false
RDS_LOGGING=false
```

### 3. Creează baza de date

```sql
-- Conectează-te la RDS și rulează:
CREATE DATABASE resources_db;
```

Tabelele vor fi create automat la pornirea aplicației.

## Configurare Citrus Sharding

### 1. Configurează variabilele Citrus în `.env`

```bash
DATABASE_TYPE=citrus
CITRUS_SERVER_URL=http://your-citrus-server:8080
CITRUS_API_KEY=your_citrus_api_key
CITRUS_TIMEOUT=5000
CITRUS_RETRY_ATTEMPTS=3
```

### 2. Asigură-te că serverul Citrus rulează

Citrus va gestiona automat shard-urile și conexiunile PostgreSQL.

## Configurare Kinesis

### 1. Creează stream-urile Kinesis

```bash
# Stream pentru primirea resurselor
aws kinesis create-stream \
  --stream-name resources-consumer-stream \
  --shard-count 2

# Stream pentru trimiterea resurselor (dacă nu există)
aws kinesis create-stream \
  --stream-name resources-stream \
  --shard-count 2
```

### 2. Configurează variabilele Kinesis în `.env`

```bash
KINESIS_STREAM_NAME=resources-stream
KINESIS_CONSUMER_STREAM_NAME=resources-consumer-stream
ELIXIR_STREAM_NAME=elixir-notifications
```

## Instalare și Pornire

### 1. Instalează dependințele

```bash
npm install
```

### 2. Pornește aplicația

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## Testare

### 1. Verifică health check

```bash
curl http://localhost:3001/health
```

### 2. Testează crearea unei resurse

```bash
curl -X POST http://localhost:3001/resources/business123-location456 \
  -H "Content-Type: application/json" \
  -H "X-Business-ID: business123" \
  -H "X-Location-ID: location456" \
  -H "X-Resource-Type: dental-patient" \
  -d '{
    "data": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890"
    }
  }'
```

### 3. Testează query-ul resurselor

```bash
curl "http://localhost:3001/resources/business123-location456/query?resourceType=dental-patient&page=1&limit=10"
```

## Migrarea între Citrus și RDS

### De la Citrus la RDS

1. Exportă datele din Citrus:
```bash
# Script pentru export (trebuie implementat)
node scripts/export-from-citrus.js
```

2. Schimbă `DATABASE_TYPE=rds` în `.env`

3. Importă datele în RDS:
```bash
# Script pentru import (trebuie implementat)
node scripts/import-to-rds.js
```

### De la RDS la Citrus

1. Exportă datele din RDS:
```bash
pg_dump -h your-rds-endpoint.amazonaws.com -U postgres resources_db > backup.sql
```

2. Schimbă `DATABASE_TYPE=citrus` în `.env`

3. Importă datele în Citrus (prin shard-uri)

## Monitorizare

### 1. Logs

Aplicația loghează toate operațiunile importante:
- Conexiuni la baza de date
- Procesarea mesajelor Kinesis
- Operațiuni CRUD pe resurse

### 2. Metrici

Poți accesa statistici prin endpoint-ul:
```bash
curl http://localhost:3001/resources/business123-location456/stats
```

## Troubleshooting

### Probleme comune

1. **Conexiune la RDS eșuată**
   - Verifică security groups
   - Verifică credențialele
   - Verifică că RDS permite conexiuni externe

2. **Citrus nu răspunde**
   - Verifică că serverul Citrus rulează
   - Verifică API key-ul
   - Verifică network connectivity

3. **Kinesis nu primește mesaje**
   - Verifică că stream-urile există
   - Verifică permisiunile AWS
   - Verifică că shard iterators sunt inițializați

### Debug mode

Pentru debugging detaliat, setează:
```bash
NODE_ENV=development
RDS_LOGGING=true
```