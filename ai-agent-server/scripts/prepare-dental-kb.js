/**
 * Script pentru pregătirea Dental Knowledge Base
 * Transformă dental-knowledge-base.json în documente pentru AWS Bedrock
 */

const fs = require('fs').promises;
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../data/dental-knowledge-base.json');
const OUTPUT_DIR = path.join(__dirname, '../data/kb-documents/dental');

/**
 * Main function
 */
async function prepareDentalKnowledgeBase() {
  console.log('🦷 Starting Dental Knowledge Base preparation...\n');

  try {
    // Create output directory
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created output directory: ${OUTPUT_DIR}\n`);

    // Read input data
    const rawData = await fs.readFile(INPUT_FILE, 'utf-8');
    const data = JSON.parse(rawData);

    let totalDocs = 0;

    // 1. System Instructions (operator & customer)
    console.log('📝 Processing System Instructions...');
    if (data.systemInstructions) {
      const operatorContent = formatSystemInstructions('operator', data.systemInstructions.operator);
      await createDocument(
        'dental-operator-instructions',
        operatorContent,
        {
          category: 'systemInstructions',
          businessType: 'dental',
          role: 'operator',
          priority: 'high'
        }
      );
      totalDocs++;

      const customerContent = formatSystemInstructions('customer', data.systemInstructions.customer);
      await createDocument(
        'dental-customer-instructions',
        customerContent,
        {
          category: 'systemInstructions',
          businessType: 'dental',
          role: 'customer',
          priority: 'high'
        }
      );
      totalDocs++;
      
      console.log(`✅ Created 2 System Instruction documents`);
    }

    // 2. Resource Structure (Base Resource)
    console.log('\n📝 Processing Resource Structure...');
    if (data.resourceStructure) {
      const structureContent = formatResourceStructure(data.resourceStructure);
      await createDocument(
        'dental-resource-structure',
        structureContent,
        {
          category: 'resourceStructure',
          businessType: 'dental',
          priority: 'critical'
        }
      );
      totalDocs++;
      console.log(`✅ Created Resource Structure document`);
    }

    // 3. Resource Schemas
    console.log('\n📝 Processing Resource Schemas...');
    if (data.resourceTypes) {
      for (const [resourceType, schema] of Object.entries(data.resourceTypes)) {
        const content = formatResourceSchema(resourceType, schema);
        await createDocument(
          `dental-resource-${resourceType}`,
          content,
          {
            category: 'resourceSchema',
            businessType: 'dental',
            resourceType: resourceType,
            priority: 'high'
          }
        );
        totalDocs++;
      }
      console.log(`✅ Created ${Object.keys(data.resourceTypes).length} Resource Schema documents`);
    }

    // 4. Data Field Structure
    console.log('\n📝 Processing Data Field Structure...');
    if (data.dataFieldStructure) {
      const dataFieldContent = formatDataFieldStructure(data.dataFieldStructure);
      await createDocument(
        'dental-data-field-structure',
        dataFieldContent,
        {
          category: 'dataFieldStructure',
          businessType: 'dental',
          priority: 'critical'
        }
      );
      totalDocs++;
      console.log(`✅ Created Data Field Structure document`);
    }

    // 5. Context Usage
    console.log('\n📝 Processing Context Usage...');
    if (data.contextUsage) {
      const contextContent = formatContextUsage(data.contextUsage);
      await createDocument(
        'dental-context-usage',
        contextContent,
        {
          category: 'contextUsage',
          businessType: 'dental',
          priority: 'high'
        }
      );
      totalDocs++;
      console.log(`✅ Created Context Usage document`);
    }

    // 6. Query Examples
    console.log('\n📝 Processing Query Examples...');
    if (data.queryExamples) {
      const queryContent = formatQueryExamples(data.queryExamples);
      await createDocument(
        'dental-query-examples',
        queryContent,
        {
          category: 'queryExamples',
          businessType: 'dental',
          priority: 'medium'
        }
      );
      totalDocs++;
      console.log(`✅ Created Query Examples document`);
    }

    // 7. Conversation Patterns
    console.log('\n📝 Processing Conversation Patterns...');
    if (data.conversationPatterns) {
      const patternContent = formatConversationPatterns(data.conversationPatterns);
      await createDocument(
        'dental-conversation-patterns',
        patternContent,
        {
          category: 'conversationPatterns',
          businessType: 'dental',
          priority: 'critical'
        }
      );
      totalDocs++;
      console.log(`✅ Created Conversation Patterns document`);
    }

    // 8. Terminology
    console.log('\n📝 Processing Terminology...');
    if (data.terminology) {
      const termContent = formatTerminology(data.terminology);
      await createDocument(
        'dental-terminology',
        termContent,
        {
          category: 'terminology',
          businessType: 'dental',
          priority: 'medium'
        }
      );
      totalDocs++;
      console.log(`✅ Created Terminology document`);
    }

    // 9. Best Practices
    console.log('\n📝 Processing Best Practices...');
    if (data.bestPractices) {
      const practicesContent = formatBestPractices(data.bestPractices);
      await createDocument(
        'dental-best-practices',
        practicesContent,
        {
          category: 'bestPractices',
          businessType: 'dental',
          priority: 'critical'
        }
      );
      totalDocs++;
      console.log(`✅ Created Best Practices document`);
    }

    // Create metadata file
    await createMetadataFile(totalDocs);

    console.log(`\n\n🎉 SUCCESS! Created ${totalDocs} documents for Dental KB`);
    console.log(`📦 Documents are ready in: ${OUTPUT_DIR}`);
    console.log(`\n📋 Next steps:`);
    console.log(`\n1. Upload documents to S3:`);
    console.log(`   aws s3 sync ${OUTPUT_DIR} s3://simplu-ai-rag-embeddings/dental/`);
    console.log(`\n2. Create Knowledge Base in AWS Console:`);
    console.log(`   - Name: simplu-dental-kb`);
    console.log(`   - Data source: s3://simplu-ai-rag-embeddings/dental/`);
    console.log(`   - Embeddings: amazon.titan-embed-text-v2:0`);
    console.log(`\n3. Sync the data source in AWS Console`);
    console.log(`\n4. Copy Knowledge Base ID to .env:`);
    console.log(`   BEDROCK_KNOWLEDGE_BASE_ID=your_kb_id_here`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

/**
 * Create a document file
 */
async function createDocument(id, content, metadata) {
  const document = {
    id,
    content,
    metadata
  };

  const filename = `${id}.json`;
  const filepath = path.join(OUTPUT_DIR, filename);

  await fs.writeFile(
    filepath,
    JSON.stringify(document, null, 2),
    'utf-8'
  );
}

/**
 * Format system instructions to text
 */
function formatSystemInstructions(role, data) {
  let content = `SYSTEM INSTRUCTIONS FOR: ${role.toUpperCase()}\n\n`;
  
  if (data.role) {
    content += `Role: ${data.role}\n\n`;
  }

  if (data.capabilities) {
    content += `CAPABILITIES:\n`;
    content += JSON.stringify(data.capabilities, null, 2);
    content += `\n\n`;
  }

  if (data.communicationStyle) {
    content += `COMMUNICATION STYLE:\n`;
    content += JSON.stringify(data.communicationStyle, null, 2);
    content += `\n\n`;
  }

  if (data.instructions) {
    content += `INSTRUCTIONS:\n${data.instructions}\n`;
  }

  return content;
}

/**
 * Format resource structure to text
 */
function formatResourceStructure(resourceStructure) {
  let content = `BASE RESOURCE STRUCTURE\n\n`;
  
  if (resourceStructure.baseResource) {
    content += `Description: ${resourceStructure.baseResource.description}\n\n`;
    content += `SCHEMA:\n`;
    content += JSON.stringify(resourceStructure.baseResource.schema, null, 2);
    
    if (resourceStructure.baseResource.note) {
      content += `\n\nIMPORTANT NOTE:\n${resourceStructure.baseResource.note}\n`;
    }
  }

  return content;
}

/**
 * Format data field structure to text
 */
function formatDataFieldStructure(dataFieldStructure) {
  let content = `DATA FIELD STRUCTURE GUIDE\n\n`;
  
  if (dataFieldStructure.important) {
    content += `IMPORTANT: ${dataFieldStructure.important}\n\n`;
  }

  if (dataFieldStructure.whenCreating) {
    content += `WHEN CREATING:\n${dataFieldStructure.whenCreating}\n\n`;
  }

  if (dataFieldStructure.whenUpdating) {
    content += `WHEN UPDATING:\n${dataFieldStructure.whenUpdating}\n\n`;
  }

  if (dataFieldStructure.whenQuerying) {
    content += `WHEN QUERYING:\n${dataFieldStructure.whenQuerying}\n\n`;
  }

  if (dataFieldStructure.note) {
    content += `NOTE:\n${dataFieldStructure.note}\n`;
  }

  return content;
}

/**
 * Format resource schema to text
 */
function formatResourceSchema(resourceType, schema) {
  let content = `RESOURCE TYPE: ${resourceType}\n`;
  content += `Display Name: ${schema.displayName}\n`;
  content += `Description: ${schema.description}\n`;
  content += `Resource ID Format: ${schema.resourceIdFormat}\n\n`;

  if (schema.note) {
    content += `IMPORTANT: ${schema.note}\n\n`;
  }

  content += `DATA SCHEMA:\n`;
  content += JSON.stringify(schema.dataSchema, null, 2);
  content += `\n\nFULL RESOURCE EXAMPLE:\n`;
  content += JSON.stringify(schema.fullResourceExample, null, 2);
  content += `\n\nDATA FIELD EXAMPLE (for creating):\n`;
  content += JSON.stringify(schema.dataFieldExample, null, 2);
  content += `\n\nFRONTEND FUNCTION EXAMPLE:\n`;
  content += JSON.stringify(schema.frontendFunctionExample, null, 2);

  if (schema.commonTreatments) {
    content += `\n\nCOMMON TREATMENTS:\n`;
    content += JSON.stringify(schema.commonTreatments, null, 2);
  }
  
  if (schema.usageInstructions) {
    content += `\n\nUSAGE INSTRUCTIONS:\n`;
    content += JSON.stringify(schema.usageInstructions, null, 2);
  }

  return content;
}

/**
 * Format context usage to text
 */
function formatContextUsage(contextUsage) {
  let content = `CONTEXT USAGE GUIDE\n\n`;
  
  if (contextUsage.userId) {
    content += `USER ID USAGE:\n`;
    content += `Description: ${contextUsage.userId.description}\n\n`;
    content += `Usage:\n`;
    contextUsage.userId.usage.forEach(u => content += `- ${u}\n`);
    content += `\nEXAMPLES:\n`;
    contextUsage.userId.examples.forEach(ex => {
      content += `\nScenario: ${ex.scenario}\n`;
      content += `Steps:\n`;
      ex.steps.forEach(step => content += `  ${step}\n`);
      content += `Response: "${ex.response}"\n`;
    });
  }

  if (contextUsage.frontendContext) {
    content += `\n\nFRONTEND CONTEXT:\n`;
    content += `Description: ${contextUsage.frontendContext.description}\n`;
    content += `Possible Fields:\n`;
    contextUsage.frontendContext.possibleFields.forEach(f => content += `- ${f}\n`);
    content += `Usage: ${contextUsage.frontendContext.usage}\n`;
  }

  return content;
}

/**
 * Format query examples to text
 */
function formatQueryExamples(queryExamples) {
  let content = `QUERY EXAMPLES\n\n`;
  
  for (const [name, example] of Object.entries(queryExamples)) {
    content += `${name.toUpperCase()}:\n`;
    content += `Description: ${example.description}\n`;
    content += `Tool: ${example.tool}\n`;
    content += `Parameters:\n${JSON.stringify(example.parameters, null, 2)}\n`;
    if (example.note) {
      content += `Note: ${example.note}\n`;
    }
    content += `\n`;
  }

  return content;
}

/**
 * Format conversation patterns to text
 */
function formatConversationPatterns(patterns) {
  let content = `CONVERSATION PATTERNS\n\n`;
  
  for (const [name, pattern] of Object.entries(patterns)) {
    content += `${name.toUpperCase()}:\n`;
    content += `Scenario: ${pattern.scenario}\n`;
    if (pattern.context) {
      content += `Context: ${pattern.context}\n`;
    }
    if (pattern.steps) {
      content += `\nSteps:\n`;
      pattern.steps.forEach(step => {
        content += `Step ${step.step}: ${step.action}\n`;
        if (step.question) content += `  Question: "${step.question}"\n`;
        if (step.tool) content += `  Tool: ${step.tool}\n`;
        if (step.function) content += `  Function: ${step.function}\n`;
        if (step.note) content += `  Note: ${step.note}\n`;
        if (step.examples) content += `  Examples: ${step.examples.join(', ')}\n`;
      });
    }
    if (pattern.example) {
      content += `\nExample:\n${pattern.example}\n`;
    }
    if (pattern.examples) {
      content += `\nExamples:\n`;
      pattern.examples.forEach(ex => {
        content += `- Query: "${ex.query}"\n`;
        content += `  Action: ${ex.action}\n`;
        content += `  Response: "${ex.response}"\n\n`;
      });
    }
    content += `\n`;
  }

  return content;
}

/**
 * Format terminology to text
 */
function formatTerminology(terminology) {
  let content = `DENTAL TERMINOLOGY\n\n`;
  
  if (terminology.medical) {
    content += `MEDICAL TERMS:\n`;
    for (const [term, definition] of Object.entries(terminology.medical)) {
      content += `- ${term}: ${definition}\n`;
    }
  }

  if (terminology.status) {
    content += `\nSTATUS VALUES:\n`;
    for (const [status, description] of Object.entries(terminology.status)) {
      content += `- ${status}: ${description}\n`;
    }
  }

  return content;
}

/**
 * Format best practices to text
 */
function formatBestPractices(practices) {
  let content = `BEST PRACTICES FOR DENTAL CLINIC AI\n\n`;
  
  for (const [category, items] of Object.entries(practices)) {
    content += `${category.toUpperCase()}:\n`;
    items.forEach(item => content += `- ${item}\n`);
    content += `\n`;
  }

  return content;
}

/**
 * Create metadata file
 */
async function createMetadataFile(totalDocs) {
  const metadata = {
    businessType: 'dental',
    version: '1.0.0',
    created: new Date().toISOString(),
    totalDocuments: totalDocs,
    categories: [
      'systemInstructions',
      'resourceStructure',
      'dataFieldStructure',
      'resourceSchemas', 
      'contextUsage',
      'queryExamples',
      'conversationPatterns',
      'terminology',
      'bestPractices'
    ],
    resourceTypes: ['appointment', 'medic', 'patient', 'treatment', 'setting'],
    roles: ['operator', 'customer']
  };

  const filepath = path.join(OUTPUT_DIR, '_metadata.json');
  await fs.writeFile(filepath, JSON.stringify(metadata, null, 2), 'utf-8');
  
  console.log(`\n📊 Metadata created: ${filepath}`);
}

// Run script
prepareDentalKnowledgeBase()
  .then(() => {
    console.log('\n✅ Done! Ready to upload to S3.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

