import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBClient, tableNames } from '@/config/dynamodb.config';
import { initialInstructions } from '../data/initial-instructions';

export async function populateRagInstructions() {
  const dynamoClient = DynamoDBDocumentClient.from(dynamoDBClient);
  
  console.log('Starting RAG instructions population...');
  
  for (const instruction of initialInstructions) {
    try {
      await dynamoClient.send(new PutCommand({
        TableName: tableNames.ragInstructions,
        Item: instruction
      }));
      
      console.log(`✅ Added instruction: ${instruction.instructionId}`);
    } catch (error) {
      console.error(`❌ Error adding instruction ${instruction.instructionId}:`, error);
    }
  }
  
  console.log('RAG instructions population completed!');
}

// Rulare script
if (require.main === module) {
  populateRagInstructions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
} 