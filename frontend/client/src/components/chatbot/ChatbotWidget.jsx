import { AnimatePresence, motion as Motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import {
  HiOutlineArrowPath,
  HiOutlineChatBubbleOvalLeftEllipsis,
  HiOutlinePaperAirplane,
  HiOutlineSparkles,
  HiOutlineXMark,
} from 'react-icons/hi2';
import api from '../../utils/api';

const starterPrompts = [
  'Guide me through this website',
  'Which Mumbai zone should I explore?',
  'What does Dayaar help with?',
];

const LAUNCHER_SIZE_DESKTOP = 58;
const LAUNCHER_SIZE_MOBILE = 52;
const EDGE_GAP_DESKTOP = 20;
const EDGE_GAP_MOBILE = 16;
const PANEL_GAP = 14;
const PANEL_MAX_WIDTH = 390;
const PANEL_MAX_HEIGHT = 580;

const createMessage = (role, content) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  role,
  content,
});

function getViewportSize() {
  if (typeof window === 'undefined') {
    return { width: 1024, height: 768 };
  }

  return {
    width: document.documentElement?.clientWidth || window.innerWidth,
    height: window.visualViewport?.height || window.innerHeight,
  };
}

function getLayoutMetrics(viewport) {
  const isCompact = viewport.width <= 640;
  return {
    launcherSize: isCompact ? LAUNCHER_SIZE_MOBILE : LAUNCHER_SIZE_DESKTOP,
    edgeGap: isCompact ? EDGE_GAP_MOBILE : EDGE_GAP_DESKTOP,
  };
}

function isUsableViewport(viewport) {
  const { launcherSize, edgeGap } = getLayoutMetrics(viewport);
  return viewport.width >= launcherSize + edgeGap * 2 && viewport.height >= launcherSize + edgeGap * 2;
}

function clampPosition(position, viewport = getViewportSize()) {
  const { launcherSize, edgeGap } = getLayoutMetrics(viewport);
  const maxX = Math.max(edgeGap, viewport.width - launcherSize - edgeGap);
  const maxY = Math.max(edgeGap, viewport.height - launcherSize - edgeGap);

  return {
    x: Math.min(Math.max(position.x, edgeGap), maxX),
    y: Math.min(Math.max(position.y, edgeGap), maxY),
  };
}

function getDefaultPosition(viewport = getViewportSize()) {
  const { launcherSize, edgeGap } = getLayoutMetrics(viewport);

  return {
    x: Math.max(edgeGap, viewport.width - launcherSize - edgeGap),
    y: Math.max(edgeGap, viewport.height - launcherSize - edgeGap),
  };
}

function getPanelPlacement(position, viewport) {
  const { launcherSize, edgeGap } = getLayoutMetrics(viewport);
  const width = Math.min(PANEL_MAX_WIDTH, viewport.width - edgeGap * 2);
  const height = Math.min(PANEL_MAX_HEIGHT, viewport.height - launcherSize - PANEL_GAP - edgeGap * 2);
  const safeHeight = Math.max(320, Math.min(PANEL_MAX_HEIGHT, height || viewport.height - edgeGap * 2));
  const opensLeft = position.x + launcherSize / 2 > viewport.width / 2;
  const preferredLeft = opensLeft ? position.x + launcherSize - width : position.x;
  const hasRoomAbove = position.y - PANEL_GAP - safeHeight >= edgeGap;
  const preferredTop = hasRoomAbove
    ? position.y - PANEL_GAP - safeHeight
    : position.y + launcherSize + PANEL_GAP;

  return {
    width,
    height: safeHeight,
    left: Math.min(Math.max(preferredLeft, edgeGap), viewport.width - width - edgeGap),
    top: Math.min(Math.max(preferredTop, edgeGap), viewport.height - safeHeight - edgeGap),
  };
}

