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
      style={{ position: 'relative', height: `${ZONE_ORDER.length * 100}vh` }}
    >
      <div style={{ position: 'sticky', top: 0, left: 0, right: 0, height: '100vh', width: '100%', overflow: 'hidden' }}>
        <MumbaiTrainMap
          scrollProgress={scrollYProgress}
          activeIndex={activeIndex}
          onExploreZone={onExploreZone}
          hasScrolled={hasScrolled}
          scrollValue={scrollValue}
        />

        {/* Scroll progress dots */}
        <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, zIndex: 20 }}>
          {ZONE_ORDER.map((_, i) => (
            <div
              key={i}
              style={{
                width: activeIndex === i ? 3 : 2,
                height: activeIndex === i ? 24 : 12,
                borderRadius: 2,
                background: activeIndex === i ? '#c9a96e' : 'rgba(255,255,255,0.15)',
                boxShadow: activeIndex === i ? '0 0 8px rgba(201,169,110,0.4)' : 'none',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Scroll hint */}
        {!hasScrolled && (
          <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 20 }}>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, color: 'rgba(245,240,232,0.4)' }}>
              Scroll to explore
            </span>
            <div style={{ width: 20, height: 32, borderRadius: 'full', border: '1px solid #a6843d' }}>
              <div style={{ width: 4, height: 8, marginLeft: 'auto', marginRight: 'auto', marginTop: 6, borderRadius: 'full', background: '#c9a96e' }} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
