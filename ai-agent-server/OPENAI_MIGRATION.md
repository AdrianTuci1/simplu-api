# Migrarea de la Gemini la OpenAI

Acest document descrie schimbările făcute pentru a înlocui Gemini cu OpenAI în ai-agent-server.

## Schimbări efectuate

### 1. Configurație

- **Fișier nou**: `src/config/openai.config.ts` (înlocuiește `gemini.config.ts`)
- **Actualizat**: `src/config/langchain.config.ts` - variabilele de mediu pentru OpenAI
- **Actualizat**: `src/config/configuration.ts` - configurația OpenAI în loc de Gemini
- **Actualizat**: `.env.example` - variabilele de mediu pentru OpenAI

### 2. Dependințe

**Adăugate:**
- `@langchain/openai`: ^0.3.15

**Eliminate:**
- `@google/generative-ai`
- `@langchain/google-genai`

### 3. Cod actualizat

**Servicii principale:**
- `src/modules/agent/agent.service.ts` - înlocuit `ChatGoogleGenerativeAI` cu `ChatOpenAI`

**Noduri LangChain:**
- `src/modules/agent/langchain/nodes/external-api.node.ts`
- `src/modules/agent/langchain/nodes/response.node.ts`
- `src/modules/agent/langchain/nodes/resource-operations.node.ts`
- `src/modules/agent/langchain/nodes/rag-search.node.ts`

## Variabile de mediu necesare

Adaugă în fișierul `.env`:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL_NAME=gpt-4o-mini
OPENAI_MAX_TOKENS=8192
OPENAI_TEMPERATURE=0.1
OPENAI_TOP_P=0.8
```

## Modele OpenAI recomandate

- **gpt-4o-mini**: Rapid și cost-eficient pentru majoritatea cazurilor
- **gpt-4o**: Pentru cazuri complexe care necesită raționament avansat
- **gpt-3.5-turbo**: Alternativă mai ieftină

## Diferențe față de Gemini

1. **Parametri eliminați**: `topK` și `safetySettings` (specifici Gemini)
2. **Autentificare**: Folosește `OPENAI_API_KEY` în loc de `GOOGLE_API_KEY`
3. **Modele**: Folosește modelele OpenAI (GPT) în loc de Gemini

## Instalare

```bash
cd ai-agent-server
npm install
npm run build
npm run start:dev
```

## Testare

Pentru a testa funcționarea:

1. Asigură-te că ai setat `OPENAI_API_KEY` în `.env`
2. Pornește serverul: `npm run start:dev`
3. Testează prin WebSocket sau webhook-uri

## Note

- Toate prompt-urile și logica de business rămân neschimbate
- Sistemul de prompt-uri în română funcționează la fel
- Performanța poate varia în funcție de modelul ales