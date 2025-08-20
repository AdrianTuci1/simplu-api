# API Test Scripts

Acest director conține scripturi pentru testarea API-ului de resurse.

## Teste API Simplificat

### Descriere
Scriptul `test-simplified-api.js` testează noua structură simplificată a API-ului unde:
- URL-urile și headers-urile rămân la fel
- Body-ul conține doar `{ "data": {...} }`
- `startDate` și `endDate` sunt extrase automat din `data` în backend
- **Pentru query-uri**: Folosim câmpurile `startDate` și `endDate` din baza de date (nu din `data`)

## Teste Data Field

### Descriere
Scriptul `test-data-field.js` verifică că câmpul `data` este salvat corect în baza de date:
- Testează că JSON-ul complet este salvat în câmpul `data`
- Verifică că toate câmpurile sunt prezente în query-uri
- Confirmă că extragerea `startDate`/`endDate` funcționează corect

### Configurare

#### Variabile de Mediu
```bash
# URL-ul de bază pentru API (implicit: http://localhost:3000)
export API_BASE_URL="http://localhost:3000"

# ID-ul business-ului pentru teste (implicit: dental-clinic)
export BUSINESS_ID="dental-clinic"

# ID-ul locației pentru teste (implicit: location1)
export LOCATION_ID="location1"
```

#### Configurare Implicită
Dacă nu setezi variabilele de mediu, scriptul va folosi:
- `API_BASE_URL`: `http://localhost:3000`
- `BUSINESS_ID`: `dental-clinic`
- `LOCATION_ID`: `location1`

### Rulare

#### Rulare Directă
```bash
# Din directorul rădăcină al proiectului
node app/scripts/test-simplified-api.js

# Sau din directorul scripts
cd app/scripts
node test-simplified-api.js
```

#### Rulare cu Variabile de Mediu
```bash
API_BASE_URL="https://api.example.com" \
BUSINESS_ID="my-business" \
LOCATION_ID="my-location" \
node app/scripts/test-simplified-api.js
```

#### Rulare Executabil
```bash
# Din directorul rădăcină
./app/scripts/test-simplified-api.js

# Sau din directorul scripts
cd app/scripts
./test-simplified-api.js
```

#### Rulare Test Data Field
```bash
# Testează că câmpul data este salvat corect
node app/scripts/test-data-field.js

# Sau executabil
./app/scripts/test-data-field.js
```

### Teste Incluse

Scriptul rulează următoarele teste:

1. **CREATE Client** - Testează crearea unui client cu structura simplificată
2. **CREATE Appointment** - Testează crearea unei programări cu structura simplificată
3. **QUERY Clients** - Testează query-ul clienților
4. **QUERY Appointments** - Testează query-ul programărilor
5. **GET Resource Stats** - Testează statisticile resurselor
6. **DATE RANGE Query** - Testează query-ul pe intervale de date
7. **QUERY with Date Filters** - Testează query-ul cu filtre de date (folosește câmpurile startDate/endDate din DB)

### Structura Testelor

#### Teste CREATE
```javascript
// Testează structura simplificată
{
  "data": {
    "name": "Test Client",
    "email": "test@example.com",
    // ... alte câmpuri
  }
}
```

#### Headers Utilizate
```javascript
{
  'Content-Type': 'application/json',
  'X-Resource-Type': 'clients' // sau 'appointments'
}
```

#### URL-uri Testate
```
POST /api/resources/{businessId}-{locationId}
GET /api/resources/{businessId}-{locationId}/clients
GET /api/resources/{businessId}-{locationId}/appointments
GET /api/resources/{businessId}-{locationId}/stats
GET /api/resources/{businessId}-{locationId}/appointments/date-range
```

### Rezultate

Scriptul va afișa:
- Status-ul fiecărui test (✅ PASSED sau ❌ FAILED)
- Răspunsurile API-ului
- Un sumar final cu toate testele

#### Exemplu de Output
```
🚀 Starting Simplified API Tests
Base URL: http://localhost:3000
Business ID: dental-clinic
Location ID: location1

🧪 Testing CREATE client...
Status: 202
Response: {
  "success": true,
  "message": "create operation queued for processing",
  "requestId": "uuid-v4-generated",
  "timestamp": "2024-01-15T10:30:00Z"
}
✅ CREATE client test PASSED

📊 Test Results Summary:
========================
✅ createClient: PASSED
✅ createAppointment: PASSED
✅ queryClients: PASSED
✅ queryAppointments: PASSED
✅ getStats: PASSED
✅ dateRangeQuery: PASSED

🎯 Overall: 6/6 tests passed
🎉 All tests passed! API simplification is working correctly.
```

### Debugging

#### Logs Detaliate
Scriptul afișează răspunsurile complete ale API-ului pentru debugging.

#### Verificare Manuală
Poți verifica manual endpoint-urile cu curl:

```bash
# Test CREATE client
curl -X POST "http://localhost:3000/api/resources/dental-clinic-location1" \
  -H "Content-Type: application/json" \
  -H "X-Resource-Type: clients" \
  -d '{
    "data": {
      "name": "Test Client",
      "email": "test@example.com"
    }
  }'

# Test QUERY clients
curl "http://localhost:3000/api/resources/dental-clinic-location1/clients?page=1&limit=10"
```

### Integrare în CI/CD

Scriptul poate fi integrat în pipeline-uri CI/CD:

```yaml
# Exemplu GitHub Actions
- name: Test API
  run: |
    npm install
    node app/scripts/test-simplified-api.js
  env:
    API_BASE_URL: ${{ secrets.API_BASE_URL }}
    BUSINESS_ID: ${{ secrets.BUSINESS_ID }}
    LOCATION_ID: ${{ secrets.LOCATION_ID }}
```

### Troubleshooting

#### Erori Comune

1. **Connection refused**
   - Verifică dacă serverul API rulează
   - Verifică `API_BASE_URL`

2. **404 Not Found**
   - Verifică dacă endpoint-urile sunt implementate
   - Verifică `BUSINESS_ID` și `LOCATION_ID`

3. **400 Bad Request**
   - Verifică structura body-ului
   - Verifică headers-urile

4. **500 Internal Server Error**
   - Verifică logs-urile serverului
   - Verifică configurația bazei de date

#### Verificare Server
```bash
# Verifică dacă serverul rulează
curl http://localhost:3000/health

# Verifică endpoint-urile
curl http://localhost:3000/api/resources/dental-clinic-location1/clients
```

### Contribuții

Pentru a adăuga noi teste:

1. Creează o nouă funcție de test
2. Adaugă-o în `runTests()`
3. Actualizează `results` object
4. Testează scriptul

```javascript
async function testNewFeature() {
  console.log('\n🧪 Testing NEW FEATURE...');
  
  try {
    const response = await makeRequest(
      'GET',
      `/api/resources/${BUSINESS_ID}-${LOCATION_ID}/new-feature`
    );

    if (response.status === 200) {
      console.log('✅ NEW FEATURE test PASSED');
      return true;
    } else {
      console.log('❌ NEW FEATURE test FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ NEW FEATURE test ERROR:', error.message);
    return false;
  }
}
```
