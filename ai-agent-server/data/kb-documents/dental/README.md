# Dental Knowledge Base - Documente pentru Vector Database

Acest director conține knowledge base-ul pentru clinici dentare, împărțit în documente individuale pentru indexare în bază de date vectorială.

## 📁 Structura Fișierelor

### 1. **index.json**
Catalog complet cu toate documentele disponibile:
- Lista tuturor documentelor generate
- Metadate pentru fiecare document
- Informații despre versiune și data generării

### 2. **consolidated-knowledge-base.json**
Toate documentele într-un singur fișier pentru import rapid în vector DB.

### 3. **Documente Individuale (34 fișiere)**
Fiecare document JSON conține:
```json
{
  "id": "identificator-unic",
  "title": "Titlul documentului",
  "content": "Conținutul (text sau JSON stringify)",
  "metadata": {
    "businessType": "dental",
    "version": "1.0.0",
    "lastUpdated": "2025-10-10",
    "type": "tipul-documentului",
    // ... alte metadate specifice
  }
}
```

## 📊 Tipuri de Documente

### System Instructions (2 documente)
- `dental-system-instructions-operator.json` - Instrucțiuni pentru operatori
- `dental-system-instructions-customer.json` - Instrucțiuni pentru clienți

### Resource Types (7 documente)
- `dental-resource-appointment.json` - Programări
- `dental-resource-medic.json` - Medici
- `dental-resource-patient.json` - Pacienți
- `dental-resource-treatment.json` - Tratamente
- `dental-resource-dental-chart.json` - **Fișe dentare** (NOU)
- `dental-resource-plan.json` - **Planuri de tratament** (NOU)
- `dental-resource-setting.json` - Setări

### Query Examples (9 documente)
Exemple de query-uri pentru:
- Listare programări
- Căutare pacienți
- Listare medici
- Obținere tratamente
- Obținere fișe dentare
- Obținere planuri de tratament
- Working hours
- etc.

### Conversation Patterns (3 documente)
- `dental-conversation-pattern-createAppointment.json` - Creare programări
- `dental-conversation-pattern-updateAppointment.json` - Actualizare programări
- `dental-conversation-pattern-searchAndDisplay.json` - Căutare și afișare

### Best Practices (8 documente)
- General
- Appointments
- Patients
- Medics
- Treatments
- Modules
- **Dental Charts** (NOU)
- **Treatment Plans** (NOU)

### Terminology (2 documente)
- `dental-terminology-medical.json` - Termeni medicali
- `dental-terminology-status.json` - Statusuri

### Alte Documente
- `dental-resource-structure.json` - Structura de bază a resurselor
- `dental-context-usage.json` - Utilizarea contextului
- `dental-data-field-structure.json` - Structura câmpurilor de date

## 🚀 Utilizare

### Opțiunea 1: Import Individual (Recomandat pentru RAG)
```javascript
const fs = require('fs');
const index = require('./index.json');

// Citește și indexează fiecare document separat
index.documents.forEach(doc => {
  const content = require(`./${doc.file}`);
  
  // Indexează în vector DB
  await vectorDB.index({
    id: content.id,
    content: content.content,
    metadata: content.metadata,
    embedding: await generateEmbedding(content.content)
  });
});
```

### Opțiunea 2: Import Consolidat (Rapid)
```javascript
const consolidated = require('./consolidated-knowledge-base.json');

// Indexează toate documentele dintr-o dată
for (const doc of consolidated.documents) {
  await vectorDB.index({
    id: doc.id,
    content: doc.content,
    metadata: doc.metadata,
    embedding: await generateEmbedding(doc.content)
  });
}
```

### Opțiunea 3: Import Selectiv (Pe Categorii)
```javascript
const index = require('./index.json');

// Indexează doar resource types
const resourceDocs = index.documents.filter(
  doc => doc.metadata.type === 'resource-type'
);

resourceDocs.forEach(async (docRef) => {
  const doc = require(`./${docRef.file}`);
  await vectorDB.index({
    id: doc.id,
    content: doc.content,
    metadata: doc.metadata
  });
});
```

## 🔍 Filtrare și Căutare

Metadatele permit filtrare avansată:

```javascript
// Caută doar în resource types
const results = await vectorDB.search(query, {
  filter: { 'metadata.type': 'resource-type' }
});

// Caută doar pentru operator role
const results = await vectorDB.search(query, {
  filter: { 'metadata.role': 'operator' }
});

// Caută specifice pentru dental charts
const results = await vectorDB.search(query, {
  filter: { 'metadata.resourceType': 'dental-chart' }
});
```

## 📈 Statistici

- **Total documente**: 34
- **Resource types**: 7 (inclusiv dental-chart și plan)
- **Query examples**: 9
- **Conversation patterns**: 3
- **Best practices**: 8 categorii

## 🔄 Regenerare

Pentru a regenera documentele după modificări în `dental-knowledge-base.json`:

```bash
cd /Users/adriantucicovenco/Proiecte/simplu-api/ai-agent-server
node scripts/split-knowledge-base.js
```

## 💡 Exemple de Integrare

### AWS Bedrock Knowledge Base
```javascript
// Pregătește documentele pentru Bedrock
const documents = consolidated.documents.map(doc => ({
  title: doc.title,
  content: doc.content,
  metadata: doc.metadata
}));

// Upload la S3 apoi sincronizează cu Knowledge Base
```

### Pinecone
```javascript
const vectors = await Promise.all(
  consolidated.documents.map(async (doc) => ({
    id: doc.id,
    values: await generateEmbedding(doc.content),
    metadata: {
      title: doc.title,
      ...doc.metadata,
      content: doc.content
    }
  }))
);

await pinecone.upsert(vectors);
```

### Weaviate
```javascript
const client = weaviate.client(config);

for (const doc of consolidated.documents) {
  await client.data.creator()
    .withClassName('DentalKnowledge')
    .withProperties({
      title: doc.title,
      content: doc.content,
      ...doc.metadata
    })
    .do();
}
```

## 🆕 Note despre Documentele Noi

### Dental Chart (Fișă Dentară)
- Conține structura completă pentru fișele dentare
- Include sistemul de numerotare FDI
- Detalii despre toate condițiile dentare disponibile
- Exemple de utilizare și best practices

### Treatment Plan (Plan de Tratament)
- Structură pentru planuri de tratament
- Include workflow-ul complet: draft → proposed → accepted → in_progress → completed
- Detalii despre tratamente din chart vs. tratamente generale
- Format pentru ID-uri de tratamente

## 📝 Versiune

- **Version**: 1.0.0
- **Last Updated**: 2025-10-10
- **Generated**: Check `index.json` pentru data exactă de generare

## 🔐 Securitate

Documentele conțin informații despre capabilities și permissions pentru diferite roluri (operator vs. customer). Asigură-te că implementezi aceste restricții în aplicația ta.

