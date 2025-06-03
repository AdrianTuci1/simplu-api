# Arhitectură Backend Multi-Tenant pentru Asistent Virtual (Business AI Agent)

Acest document descrie arhitectura de backend containerizată pentru o aplicație multi-tenant, care include un agent de asistență AI dedicat pentru diverse tipuri de afaceri (ex: clinici dentare, săli de fitness, hoteluri).

## Prezentare Generală a Arhitecturii Backend

Arhitectura backend este construită pe o serie de servicii interconectate, majoritatea rulate în containere Docker, pentru a asigura scalabilitate, izolare și o gestionare eficientă a resurselor. Componentele cheie includ:

* **API Layer (Scalable):** Punctul de intrare pentru majoritatea interacțiunilor cu backend-ul.
* **WebSocket Layer:** Gestionează conexiunile persistente pentru comunicarea în timp real.
* **Events (Kafka Bus):** Un sistem de mesagerie distribuită pentru comunicarea asincronă între servicii.
* **AI Agent (Scalable):** Componenta inteligentă care procesează cererile și interacționează cu API-uri externe.
* **DB Layer:** Straturile de persistență pentru datele aplicației și sesiuni.
* **Auth (SSO):** Serviciul de autentificare.

## Componente Dockerizate

Următoarele componente de backend sunt proiectate pentru a rula în containere Docker, facilitând implementarea și scalarea.

### 1. API Server (Node.js)

* **Descriere:** Serviciul principal de API, responsabil pentru gestionarea cererilor HTTP de la frontend și coordonarea operațiunilor cu alte servicii backend. Construit cu Node.js pentru performanță și scalabilitate.
* **Tehnologie:** Node.js
* **Conexiuni:** Interacționează cu WebSocket Layer, Kafka Bus, Auth, și DB Layer.

### 2. Phoenix (Elixir) WebSocket Server

* **Descriere:** Un server dedicat pentru gestionarea conexiunilor WebSocket, oferind comunicare bidirecțională în timp real. Utilizarea Elixir/Phoenix asigură o toleranță la erori ridicată și scalabilitate excelentă pentru conexiuni concurente.
* **Tehnologie:** Elixir, Phoenix
* **Conexiuni:** Primește cereri de la API Layer și poate trimite evenimente către clienții conectați.

### 3. Kafka Bus (Events)

* **Descriere:** Un bus de mesaje distribuit, utilizat pentru a facilita comunicarea asincronă și decoupled între diverse servicii (microservicii). Asigură durabilitatea mesajelor și permite scalarea independentă a producătorilor și consumatorilor de evenimente.
* **Tehnologie:** Apache Kafka
* **Conexiuni:** Serviciile API Server, WebSocket Server și LangGraph AI Agent publică și/sau consumă evenimente de pe Kafka Bus.

### 4. LangGraph AI Agent

* **Descriere:** Agentul inteligent de asistență pentru afaceri. Acest serviciu procesează cererile complexe, utilizează modele de limbaj și logică de business pentru a oferi răspunsuri și acțiuni specifice fiecărui tip de afacere (clinici dentare, săli de fitness, hoteluri). Interacționează cu API-uri externe pentru a prelua informații sau a executa acțiuni.
* **Tehnologie:** LangGraph (sau similar), Python (probabil)
* **Conexiuni:** Consumă evenimente de pe Kafka Bus, interacționează cu PostgreSQL (pentru date specifice fiecărui tenant), și comunică cu External APIs (Meta Graph API, Twilio, Booking.com / Email Ingest).

### 5. auth.simptu.io (SSO)

* **Descriere:** Un serviciu dedicat de autentificare Single Sign-On (SSO). Acesta gestionează procesele de autentificare și autorizare, asigurând securitatea accesului la resursele backend.
* **Tehnologie:** Nespecificată (dar este un serviciu autonom de autentificare)
* **Conexiuni:** API Server și alte servicii care necesită autentificare interacționează cu acest serviciu.

### 6. PostgreSQL (multi-tenant, encrypted per tenant)

* **Descriere:** Baza de date relațională principală, concepută pentru a suporta arhitectura multi-tenant. Datele fiecărui tenant sunt criptate separat pentru a asigura izolare și securitate. Stochează datele operaționale ale aplicației.
* **Tehnologie:** PostgreSQL
* **Conexiuni:** Majoritatea serviciilor de backend (API Server, LangGraph AI Agent, Auth) interacționează cu această bază de date.

### 7. Redis (cache + sessions)

* **Descriere:** O bază de date in-memory utilizată pentru caching rapid și stocarea sesiunilor utilizatorilor. Contribuie la performanța generală a sistemului prin reducerea latenței accesului la date frecvent solicitate.
* **Tehnologie:** Redis
* **Conexiuni:** API Server și probabil alte servicii (ex: WebSocket Server) interacționează cu Redis pentru cache și sesiuni.

### 8. External APIs (Integrare)

* **Descriere:** Deși nu sunt containere rulate în cadrul sistemului, aceste API-uri externe sunt integrate de LangGraph AI Agent pentru a extinde funcționalitatea și a oferi servicii specifice:
    * **Meta Graph API:** Pentru interacțiuni cu platformele Meta (Facebook, Instagram).
    * **Twilio (SMS / Voice):** Pentru funcționalități de comunicare (mesaje SMS, apeluri vocale).
    * **Booking.com / Email Ingest:** Pentru integrarea cu platforme de rezervări sau procesarea email-urilor.
* **Tehnologie:** API-uri terțe
* **Conexiuni:** LangGraph AI Agent inițiază cereri către aceste API-uri.

## Arhitectură Multi-Tenant

Sistemul este proiectat să suporte multiple clinici, săli de fitness sau hoteluri ca **"tenanți"** independenți, toți rulând pe aceeași infrastructură backend partajată. Izolarea datelor și securitatea sunt asigurate prin:

* **Criptare per Tenant:** Datele fiecărui tenant în PostgreSQL sunt criptate individual.
* **Login Separat:** Sistemul de autentificare (auth.simptu.io) gestionează accesul specific fiecărui tenant.
* **Logică de Business:** AI Agent-ul și API Server-ul conțin logica necesară pentru a distinge și a procesa cererile în contextul tenantului corespunzător.

## Implementare și Rulare (Docker Compose / Kubernetes)

Această arhitectură este ideală pentru a fi implementată folosind:

* **Docker Compose:** Pentru medii de dezvoltare locală sau mici implementări, `docker-compose.yml` ar defini toate serviciile și dependințele acestora.
* **Kubernetes:** Pentru producție, un orchestrator de containere precum Kubernetes ar gestiona scalarea, disponibilitatea și implementarea complexă a acestor servicii.

---