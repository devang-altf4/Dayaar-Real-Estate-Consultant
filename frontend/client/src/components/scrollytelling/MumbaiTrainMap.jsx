/**
 * MumbaiTrainMap — Full-screen satellite map with curvy train path.
 * Zone card uses inline CSS to avoid Tailwind v4 issues.
 */

import { useRef, useEffect, useState } from 'react';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { ZONE_ORDER, ZONE_INFO } from '../../data/zones';
import { HiOutlineArrowRight } from 'react-icons/hi2';
import { TbBuildingSkyscraper } from 'react-icons/tb';
import { IoTrendingUpOutline } from 'react-icons/io5';

// Geographic positions matching Mumbai's Western Line (real proportional distances)
// Mira Road is far north, then Borivali cluster, Andheri cluster, Bandra, Dadar, SoBo
// Positions tuned to match actual inter-station proportional spacing
const STATION_POSITIONS = [0.04, 0.20, 0.38, 0.56, 0.74, 0.92];

const ZONE_PRICES = {
  'mira-road':       '₹10.5K–₹14K',
  'makabo':          '₹20K–₹38K',
  'andheri':         '₹25K–₹45K',
  'western-suburbs': '₹40K–₹80K',
  'south-central':   '₹35K–₹65K',
  'sobo':            '₹50K–₹1.5L+',
};

const ZONE_STATIONS = {
  'mira-road':       ['Bhayandar', 'Mira Road', 'Dahisar'],
  'makabo':          ['Malad', 'Kandivali', 'Borivali'],
  'andheri':         ['Goregaon', 'to', 'Vile Parle'],
  'western-suburbs': ['Santa Cruz', 'Khar', 'Bandra'],
  'south-central':   ['Dadar', 'Parel', 'Mumbai Central'],
  'sobo':            ['Mumbai Central', 'Marine Drive', 'Colaba'],
};

const ZONE_HIGHLIGHTS = {
  'mira-road':       { growth: '+12% YoY', tag: 'Emerging',       config1: '₹45L – ₹80L',     config2: '₹75L – ₹1.30Cr',   config3: '₹1.20Cr – ₹1.90Cr' },
  'makabo':          { growth: '+8% YoY',  tag: 'Established',    config1: '₹90L – ₹1.40Cr',  config2: '₹1.40Cr – ₹2.60Cr', config3: '₹2.60Cr – ₹4.20Cr' },
  'andheri':         { growth: '+10% YoY', tag: 'Commercial Hub', config1: '₹1.20Cr – ₹2Cr',  config2: '₹2Cr – ₹4Cr',       config3: '₹4Cr – ₹7Cr' },
  'western-suburbs': { growth: '+7% YoY',  tag: 'Aspirational',   config1: '₹2Cr – ₹4Cr',     config2: '₹4Cr – ₹8Cr',       config3: '₹8Cr – ₹18Cr' },
  'south-central':   { growth: '+9% YoY',  tag: 'Renaissance',    config1: '₹1.80Cr – ₹3Cr',  config2: '₹3Cr – ₹6Cr',       config3: '₹6Cr – ₹12Cr' },
  'sobo':            { growth: '+6% YoY',  tag: 'Ultra-Premium',  config1: '₹3Cr – ₹8Cr',     config2: '₹8Cr – ₹20Cr',      config3: '₹20Cr – ₹50Cr+' },
};

// Mumbai Western Railway Line — path traced to exactly match reference image 2
// vbX=320,vbW=470 → path at x=461 appears at (461-320)/470 = 30% from left
// S-curve: starts slightly left, curves further LEFT through N.suburbs (coast bends),
// then right through Andheri/Bandra, then gently left again toward SoBo
const RAILWAY_PATH = `
  M 435,60
  C 428,105  418,158  408,208
  C 398,255  394,305  400,355
  C 406,400  418,442  426,488
  C 434,528  440,568  436,610
  C 432,650  428,690  432,732
  C 436,770  438,808  436,848
  C 434,872  431,884  428,900
`;

// Hook for responsive
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
}

