# Enhanced Logging and LLM Processing

## 🎯 **Overview**
Acest sistem oferă logging detaliat și procesare LLM avansată pentru detectarea intențiilor și extragerea entităților din mesajele utilizatorilor.

## 🚀 **Features Implementate**

### **1. Enhanced Logging**
- **HTTP Request Logging**: Toate cererile HTTP sunt logate cu detalii complete
- **WebSocket Logging**: Conexiuni, canale, evenimente și disconectări
- **Message Processing Logging**: Procesarea mesajelor cu parametri și context
- **AI Agent Communication**: Comunicarea detaliată cu AI agent server
- **Error Logging**: Erori cu stacktrace și context complet

### **2. LLM Processing cu Intent Detection**
- **Intent Detection**: Detectează automat intenția mesajului
- **Entity Extraction**: Extrage entități relevante (servicii, prioritate, etc.)
- **Suggested Actions**: Generează acțiuni sugerate bazate pe intenție
- **Confidence Scoring**: Scor de încredere pentru detectarea intenției
- **Fallback Processing**: Procesare de rezervă în caz de eroare

### **3. Intent Types Detectate**
- `greeting` - Salutări și introduceri
- `help_request` - Cereri de ajutor
- `booking_request` - Cereri de rezervare
- `information_request` - Cereri de informații
- `gratitude` - Mesaje de mulțumire
- `problem_report` - Raportări de probleme
- `general_inquiry` - Întrebări generale

## 📊 **Log Structure**

### **Message Processing Logs**
```
=== Processing Message from Notification Hub ===
Message ID: 2f047d25-848d-474b-9386-cb64a6d60aaf
Tenant ID: B0100001
User ID: 33948842-b061-7036-f02f-79b9c0b4225b
Session ID: B0100001:33948842-b061-7036-f02f-79b9c0b4225b:1756846800000
Content: "salut! Cu ce ma poti ajuta?"
Context: {}
```

### **LLM Processing Logs**
```
=== LLM Processing Started ===
Input content: "salut! Cu ce ma poti ajuta?"
Context: {}
Calling AgentService for LLM processing...
=== LLM Response Received ===
Raw LLM response: {...}
=== Parsed LLM Response ===
Intent: greeting
Confidence: 0.8
Entities: []
```

### **AI Response Logs**
```
=== AI Processing Results ===
Detected Intent: greeting
Confidence: 0.8
Entities: []
Suggested Actions: ["View Services", "Make Appointment", "Get Information"]
Response Content: "Salut! Cu plăcere te ajut..."
```

### **HTTP Communication Logs**
```
=== Sending AI Response to Notification Hub ===
Tenant ID: B0100001
User ID: 33948842-b061-7036-f02f-79b9c0b4225b
Message ID: 2f047d25-848d-474b-9386-cb64a6d60aaf
Content: "Salut! Cu plăcere te ajut..."
Target URL: http://notification-hub:4000/api/ai-responses
```

## 🛠️ **Usage**

### **1. Testare Enhanced Logging**
```bash
# Rulare script de test complet
./test-enhanced-logging.sh

# Test individual
curl -X POST http://localhost:4000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "test-user-001",
    "session_id": "test-session-001",
    "content": "Salut! Ma poti ajuta?"
  }'
```

### **2. Monitorizare Logs**
```bash
# AI Agent Server logs
docker logs ai-agent-server-1 -f

# Notification Hub logs
docker logs notification-hub-1 -f
```

### **3. Health Check**
```bash
# Verificare starea Notification Hub
curl http://localhost:4000/health

# Testare conectivitate
curl http://localhost:3003/health
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# AI Agent Server
NOTIFICATION_HUB_HTTP_URL=http://notification-hub:4000
PORT=3003

# Notification Hub
AI_AGENT_HTTP_URL=http://ai-agent-server:3003
```

### **Logging Levels**
```typescript
// În config/dev.exs
config :logger,
  level: :info,  # :debug pentru mai multe detalii
  format: "[$time] [$level] $message\n",
  metadata: [:request_id, :remote_ip, :user_agent]
```

## 📈 **Performance Metrics**

### **Measured Parameters**
- **Processing Time**: Timpul total de procesare a mesajului
- **LLM Response Time**: Timpul de răspuns al LLM
- **HTTP Latency**: Latency-ul comunicării HTTP
- **Intent Confidence**: Scorul de încredere pentru detectarea intenției

### **Monitoring Points**
- Message reception → Intent detection
- LLM processing → Response generation
- HTTP communication → Notification Hub
- WebSocket broadcast → Client delivery

## 🚨 **Error Handling**

### **Fallback Mechanisms**
1. **LLM Processing Error**: Fallback la intent detection local
2. **HTTP Communication Error**: Logging detaliat fără întrerupere
3. **Parse Error**: Fallback parsing cu datele disponibile
4. **Connection Error**: Health check și retry logic

### **Error Logging**
```
=== Error Processing Message ===
Message ID: 2f047d25-848d-474b-9386-cb64a6d60aaf
Error: Connection timeout
Stack: Error: Connection timeout...
```

## 🔍 **Debugging**

### **Common Issues**
1. **Messages not reaching AI agent**: Verifică logurile `AiAgentClient.send_message/6`
2. **Intent detection failing**: Verifică logurile `detectIntentFromContent`
3. **HTTP communication errors**: Verifică logurile `ElixirHttpService`
4. **WebSocket broadcast issues**: Verifică logurile `broadcast_ai_response`

### **Debug Commands**
```bash
# Testare conectivitate
curl -v http://localhost:3003/health

# Verificare logs în timp real
docker logs ai-agent-server-1 -f | grep "==="

# Testare WebSocket
wscat -c ws://localhost:4000/socket/websocket
```

## 📚 **API Reference**

### **Message Processing Endpoint**
```
POST /api/messages
Content-Type: application/json

{
  "tenant_id": "string",
  "user_id": "string", 
  "session_id": "string",
  "content": "string",
  "context": {}
}
```

### **AI Response Endpoint**
```
POST /api/ai-responses
Content-Type: application/json

{
  "tenant_id": "string",
  "user_id": "string",
  "session_id": "string", 
  "message_id": "string",
  "content": "string",
  "context": {
    "intent": "string",
    "confidence": "number",
    "entities": [],
    "suggestedActions": []
  }
}
```

## 🎉 **Benefits**

1. **Complete Visibility**: Toate operațiunile sunt logate cu detalii
2. **Intent Understanding**: Detectarea automată a intenției utilizatorului
3. **Smart Responses**: Răspunsuri contextuale și acțiuni sugerate
4. **Error Tracking**: Urmărirea completă a erorilor și debugging
5. **Performance Monitoring**: Măsurarea timpilor de procesare
6. **Scalability**: Logging structurat pentru analiză și monitorizare

## 🔮 **Future Enhancements**

- **Machine Learning**: Îmbunătățirea detectării intențiilor cu ML
- **Analytics Dashboard**: Dashboard pentru analiza conversațiilor
- **A/B Testing**: Testarea diferitelor răspunsuri AI
- **Multi-language Support**: Suport pentru mai multe limbi
- **Sentiment Analysis**: Analiza sentimentului utilizatorului
