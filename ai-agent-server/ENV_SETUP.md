# Environment Variables Setup

## 📋 Variabile Obligatorii

### AWS Bedrock Configuration

```bash
# Bedrock Agent ID (din AWS Console → Bedrock → Agents)
BEDROCK_AGENT_ID=XXXXXXXXXX

# Agent Alias ID (folosește TSTALIASID pentru testing)
BEDROCK_AGENT_ALIAS_ID=TSTALIASID

# AWS Region
AWS_BEDROCK_REGION=us-east-1

# AWS Credentials
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```

### App Server Authentication

```bash
# Shared secret key pentru autentificare internă între ai-agent-server și app server
# IMPORTANT: Trebuie să fie ACELAȘI în ambele servere!
AI_SERVER_KEY=your_strong_secret_key_here_min_32_chars

# URL app server
API_SERVER_URL=http://localhost:3000
```

**Notă importantă:** `AI_SERVER_KEY` trebuie setat în:
1. ✅ `ai-agent-server/.env` - pentru a trimite requests
2. ✅ `app/.env` - pentru a valida requests

### Elixir Server

```bash
ELIXIR_HTTP_URL=http://localhost:4000
ELIXIR_WS_URL=ws://localhost:4000/socket/websocket
```

### DynamoDB Tables

```bash
DYNAMODB_MESSAGES_TABLE=ai-agent-messages
DYNAMODB_SESSIONS_TABLE=ai-agent-sessions
AWS_REGION=eu-central-1
```

## 🔧 Variabile Opționale

### Bedrock Knowledge Base (pentru RAG)

```bash
# Knowledge Base ID (din AWS Console → Bedrock → Knowledge Bases)
BEDROCK_KNOWLEDGE_BASE_ID=XXXXXXXXXX

# Model ID (default: Claude 3.5 Sonnet)
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
```

### Performance Settings

```bash
# Enable tracing pentru debugging
BEDROCK_ENABLE_TRACE=true

# Timeout pentru Bedrock requests (milliseconds)
BEDROCK_TIMEOUT=60000

# Număr de rezultate din Knowledge Base
BEDROCK_KB_RESULTS=5

# Scor minim pentru relevanță Knowledge Base
BEDROCK_KB_MIN_SCORE=0.7
```

## ✅ Verificare Setup

### 1. Verifică că AI_SERVER_KEY este setat în ambele servere

**În ai-agent-server:**
```bash
cd ai-agent-server
grep AI_SERVER_KEY .env
# Ar trebui să vezi: AI_SERVER_KEY=your_secret_key
```

**În app:**
```bash
cd ../app
grep AI_SERVER_KEY .env
# Ar trebui să fie ACELAȘI: AI_SERVER_KEY=your_secret_key
```

### 2. Test conexiune la app server

```bash
# Din ai-agent-server
npm run start:dev
```

Logs ar trebui să arate:
```
✅ Registered 6 tools: query_app_server, call_frontend_function, ...
```

Test query:
```bash
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "test-user",
    "session_id": "test",
    "message_id": "msg1",
    "payload": {"content": "Listează programările"}
  }'
```

Dacă primești răspuns JSON (nu eroare de autentificare), totul funcționează! ✅

## 🔐 Securitate

### Generare AI_SERVER_KEY sigur

```bash
# Generează un key random de 32 caractere
openssl rand -base64 32

# Sau folosește Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copiază output-ul și folosește-l ca `AI_SERVER_KEY` în **ambele** servere.

## 📝 Exemplu .env complet

```bash
# ========== AWS BEDROCK ==========
BEDROCK_AGENT_ID=XXXXXXXXXX
BEDROCK_AGENT_ALIAS_ID=TSTALIASID
BEDROCK_KNOWLEDGE_BASE_ID=XXXXXXXXXX
AWS_BEDROCK_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# ========== INTERNAL AUTH ==========
AI_SERVER_KEY=random_32_char_secret_key_here

# ========== SERVERS ==========
API_SERVER_URL=http://localhost:3000
ELIXIR_HTTP_URL=http://localhost:4000
ELIXIR_WS_URL=ws://localhost:4000/socket/websocket

# ========== DYNAMODB ==========
DYNAMODB_MESSAGES_TABLE=ai-agent-messages
DYNAMODB_SESSIONS_TABLE=ai-agent-sessions
AWS_REGION=eu-central-1

# ========== OPTIONAL ==========
BEDROCK_ENABLE_TRACE=true
BEDROCK_TIMEOUT=60000
BEDROCK_KB_RESULTS=5
BEDROCK_KB_MIN_SCORE=0.7
```

## ❌ Common Errors

### Error: "Invalid AI-SERVER-KEY"
```
✅ Fix: Verifică că AI_SERVER_KEY este ACELAȘI în ai-agent-server/.env și app/.env
```

### Error: "AI_SERVER_KEY environment variable not configured"
```
✅ Fix: Adaugă AI_SERVER_KEY în app/.env
```

### Error: "BEDROCK_AGENT_ID is required"
```
✅ Fix: Creează Bedrock Agent în AWS și adaugă ID-ul în .env
```

### Error: "ResourceType header missing"
```
✅ Fix: Tool-ul adaugă automat X-Resource-Type header pentru resources module
```

## 🔗 Related Docs

- `BEDROCK_SETUP.md` - Setup complet AWS Bedrock
- `data/KNOWLEDGE_BASE_SETUP.md` - Setup Knowledge Base
- `data/dental-knowledge-base.json` - Schema resurse dental