const initialMessages = [
  createMessage(
    'assistant',
    'Hi, I am Dayaar Assist. Ask me about Mumbai zones, curated projects, pricing ranges, services, or where to submit your property requirement.'
  ),
];

const styles = {
  shell: {
    position: 'fixed',
    zIndex: 60,
    fontFamily: 'var(--font-body)',
  },
  panel: {
    position: 'fixed',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: 16,
    border: '1px solid var(--site-border)',
    background: 'var(--site-panel)',
    boxShadow: '0 24px 64px rgb(13 47 85 / 24%)',
    backdropFilter: 'blur(22px) saturate(160%)',
    WebkitBackdropFilter: 'blur(22px) saturate(160%)',
  },
  header: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    padding: '16px 16px 14px',
    borderBottom: '1px solid var(--site-border)',
    background: 'var(--site-tint)',
    cursor: 'grab',
    touchAction: 'none',
    userSelect: 'none',
  },
  titleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderRadius: '50%',
    background: 'var(--site-action)',
    color: '#FFFFFF',
    boxShadow: '0 10px 26px rgba(30, 94, 255, 0.35)',
  },
  title: {
    margin: 0,
    color: 'var(--site-ink)',
    fontFamily: 'var(--font-heading)',
    fontSize: 15,
    fontWeight: 800,
    lineHeight: 1.1,
  },
  subtitle: {
    marginTop: 3,
    color: 'var(--site-muted)',
    fontSize: 11,
    lineHeight: 1.3,
  },
  closeButton: {
    width: 34,
    height: 34,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderRadius: 10,
    border: '1px solid var(--site-border)',
    background: 'var(--site-panel)',
    color: 'var(--site-ink)',
    cursor: 'pointer',
  },
  viewport: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 14px 12px',
    background: 'var(--site-canvas)',
  },
  messageRow: {
    display: 'flex',
    marginBottom: 10,
  },
  messageBubble: {
    maxWidth: '86%',
    padding: '10px 12px',
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },
  assistantBubble: {
    background: 'var(--site-panel)',
    border: '1px solid var(--site-border)',
    color: 'var(--site-ink)',
    borderTopLeftRadius: 4,
  },
  userBubble: {
    background: 'var(--site-action)',
    color: '#FFFFFF',
    borderTopRightRadius: 4,
    boxShadow: '0 10px 24px rgba(30, 94, 255, 0.22)',
  },
  promptGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  promptButton: {
    borderRadius: 999,
    border: '1px solid var(--site-border)',
    background: 'var(--site-tint)',
    color: 'var(--site-accent)',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 700,
    padding: '8px 11px',
    lineHeight: 1.2,
    fontFamily: 'var(--font-body)',
  },
  typing: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    color: 'var(--site-muted)',
    fontSize: 12,
  },
  composer: {
    flexShrink: 0,
    display: 'grid',
    gridTemplateColumns: '1fr 42px',
    gap: 10,
    padding: 12,
    borderTop: '1px solid var(--site-border)',
    background: 'var(--site-panel)',
  },
  textarea: {
    minHeight: 42,
    maxHeight: 92,
    resize: 'none',
    borderRadius: 12,
    border: '1px solid var(--site-input-border)',
    background: 'var(--site-canvas)',
    color: 'var(--site-ink)',
    fontSize: 13,
    lineHeight: 1.4,
    padding: '11px 12px',
    outline: 'none',
    fontFamily: 'var(--font-body)',
  },
  sendButton: {
    width: 42,
    height: 42,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'end',
    borderRadius: 12,
    border: 'none',
    background: 'var(--site-action)',
    color: '#FFFFFF',
    cursor: 'pointer',
    boxShadow: '0 10px 28px rgba(30, 94, 255, 0.28)',
  },
  launcher: {
    width: '100%',
    height: '100%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    border: '1px solid rgba(169, 201, 255, 0.35)',
    background: 'var(--site-action)',
    color: '#FFFFFF',
    cursor: 'grab',
    boxShadow: '0 18px 44px rgba(30, 94, 255, 0.35), 0 0 0 8px rgba(30, 94, 255, 0.08)',
    touchAction: 'none',
    userSelect: 'none',
  },
  launcherBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 15,
    height: 15,
    borderRadius: '50%',
    border: '2px solid #0B0B0D',
    background: '#22c55e',
  },
};

