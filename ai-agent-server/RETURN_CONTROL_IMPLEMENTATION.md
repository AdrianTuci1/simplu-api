# 🔄 Return Control Implementation

## 📖 Ce este Return Control?

Când configurezi Action Groups în AWS Bedrock Agent, ai 2 opțiuni de execuție:

### Opțiunea 1: Lambda Function
```
Bedrock → Lambda → Execută Tool → Return Result → Bedrock
```

### Opțiunea 2: Return Control (Ce folosim!)
```
Bedrock → Return Control Event → 
Notre Server execută Tool →
Return Result → Bedrock → Continuă conversația
```

## ⚠️ Problema Inițială

```typescript
if (event.returnControl) {
  this.logger.warn('⚠️ Return control event received - not yet implemented');
}
```

**Log-uri**:
```
[Nest] WARN [BedrockAgentService] ⚠️ Return control event received - not yet implemented
```

**Ce se întâmpla**: Bedrock încerca să execute tools, dar NOI nu procesam event-ul!

## ✅ Soluția Implementată (Parțial)

### 1. Dependency Injection

Am injectat `ToolExecutorService` în `BedrockAgentService`:

```typescript
constructor(
  @Inject(forwardRef(() => ToolExecutorService))
  private readonly toolExecutorService: ToolExecutorService,
) {
  // ...
}
```

**De ce `forwardRef`?** Pentru a evita circular dependency warnings.

### 2. Procesare Return Control Event

```typescript
if (event.returnControl) {
  this.logger.log('🔄 Return control event received - processing tool invocations');
  
  const invocationInputs = event.returnControl.invocationInputs || [];
  
  for (const invocationInput of invocationInputs) {
    if (invocationInput.actionGroupInvocationInput) {
      const { actionGroupName, function: functionName, parameters } = 
        invocationInput.actionGroupInvocationInput;
      
      // Parse parameters
      const parsedParams = {};
      for (const param of parameters) {
        parsedParams[param.name] = param.value;
      }
      
      // Execute tool
      const toolResult = await this.toolExecutorService.executeTool({
        toolName: functionName,
        parameters: parsedParams,
        context,
      });
      
      this.logger.log(`✅ Tool executed: ${functionName}`);
    }
  }
}
```

### 3. Context Passing

Am adăugat `context` la metoda `processBedrockStream`:

```typescript
private async processBedrockStream(response: any, context: ToolContext)
```

Astfel tools-urile au acces la businessId, locationId, userId, etc.

## 📊 Flow Actual (Parțial Funcțional)

```
1. User: "Ce tratamente avem?"
   ↓
2. Bedrock Agent: "Trebuie să apelez query_app_server"
   ↓
3. Bedrock trimite: returnControl event
   ↓
4. Notre Server: Detectează event
   ↓
5. Notre Server: Execută query_app_server
   ↓
6. Notre Server: Primește rezultat
   ↓
7. 🚫 PROBLEMA: Nu trimitem rezultatul înapoi la Bedrock!
   ↓
8. Conversația se oprește aici
```

## ⚠️ Ce Lipsește: Conversation Continuation

### Problema

După ce executăm tool-ul, **NU trimitem rezultatul înapoi la Bedrock**!

Bedrock așteaptă să primească rezultatul pentru a continua conversația și a genera răspunsul final pentru utilizator.

### Soluția Completă (Nu implementată încă)

Trebuie să:

1. **Colectăm rezultatele tuturor tools**
2. **Creăm un nou InvokeAgentCommand** cu:
   - `sessionId` (același)
   - `sessionState` actualizat cu rezultatele
   - Posibil un mesaj gol sau de continuare

```typescript
// After executing all tools
const toolResults = [...]; // Rezultatele colectate

// Continue conversation with tool results
const continuationCommand = new InvokeAgentCommand({
  agentId: this.config.agentId,
  agentAliasId: this.config.agentAliasId,
  sessionId: sessionId,
  sessionState: {
    ...previousSessionState,
    invocationId: event.returnControl.invocationId,
    returnControlInvocationResults: toolResults.map(result => ({
      apiResult: {
        actionGroup: result.actionGroupName,
        httpMethod: 'POST',
        apiPath: `/${result.functionName}`,
        responseBody: {
          'application/json': {
            body: JSON.stringify(result.data)
          }
        },
        responseCode: result.success ? 200 : 500,
      }
    }))
  },
  enableTrace: true,
});

// Send back to Bedrock
const continuationResponse = await this.bedrockClient.send(continuationCommand);

// Process continuation response
const finalCompletion = await this.processBedrockStream(
  continuationResponse, 
  context
);
```

## 🔍 Log-uri Actuale

### Ce vezi acum:

```
🔄 Return control event received - processing tool invocations
🔧 Executing tool locally: query_tools::query_app_server
📝 Tool parameters: { "module": "resources", "action": "list", ... }
⚙️ Executing tool: query_app_server
📡 Querying resources: GET http://localhost:3000/resources/...
✅ Tool query_app_server executed successfully in 234ms
✅ Tool executed successfully: query_app_server
📊 Tool result: { "success": true, "data": [...] }
⚠️ Return control processed, but continuation not yet implemented
⚠️ Tool results need to be sent back to Bedrock for conversation continuation
```

### Ce ar trebui să vezi (după implementare completă):

```
🔄 Return control event received - processing tool invocations
🔧 Executing tool locally: query_tools::query_app_server
✅ Tool executed successfully: query_app_server
🔄 Sending tool results back to Bedrock
📡 Continuing conversation with tool results
✅ Final response received from Bedrock
💬 Final answer: "Clinica oferă următoarele tratamente: ..."
```

