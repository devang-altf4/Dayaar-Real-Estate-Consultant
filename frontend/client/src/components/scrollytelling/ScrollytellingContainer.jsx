/**
 * ScrollytellingContainer — Full-screen map with floating zone details.
 *
 * Fixes:
 *  - Zone card only appears AFTER user begins scrolling (hasScrolled state)
 *  - hasScrolled triggers at 2% scroll progress
 */

import { useRef, useState } from 'react';
import { useScroll, useMotionValueEvent } from 'framer-motion';
import MumbaiTrainMap from './MumbaiTrainMap';
import { ZONE_ORDER } from '../../data/zones';

export default function ScrollytellingContainer({ onExploreZone }) {
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [scrollValue, setScrollValue] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    const idx = Math.min(Math.floor(latest * ZONE_ORDER.length), ZONE_ORDER.length - 1);
    setActiveIndex(idx);
    setScrollValue(latest);
    // Only show zone card once user has scrolled at least 2%
    if (latest > 0.02 && !hasScrolled) setHasScrolled(true);
    if (latest <= 0.005) setHasScrolled(false);
  });

  return (
    <section
      ref={containerRef}
      id="zones-section"
      className="relative"
      style={{ height: `${ZONE_ORDER.length * 100}vh` }}
    >
      <div className="sticky top-0 h-screen w-screen overflow-hidden">
        <MumbaiTrainMap
          scrollProgress={scrollYProgress}
          activeIndex={activeIndex}
          onExploreZone={onExploreZone}
          hasScrolled={hasScrolled}
          scrollValue={scrollValue}
        />

        {/* Scroll progress dots */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-20">
          {ZONE_ORDER.map((_, i) => (
            <div
              key={i}
              className="transition-all duration-300"
              style={{
                width: activeIndex === i ? '3px' : '2px',
                height: activeIndex === i ? '24px' : '12px',
                borderRadius: '2px',
                background: activeIndex === i ? 'var(--gold)' : 'rgba(255,255,255,0.15)',
                boxShadow: activeIndex === i ? '0 0 8px rgba(201,169,110,0.4)' : 'none',
              }}
            />
          ))}
        </div>

        {/* Scroll hint */}
        {!hasScrolled && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20 animate-bounce">
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold" style={{ color: 'var(--cream-dim)' }}>
              Scroll to explore
            </span>
            <div className="w-5 h-8 rounded-full border" style={{ borderColor: 'var(--gold-dark)' }}>
              <div className="w-1 h-2 mx-auto mt-1.5 rounded-full" style={{ background: 'var(--gold)' }} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