function ChatMessage({ message }) {
  const isUser = message.role === 'user';

  return (
    <div
      style={{
        ...styles.messageRow,
        justifyContent: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={{
          ...styles.messageBubble,
          ...(isUser ? styles.userBubble : styles.assistantBubble),
        }}
      >
        {message.content}
      </div>
    </div>
  );
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [viewport, setViewport] = useState(getViewportSize);
  const [customPosition, setCustomPosition] = useState(null);
  const [dragging, setDragging] = useState(false);
  const shellRef = useRef(null);
  const viewportRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (!open || !viewportRef.current) return;
    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
  }, [messages, open, sending]);

  useEffect(() => {
    const handleResize = () => {
      const nextViewport = getViewportSize();
      if (!isUsableViewport(nextViewport)) return;
      setViewport(nextViewport);
      setCustomPosition((current) => (current ? clampPosition(current, nextViewport) : null));
    };

    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  const beginDrag = (event, source) => {
    if (event.button !== undefined && event.button !== 0) return;
    if (event.target.closest?.('[data-no-drag="true"]')) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const liveViewport = getViewportSize();
    const rect = shellRef.current?.getBoundingClientRect();
    const fallbackPos = customPosition ?? getDefaultPosition(liveViewport);
    dragRef.current = {
      pointerId: event.pointerId,
      source,
      startX: event.clientX,
      startY: event.clientY,
      baseX: rect ? rect.left : fallbackPos.x,
      baseY: rect ? rect.top : fallbackPos.y,
      moved: false,
    };
    setDragging(true);
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      drag.moved = true;
    }

    if (drag.moved) {
      const liveViewport = getViewportSize();
      setCustomPosition(clampPosition({
        x: drag.baseX + deltaX,
        y: drag.baseY + deltaY,
      }, isUsableViewport(liveViewport) ? liveViewport : viewport));
    }
  };

  const finishDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragRef.current = null;
    setDragging(false);

    if (drag.source === 'launcher' && !drag.moved) {
      setOpen((current) => !current);
    }
  };

  const sendMessage = async (text = input) => {
    const cleanText = text.trim();
    if (!cleanText || sending) return;

    const userMessage = createMessage('user', cleanText);
    const nextMessages = [...messages, userMessage];

    setOpen(true);
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      const apiMessages = nextMessages
        .filter((message) => ['user', 'assistant'].includes(message.role))
        .slice(-10)
        .map((message) => ({ role: message.role, content: message.content }));

      const response = await api.post('/chatbot', { messages: apiMessages });
      setMessages((current) => [
        ...current,
        createMessage('assistant', response.data?.message || 'I could not read the response. Please try again.'),
      ]);
    } catch (error) {
      const fallback = error.response?.data?.message
        || 'I am having trouble connecting right now. You can still use the Get in Touch form or WhatsApp for immediate help.';

      setMessages((current) => [
        ...current,
        createMessage('assistant', fallback),
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const hasUserMessage = messages.some((message) => message.role === 'user');
  const { launcherSize, edgeGap } = getLayoutMetrics(viewport);
  const effectivePosition = customPosition ?? getDefaultPosition(viewport);
  const panelPlacement = getPanelPlacement(effectivePosition, viewport);
  const shellPositionStyle = customPosition
    ? { left: customPosition.x, top: customPosition.y }
    : { right: edgeGap, bottom: `calc(${edgeGap}px + env(safe-area-inset-bottom, 0px))` };

  return (
    <div
      ref={shellRef}
      style={{
        ...styles.shell,
        width: launcherSize,
        height: launcherSize,
        ...shellPositionStyle,
      }}
    >
      <AnimatePresence>
        {open && (
          <Motion.div
            style={{
              ...styles.panel,
              left: panelPlacement.left,
              top: panelPlacement.top,
              width: panelPlacement.width,
              height: panelPlacement.height,
            }}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          >
            <div
              style={{
                ...styles.header,
                cursor: dragging ? 'grabbing' : 'grab',
              }}
              onPointerDown={(event) => beginDrag(event, 'panel')}
              onPointerMove={moveDrag}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
            >
              <div style={styles.titleWrap}>
                <div style={styles.avatar}>
                  <HiOutlineSparkles style={{ width: 18, height: 18 }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2 style={styles.title}>Dayaar Assist</h2>
                  <p style={styles.subtitle}>Website and property guidance</p>
                </div>
              </div>

              <Motion.button
                data-no-drag="true"
                type="button"
                aria-label="Close chatbot"
                title="Close chatbot"
                style={styles.closeButton}
                onClick={() => setOpen(false)}
                whileHover={{ borderColor: '#83a9d6', color: '#a0ccff' }}
                whileTap={{ scale: 0.94 }}
              >
                <HiOutlineXMark style={{ width: 18, height: 18 }} />
              </Motion.button>
            </div>

            <div ref={viewportRef} style={styles.viewport}>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {!hasUserMessage && (
                <div style={styles.promptGrid}>
                  {starterPrompts.map((prompt) => (
                    <Motion.button
                      key={prompt}
                      type="button"
                      style={styles.promptButton}
                      onClick={() => sendMessage(prompt)}
                      whileHover={{ y: -1, borderColor: 'rgba(169, 201, 255, 0.55)' }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {prompt}
                    </Motion.button>
                  ))}
                </div>
              )}

              {sending && (
                <div style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
                  <div style={{ ...styles.messageBubble, ...styles.assistantBubble }}>
                    <span style={styles.typing}>
                      <HiOutlineArrowPath style={{ width: 14, height: 14 }} />
                      Thinking...
                    </span>
                  </div>
                </div>
              )}
            </div>

            <form
              style={styles.composer}
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage();
              }}
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about zones, prices, services..."
                style={styles.textarea}
                disabled={sending}
                rows={1}
              />
              <Motion.button
                type="submit"
                aria-label="Send message"
                title="Send message"
                style={{
                  ...styles.sendButton,
                  opacity: sending || !input.trim() ? 0.58 : 1,
                  cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
                }}
                disabled={sending || !input.trim()}
                whileHover={sending || !input.trim() ? undefined : { y: -1 }}
                whileTap={sending || !input.trim() ? undefined : { scale: 0.95 }}
              >
                <HiOutlinePaperAirplane style={{ width: 18, height: 18 }} />
              </Motion.button>
            </form>
          </Motion.div>
        )}
      </AnimatePresence>

      <Motion.button
        type="button"
        aria-label={open ? 'Close Dayaar chatbot' : 'Open Dayaar chatbot'}
        title={open ? 'Close Dayaar chatbot' : 'Open Dayaar chatbot'}
        style={{
          ...styles.launcher,
          cursor: dragging ? 'grabbing' : 'grab',
        }}
        onPointerDown={(event) => beginDrag(event, 'launcher')}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen((current) => !current);
          }
        }}
        whileHover={{ y: dragging ? 0 : -2, boxShadow: '0 22px 52px rgba(30, 94, 255, 0.42), 0 0 0 8px rgba(30, 94, 255, 0.1)' }}
        whileTap={{ scale: 0.95 }}
      >
        <HiOutlineChatBubbleOvalLeftEllipsis style={{ width: 27, height: 27 }} />
        {!open && <span style={styles.launcherBadge} />}
      </Motion.button>
    </div>
  );
}
