const { getSiteKnowledge } = require('./siteKnowledge');

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.1-8b-instant';
const MAX_HISTORY_MESSAGES = 10;
const MAX_MESSAGE_LENGTH = 1600;

function getGroqKeys() {
  return [
    process.env.GROQ_API_KEY,
    process.env.FALLBACK_GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
  ]
    .map((key) => key?.trim())
    .filter(Boolean)
    .filter((key, index, keys) => keys.indexOf(key) === index);
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((message) => (
      message
      && ['user', 'assistant'].includes(message.role)
      && typeof message.content === 'string'
      && message.content.trim()
    ))
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, MAX_MESSAGE_LENGTH),
    }));
}

function buildSystemPrompt() {
  return [
    'You are the website assistant for Dayaar Real Estate Consultant.',
    'Use only the website knowledge below and the conversation context to answer.',
    'Your job is to guide visitors around the website, explain zones/projects/services, help them choose useful next steps, and direct serious leads to the Get in Touch form or contact details.',
    'Keep answers concise and practical: usually 2 to 5 short sentences. Use bullets only when comparison helps.',
    'Do not invent live inventory, exact final prices, legal advice, loan approvals, or guaranteed returns. State that prices are indicative and users should contact Dayaar for final details.',
    'If a user asks something unrelated to the website or Mumbai real estate, politely bring them back to Dayaar website help.',
    'Useful website anchors: #about-section for Our Journey, #zones-section for zone exploration, #lead-section for Get in Touch, and #footer for contact details.',
    '',
    getSiteKnowledge(),
  ].join('\n');
}

async function callGroq(apiKey, messages, keySlot) {
  const controller = new AbortController();
  const timeoutMs = Number(process.env.GROQ_TIMEOUT_MS) || 18000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || DEFAULT_MODEL,
        messages,
        temperature: Number(process.env.GROQ_TEMPERATURE) || 0.35,
        max_completion_tokens: Number(process.env.GROQ_MAX_TOKENS) || 520,
      }),
      signal: controller.signal,
    });

    const rawBody = await response.text();
    let payload;

    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      payload = {};
    }

    if (!response.ok) {
      const detail = payload?.error?.message || rawBody.slice(0, 240) || response.statusText;
      throw new Error(`Groq key slot ${keySlot} failed with ${response.status}: ${detail}`);
    }

    const content = payload?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error(`Groq key slot ${keySlot} returned an empty response`);
    }

    return {
      content,
      model: payload.model || process.env.GROQ_MODEL || DEFAULT_MODEL,
      keySlot,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Groq key slot ${keySlot} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function askWebsiteAssistant(rawMessages) {
  const groqKeys = getGroqKeys();
  const messages = normalizeMessages(rawMessages);

  if (!messages.some((message) => message.role === 'user')) {
    const error = new Error('A user message is required.');
    error.status = 400;
    throw error;
  }

  if (!groqKeys.length) {
    const error = new Error('No Groq API key configured.');
    error.status = 503;
    throw error;
  }

  const requestMessages = [
    { role: 'system', content: buildSystemPrompt() },
    ...messages,
  ];
  const failures = [];

  for (let index = 0; index < groqKeys.length; index += 1) {
    try {
      return await callGroq(groqKeys[index], requestMessages, index + 1);
    } catch (error) {
      failures.push(error.message);
    }
  }

  const error = new Error('All Groq API keys failed.');
  error.status = 502;
  error.failures = failures;
  throw error;
}

module.exports = {
  askWebsiteAssistant,
  normalizeMessages,
};
