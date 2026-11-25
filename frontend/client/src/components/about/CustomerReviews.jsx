import { motion, useInView, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { HiMiniStar } from 'react-icons/hi2';
import { CUSTOMER_REVIEWS } from '../../data/companyStory';
import { LandingReveal } from '../site/LandingReveal';

const MotionDiv = motion.div;
const MotionArticle = motion.article;

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

function ReviewCard({ review, reducedMotion = false }) {
  return (
    <MotionArticle
      style={{
        width: 'clamp(168px, 42vw, 308px)',
        minHeight: 'clamp(200px, 40vw, 246px)',
        borderRadius: 20,
        border: '1px solid var(--site-border)',
        background: 'var(--site-panel)',
        padding: 'clamp(14px, 2.8vw, 20px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transformStyle: 'preserve-3d',
        boxShadow: 'var(--site-shadow)',
      }}
      whileHover={reducedMotion ? undefined : { y: -8, rotateX: 4, rotateY: -5 }}
      transition={{ type: 'spring', stiffness: 190, damping: 20 }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--site-accent)', marginBottom: 14 }}>
          {Array.from({ length: review.rating }).map((_, i) => (
            <HiMiniStar key={`${review.name}-${i}`} style={{ width: 14, height: 14 }} />
          ))}
        </div>

        <p
          style={{
            margin: 0,
            color: 'var(--site-ink)',
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
          borderTop: '1px solid var(--site-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--site-ink)' }}>{review.name}</p>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--site-muted)' }}>{review.timeAgo}</p>
        </div>
        <span
          style={{
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--site-accent)',
            fontWeight: 700,
          }}
        >
          Verified
        </span>
      </div>
    </MotionArticle>
  );
}

function AnimatedReviewsLane() {
  const laneRef = useRef(null);
  const inView = useInView(laneRef);
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
    if (!inView) return;
    let rafId = 0;
    let previousTime = performance.now();

    const animate = (now) => {
      const width = singleTrackWidthRef.current;
      const delta = (now - previousTime) / 1000;
      previousTime = now;

      if (width && !interactionRef.current.hovering && !interactionRef.current.dragging) {
        let next = offsetRef.current - delta * 64;
        if (next <= -width) next += width;
        if (next > 0) next -= width;
        offsetRef.current = next;
        x.set(next);
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [inView, x]);

  return (
    <div
      ref={laneRef}
      style={{
        marginTop: 12,
        overflow: 'hidden',
        padding: '12px 0 20px',
        maskImage: 'linear-gradient(90deg, transparent, #000 3%, #000 97%, transparent)',
      }}
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

    </div>
  );
}

export default function CustomerReviews() {
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();

  return (
    <section className="site-section site-reviews" aria-labelledby="customer-reviews">
      <div className="site-container">
        <LandingReveal>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p style={{ color: 'var(--site-accent)', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Customer Reviews — Client Stories
              </p>
              <h2
                id="customer-reviews"
                tabIndex={-1}
                style={{
                  marginTop: 8,
                  fontSize: isMobile ? 'clamp(1.2rem, 6vw, 1.55rem)' : 'clamp(1.35rem, 2.2vw, 2.05rem)',
                  lineHeight: 1.15,
                }}
              >
                Real words from real buyers and investors
              </h2>
            </div>
            <p style={{ color: 'var(--site-muted)', fontSize: isMobile ? 12 : 13, maxWidth: isMobile ? 260 : 350, lineHeight: 1.65 }}>
              Verified client feedback from recent and long-term experiences.
            </p>
          </div>
          {reducedMotion ? (
            <div className="landing-static-reviews" role="region" aria-label="Client stories" tabIndex={0}>
              {CUSTOMER_REVIEWS.map((review, index) => <ReviewCard key={index} review={review} reducedMotion />)}
            </div>
          ) : <AnimatedReviewsLane />}
        </LandingReveal>
      </div>
    </section>
  );
}
