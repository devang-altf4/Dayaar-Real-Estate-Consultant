const express = require('express');
const { askWebsiteAssistant, normalizeMessages } = require('../services/groqChatService');

const router = express.Router();

// POST /api/chatbot - answer website questions through Groq with key failover.
router.post('/', async (req, res) => {
  const rawMessages = Array.isArray(req.body?.messages)
    ? req.body.messages
    : [{ role: 'user', content: req.body?.message || '' }];

  try {
    const messages = normalizeMessages(rawMessages);
    const answer = await askWebsiteAssistant(messages);

    res.json({
      success: true,
      message: answer.content,
      model: answer.model,
    });
  } catch (error) {
    const status = error.status || 500;

    if (error.failures?.length) {
      console.error('[chatbot] Groq failover exhausted:', error.failures.join(' | '));
    } else {
      console.error('[chatbot]', error.message);
    }

    res.status(status).json({
      success: false,
      message: status === 400
        ? 'Please enter a question for the assistant.'
        : 'The assistant is temporarily unavailable. Please use the contact form or WhatsApp for immediate help.',
    });
  }
});

module.exports = router;
