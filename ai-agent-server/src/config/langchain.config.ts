export const langchainConfig = {
  modelName: process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash-exp',
  temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.1'),
  maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '8192'),
  topP: parseFloat(process.env.GEMINI_TOP_P || '0.8'),
  topK: parseInt(process.env.GEMINI_TOP_K || '40'),
  
  // RAG Configuration
  rag: {
    chunkSize: 1000,
    chunkOverlap: 200,
    similarityThreshold: 0.7,
  },
  
  // Memory Configuration
  memory: {
    maxTokens: 4000,
    returnMessages: true,
  },
}; 