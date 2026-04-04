import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  HiOutlineXMark,
  HiOutlineBuildingOffice,
  HiOutlineMapPin,
  HiOutlineChevronUp,
  HiOutlineSparkles,
  HiOutlineArrowTrendingUp,
  HiOutlineHome,
  HiOutlineBanknotes,
  HiOutlinePlusCircle,
} from 'react-icons/hi2';
import { useZoneData } from '../../hooks/useZoneData';
import ProjectCard from './ProjectCard';

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 24, stiffness: 180 } },
};

/* ── Section Card with visible border box ── */
function SectionCard({ title, icon: Icon, children, badge, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '12px',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          borderBottom: open ? '1px solid rgba(255,255,255,0.08)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {Icon && <Icon style={{ width: '16px', height: '16px', color: 'var(--gold)', flexShrink: 0 }} />}
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--cream)',
          }}>
            {title}
          </span>
          {badge !== undefined && badge !== null && (
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '6px',
              marginLeft: '4px',
              background: 'rgba(201,169,110,0.15)',
              color: 'var(--gold)',
            }}>
              {badge}
            </span>
          )}
        </div>
        <motion.div animate={{ rotate: open ? 0 : 180 }} transition={{ duration: 0.2 }}>
          <HiOutlineChevronUp style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }} />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '16px 20px' }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ZoneDetailPanel({ selectedZone, onClose }) {
  const { data, loading, error } = useZoneData(selectedZone);
  const [activeBHK, setActiveBHK] = useState('bhk2');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {selectedZone && (
        <>
          {/* Backdrop */}
          <motion.div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 40,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sliding Panel */}
          <motion.div
            key={selectedZone}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              height: '100%',
              zIndex: 50,
              display: 'flex',
              width: 'min(96vw, 920px)',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 200 }}
          >

            {/* ══════════ LEFT PANEL ══════════ */}
            {isDesktop && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                width: '280px',
                flexShrink: 0,
                padding: '28px',
                background: '#0f1115',
                borderRight: '1px solid rgba(255,255,255,0.08)',
              }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '14px', color: '#0f1115' }}>D</span>
                  </div>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--cream)' }}>Dayaar</span>
                </div>

                {/* Title */}
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: 900,
                  lineHeight: 1.2,
                  marginBottom: '16px',
                  color: 'var(--cream)',
                  fontFamily: 'Outfit, sans-serif',
                }}>
                  Full Market Data
                </h2>

                {data && (
                  <>
                    {/* Badge row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                      <span style={{
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        fontWeight: 700,
                        padding: '5px 10px',
                        borderRadius: '6px',
                        background: 'rgba(201,169,110,0.12)',
                        color: 'var(--gold)',
                        border: '1px solid rgba(201,169,110,0.15)',
                      }}>
                        Premium Zone
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>· Inter</span>
                    </div>

                    <p style={{ fontSize: '13px', lineHeight: 1.7, marginBottom: '32px', color: 'var(--text-secondary)' }}>
                      {data.description}
                    </p>

                    <button
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        color: 'var(--gold)',
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                      }}
                    >
                      <HiOutlinePlusCircle style={{ width: '16px', height: '16px' }} />
                      Add s information
                    </button>
                  </>
                )}

                <div style={{ flex: 1 }} />
              </div>
            )}

            {/* ══════════ RIGHT PANEL ══════════ */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              background: '#0a0c10',
            }}>
              {/* Header bar */}
              <div style={{
                flexShrink: 0,
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(10,12,16,0.98)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--gold)',
                    boxShadow: '0 0 10px rgba(201,169,110,0.6)',
                    display: 'inline-block',
                  }} />
                  <span style={{
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    fontWeight: 700,
                    color: 'var(--cream)',
                  }}>
                    Full Market Data
                  </span>
                </div>
                <motion.button
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-muted)',
                  }}
                  onClick={onClose}
                  whileHover={{ borderColor: 'rgba(255,255,255,0.25)', color: 'var(--cream)' }}
                  whileTap={{ scale: 0.92 }}
                >
                  <HiOutlineXMark style={{ width: '16px', height: '16px' }} />
                </motion.button>
              </div>

              {/* Scrollable content */}
              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

                {loading && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <motion.div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: '2px solid var(--border)',
                        borderTopColor: 'var(--gold)',
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                )}

                {error && (
                  <div style={{ padding: '32px', color: '#f87171', textAlign: 'center', fontSize: '14px' }}>
                    {error}
                  </div>
                )}

                {data && !loading && (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                  >
                    {/* ── Zone Header ── */}
                    <motion.div variants={fadeIn} style={{ padding: '24px 24px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        fontWeight: 700,
                        padding: '5px 10px',
                        borderRadius: '6px',
                        marginBottom: '12px',
                        background: 'rgba(201,169,110,0.12)',
                        color: 'var(--gold)',
                        border: '1px solid rgba(201,169,110,0.15)',
                      }}>
                        Premium Zone
                      </span>
                      <h2 style={{
                        fontSize: '42px',
                        fontWeight: 900,
                        lineHeight: 1.05,
                        marginBottom: '8px',
                        color: 'var(--cream)',
                        fontFamily: 'Outfit, sans-serif',
                      }}>
                        {data.name}
                      </h2>
                      <p style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.02em', marginBottom: '10px', color: 'var(--gold-dark)' }}>
                        {data.subtitle}
                      </p>
                      <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                        {data.description}
                      </p>
                    </motion.div>

                    {/* ── Per Sq.Ft + Yield ── */}
                    <motion.div variants={fadeIn} style={{ padding: '0 24px 16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {/* Per Sq Ft */}
                        <div style={{
                          padding: '16px',
                          borderRadius: '12px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <HiOutlineBuildingOffice style={{ width: '16px', height: '16px', color: 'var(--gold)', flexShrink: 0 }} />
                            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--text-muted)' }}>
                              Per Sq. Ft
                            </span>
                          </div>
                          <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--cream)' }}>
                            {data.pricePerSqFt}
                          </div>
                        </div>

                        {/* Yield */}
                        <div style={{
                          padding: '16px',
                          borderRadius: '12px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <HiOutlineArrowTrendingUp style={{ width: '16px', height: '16px', color: '#22c55e', flexShrink: 0 }} />
                            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--text-muted)' }}>
                              Yield
                            </span>
                          </div>
                          <div style={{ fontSize: '26px', fontWeight: 900, color: '#22c55e' }}>
                            {data.rentalYield}
                          </div>
                          {/* Green progress bar */}
                          <div style={{ marginTop: '8px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: '65%', borderRadius: '2px', background: 'linear-gradient(90deg, #16a34a, #22c55e)' }} />
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* ── PRICE RANGES ── */}
                    <motion.div variants={fadeIn} style={{ padding: '0 24px 4px' }}>
                      <SectionCard title="Price Ranges" icon={HiOutlineBuildingOffice} defaultOpen={true}>
                        {/* BHK Tabs */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          marginBottom: '20px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(0,0,0,0.2)',
                        }}>
                          {[
                            { key: 'bhk1', label: '1BHK' },
                            { key: 'bhk2', label: '2BHK' },
                            { key: 'bhk3', label: '3BHK' },
                          ].map((tab, i) => (
                            <button
                              key={tab.key}
                              style={{
                                padding: '12px 0',
                                fontSize: '11px',
                                fontWeight: 700,
                                letterSpacing: '0.05em',
                                cursor: 'pointer',
                                border: 'none',
                                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                                background: activeBHK === tab.key ? 'rgba(201,169,110,0.2)' : 'transparent',
                                color: activeBHK === tab.key ? 'var(--gold)' : 'var(--text-muted)',
                                transition: 'all 0.2s',
                              }}
                              onClick={() => setActiveBHK(tab.key)}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* Buy / Rent values */}
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={activeBHK}
                            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            transition={{ duration: 0.15 }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                <HiOutlineHome style={{ width: '14px', height: '14px', color: 'var(--gold-dark)', flexShrink: 0 }} />
                                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--text-muted)' }}>Buy</span>
                              </div>
                              <p style={{ fontSize: '26px', fontWeight: 900, lineHeight: 1.2, color: 'var(--cream)', margin: 0 }}>
                                {data.priceRange?.[activeBHK]?.price || '—'}
                              </p>
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                <HiOutlineBanknotes style={{ width: '14px', height: '14px', color: 'var(--gold-dark)', flexShrink: 0 }} />
                                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--text-muted)' }}>Rent/Mo</span>
                              </div>
                              <p style={{ fontSize: '26px', fontWeight: 900, lineHeight: 1.2, color: 'var(--cream)', margin: 0 }}>
                                {data.priceRange?.[activeBHK]?.rent || '—'}
                              </p>
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </SectionCard>
                    </motion.div>

                    {/* ── CONNECTIVITY ── */}
                    {data.demographics?.connectivity && (
                      <motion.div variants={fadeIn} style={{ padding: '0 24px 4px' }}>
                        <SectionCard
                          title="Connectivity"
                          icon={HiOutlineMapPin}
                          badge={data.demographics.connectivity.length}
                          defaultOpen={true}
                        >
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {data.demographics.connectivity.map((c) => (
                              <span
                                key={c}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  background: 'rgba(255,255,255,0.03)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  color: 'var(--cream-dim)',
                                }}
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </SectionCard>
                      </motion.div>
                    )}

                    {/* ── CURATED PROJECTS ── */}
                    {data.projects?.length > 0 && (
                      <motion.div variants={fadeIn} style={{ padding: '0 24px 4px' }}>
                        <SectionCard
                          title="Curated Projects"
                          icon={HiOutlineSparkles}
                          badge={data.projects.length}
                          defaultOpen={true}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {data.projects.map((project, i) => (
                              <ProjectCard key={project.codename} project={project} index={i} />
                            ))}
                          </div>
                        </SectionCard>
                      </motion.div>
                    )}

                    <div style={{ height: '40px' }} />
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
