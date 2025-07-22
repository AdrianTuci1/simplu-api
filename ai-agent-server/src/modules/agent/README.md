# Agent Service

Agent Service-ul este componenta centrală pentru procesarea inteligentă a mesajelor folosind LangChain, LangGraph și Gemini 2.5 Flash.

## Funcționalități

### 1. Procesare Mesaje WebSocket
- Procesare mesaje de la coordonatori prin WebSocket
- Analiză intenții cu Gemini
- Executare workflow-uri bazate pe instrucțiuni RAG
- Generare răspunsuri naturale și utile

### 2. Procesare Autonomă Webhook
- Procesare automată a mesajelor de la surse externe (Meta, Twilio, Email)
- Analiză intenții și determinare dacă poate fi rezolvat autonom
- Executare workflow-uri complete fără intervenție umană
- Escaladare către coordonatori când este necesar

### 3. LangGraph Workflow
- Graful de procesare cu noduri specializate:
  - `BusinessInfoNode`: Obținere informații business
  - `RagSearchNode`: Căutare în baza de date RAG
  - `ResourceOperationsNode`: Operații pe resurse
  - `ExternalApiNode`: Apeluri API externe
  - `ResponseNode`: Generare răspunsuri

## Structura Fișierelor

```
src/modules/agent/
├── interfaces/
│   ├── agent.interface.ts    # Interfețe pentru Agent Service
│   └── index.ts              # Export interfețe
├── langchain/
│   └── nodes/
│       ├── business-info.node.ts
│       ├── rag-search.node.ts
│       ├── resource-operations.node.ts
│       ├── external-api.node.ts
│       ├── response.node.ts
│       └── index.ts
├── agent.service.ts          # Serviciul principal
├── agent.controller.ts       # Controller pentru API
├── agent.module.ts           # Module NestJS
├── agent.service.spec.ts     # Teste
└── README.md                 # Documentație
```

## API Endpoints

### POST /agent/process-message
Procesează un mesaj de la WebSocket.

**Body:**
```json
{
  "businessId": "string",
  "locationId": "string", 
  "userId": "string",
  "message": "string",
  "sessionId": "string (optional)"
}
```

### POST /agent/process-webhook
Procesează un mesaj de la webhook (procesare autonomă).

**Body:**
```json
{
  "businessId": "string",
  "locationId": "string",
  "userId": "string", 
  "message": "string",
  "source": "meta|twilio|email",
  "externalId": "string (optional)",
  "sessionId": "string (optional)"
}
```

### GET /agent/health
Verifică starea serviciului.

### GET /agent/test-intent/:message
Testează analiza intențiilor pentru un mesaj.

## Configurație

Serviciul folosește configurația din:
- `@/config/gemini.config.ts` - Configurația Gemini
- `@/config/langchain.config.ts` - Configurația LangChain

## Integrare

Agent Service-ul se integrează cu:
- **BusinessInfoService**: Pentru informații despre business
- **RagService**: Pentru căutări în baza de date RAG
- **SessionService**: Pentru gestionarea sesiunilor
- **WebSocketGateway**: Pentru comunicarea cu coordonatorii

## Testare

```bash
# Rulare teste
npm run test src/modules/agent/agent.service.spec.ts

# Testare endpoint
curl -X POST http://localhost:3000/agent/process-message \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "test-business",
    "locationId": "test-location", 
    "userId": "test-user",
    "message": "Vreau să fac o rezervare"
  }'
```

## Workflow Autonom

1. **Analiză Intenție**: Gemini analizează mesajul și determină intenția
2. **Verificare Autonomie**: Se verifică dacă poate fi rezolvat automat
3. **Obținere Instrucțiuni**: Se caută în baza RAG instrucțiunile relevante
4. **Executare Workflow**: Se execută pașii workflow-ului
5. **Validare**: Se validează rezultatele
6. **Notificare**: Se notifică coordonatorii despre acțiunea autonomă
7. **Răspuns**: Se generează răspunsul pentru utilizator

## Escaladare

Când o cerere nu poate fi rezolvată autonom:
1. Se trimite notificare către coordonatori prin WebSocket
2. Se marchează conversația ca necesitând intervenție umană
3. Se răspunde utilizatorului că cererea a fost transmisă unui coordonator 