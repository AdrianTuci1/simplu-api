d# 🎙️ Eleven Labs - Models & Voices Guide

## 🤖 LLM Models

### **Important: Language-Specific Models**

Eleven Labs are restricții pe modele în funcție de limbă:

#### **English (en)**
- ✅ `gpt-4o` - OpenAI GPT-4 Optimized
- ✅ `gpt-4o-mini` - OpenAI GPT-4 Mini (faster, cheaper)
- ✅ `claude-3-5-sonnet` - Anthropic Claude 3.5
- ✅ `eleven_turbo_v2_5` - Eleven Labs Turbo
- ✅ `eleven_flash_v2_5` - Eleven Labs Flash (fastest)

#### **Non-English (ro, es, de, etc.)**
- ✅ `eleven_turbo_v2_5` - **REQUIRED pentru română**
- ✅ `eleven_flash_v2_5` - **REQUIRED pentru română**
- ❌ `gpt-4o` - NU funcționează
- ❌ `gpt-4o-mini` - NU funcționează
- ❌ `claude-3-5-sonnet` - NU funcționează

### **În Codul Nostru:**

```typescript
// Pentru limba română (language: 'ro')
conversation_config: {
  agent: {
    prompt: {
      llm: 'eleven_turbo_v2_5',  // OBLIGATORIU pentru non-English
      temperature: 0.7,
      max_tokens: 1000,
    },
    language: 'ro',
  }
}
```

### **Model Comparison:**

| Model | Speed | Cost | Quality | Languages |
|-------|-------|------|---------|-----------|
| `eleven_flash_v2_5` | ⚡⚡⚡ Fastest | 💰 Cheapest | ⭐⭐⭐ Good | All |
| `eleven_turbo_v2_5` | ⚡⚡ Fast | 💰💰 Medium | ⭐⭐⭐⭐ Great | All |
| `gpt-4o-mini` | ⚡⚡ Fast | 💰💰 Medium | ⭐⭐⭐⭐ Great | English only |
| `gpt-4o` | ⚡ Slower | 💰💰💰 Expensive | ⭐⭐⭐⭐⭐ Best | English only |
| `claude-3-5-sonnet` | ⚡ Slower | 💰💰💰 Expensive | ⭐⭐⭐⭐⭐ Best | English only |

**Recomandare**: `eleven_turbo_v2_5` pentru română (best balance speed/quality/cost)

---

## 🎤 Voice IDs

### **Romanian-Friendly Voices**

Eleven Labs nu are voices native în română, dar acestea funcționează bine:

#### **Neutral/Professional:**
```typescript
{
  id: '21m00Tcm4TlvDq8ikWAM',
  name: 'Rachel',
  gender: 'Female',
  accent: 'American',
  description: 'Calm, clear, neutral - BEST pentru română',
  use_cases: ['Professional', 'Customer service', 'Medical']
}
```

#### **Feminine Voices:**
```typescript
{
  id: 'EXAVITQu4vr4xnSDxMaL',
  name: 'Bella',
  gender: 'Female',
  accent: 'American',
  description: 'Warm, friendly, engaging',
  use_cases: ['Hospitality', 'Sales', 'Support']
}

{
  id: 'MF3mGyEYCl7XYWbV9V6O',
  name: 'Elli',
  gender: 'Female',
  accent: 'American',
  description: 'Soft, professional, trustworthy',
  use_cases: ['Healthcare', 'Finance', 'Education']
}

{
  id: 'ThT5KcBeYPX3keUQqHPh',
  name: 'Dorothy',
  gender: 'Female',
  accent: 'British',
  description: 'Pleasant, clear, authoritative',
  use_cases: ['Business', 'Training', 'Announcements']
}
```

#### **Masculine Voices:**
```typescript
{
  id: 'pNInz6obpgDQGcFmaJgB',
  name: 'Adam',
  gender: 'Male',
  accent: 'American',
  description: 'Deep, authoritative, confident',
  use_cases: ['Business', 'News', 'Professional']
}

{
  id: 'N2lVS1w4EtoT3dr4eOWO',
  name: 'Callum',
  gender: 'Male',
  accent: 'American',
  description: 'Strong, reassuring, mature',
  use_cases: ['Corporate', 'Finance', 'Legal']
}

{
  id: 'ErXwobaYiN019PkySvjV',
  name: 'Antoni',
  gender: 'Male',
  accent: 'American',
  description: 'Well-rounded, friendly, versatile',
  use_cases: ['Customer service', 'Support', 'General']
}
```