export default function MumbaiTrainMap({ scrollProgress, activeIndex, onExploreZone, hasScrolled, scrollValue = 0 }) {
  const pathRef = useRef(null);
  const containerRef = useRef(null);
  const [pathLength, setPathLength] = useState(0);
  const [stationCoords, setStationCoords] = useState([]);
  const [trainPos, setTrainPos] = useState({ x: 435, y: 60 });
  const [containerSize, setContainerSize] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1268,
    h: typeof window !== 'undefined' ? window.innerHeight : 710,
  }));
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!pathRef.current) return;
    const len = pathRef.current.getTotalLength();
    setPathLength(len);
    const coords = STATION_POSITIONS.map((pct) => {
      const pt = pathRef.current.getPointAtLength(pct * len);
      return { x: pt.x, y: pt.y };
    });
    setStationCoords(coords);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const smoothProgress = useSpring(scrollProgress, {
    stiffness: 80, damping: 20, restDelta: 0.001,
  });

  useEffect(() => {
    if (!pathRef.current || pathLength === 0) return;
    const unsub = smoothProgress.on('change', (val) => {
      const clamped = Math.max(0, Math.min(val, 0.999));
      const pt = pathRef.current.getPointAtLength(clamped * pathLength);
      setTrainPos({ x: pt.x, y: pt.y });
    });
    return unsub;
  }, [smoothProgress, pathLength]);

  const dashOffset = useTransform(smoothProgress, [0, 1], [pathLength || 1200, 0]);

  // ─── Dynamic ViewBox — works on ANY screen size ───────────────────────────
  // Strategy: fix vbH to cover the full SVG path (y=40→920, span=880 units),
  // then derive vbW from the container's actual aspect ratio.
  // This guarantees height is ALWAYS the binding dimension in xMidYMid slice,
  // so the full north-to-south route is visible regardless of viewport width.
  //
  // Path center x≈420. Place it at 38% from left on desktop, 30% on mobile.
  const PATH_VB_Y    = 40;   // top of viewBox (slightly above first station y=60)
  const PATH_VB_H    = 880;  // covers y=40 → y=920  (path runs y=60 → y=900)
  const PATH_SVG_X   = 420;  // approximate x-center of the railway path
  const pathLeftPct  = isMobile ? 0.30 : 0.38;

  const cH = containerSize.h || window.innerHeight;
  const cW = containerSize.w || window.innerWidth;

  // vbW = cW * (PATH_VB_H / cH)  →  aspect ratio of vbW/vbH == cW/cH
  // When these match, scale_H == scale_W, so ANY scale is binding (no clipping).
  const vbH = PATH_VB_H;
  const vbY = PATH_VB_Y;
  const vbW = (cW / cH) * vbH;
  const vbX = PATH_SVG_X - pathLeftPct * vbW;
  const viewBox = `${vbX} ${vbY} ${vbW} ${vbH}`;

  const svgToScreen = (svgX, svgY) => {
    // With matched aspect ratios, scale = cH/vbH = cW/vbW (same value).
    const scale = cH / vbH;
    return {
      x: (svgX - vbX) * scale,
      y: (svgY - vbY) * scale,
    };
  };

  const activeZoneId = ZONE_ORDER[activeIndex];
  const activeZone = ZONE_INFO[activeZoneId];
  const activeHighlight = ZONE_HIGHLIGHTS[activeZoneId];
  const activePrice = ZONE_PRICES[activeZoneId];
  const activeCoord = stationCoords[activeIndex];

  // On mobile, flip popup to TOP when train is in lower half of the map (Western Suburbs onwards)
  // This keeps the map animation visible as the train goes lower
  const popupOnTop = isMobile && activeIndex >= 3;

  // Hide popup when approaching the contact section (last 5% of scroll)
  // or when scrollValue is 0 (before scrolling)
  const hideNearContact = scrollValue > 0.95;

  // Card position: Desktop = near station, Mobile = bottom or top of screen
  let cardScreenPos = { x: 16, y: 200 };
  if (isMobile) {
    // Mobile: position handled by top/bottom CSS
    cardScreenPos = { x: 12, y: 'auto' };
  } else if (activeCoord) {
    const sp = svgToScreen(activeCoord.x, activeCoord.y);
    const cardW = 290;
    // index 0 (Mira Road) force LEFT; rest: even=left, odd=right
    const isRight = activeIndex === 0 ? false : activeIndex % 2 !== 0;
    if (!isRight) {
      cardScreenPos = {
        x: Math.max(16, sp.x - cardW - 50),
        y: Math.max(80, Math.min(sp.y - 60, containerSize.h - 340)),
      };
    } else {
      cardScreenPos = {
        x: Math.min(containerSize.w - cardW - 16, sp.x + 50),
        y: Math.max(80, Math.min(sp.y - 60, containerSize.h - 340)),
      };
    }
  }


  // BHK data
  const bhkData = [
    { label: '1 BHK', value: activeHighlight?.config1 },
    { label: '2 BHK', value: activeHighlight?.config2 },
    { label: '3 BHK', value: activeHighlight?.config3 },
  ];

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      {/* SATELLITE MAP */}
      <img
        src="/images/mumbai-map.png"
        alt="Mumbai satellite map"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'brightness(0.4) contrast(1.15) saturate(0.6)',
        }}
      />
      {/* Vignette */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 80% 70% at 55% 50%, transparent 30%, rgba(10,10,15,0.6) 100%)',
      }} />

      {/* SVG OVERLAY */}
      <svg
        viewBox={viewBox}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="stationGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Track background */}
        <path ref={pathRef} d={RAILWAY_PATH} fill="none" stroke="rgba(255,255,255,0.1)"
          strokeWidth="2" strokeLinecap="round" strokeDasharray="5 4" />

        {/* Track progress (blue) */}
        <motion.path d={RAILWAY_PATH} fill="none" stroke="#1E5EFF" strokeWidth="2.5"
          strokeLinecap="round"
          style={{
            strokeDasharray: pathLength || 1200,
            strokeDashoffset: dashOffset,
            filter: 'drop-shadow(0 0 8px rgba(30,94,255,0.5))',
          }}
        />

        {/* Stations + Labels */}
        {stationCoords.map((coord, i) => {
          const zoneId = ZONE_ORDER[i];
          const isActive = activeIndex === i;
          const isPast = activeIndex > i;
          const zoneName = ZONE_INFO[zoneId].name.toUpperCase();
          const price = ZONE_PRICES[zoneId];
          const stations = ZONE_STATIONS[zoneId];
          const isRight = true;
          const lx = coord.x + 20;
          const anchor = 'start';

          return (
            <g key={zoneId}>
              {isActive && (
                <>
                  <motion.circle cx={coord.x} cy={coord.y} r="18" fill="none" stroke="#1E5EFF" strokeWidth="0.8"
                    initial={{ r: 8, opacity: 0.7 }} animate={{ r: 26, opacity: 0 }}
                    transition={{ duration: 2, repeat: Infinity }} />
                  <motion.circle cx={coord.x} cy={coord.y} r="12" fill="none" stroke="#1E5EFF" strokeWidth="0.5"
                    initial={{ r: 6, opacity: 0.5 }} animate={{ r: 20, opacity: 0 }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
                </>
              )}
              <circle cx={coord.x} cy={coord.y}
                r={isActive ? 7 : isPast ? 4 : 3}
                fill={isActive ? '#1E5EFF' : isPast ? '#4A7FBF' : 'rgba(255,255,255,0.25)'}
                stroke={isActive ? 'rgba(10,10,15,0.8)' : 'none'}
                strokeWidth={isActive ? 2.5 : 0}
                style={{ transition: 'all 0.5s cubic-bezier(0.4,0,0.2,1)', filter: isActive ? 'drop-shadow(0 0 12px rgba(30,94,255,0.8))' : 'none' }}
              />
              <line x1={coord.x + (isRight ? 9 : -9)} y1={coord.y}
                x2={lx - (isRight ? 2 : -2)} y2={coord.y}
                stroke={isActive ? '#1E5EFF' : 'rgba(255,255,255,0.06)'} strokeWidth="0.6" style={{ transition: 'all 0.4s' }} />
              <text x={lx} y={coord.y - 12} textAnchor={anchor}
                fill={isActive ? '#1E5EFF' : isPast ? 'rgba(169,201,255,0.45)' : 'rgba(169,201,255,0.15)'}
                fontSize={isActive ? '14' : '9'} fontFamily="Outfit, sans-serif"
                fontWeight={isActive ? '800' : '600'} letterSpacing="1.5"
                style={{ transition: 'all 0.5s', filter: isActive ? 'drop-shadow(0 0 8px rgba(30,94,255,0.5))' : 'none' }}>
                {ZONE_INFO[zoneId].name.toUpperCase()}
              </text>
              <motion.text x={lx} y={coord.y + 6} textAnchor={anchor}
                fill={isActive ? '#A9C9FF' : isPast ? 'rgba(169,201,255,0.2)' : 'rgba(169,201,255,0.06)'}
                fontSize={isActive ? '10' : '7.5'} fontFamily="Inter, sans-serif" fontWeight="700"
                style={{ transition: 'all 0.4s' }}>
                {price}/sqft
              </motion.text>
              {stations.map((s, si) => (
                <motion.text key={s} x={lx} y={coord.y + 22 + si * 13} textAnchor={anchor}
                  fill={isActive ? 'rgba(169,201,255,0.6)' : 'rgba(255,255,255,0.07)'}
                  fontSize="7.5" fontFamily="Inter, sans-serif" fontWeight="500" letterSpacing="0.8"
                  initial={false}
                  animate={{ opacity: isActive ? 1 : isPast ? 0.2 : 0.05, x: isActive ? 0 : (isRight ? -4 : 4) }}
                  transition={{ duration: 0.3, delay: si * 0.06 }}
                  style={{ textTransform: 'uppercase' }}>
                  {s}
                </motion.text>
              ))}
            </g>
          );
        })}

        {/* TRAIN */}
        <g>
          <circle cx={trainPos.x} cy={trainPos.y} r="14" fill="rgba(30,94,255,0.2)" style={{ filter: 'blur(6px)' }} />
          <rect x={trainPos.x - 9} y={trainPos.y - 5.5} width="18" height="11" rx="3"
            fill="#1E5EFF" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }} />
          <rect x={trainPos.x - 6} y={trainPos.y - 3.5} width="5" height="3.5" rx="1" fill="#0a0a0f" opacity="0.5" />
          <rect x={trainPos.x + 1} y={trainPos.y - 3.5} width="5" height="3.5" rx="1" fill="#0a0a0f" opacity="0.5" />
          <line x1={trainPos.x - 7} y1={trainPos.y + 6.5} x2={trainPos.x + 7} y2={trainPos.y + 6.5}
            stroke="#4A7FBF" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx={trainPos.x} cy={trainPos.y + 7} r="1" fill="#A9C9FF" />
        </g>

        <text x="140" y="450" fill="rgba(255,255,255,0.04)" fontSize="9" fontFamily="Inter" fontWeight="600"
          letterSpacing="4" transform="rotate(-70, 140, 450)" style={{ textTransform: 'uppercase' }}>
          Western Line
        </text>
      </svg>

      {/* ═══ COMPACT ZONE CARD - Responsive ═══ */}
      <AnimatePresence mode="wait">
        {hasScrolled && !hideNearContact && (
          <motion.div
            key={`${activeZoneId}-${popupOnTop ? 'top' : 'bot'}`}
            style={isMobile ? {
              // MOBILE: positioned at top or bottom depending on train position
              position: 'absolute',
              zIndex: 30,
              left: 12,
              right: 12,
              ...(popupOnTop
                ? { top: 60, bottom: 'auto' }
                : { bottom: 12, top: 'auto' }),
              pointerEvents: 'auto',
            } : {
              // DESKTOP: positioned near station
              position: 'absolute',
              zIndex: 30,
              width: 290,
              left: cardScreenPos.x,
              top: cardScreenPos.y,
              pointerEvents: 'auto',
            }}
            initial={{ opacity: 0, y: isMobile ? (popupOnTop ? -30 : 30) : 0, scale: isMobile ? 1 : 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isMobile ? (popupOnTop ? -30 : 30) : 0, scale: isMobile ? 1 : 0.95 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          >
            <div
              style={{
                borderRadius: isMobile ? 14 : 12,
                overflow: 'hidden',
                background: 'linear-gradient(165deg, rgba(15, 42, 68, 0.97) 0%, rgba(11, 11, 13, 0.98) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(30, 94, 255, 0.15)',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
              }}
            >
              {/* Header */}
              <div style={{ padding: isMobile ? '12px 14px 0' : '12px 14px 0' }}>
                {/* Zone + Tag */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? 6 : 6 }}>
                  <span style={{ fontSize: isMobile ? 8 : 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#1E5EFF' }}>
                    Zone {String(activeIndex + 1).padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: isMobile ? 7 : 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: isMobile ? '3px 8px' : '3px 8px', borderRadius: 3, background: 'rgba(30, 94, 255, 0.1)', color: '#A9C9FF', border: '1px solid rgba(30, 94, 255, 0.2)' }}>
                    {activeHighlight?.tag}
                  </span>
                </div>

                {/* Zone Name */}
                <h3 style={{ fontSize: isMobile ? 22 : 22, fontWeight: 700, lineHeight: 1.1, color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", margin: 0, marginBottom: isMobile ? 4 : 5 }}>
                  {activeZone?.name}
                </h3>

                {/* Subtitle */}
                <p style={{ fontSize: isMobile ? 10 : 10, fontWeight: 500, color: '#A9C9FF', margin: 0, marginBottom: isMobile ? 3 : 4 }}>
                  {activeZone?.subtitle}
                </p>

                {/* Description */}
                <p style={{ fontSize: isMobile ? 9 : 10, lineHeight: 1.4, color: 'rgba(255, 255, 255, 0.5)', margin: 0, marginBottom: isMobile ? 10 : 10 }}>
                  {activeZone?.description}
                </p>

                {/* Metrics Row */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: isMobile ? 10 : 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <TbBuildingSkyscraper style={{ width: 10, height: 10, color: 'rgba(255, 255, 255, 0.4)' }} />
                      <span style={{ fontSize: 7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255, 255, 255, 0.4)' }}>Price/sqft</span>
                    </div>
                    <div style={{ fontSize: isMobile ? 15 : 15, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Outfit', sans-serif" }}>
                      {activePrice}/sqft
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginBottom: 2 }}>
                      <IoTrendingUpOutline style={{ width: 10, height: 10, color: '#22c55e' }} />
                      <span style={{ fontSize: 7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#22c55e' }}>Growth</span>
                    </div>
                    <div style={{ fontSize: isMobile ? 15 : 15, fontWeight: 700, color: '#22c55e', fontFamily: "'Outfit', sans-serif" }}>
                      {activeHighlight?.growth}
                    </div>
                  </div>
                </div>
              </div>

              {/* BHK Cards */}
              <div style={{ padding: isMobile ? '0 14px 12px' : '0 14px 12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 6 : 6, marginBottom: isMobile ? 10 : 10 }}>
                  {bhkData.map((item, idx) => {
                    return (
                      <div
                        key={item.label}
                        style={{
                          padding: isMobile ? '8px 4px' : '8px 4px',
                          borderRadius: 8,
                          textAlign: 'center',
                          background: 'rgba(30, 94, 255, 0.05)',
                          border: '1px solid rgba(30, 94, 255, 0.1)',
                        }}
                      >
                        <span style={{ fontSize: isMobile ? 7 : 7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', display: 'block', marginBottom: 3, color: 'rgba(255, 255, 255, 0.4)' }}>
                          {item.label}
                        </span>
                        <span style={{ fontSize: isMobile ? 9 : 10, fontWeight: 700, display: 'block', color: '#FFFFFF', lineHeight: 1.2, fontFamily: "'Outfit', sans-serif" }}>
                          {item.value}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* CTA Button */}
                <motion.button
                  onClick={() => onExploreZone?.(activeZoneId)}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: isMobile ? '10px 16px' : '10px 16px',
                    fontSize: isMobile ? 9 : 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #1E5EFF 0%, #4A7FBF 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    boxShadow: '0 3px 12px rgba(30, 94, 255, 0.3)',
                  }}
                  whileHover={{ scale: 1.02, boxShadow: '0 5px 18px rgba(30, 94, 255, 0.4)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  View Full Market Data
                  <HiOutlineArrowRight style={{ width: 12, height: 12, transition: 'transform 0.2s', transform: isHovered ? 'translateX(2px)' : 'translateX(0)' }} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top badge — hidden on mobile when popup is on top to avoid overlap */}
      {!(isMobile && popupOnTop) && (
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          zIndex: 20,
        }}
      >
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 14,
            background: 'rgba(11, 11, 13, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(30, 94, 255, 0.15)',
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              display: 'block',
              color: '#4A7FBF',
            }}
          >
            Mumbai Real Estate Map
          </span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              display: 'block',
              marginTop: 4,
              color: '#FFFFFF',
            }}
          >
            {ZONE_INFO[ZONE_ORDER[activeIndex]]?.name}
          </span>
        </div>
      </div>
      )}

      {/* Compass */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          zIndex: 20,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(11, 11, 13, 0.6)',
            border: '1px solid rgba(30, 94, 255, 0.15)',
          }}
        >
          <span style={{ fontSize: 9, fontWeight: 700, color: '#4A7FBF' }}>N</span>
        </div>
      </div>
    </div>
  );
}
