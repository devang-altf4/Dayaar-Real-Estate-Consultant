import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import {
  HiMiniChevronLeft,
  HiMiniChevronRight,
  HiMiniStar,
} from 'react-icons/hi2';
import { CUSTOMER_REVIEWS, JOURNEY_MILESTONES } from '../../data/companyStory';

const MotionSection = motion.section;
const MotionDiv = motion.div;
const MotionArticle = motion.article;
const MotionButton = motion.button;

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const media = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = (event) => setIsMobile(event.matches);

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [breakpoint]);

  return isMobile;
}

function ReviewCard({ review }) {
  return (
    <MotionArticle
      style={{
        width: 'clamp(168px, 42vw, 308px)',
        minHeight: 'clamp(200px, 40vw, 246px)',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.08)',
        background:
          'linear-gradient(138deg, rgba(10,11,18,0.96) 0%, rgba(15,24,44,0.93) 55%, rgba(11,13,22,0.95) 100%)',
        padding: 'clamp(14px, 2.8vw, 20px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transformStyle: 'preserve-3d',
        boxShadow: '0 16px 34px rgba(0,0,0,0.35)',
      }}
      whileHover={{ y: -8, rotateX: 4, rotateY: -5 }}
      transition={{ type: 'spring', stiffness: 190, damping: 20 }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#A9C9FF', marginBottom: 14 }}>
          {Array.from({ length: review.rating }).map((_, i) => (
            <HiMiniStar key={`${review.name}-${i}`} style={{ width: 14, height: 14 }} />
          ))}
        </div>

        <p
          style={{
            margin: 0,
            color: 'rgba(255,255,255,0.86)',
            fontSize: 'clamp(12px, 1.4vw, 14px)',
            lineHeight: 1.58,
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 6,
            overflow: 'hidden',
          }}
        >
          "{review.text}"
        </p>
      </div>

      <div
        style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>{review.name}</p>
          <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.54)' }}>{review.timeAgo}</p>
        </div>
        <span
          style={{
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: '#4A7FBF',
            fontWeight: 700,
          }}
        >
          Verified
        </span>
      </div>
    </MotionArticle>
  );
}

