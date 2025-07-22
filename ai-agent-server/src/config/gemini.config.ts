export const geminiConfig = {
  modelName: process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash-exp',
  maxOutputTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '8192'),
  temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.1'),
  topP: parseFloat(process.env.GEMINI_TOP_P || '0.8'),
  topK: parseInt(process.env.GEMINI_TOP_K || '40'),
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    }
  ],
  systemPrompt: `
    Ești un asistent AI specializat pentru business-uri din România.
    Te ocupi de:
    - Programări și rezervări
    - Gestionarea clienților
    - Operații pe resurse business
    - Comunicare prin SMS, email, WhatsApp
    - Răspunsuri în limba română
    
    Răspunsurile tale trebuie să fie:
    - Prietenoase și profesionale
    - Specific pentru tipul de business
    - În limba română
    - Concise și utile
  `
}; 