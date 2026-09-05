import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy Gemini API Client Initialization
let genAIInstance: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[Gemini Server] Warning: GEMINI_API_KEY environment variable is not defined.');
    }
    genAIInstance = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return genAIInstance;
}

// Resilient Model Fallback Ladder
const FALLBACK_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

interface FallbackResult {
  text: string;
  modelUsed: string;
}

/**
 * Standard helper implementation for resilient Gemini content generation
 */
async function generateContentWithFallback(
  contents: any,
  systemInstruction?: string,
  responseSchema?: any
): Promise<FallbackResult> {
  const ai = getGenAI();
  let lastError: any = null;

  for (const model of FALLBACK_MODELS) {
    try {
      const config: any = {};
      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }
      if (responseSchema) {
        config.responseMimeType = 'application/json';
        config.responseSchema = responseSchema;
      }

      const response = await ai.models.generateContent({
        model,
        contents,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      const responseText = response.text || '';
      return { text: responseText, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || err);
      console.warn(`[Gemini Fallback Ladder] Model "${model}" failed: ${errMsg}`);

      const isRecoverable =
        errMsg.includes('503') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('404') ||
        errMsg.includes('NOT_FOUND') ||
        errMsg.includes('500') ||
        errMsg.includes('INTERNAL') ||
        errMsg.includes('overloaded');

      if (!isRecoverable) {
        // Attempt next model anyway to maintain highest availability
      }
    }
  }

  throw lastError || new Error('All fallback Gemini models failed.');
}

// ==========================================
// API ROUTES
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

/**
 * Audio Transcription Endpoint
 * Accepts base64 audio and transcribes verbatim using Gemini 3.6 Flash
 */
app.post('/api/transcribe', async (req, res) => {
  try {
    // Defensive Payload Ingestion (Null-Safe Destructuring)
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { audioData, mimeType = 'audio/webm' } = body;

    if (!audioData || typeof audioData !== 'string') {
      return res.status(400).json({ error: 'Valid audioData string is required' });
    }

    // Strip prefix if client sent data URL format
    const base64Clean = audioData.includes('base64,')
      ? audioData.split('base64,')[1]
      : audioData;

    const contents = [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: mimeType.split(';')[0] || 'audio/webm',
              data: base64Clean,
            },
          },
          {
            text: 'Transcribe this voice journal recording accurately and verbatim. Format into natural, easy-to-read paragraphs with proper punctuation and capitalization. Do not skip or alter spoken words.',
          },
        ],
      },
    ];

    const systemInstruction =
      'You are a dedicated voice journal transcription assistant. Your role is to accurately transcribe personal spoken reflections into clean, well-formatted English text while preserving the speaker’s exact voice and authentic cadence.';

    const result = await generateContentWithFallback(contents, systemInstruction);
    res.json({
      transcript: result.text.trim(),
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Transcription error:', error);
    res.status(500).json({
      error: error.message || 'Failed to transcribe audio log with Gemini API',
    });
  }
});

/**
 * Journal Summarization Endpoint
 * Generates Title, Key Points, Mood, Synthesis, and Action Items for review
 */
app.post('/api/summarize', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { transcript } = body;

    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: 'Valid transcript string is required' });
    }

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: `Analyze the following personal journal transcript and generate a structured summary that will be presented to the user prior to saving:\n\n"""\n${transcript}\n"""\n\nReturn a JSON object with:
- "title": A concise, meaningful 3-6 word title capturing the theme
- "mood": The emotional tone or state (e.g. "Reflective & Optimistic", "Determined", "Vulnerable & Thoughtful")
- "keyPoints": Array of 3 to 5 bullet points highlighting core thoughts
- "summary": A 2-3 sentence narrative synthesis of the entry
- "actionItems": Optional array of 1-3 gentle reflections or follow-up thoughts`,
          },
        ],
      },
    ];

    const systemInstruction =
      'You are an empathetic, insightful personal journaling companion. Extract themes, emotional tone, and actionable reflections warmly and accurately. Always output valid JSON.';

    const result = await generateContentWithFallback(contents, systemInstruction);

    // Parse JSON safely
    let parsedSummary;
    try {
      // Remove markdown backticks if any
      const cleaned = result.text.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedSummary = JSON.parse(cleaned);
    } catch {
      parsedSummary = {
        title: 'Personal Voice Reflection',
        mood: 'Thoughtful',
        keyPoints: [result.text.slice(0, 100)],
        summary: result.text.slice(0, 250),
        actionItems: ['Review journal thoughts'],
      };
    }

    res.json({
      summary: parsedSummary,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Summarization error:', error);
    res.status(500).json({
      error: error.message || 'Failed to summarize transcription with Gemini API',
    });
  }
});

/**
 * Multi-Turn Reflection Conversation Endpoint
 * Allows users to converse with Gemini for deeper journaling and perspective
 */
app.post('/api/chat', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { messages = [], currentTopic = '' } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Non-empty messages array is required' });
    }

    // Format messages for Gemini API
    const formattedContents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: String(m.content || '') }],
    }));

    const systemInstruction = `You are a warm, thoughtful, and psychologically attuned personal journaling guide and reflective sounding board.
Your purpose is to help the user unpack their thoughts, emotions, goals, and experiences in their private journal.
- Be supportive, non-judgmental, and validating.
- Ask perceptive follow-up questions that help them discover their own clarity and self-compassion.
- Keep responses focused (2-4 paragraphs maximum) so the user has space to reflect and write more.
- Never diagnose mental health conditions, and maintain an encouraging, grounding tone.
${currentTopic ? `Current Journal Focus: ${currentTopic}` : ''}`;

    const result = await generateContentWithFallback(formattedContents, systemInstruction);

    res.json({
      reply: result.text.trim(),
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Chat reflection error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate reflection response with Gemini API',
    });
  }
});

// ==========================================
// Vite Middleware / Static Serving
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Journal & Audio Reflections server running on port ${PORT}`);
  });
}

startServer();
