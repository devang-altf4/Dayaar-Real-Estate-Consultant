/**
 * ZoneSlide — Zone popup card matching exact Stitch design
 * Using inline CSS to avoid Tailwind v4 issues
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { HiOutlineArrowRight } from 'react-icons/hi2';
import { TbBuildingSkyscraper } from 'react-icons/tb';
import { IoTrendingUpOutline } from 'react-icons/io5';

const ZONE_IMAGES = {
  'mira-road': '/images/zones/mira-road.png',
  'makabo': '/images/zones/makabo.png',
  'andheri': '/images/zones/andheri.png',
  'western-suburbs': '/images/zones/western-suburbs.png',
  'south-central': '/images/zones/south-central.png',
  'sobo': '/images/zones/sobo.png',
};

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

export default function ZoneSlide({ zoneId, index, zone, highlight, isActive, onExplore }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isHovered, setIsHovered] = useState(false);
  const image = ZONE_IMAGES[zoneId];

  // BHK data
  const bhkData = [
    { label: '1 BHK', value: highlight.config1 },
    { label: '2 BHK', value: highlight.config2 },
    { label: '3 BHK', value: highlight.config3 },
  ];

  return (
    <div
      id={`zone-${zoneId}`}
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Background image */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.15,
        }}
      >
        <img
          src={image}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          loading="lazy"
        />
      </div>

      {/* Gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(10, 10, 15, 0.95) 0%, rgba(10, 10, 15, 0.85) 50%, rgba(10, 10, 15, 0.95) 100%)',
        }}
      />

      {/* Content Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          padding: isMobile ? '60px 20px' : '80px 48px',
        }}
      >
        {/* The Card */}
        <motion.div
          style={{
            maxWidth: isMobile ? '100%' : 480,
            borderRadius: isMobile ? 16 : 20,
            overflow: 'hidden',
            background: 'linear-gradient(180deg, rgba(18, 20, 26, 0.98) 0%, rgba(12, 14, 18, 0.99) 100%)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(30, 94, 255, 0.15)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
          }}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* ===== HEADER SECTION ===== */}
          <div style={{ padding: isMobile ? '24px 24px 0' : '32px 32px 0' }}>
            
            {/* Top Row: ZONE XX + Tag */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: isMobile ? 12 : 16,
              }}
            >
              <span
                style={{
                  fontSize: isMobile ? 11 : 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
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
                  letterSpacing: '0.1em',
                  padding: isMobile ? '6px 12px' : '7px 14px',
                  borderRadius: 6,
                  background: 'rgba(30, 94, 255, 0.1)',
                  color: '#1E5EFF',
                  border: '1px solid rgba(30, 94, 255, 0.3)',
                }}
              >
                {highlight.tag}
              </span>
            </div>

            {/* Zone Name - Large */}
            <h2
              style={{
                fontSize: isMobile ? 36 : 48,
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                color: '#f5f0e8',
                fontFamily: "var(--font-heading)",
                margin: 0,
                marginBottom: isMobile ? 14 : 18,
              }}
            >
              {zone.name}
            </h2>

            {/* Subtitle - Blue */}
            <p
              style={{
                fontSize: isMobile ? 14 : 16,
                fontWeight: 500,
                color: '#1E5EFF',
                margin: 0,
                marginBottom: isMobile ? 10 : 12,
                lineHeight: 1.4,
              }}
            >
              {zone.subtitle}
            </p>

            {/* Description - Gray */}
            <p
              style={{
                fontSize: isMobile ? 14 : 15,
                lineHeight: 1.6,
                color: 'rgba(255, 255, 255, 0.55)',
                margin: 0,
                marginBottom: isMobile ? 24 : 28,
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
                marginBottom: isMobile ? 24 : 28,
              }}
            >
              {/* Price/sqft */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: isMobile ? 8 : 10,
                  }}
                >
                  <TbBuildingSkyscraper
                    style={{
                      width: isMobile ? 16 : 18,
                      height: isMobile ? 16 : 18,
                      color: 'rgba(255, 255, 255, 0.4)',
                    }}
                  />
                  <span
                    style={{
                      fontSize: isMobile ? 11 : 12,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: 'rgba(255, 255, 255, 0.4)',
                    }}
                  >
                    Price/sqft
                  </span>
                </div>
                <div
                  style={{
                    fontSize: isMobile ? 22 : 26,
                    fontWeight: 700,
                    color: '#f5f0e8',
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
                    gap: 8,
                    marginBottom: isMobile ? 8 : 10,
                  }}
                >
                  <IoTrendingUpOutline
                    style={{
                      width: isMobile ? 16 : 18,
                      height: isMobile ? 16 : 18,
                      color: '#22c55e',
                    }}
                  />
                  <span
                    style={{
                      fontSize: isMobile ? 11 : 12,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: '#22c55e',
                    }}
                  >
                    Growth
                  </span>
                </div>
                <div
                  style={{
                    fontSize: isMobile ? 22 : 26,
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
          <div style={{ padding: isMobile ? '0 24px 24px' : '0 32px 32px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: isMobile ? 12 : 14,
                marginBottom: isMobile ? 20 : 24,
              }}
            >
              {bhkData.map((item, idx) => {
                return (
                  <div
                    key={item.label}
                    style={{
                      padding: isMobile ? '16px 12px' : '20px 14px',
                      borderRadius: isMobile ? 12 : 14,
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: isMobile ? 11 : 12,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        display: 'block',
                        marginBottom: isMobile ? 8 : 10,
                        color: 'rgba(255, 255, 255, 0.45)',
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontSize: isMobile ? 14 : 16,
                        fontWeight: 700,
                        display: 'block',
                        color: '#f5f0e8',
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
                gap: isMobile ? 12 : 14,
                padding: isMobile ? '18px 28px' : '20px 32px',
                fontSize: isMobile ? 13 : 14,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                borderRadius: isMobile ? 12 : 14,
                background: 'linear-gradient(135deg, #4A7FBF 0%, #1E5EFF 50%, #0F2A44 100%)',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "var(--font-body)",
                boxShadow: '0 6px 24px rgba(30, 94, 255, 0.3)',
                transition: 'all 0.3s ease',
              }}
              whileHover={{
                scale: 1.02,
                boxShadow: '0 10px 36px rgba(30, 94, 255, 0.4)',
              }}
              whileTap={{ scale: 0.98 }}
            >
              View Full Market Data
              <HiOutlineArrowRight
                style={{
                  width: isMobile ? 18 : 20,
                  height: isMobile ? 18 : 20,
                  transition: 'transform 0.3s ease',
                  transform: isHovered ? 'translateX(5px)' : 'translateX(0)',
                }}
              />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

