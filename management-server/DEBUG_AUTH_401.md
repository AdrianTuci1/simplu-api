# Debugging 401 Unauthorized Error

## Problema
Primești eroarea `HTTP/1.1 401 Unauthorized` și server-ul nu oferă log-uri detaliate.

## Logarea Îmbunătățită

Am adăugat logare detaliată în:
1. **CognitoAuthGuard** - loghează fiecare verificare de autentificare
2. **AuthService** - loghează validarea token-ului
3. **getUserFromToken** - loghează extragerea informațiilor din token

## Pași de Debugging

### 1. Verifică Log-urile
După ce faci o cerere, caută în log-uri:
```bash
# Caută log-urile de autentificare
grep "Auth check" logs/application.log
grep "Token validation" logs/application.log
grep "Bearer token" logs/application.log
```

### 2. Verifică Header-ul Authorization
Asigură-te că trimiți header-ul corect:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/businesses
```

### 3. Verifică Token-ul
- Token-ul trebuie să fie valid
- Token-ul nu trebuie să fie expirat
- Formatul trebuie să fie: `Bearer <token>`

### 4. Endpoint-uri Publice
Următoarele endpoint-uri sunt publice (nu necesită autentificare):
- `GET /health`
- `GET /`
- `GET /businesses/:id/invitation`

### 5. Endpoint-uri Protejate
Toate celelalte endpoint-uri necesită autentificare:
- `GET /businesses`
- `POST /businesses/configure`
- `POST /businesses/:id/payment`
- `POST /businesses/:id/launch`
- `GET /users/me`
- `PUT /users/me`

## Mesaje de Eroare Posibile

### "Authorization header required"
- Nu ai trimis header-ul `Authorization`
- Header-ul este gol

### "Bearer token required"
- Header-ul nu începe cu `Bearer `
- Formatul este incorect

### "Token validation failed"
- Token-ul este invalid
- Token-ul este expirat
- Eroare în validarea token-ului

### "Invalid access token"
- Nu s-au putut extrage informațiile din token
- Token-ul este corupt

### "Token verification failed"
- Semnătura JWT este invalidă
- Token-ul a expirat
- Issuer-ul sau audience-ul sunt incorecte
- Cheia publică nu poate fi obținută

### "No username found in token"
- Token-ul nu conține claim-ul `cognito:username` sau `sub`
- Token-ul nu este un access token valid

### "User not found in Cognito"
- Username-ul din token nu există în User Pool
- Utilizatorul a fost șters din Cognito

## Testare Rapidă

### 1. Testează endpoint-ul public:
```bash
curl http://localhost:3001/health
```

### 2. Testează cu token invalid:
```bash
curl -H "Authorization: Bearer invalid_token" http://localhost:3001/businesses
# Va returna 401 cu mesajul "Token verification failed"
```

### 3. Testează fără header:
```bash
curl http://localhost:3001/businesses
# Va returna 401 cu mesajul "Authorization header required"
```

### 4. Testează cu token valid:
```bash
# Obține un token valid de la Cognito
curl -H "Authorization: Bearer YOUR_VALID_TOKEN" http://localhost:3001/businesses
# Va returna 200 cu lista de business-uri
```

### 5. Cum să obții un token valid:
```bash
# 1. Autentifică-te prin Cognito Hosted UI sau API
# 2. Obține access token din răspuns
# 3. Folosește token-ul în header-ul Authorization
```

## Configurare pentru Production

AuthService folosește validarea reală cu Cognito:
- ✅ Verifică semnătura JWT folosind cheile publice Cognito
- ✅ Verifică expirarea token-ului
- ✅ Verifică issuer-ul și audience-ul
- ✅ Extrage username-ul din token
- ✅ Obține informațiile complete ale utilizatorului din Cognito

### Variabile de Mediu Necesare:
```bash
COGNITO_USER_POOL_ID=your-user-pool-id
COGNITO_CLIENT_ID=your-client-id
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Validarea Token-ului:
1. **Decodare header** - pentru a obține key ID (kid)
2. **Obținere cheie publică** - din JWKS endpoint
3. **Verificare semnătură** - folosind algoritmul RS256
4. **Verificare claims** - issuer, audience, expirare
5. **Extragere username** - din token
6. **Obținere user info** - din Cognito User Pool

## Soluții

### 1. Verifică CORS
Asigură-te că CORS este configurat corect pentru frontend-ul tău.

### 2. Verifică Token-ul
Folosește un token valid de la Cognito sau un token de test pentru development.

### 3. Verifică URL-ul
Asigură-te că apelezi endpoint-ul corect.

### 4. Verifică Metoda HTTP
Asigură-te că folosești metoda HTTP corectă (GET, POST, PUT, DELETE).

## Testare Automată

Rulează script-ul de testare pentru a verifica autentificarea:

```bash
# Testare cu token invalid (default)
node scripts/test-auth.js

# Testare cu token valid
TEST_TOKEN=your_valid_token node scripts/test-auth.js

# Testare pe server diferit
MANAGEMENT_SERVER_URL=https://your-server.com node scripts/test-auth.js
```

## Contact
Dacă problema persistă, verifică log-urile complete și furnizează:
- URL-ul apelat
- Metoda HTTP
- Headers trimiși
- Log-urile de eroare
- Rezultatul script-ului de testare 