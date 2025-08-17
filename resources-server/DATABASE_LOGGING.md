# Database Logging

Acest document explică sistemul de logging pentru conexiunile la baza de date din resources-server.

## Loguri de Conexiune

### 1. La pornirea aplicației

```
[DatabaseService] Initializing database connections for type: citrus
[DatabaseService] Citrus sharding enabled - connections will be initialized on-demand
```

Pentru RDS:
```
[DatabaseService] Initializing database connections for type: rds
[DatabaseService] Initializing RDS connection to localhost:5432/test_db
[DatabaseService] ✅ RDS connection successful to localhost:5432/test_db
[DatabaseService] RDS tables created/verified successfully
```

### 2. La prima conexiune Citrus

```
[DatabaseService] Initializing Citrus connection to shard shard-001
[DatabaseService] ✅ Citrus connection successful to shard shard-001
[DatabaseService] Citrus tables created/verified successfully for shard shard-001
```

Pentru conexiuni ulterioare:
```
[DatabaseService] Using existing Citrus connection to shard shard-001
```

### 3. Operațiuni de bază de date

Salvare resursă:
```
[DatabaseService] ✅ Saved resource appointment-123 to citrus database (shard: shard-001)
```

Ștergere resursă:
```
[DatabaseService] ✅ Deleted resource appointment-123 from citrus database (shard: shard-001)
```

### 4. La închiderea aplicației

```
[DatabaseService] Closing database connections...
[DatabaseService] ✅ RDS connection closed
[DatabaseService] ✅ Citrus connection closed for shard shard-001
[DatabaseService] All database connections closed successfully
```

## Tipuri de Loguri

### ✅ Loguri de succes
- Conexiuni reușite
- Operațiuni de salvare/ștergere reușite
- Închiderea conexiunilor

### ❌ Loguri de eroare
- Erori de conexiune la RDS
- Erori de conexiune la Citrus
- Erori de operațiuni

### ⚠️ Loguri de warning
- Tip de bază de date necunoscut
- Credențiale lipsă

## Beneficii

1. **Vizibilitate completă** a stării conexiunilor
2. **Debugging ușor** pentru probleme de conexiune
3. **Monitorizare** a performanței operațiunilor
4. **Tracking** al shard-urilor folosite
5. **Confirmare** că operațiunile s-au executat cu succes

## Configurare

Logurile sunt activate automat și nu necesită configurare suplimentară. Nivelul de logging poate fi controlat prin:

```bash
# Pentru mai multe detalii
NODE_ENV=development

# Pentru mai puține detalii
NODE_ENV=production
```

## Monitorizare

Pentru a monitoriza conexiunile la baza de date, urmărește logurile cu:
- `✅` - pentru operațiuni reușite
- `❌` - pentru erori
- `Initializing` - pentru pornirea conexiunilor
- `Closing` - pentru închiderea conexiunilor
