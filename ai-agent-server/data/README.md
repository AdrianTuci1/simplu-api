# Knowledge Base Data

## 📦 Fișiere Importante

### `knowledge-base-data.json` ⭐
**Fișierul principal cu toate datele pentru Knowledge Base.**

Conține:
- ✅ **6 System Instructions** - Comportament pentru dental/gym/hotel × operator/customer
- ✅ **5 Tool Guidance** - Cum să folosească fiecare tool (query_app_server, manage_draft, etc.)
- ✅ **3 Conversation Patterns** - Fluxuri conversaționale (booking, search, error handling)
- ✅ **3 Domain Knowledge** - Cunoștințe despre dental (tratamente), gym (clase), hotel (camere)

**Total: ~17 documente comprehensive pentru AI agent**

### `KNOWLEDGE_BASE_SETUP.md` 📚
Ghid complet pas-cu-pas pentru setup în AWS.

## 🚀 Quick Start (3 Comenzi)

```bash
# 1. Pregătește documentele
npm run prepare-kb

# 2. Upload în S3 (înlocuiește cu bucket-ul tău)
aws s3 sync data/kb-documents/ s3://simplu-ai-rag-embeddings/documents/

# 3. Creează Knowledge Base în AWS Console
# Apoi adaugă KB ID în .env
```

## 📋 Ce Conțin Datele?

### System Instructions (Role + Business Type)

| Role | Business | Stil | Lungime Răspuns |
|------|----------|------|----------------|
| Operator | Dental | Profesional, concis | Max 50 cuvinte |
| Customer | Dental | Prietenos, ghidare | Max 150 cuvinte |
| Operator | Gym | Energic, motivant | Max 50 cuvinte |
| Customer | Gym | Entuziast, încurajator | Mediu |
| Operator | Hotel | Profesional, elegant | Max 50 cuvinte |
| Customer | Hotel | Ospitalier, atent | Mediu |

### Tool Guidance (Cum Să Folosească Tools)

1. **query_app_server** - Căutare și listare date
2. **manage_draft** - Creare programări/rezervări
3. **send_elixir_notification** - Notificări frontend
4. **broadcast_websocket_message** - Mesaje real-time
5. **interact_with_frontend** - Interacțiune cu UI

### Conversation Patterns (Fluxuri)

1. **Booking Flow** - Creare programare pas-cu-pas
2. **Search & Info** - Căutare informații și persoane
3. **Error Handling** - Gestionarea erorilor și conflictelor

### Domain Knowledge (Cunoștințe Specifice)

1. **Dental** - Tratamente, prețuri, durată, recomandări
2. **Gym** - Clase fitness, abonamente, beneficii
3. **Hotel** - Tipuri camere, servicii, prețuri

## 🎯 Exemple de Instrucțiuni

### Operator Dental
```
Tu ești un asistent AI pentru operatori clinică dentară.
Ai acces complet la toate datele.

Răspunsuri: CONCISE (max 50 cuvinte)
Stil: Profesional și direct
Tools: query_app_server, manage_draft, send_elixir_notification

Exemplu:
Q: "Câte programări avem astăzi?"
A: "Astăzi: 12 programări (8 consultații, 3 tratamente, 1 implant). 
   Primul pacient: 9:00 cu Dr. Popescu."
```

### Customer Gym
```
Tu ești un asistent AI pentru membrii sălii de sport.
Motivezi și ghidezi către obiective.

Răspunsuri: MOTIVANT și ÎNCURAJATOR
Stil: Entuziast și prietenos

Exemplu:
Q: "Ce clase recomandați pentru începători?"
A: "Awesome că vrei să începi! 🌟 
   Recomand: Yoga (luni/miercuri 18:00) pentru flexibilitate,
   sau Pilates (marți/joi 19:00) pentru core strength.
   Ambele sunt beginner-friendly. Care te atrage?"
```

## ✅ Verificare Rapidă

După setup, testează:

```bash
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "dental_clinic_1",
    "user_id": "operator_1",
    "session_id": "test_1",
    "message_id": "msg_1",
    "payload": {
      "content": "Vreau să văd programările de azi"
    }
  }'
```

**Expected:**
- Răspuns în stil operator (concis, profesional)
- Folosește query_app_server tool
- Răspuns sub 50 cuvinte

## 📝 Modificarea Datelor

Dacă vrei să modifici instrucțiunile:

1. **Editează** `knowledge-base-data.json`
2. **Rulează** `npm run prepare-kb`
3. **Upload** în S3
4. **Sync** în AWS Console

## 💡 Tips

### Pentru Răspunsuri Mai Bune:
- ✅ Fii FOARTE specific în instrucțiuni
- ✅ Include exemple concrete de interacțiuni
- ✅ Definește clar limitările (ce poate/nu poate face)
- ✅ Specifică stilul de răspuns (lungime, ton)

### Pentru Debugging:
- Enable `BEDROCK_ENABLE_TRACE=true` în `.env`
- Verifică logs: `grep "Bedrock" logs/*.log`
- Testează în AWS Console → Knowledge Base → Test

## 📚 Documentație Completă

Pentru detalii complete, vezi:
- **KNOWLEDGE_BASE_SETUP.md** - Setup pas-cu-pas în AWS
- **../BEDROCK_SETUP.md** - Overview complet Bedrock
- **../QUICKSTART.md** - Quick start guide

## 🆘 Need Help?

Common issues:
- **No results from KB**: Scade `BEDROCK_KB_MIN_SCORE` în .env
- **Slow responses**: Reduce `BEDROCK_KB_RESULTS`
- **Wrong instructions**: Verifică metadata (role, businessType)

---

**Good luck! 🚀**

