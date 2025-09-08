# Setup pentru Sesiuni și Mesaje în AI Agent Server

## Problema Rezolvată

AI agent server nu creează sesiuni și nu stochează mesajele corect, ceea ce înseamnă că nu are context conversațional. Am implementat următoarele soluții:

## Soluții Implementate

### ✅ 1. Crearea și Gestionarea Sesiunilor
- **WebSocket Gateway**: Verifică dacă există o sesiune activă pentru utilizator
- **Webhook Service**: Aplicat aceeași logică pentru toate sursele (Meta, Twilio, Gmail)
- **Session Service**: Adăugat metoda `getActiveSessionForUser()` cu fallback pentru GSI

### ✅ 2. Context Conversațional
- **AgentState**: Adăugat câmpul `sessionMessages` pentru ultimele 4 mesaje
- **AgentService**: Încarcă mesajele din sesiune înainte de procesare
- **RAG Context**: Folosește mesajele din sesiune în loc de `businessInfo.settings`

### ✅ 3. Context Temporal
- **Time Context**: Generat din timestamp-uri curente (fără TimeService)
- **RAG Integration**: Context temporal inclus în prompt-uri și understanding context

### ✅ 4. Memorie Dinamică Îmbunătățită
- **rag-dynamic-user**: Populat cu contextul sesiunii și istoricul conversațiilor
- **Session Context**: Include lungimea conversației, subiectele recente, ultimul mesaj

## Setup-ul Tabelelor DynamoDB

### 1. Creează Tabelele

```bash
cd ai-agent-server
node scripts/setup-dynamodb-tables.js
```

Acest script va crea toate tabelele necesare:
- `ai-agent-sessions` (cu GSI `businessId-userId-index`)
- `ai-agent-messages` (cu GSI-uri pentru query-uri eficiente)
- `business-info`
- `rag-system-instructions`
- `rag-dynamic-business`
- `rag-dynamic-user`
- `business-external-credentials`

### 2. Testează Setup-ul

```bash
node scripts/test-sessions-and-messages.js
```

Acest script va testa:
- Crearea sesiunilor
- Crearea mesajelor
- Query-urile pentru mesaje din sesiune
- GSI-ul pentru sesiuni active

### 3. Populează Instrucțiunile RAG

```bash
node scripts/populate-system-instructions.js
node scripts/populate-rag.js
```

## Structura Tabelelor

### Tabela `ai-agent-sessions`
```typescript
interface Session {
  sessionId: string;           // Partition Key
  businessId: string;          // GSI Partition Key
  locationId: string;
  userId: string;              // GSI Sort Key
  status: 'active' | 'closed' | 'resolved' | 'abandoned';
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  metadata: {
    businessType: string;
    context: any;
  };
}
```

**GSI**: `businessId-userId-index` pentru query-uri eficiente

### Tabela `ai-agent-messages`
```typescript
interface Message {
  messageId: string;           // Partition Key
  sessionId: string;           // Sort Key
  businessId: string;
  userId: string;
  content: string;
  type: 'user' | 'agent' | 'system';
  timestamp: string;
  metadata: {
    source: 'websocket' | 'webhook' | 'cron';
    externalId?: string;
    responseId?: string;
  };
}
```

**GSI-uri**:
- `sessionId-timestamp-index` pentru mesajele din sesiune
- `businessId-timestamp-index` pentru mesajele din business

## Variabile de Mediu

Asigură-te că ai setate:

```bash
# AWS Configuration
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key

# DynamoDB Table Names
export DYNAMODB_SESSIONS_TABLE=ai-agent-sessions
export DYNAMODB_MESSIONS_TABLE=ai-agent-messages
export DYNAMODB_BUSINESS_INFO_TABLE=business-info
export DYNAMODB_RAG_SYSTEM_TABLE=rag-system-instructions
export DYNAMODB_RAG_DYNAMIC_BUSINESS_TABLE=rag-dynamic-business
export DYNAMODB_RAG_DYNAMIC_USER_TABLE=rag-dynamic-user
export DYNAMODB_EXTERNAL_CREDENTIALS_TABLE=business-external-credentials
```

## Beneficiile Implementării

### 🎯 Context Conversațional
- AI-ul înțelege conversațiile anterioare
- Răspunsuri contextuale și relevante
- Continuity între mesaje

### 💾 Memorie Persistentă
- Sesiunile sunt stocate și reutilizate corect
- Mesajele sunt salvate pentru istoric
- Contextul se păstrează între sesiuni

### 🧠 RAG Îmbunătățit
- Context dinamic include istoricul conversațiilor
- Memoria utilizatorului se îmbogățește cu fiecare interacțiune
- Subiectele recente sunt luate în considerare

### ⏰ Context Temporal
- AI-ul știe timpul curent
- Detectează orele de program
- Răspunsuri adaptate la momentul zilei

### 🔄 Consistență
- Toate sursele (WebSocket, Meta, Twilio, Gmail) folosesc aceeași logică
- Gestionarea sesiunilor este uniformă
- Fallback-uri pentru GSI-uri lipsă

## Testarea

După setup, testează cu:

1. **WebSocket**: Trimite mesaje prin WebSocket și verifică că se creează sesiuni
2. **Webhooks**: Testează webhook-urile Meta/Twilio
3. **Context**: Verifică că AI-ul răspunde contextual la mesajele anterioare

## Troubleshooting

### GSI nu există
- Scriptul va folosi fallback la scan (mai lent dar funcțional)
- Creează GSI-ul manual în AWS Console sau rerulează setup script

### Tabelele nu se creează
- Verifică credențialele AWS
- Verifică permisiunile DynamoDB
- Verifică regiunea AWS

### Mesajele nu se salvează
- Verifică că tabelele există
- Verifică log-urile pentru erori
- Testează cu scriptul de test

## Următorii Pași

1. Rulează setup-ul tabelelor
2. Testează cu scripturile
3. Populează instrucțiunile RAG
4. Testează AI agent server cu mesaje reale
5. Monitorizează log-urile pentru erori

Acum AI agent server va avea context complet și va putea oferi răspunsuri mult mai relevante! 🎉