---

## 🎨 Voice Selection Logic

```typescript
// În elevenlabs.service.ts
private getDefaultVoiceId(language: string): string {
  // Romanian - use Rachel (neutral, professional)
  if (language === 'ro' || language === 'romanian') {
    return '21m00Tcm4TlvDq8ikWAM'; // Rachel
  }
  
  // English - can use any voice
  return '21m00Tcm4TlvDq8ikWAM'; // Rachel (default)
}
```

### **Per Business Type:**

```typescript
const recommendedVoices = {
  dental: {
    default: '21m00Tcm4TlvDq8ikWAM', // Rachel - calm, professional
    alternative: 'MF3mGyEYCl7XYWbV9V6O', // Elli - trustworthy
  },
  gym: {
    default: 'EXAVITQu4vr4xnSDxMaL', // Bella - energetic
    alternative: 'ErXwobaYiN019PkySvjV', // Antoni - motivational
  },
  hotel: {
    default: 'ThT5KcBeYPX3keUQqHPh', // Dorothy - pleasant
    alternative: '21m00Tcm4TlvDq8ikWAM', // Rachel - professional
  },
};
```

---

## ⚙️ TTS Configuration

```typescript
tts: {
  voice_id: params.voiceId,
  model_id: 'eleven_turbo_v2',  // Auto-set by Eleven Labs
  optimize_streaming_latency: 3,  // 0-4 (4 = fastest, 0 = best quality)
  stability: 0.5,                 // 0-1 (0 = variable, 1 = stable)
  similarity_boost: 0.75,         // 0-1 (how close to original voice)
  speed: 1.0,                     // 0.5-2.0 (speaking speed)
}
```

### **Optimizare pentru Voice Calls:**

**Low Latency (Recommended):**
```typescript
tts: {
  optimize_streaming_latency: 3,  // High optimization
  stability: 0.5,                 // Balanced
  similarity_boost: 0.75,         // Good quality
  speed: 1.0,                     // Normal speed
}
```

**High Quality:**
```typescript
tts: {
  optimize_streaming_latency: 0,  // No optimization
  stability: 0.7,                 // More stable
  similarity_boost: 0.85,         // Higher quality
  speed: 0.9,                     // Slightly slower
}
```

**Fast Response:**
```typescript
tts: {
  optimize_streaming_latency: 4,  // Maximum optimization
  stability: 0.4,                 // More variable
  similarity_boost: 0.6,          // Lower quality
  speed: 1.1,                     // Slightly faster
}
```

---

## 📝 Override în Activation

```bash
POST /api/elevenlabs/activate/B0100001-L0100001
{
  "voiceId": "pNInz6obpgDQGcFmaJgB",  # Adam (masculine, deep)
  "greeting": "Custom greeting..."
}

# Voice selection override-uiește default-ul automat
```

---

## 🧪 Testing Voices

Pentru a testa cum sună vocea în română:

1. **Eleven Labs Voice Lab**: https://elevenlabs.io/voice-lab
2. Test text: 
```
Bună ziua! Sunt asistentul virtual al clinicii dentare. 
Cu ce vă pot ajuta astăzi? Puteți programa o consultație 
sau puteți întreba despre serviciile noastre.
```
3. Ascultă cum sună fiecare voice
4. Alege cel mai potrivit pentru business type

---

## ⚠️ Important Notes

1. **Non-English = Eleven Labs Models ONLY**
   - Pentru `language: 'ro'` → TREBUIE `eleven_turbo_v2_5` sau `eleven_flash_v2_5`
   - GPT/Claude funcționează DOAR pentru English

2. **Voice Quality**
   - Toate voices sunt antrenate pe English
   - Funcționează OK pe română, dar cu accent
   - Rachel și Bella sunt cele mai neutre

3. **Latency vs Quality**
   - `optimize_streaming_latency: 3` = good balance
   - Pentru calls în timp real, optimizează latency
   - Pentru pre-recorded messages, optimizează quality

---

**Voice și model configuration complete! 🎤**