function ReviewsLane() {
  const prefersReducedMotion = useReducedMotion();
  const firstSetRef = useRef(null);
  const offsetRef = useRef(0);
  const singleTrackWidthRef = useRef(0);
  const interactionRef = useRef({ hovering: false, dragging: false });

  const x = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 130, damping: 22, mass: 0.45 });

  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    interactionRef.current.hovering = isHovering;
  }, [isHovering]);

  useEffect(() => {
    interactionRef.current.dragging = isDragging;
  }, [isDragging]);

  const normalizeOffset = (value, width) => {
    if (!width) return value;
    let next = value;
    while (next >= 0) next -= width;
    while (next < -width) next += width;
    return next;
  };

  useEffect(() => {
    const measure = () => {
      const width = firstSetRef.current?.scrollWidth || 0;
      if (!width) return;

      singleTrackWidthRef.current = width;

      if (offsetRef.current === 0) {
        offsetRef.current = -width;
        x.set(offsetRef.current);
        return;
      }

      const normalized = normalizeOffset(offsetRef.current, width);
      offsetRef.current = normalized;
      x.set(normalized);
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    if (firstSetRef.current) {
      resizeObserver.observe(firstSetRef.current);
    }

    window.addEventListener('resize', measure);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [x]);

  useEffect(() => {
    let rafId = 0;
    let previousTime = performance.now();

    const animate = (now) => {
      const width = singleTrackWidthRef.current;
      const delta = (now - previousTime) / 1000;
      previousTime = now;

      if (width && !interactionRef.current.hovering && !interactionRef.current.dragging) {
        const speed = prefersReducedMotion ? 26 : 64;
        let next = offsetRef.current + delta * speed;
        if (next >= 0) next -= width;
        if (next < -width) next += width;
        offsetRef.current = next;
        x.set(next);
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [prefersReducedMotion, x]);

  return (
    <div
      style={{ position: 'relative', marginTop: 26, overflow: 'hidden', padding: '2px 0' }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <MotionDiv
        style={{
          x: smoothX,
          display: 'flex',
          alignItems: 'stretch',
          width: 'max-content',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        drag="x"
        dragMomentum={false}
        dragElastic={0.04}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => {
          const width = singleTrackWidthRef.current;
          const normalized = normalizeOffset(x.get(), width);
          offsetRef.current = normalized;
          x.set(normalized);
          setIsDragging(false);
        }}
      >
        <div ref={firstSetRef} style={{ display: 'flex', gap: 'clamp(10px, 1.7vw, 20px)', paddingRight: 'clamp(10px, 1.7vw, 20px)' }}>
          {CUSTOMER_REVIEWS.map((review, idx) => (
            <ReviewCard key={`${review.name}-${idx}`} review={review} />
          ))}
        </div>

        <div aria-hidden="true" style={{ display: 'flex', gap: 'clamp(10px, 1.7vw, 20px)' }}>
          {CUSTOMER_REVIEWS.map((review, idx) => (
            <ReviewCard key={`loop-${review.name}-${idx}`} review={review} />
          ))}
        </div>
      </MotionDiv>

      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 'clamp(26px, 8vw, 90px)',
          background: 'linear-gradient(90deg, rgba(11,11,13,1) 0%, rgba(11,11,13,0) 100%)',
        }}
      />
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 'clamp(26px, 8vw, 90px)',
          background: 'linear-gradient(270deg, rgba(11,11,13,1) 0%, rgba(11,11,13,0) 100%)',
        }}
      />
    </div>
  );
}

function JourneyExperience() {
  const isMobile = useIsMobile();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const total = JOURNEY_MILESTONES.length;
  const activeMilestone = JOURNEY_MILESTONES[activeIndex];
  const progress = ((activeIndex + 1) / total) * 100;
  const timelineBarRef = useRef(null);
  const timelineNodeRefs = useRef([]);

  const goTo = (index) => {
    const normalized = (index + total) % total;
    if (normalized === activeIndex) return;
    setDirection(normalized > activeIndex ? 1 : -1);
    setActiveIndex(normalized);
  };

  const goPrev = () => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + total) % total);
  };

  const goNext = () => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % total);
  };

  const scrollTimelineBy = (delta) => {
    if (!timelineBarRef.current) return;
    timelineBarRef.current.scrollBy({ left: delta, behavior: 'smooth' });
  };

  useEffect(() => {
    const scroller = timelineBarRef.current;
    const activeNode = timelineNodeRefs.current[activeIndex];
    if (!scroller || !activeNode) return;

    const targetLeft = activeNode.offsetLeft - (scroller.clientWidth - activeNode.clientWidth) / 2;
    const maxLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const clampedLeft = Math.max(0, Math.min(targetLeft, maxLeft));

    scroller.scrollTo({ left: clampedLeft, behavior: 'smooth' });
  }, [activeIndex]);

  const slideVariants = {
    enter: (dir) => ({
      opacity: 0,
      x: dir > 0 ? (isMobile ? 46 : 72) : (isMobile ? -46 : -72),
      rotateY: isMobile ? 0 : dir > 0 ? -7 : 7,
      scale: 0.98,
    }),
    center: {
      opacity: 1,
      x: 0,
      rotateY: 0,
      scale: 1,
    },
    exit: (dir) => ({
      opacity: 0,
      x: dir > 0 ? (isMobile ? -46 : -72) : (isMobile ? 46 : 72),
      rotateY: isMobile ? 0 : dir > 0 ? 7 : -7,
      scale: 0.98,
    }),
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        borderRadius: isMobile ? 20 : 30,
        border: '1px solid rgba(255,255,255,0.12)',
        padding: isMobile ? '14px 12px 16px' : 'clamp(14px, 2.2vw, 28px)',
        background:
          'linear-gradient(160deg, rgba(8,10,17,0.96) 0%, rgba(17,25,45,0.9) 52%, rgba(9,12,19,0.96) 100%)',
        boxShadow: '0 30px 72px rgba(0,0,0,0.34)',
        overflow: 'hidden',
      }}
    >
      <MotionDiv
        aria-hidden="true"
        animate={{ x: [0, 28, 0], y: [0, -14, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: -70,
          right: -50,
          width: isMobile ? 170 : 240,
          height: isMobile ? 170 : 240,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(30,94,255,0.34) 0%, transparent 70%)',
          filter: 'blur(4px)',
          pointerEvents: 'none',
        }}
      />
      <MotionDiv
        aria-hidden="true"
        animate={{ x: [0, -24, 0], y: [0, 18, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          bottom: -80,
          left: -60,
          width: isMobile ? 170 : 240,
          height: isMobile ? 170 : 240,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(74,127,191,0.28) 0%, transparent 70%)',
          filter: 'blur(6px)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="relative grid gap-7 lg:gap-9"
        style={{ gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : '0.95fr minmax(0,1fr)' }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#4A7FBF',
              fontWeight: 700,
            }}
          >
            About Us Timeline
          </p>
          <h3
            style={{
              margin: '8px 0 8px',
              color: '#FFFFFF',
              fontSize: isMobile ? '1.36rem' : 'clamp(1.28rem, 2.2vw, 1.9rem)',
              lineHeight: 1.12,
            }}
          >
            Our Journey with
            <span style={{ display: 'block', color: '#A9C9FF' }}>Dayaar Real Estate</span>
          </h3>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.62)', fontSize: 14, lineHeight: 1.62 }}>
            From 2022 inception to expansion, scale, current operations, and future vision.
          </p>

          <div style={{ marginTop: isMobile ? 10 : 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
              Milestone Years
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={() => scrollTimelineBy(-160)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.16)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#A9C9FF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                aria-label="Scroll timeline left"
              >
                <HiMiniChevronLeft style={{ width: 14, height: 14 }} />
              </button>
              <button
                type="button"
                onClick={() => scrollTimelineBy(160)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.16)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#A9C9FF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                aria-label="Scroll timeline right"
              >
                <HiMiniChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>

          <div style={{ marginTop: isMobile ? 12 : 18, position: 'relative', padding: '10px 0 2px' }}>
            <div
              style={{
                display: isMobile ? 'none' : 'block',
                position: 'absolute',
                left: 8,
                right: 8,
                top: 28,
                height: 2,
                borderRadius: 999,
                background: 'linear-gradient(90deg, rgba(255,255,255,0.08), rgba(30,94,255,0.45), rgba(255,255,255,0.08))',
              }}
            />

            <div
              ref={timelineBarRef}
              className={`flex items-start ${isMobile ? 'justify-start' : 'justify-between'} gap-2 overflow-x-auto pb-2`}
              onWheel={(event) => {
                if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                  event.currentTarget.scrollLeft += event.deltaY;
                }
              }}
              style={{
                scrollSnapType: isMobile ? 'x mandatory' : 'none',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: isMobile ? 8 : 2,
                paddingLeft: isMobile ? 2 : 0,
                paddingRight: isMobile ? 10 : 0,
                scrollbarWidth: 'thin',
                overflowY: 'hidden',
                maxWidth: '100%',
                touchAction: 'pan-x',
                overscrollBehaviorX: 'contain',
              }}
            >
              {JOURNEY_MILESTONES.map((milestone, index) => {
                const isActive = index === activeIndex;
                const shortTitle =
                  milestone.title.length > 18 ? `${milestone.title.slice(0, 18)}...` : milestone.title;

                return (
                  <MotionButton
                    key={`${milestone.year}-${milestone.title}`}
                    ref={(node) => {
                      timelineNodeRefs.current[index] = node;
                    }}
                    type="button"
                    onClick={() => goTo(index)}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      minWidth: isMobile ? 72 : 74,
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                      color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.72)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      scrollSnapAlign: isMobile ? 'start' : 'none',
                      flex: '0 0 auto',
                    }}
                  >
                    <span
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 999,
                        margin: '0 auto',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        border: isActive ? '1px solid rgba(30,94,255,0.7)' : '1px solid rgba(255,255,255,0.2)',
                        background: isActive ? 'rgba(30,94,255,0.25)' : 'rgba(255,255,255,0.03)',
                        boxShadow: isActive ? '0 0 18px rgba(30,94,255,0.35)' : 'none',
                        transition: 'all 0.25s ease',
                      }}
                    >
                      {milestone.year}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        marginTop: 8,
                        fontSize: 10,
                        lineHeight: 1.35,
                        maxWidth: isMobile ? 90 : 100,
                        marginInline: 'auto',
                        color: isActive ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.56)',
                      }}
                    >
                      {shortTitle}
                    </span>
                  </MotionButton>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: isMobile ? 10 : 14 }}>
            <div
              style={{
                height: 6,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
              }}
            >
              <MotionDiv
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 190, damping: 24 }}
                style={{
                  height: '100%',
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, #A9C9FF, #1E5EFF)',
                }}
              />
            </div>
            <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.52)', fontSize: 11 }}>
              Journey Phase {activeIndex + 1} of {total}
            </p>
          </div>
        </div>

        <div style={{ perspective: isMobile ? 0 : 1200, minWidth: 0 }}>
          <AnimatePresence mode="wait" custom={direction}>
            <MotionArticle
              key={`${activeMilestone.year}-${activeMilestone.title}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.56, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.08}
              onDragEnd={(_, info) => {
                if (info.offset.x <= (isMobile ? -56 : -70)) goNext();
                if (info.offset.x >= (isMobile ? 56 : 70)) goPrev();
              }}
              style={{
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                borderRadius: 24,
                border: '1px solid rgba(30,94,255,0.24)',
                background:
                  'linear-gradient(152deg, rgba(14,20,34,0.95) 0%, rgba(10,12,20,0.96) 55%, rgba(12,25,42,0.92) 100%)',
                padding: isMobile ? '14px 12px 16px' : 'clamp(16px, 2.4vw, 26px)',
                boxShadow: '0 24px 52px rgba(0,0,0,0.33)',
                cursor: 'grab',
                minHeight: isMobile ? 0 : 370,
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4" style={{ minWidth: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      borderRadius: 999,
                      padding: '6px 12px',
                      background: 'rgba(30,94,255,0.2)',
                      border: '1px solid rgba(169,201,255,0.2)',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#A9C9FF',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {activeMilestone.year}
                    <span style={{ width: 1, height: 11, background: 'rgba(169,201,255,0.38)' }} />
                    Journey Phase
                  </span>

                  <h4
                    style={{
                      margin: '10px 0 0',
                      fontSize: isMobile ? '1.2rem' : 'clamp(1.18rem, 1.8vw, 1.62rem)',
                      color: '#FFFFFF',
                      lineHeight: 1.14,
                      wordBreak: 'break-word',
                    }}
                  >
                    {activeMilestone.title}
                  </h4>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: isMobile ? '100%' : 'auto',
                    justifyContent: isMobile ? 'flex-end' : 'flex-start',
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={goPrev}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: 'rgba(255,255,255,0.04)',
                      color: '#A9C9FF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    aria-label="Previous phase"
                  >
                    <HiMiniChevronLeft style={{ width: 16, height: 16 }} />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: 'rgba(255,255,255,0.04)',
                      color: '#A9C9FF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    aria-label="Next phase"
                  >
                    <HiMiniChevronRight style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>

              <div className="grid gap-3" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))' }}>
                {activeMilestone.highlights.map((point, idx) => (
                  <MotionDiv
                    key={`${activeMilestone.year}-${point}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + idx * 0.06 }}
                    whileHover={{ y: -4, borderColor: 'rgba(30,94,255,0.42)' }}
                    style={{
                      minWidth: 0,
                      borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.11)',
                      background: 'rgba(255,255,255,0.02)',
                      padding: isMobile ? '11px 10px' : '13px 12px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 23,
                        height: 23,
                        borderRadius: 8,
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(30,94,255,0.18)',
                        border: '1px solid rgba(30,94,255,0.35)',
                        color: '#A9C9FF',
                        fontSize: 10,
                        fontWeight: 700,
                        marginTop: 1,
                      }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <p
                      style={{
                        margin: 0,
                        color: 'rgba(255,255,255,0.75)',
                        fontSize: isMobile ? 13 : 14,
                        lineHeight: 1.58,
                        wordBreak: 'break-word',
                      }}
                    >
                      {point}
                    </p>
                  </MotionDiv>
                ))}
              </div>
            </MotionArticle>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function AboutJourneyReviewsSection() {
  const isMobile = useIsMobile();

  return (
    <MotionSection
      id="about-section"
      initial={{ opacity: 0.95 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      style={{
        position: 'relative',
        padding: isMobile ? '76px 0 84px' : '98px 0 112px',
        background:
          'radial-gradient(120% 120% at 86% -14%, rgba(30,94,255,0.24) 0%, rgba(11,11,13,0) 45%), radial-gradient(120% 170% at -15% 45%, rgba(74,127,191,0.15) 0%, rgba(11,11,13,0) 44%), #0B0B0D',
        overflow: 'hidden',
        scrollMarginTop: 96,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.24,
          pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(rgba(169,201,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(169,201,255,0.05) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(circle at 48% 42%, black 30%, transparent 84%)',
        }}
      />

      <div className="container-luxury" style={{ position: 'relative', zIndex: 2 }}>
        <MotionDiv
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.65 }}
          style={{ marginBottom: isMobile ? 18 : 30 }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              color: '#1E5EFF',
              textTransform: 'uppercase',
              letterSpacing: '0.28em',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            <span style={{ width: 30, height: 1, background: '#1E5EFF' }} />
            About Us
          </span>

          <h2
            style={{
              marginTop: 14,
              marginBottom: 10,
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              lineHeight: 1.02,
              color: '#FFFFFF',
              fontSize: isMobile ? 'clamp(1.7rem, 8vw, 2.3rem)' : 'clamp(1.95rem, 4.2vw, 3.45rem)',
            }}
          >
            Our Journey with
            <span
              style={{
                display: 'block',
                background: 'linear-gradient(135deg, #A9C9FF, #1E5EFF, #4A7FBF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Dayaar Real Estate
            </span>
          </h2>

          <p style={{ maxWidth: 760, color: 'rgba(255,255,255,0.66)', fontSize: isMobile ? 13 : 14, lineHeight: 1.7 }}>
            Year-wise milestones highlighting our growth, expansion, achievements, and long-term vision.
          </p>
        </MotionDiv>

        <JourneyExperience />

        <MotionDiv
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65 }}
          style={{ marginTop: isMobile ? 54 : 82 }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div>
              <p
                style={{
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  fontSize: 11,
                  color: '#4A7FBF',
                  fontWeight: 700,
                }}
              >
                Customer Reviews
              </p>
              <h3
                style={{
                  margin: '8px 0 0',
                  color: '#FFFFFF',
                  fontSize: isMobile ? 'clamp(1.2rem, 6vw, 1.55rem)' : 'clamp(1.35rem, 2.2vw, 2.05rem)',
                  lineHeight: 1.15,
                }}
              >
                Real words from real buyers and investors
              </h3>
            </div>

            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: isMobile ? 12 : 13, maxWidth: isMobile ? 260 : 350, lineHeight: 1.65 }}>
              Verified client feedback from recent and long-term experiences.
            </p>
          </div>

          <ReviewsLane />
        </MotionDiv>
      </div>
    </MotionSection>
  );
}