## 🎯 Beneficii Implementării Actuale (Parțiale)

### ✅ Ce funcționează:

1. **Detectăm returnControl events** ✓
2. **Extragem tool details** (name, parameters) ✓
3. **Executăm tools local** folosind ToolExecutorService ✓
4. **Logging detaliat** pentru debugging ✓
5. **Error handling** pentru tool execution ✓

### ❌ Ce NU funcționează încă:

1. **Trimiterea rezultatelor înapoi la Bedrock** ✗
2. **Continuarea conversației** după tool execution ✗
3. **Generarea răspunsului final** pentru user ✗

## 📝 Next Steps pentru Implementare Completă

### Pasul 1: Implementare Continuation Logic

```typescript
// În processBedrockStream
if (event.returnControl) {
  // ... execute tools ...
  
  // Colectăm toate rezultatele
  const toolResults = await this.executeAllTools(event.returnControl, context);
  
  // Continuăm conversația
  const finalResponse = await this.continueConversationWithResults(
    sessionId,
    event.returnControl.invocationId,
    toolResults,
    context
  );
  
  // Procesăm răspunsul final
  return finalResponse;
}
```

### Pasul 2: Metodă pentru Continuation

```typescript
private async continueConversationWithResults(
  sessionId: string,
  invocationId: string,
  toolResults: any[],
  context: ToolContext
): Promise<any> {
  const command = new InvokeAgentCommand({
    agentId: this.config.agentId,
    agentAliasId: this.config.agentAliasId,
    sessionId,
    sessionState: {
      invocationId,
      returnControlInvocationResults: this.formatToolResults(toolResults),
    },
    enableTrace: true,
  });
  
  const response = await this.bedrockClient.send(command);
  return this.processBedrockStream(response, context);
}
```

### Pasul 3: Format Tool Results

```typescript
private formatToolResults(toolResults: any[]): any[] {
  return toolResults.map(result => ({
    apiResult: {
      actionGroup: result.actionGroupName,
      apiPath: `/${result.functionName}`,
      httpMethod: 'POST',
      responseBody: {
        'application/json': {
          body: JSON.stringify(result.data || result.error)
        }
      },
      responseCode: result.success ? 200 : 500,
    }
  }));
}
```

## 🧪 Testing

### Test Manual

```bash
# Start server
cd ai-agent-server
npm run start:dev

# Send message that requires tool
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "user-123",
    "session_id": "test-return-control",
    "message_id": "msg_1",
    "payload": {
      "content": "Ce tratamente avem disponibile?"
    }
  }'
```

**Ce ar trebui să vezi**:
```
🔄 Return control event received - processing tool invocations
🔧 Executing tool locally: query_tools::query_app_server
✅ Tool executed successfully
⚠️ Return control processed, but continuation not yet implemented
```

## 💡 Alternative

### Opțiunea 1: Folosește Lambda pentru Tools

Configurează Action Groups să folosească Lambda în loc de Return Control:

**Avantaje**:
- Bedrock gestionează complet tool execution
- Mai simplu, fără continuation logic

**Dezavantaje**:
- Trebuie să configurezi Lambda functions
- Mai greu de debugat
- Overhead suplimentar (Lambda cold starts)

### Opțiunea 2: Implementare Completă Return Control

**Avantaje**:
- Control complet asupra tool execution
- Logging detaliat local
- Ușor de debugat
- Nu necesită Lambda

**Dezavantaje**:
- Implementare mai complexă
- Trebuie să gestionăm continuation logic

## 📚 Resurse

- **AWS Docs**: [Bedrock Agents Return Control](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-returncontrol.html)
- **Code**: 
  - `src/modules/tools/bedrock/bedrock-agent.service.ts` (liniile 216-264)
  - `src/modules/tools/bedrock/tool-executor.service.ts`
- **Related**:
  - `BEDROCK_ACTION_GROUPS_SETUP.md` - Setup Action Groups
  - `CONTEXT_INJECTION_FIX.md` - Context management

## ✅ Status Actual

- [x] Detectare returnControl events
- [x] Extragere tool details
- [x] Executare tools local
- [x] Logging și error handling
- [x] **Trimitere rezultate înapoi la Bedrock** ✅ IMPLEMENTAT!
- [x] **Continuare conversație** ✅ IMPLEMENTAT!
- [x] **Generare răspuns final** ✅ IMPLEMENTAT!

**Return Control este COMPLET FUNCȚIONAL!** 🎉

## 🎯 Implementare Completă (2024)

### Metode Implementate:

#### 1. `executeReturnControlTools()`
- Execută toate tools-urile cerute de Bedrock
- Colectează rezultatele într-un format structurat
- Gestionează erori per-tool

#### 2. `continueConversationWithResults()`
- Formatează rezultatele pentru Bedrock
- Creează nou InvokeAgentCommand cu rezultatele
- Trimite înapoi la Bedrock
- Procesează răspunsul final recursiv

### Flow Complet Actual:

```
User: "Ce tratamente avem?"
   ↓
Bedrock: "Trebuie să apelez query_app_server"
   ↓
Notre Server: ✅ Detectează returnControl event
   ↓
Notre Server: ✅ Execută query_app_server local
   ↓
Notre Server: ✅ Formatează rezultatul
   ↓
Notre Server: ✅ Trimite rezultatul înapoi la Bedrock
   ↓
Bedrock: ✅ Procesează rezultatul și generează răspuns
   ↓
User: "Clinica oferă următoarele tratamente: consultații, igienizări, tratamente..."
```

**Conversația se continuă automat!** ✅

