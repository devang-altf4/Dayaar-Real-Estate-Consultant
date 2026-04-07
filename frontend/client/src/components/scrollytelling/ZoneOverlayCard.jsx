/**
 * ZoneOverlayCard — Zone popup card matching exact Stitch design
 * Using inline CSS to avoid Tailwind v4 issues
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { HiOutlineArrowRight } from 'react-icons/hi2';
import { TbBuildingSkyscraper } from 'react-icons/tb';
import { IoTrendingUpOutline } from 'react-icons/io5';

// Custom hook for responsive behavior
function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

export default function ZoneOverlayCard({ zoneId, index, zone, highlight, onExplore }) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const [isHovered, setIsHovered] = useState(false);

  // BHK data
  const bhkData = [
    { label: '1 BHK', value: highlight.config1 },
    { label: '2 BHK', value: highlight.config2 },
    { label: '3 BHK', value: highlight.config3 },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: isMobile ? 16 : 28,
        left: isMobile ? 12 : 28,
        zIndex: 20,
        width: isMobile ? 'calc(100% - 24px)' : 'calc(100% - 56px)',
        maxWidth: isMobile ? 360 : 420,
      }}
    >
      <motion.div
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(20, 22, 28, 0.98) 0%, rgba(12, 14, 18, 0.99) 100%)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid rgba(30, 94, 255, 0.12)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
        }}
        whileHover={{
          borderColor: 'rgba(30, 94, 255, 0.25)',
        }}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={zoneId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* ===== HEADER SECTION ===== */}
            <div style={{ padding: isMobile ? '20px 20px 0' : '28px 28px 0' }}>
              
              {/* Top Row: ZONE XX + Tag */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: isMobile ? 8 : 10,
                }}
              >
                <span
                  style={{
                    fontSize: isMobile ? 10 : 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    color: '#1E5EFF',
                  }}
                >
                  Zone {String(index + 1).padStart(2, '0')}
                </span>
                <span
                  style={{
                    fontSize: isMobile ? 9 : 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: isMobile ? '5px 10px' : '6px 12px',
                    borderRadius: 6,
                    background: 'rgba(30, 94, 255, 0.1)',
                    color: '#1E5EFF',
                    border: '1px solid rgba(30, 94, 255, 0.25)',
                  }}
                >
                  {highlight.tag}
                </span>
              </div>

              {/* Zone Name - Large */}
              <h2
                style={{
                  fontSize: isMobile ? 32 : 40,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                  marginBottom: isMobile ? 8 : 10,
                  color: 'var(--cream)',
                  fontFamily: "var(--font-heading)",
                  margin: 0,
                  marginBottom: isMobile ? 10 : 12,
                }}
              >
                {zone.name}
              </h2>

              {/* Subtitle - Gold with bullet separators */}
              <p
                style={{
                  fontSize: isMobile ? 12 : 14,
                  fontWeight: 500,
                  color: 'var(--gold)',
                  margin: 0,
                  marginBottom: isMobile ? 8 : 10,
                  lineHeight: 1.4,
                }}
              >
                {zone.subtitle}
              </p>

              {/* Description - Gray */}
              <p
                style={{
                  fontSize: isMobile ? 12 : 14,
                  lineHeight: 1.5,
                  color: 'rgba(255, 255, 255, 0.5)',
                  margin: 0,
                  marginBottom: isMobile ? 16 : 20,
                }}
              >
                {zone.description}
              </p>

              {/* ===== METRICS ROW ===== */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: isMobile ? 16 : 20,
                }}
              >
                {/* Price/sqft */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: isMobile ? 6 : 8,
                    }}
                  >
                    <TbBuildingSkyscraper
                      style={{
                        width: isMobile ? 14 : 16,
                        height: isMobile ? 14 : 16,
                        color: 'rgba(255, 255, 255, 0.4)',
                      }}
                    />
                    <span
                      style={{
                        fontSize: isMobile ? 10 : 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'rgba(255, 255, 255, 0.4)',
                      }}
                    >
                      Price/sqft
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: isMobile ? 20 : 24,
                      fontWeight: 700,
                      color: 'var(--cream)',
                      fontFamily: "var(--font-heading)",
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {highlight.price}
                  </div>
                </div>

                {/* Growth */}
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 6,
                      marginBottom: isMobile ? 6 : 8,
                    }}
                  >
                    <IoTrendingUpOutline
                      style={{
                        width: isMobile ? 14 : 16,
                        height: isMobile ? 14 : 16,
                        color: '#22c55e',
                      }}
                    />
                    <span
                      style={{
                        fontSize: isMobile ? 10 : 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: '#22c55e',
                      }}
                    >
                      Growth
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: isMobile ? 20 : 24,
                      fontWeight: 700,
                      color: '#22c55e',
                      fontFamily: "var(--font-heading)",
                    }}
                  >
                    {highlight.growth}
                  </div>
                </div>
              </div>
            </div>

            {/* ===== BHK CARDS ===== */}
            <div style={{ padding: isMobile ? '0 20px 20px' : '0 28px 24px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: isMobile ? 10 : 12,
                  marginBottom: isMobile ? 16 : 20,
                }}
              >
                {bhkData.map((item, idx) => {
                  return (
                    <div
                      key={item.label}
                      style={{
                        padding: isMobile ? '14px 10px' : '16px 12px',
                        borderRadius: isMobile ? 12 : 14,
                        textAlign: 'center',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: isMobile ? 10 : 11,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          display: 'block',
                          marginBottom: isMobile ? 6 : 8,
                          color: 'rgba(255, 255, 255, 0.45)',
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          fontSize: isMobile ? 13 : 15,
                          fontWeight: 700,
                          display: 'block',
                          color: 'var(--cream)',
                          lineHeight: 1.3,
                          fontFamily: "var(--font-heading)",
                        }}
                      >
                        {item.value}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* ===== CTA BUTTON ===== */}
              <motion.button
                onClick={onExplore}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: isMobile ? 10 : 12,
                  padding: isMobile ? '16px 24px' : '18px 28px',
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  borderRadius: isMobile ? 12 : 14,
                  background: 'linear-gradient(135deg, #4A7FBF 0%, #1E5EFF 50%, #0F2A44 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "var(--font-body)",
                  boxShadow: '0 4px 16px rgba(30, 94, 255, 0.25)',
                  transition: 'all 0.3s ease',
                }}
                whileHover={{
                  scale: 1.02,
                  boxShadow: '0 8px 28px rgba(30, 94, 255, 0.35)',
                }}
                whileTap={{ scale: 0.98 }}
              >
                View Full Market Data
                <HiOutlineArrowRight
                  style={{
                    width: isMobile ? 16 : 18,
                    height: isMobile ? 16 : 18,
                    transition: 'transform 0.3s ease',
                    transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
                  }}
                />
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

