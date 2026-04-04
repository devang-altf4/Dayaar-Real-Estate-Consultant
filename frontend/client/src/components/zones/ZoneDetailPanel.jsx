/**
 * ZoneDetailPanel — EXACT pixel match to Stitch reference:
 *
 * Key design elements from Stitch:
 *  1. Two-panel layout: Left info panel + Right scrollable data
 *  2. Section cards have visible borders (rgba(255,255,255,0.1))  
 *  3. BHK tabs with selected state having gold border top
 *  4. Per Sq.Ft + Yield side by side with distinct styling
 *  5. Buy/Rent text is LARGE and bold
 *  6. Connectivity tags in horizontal flex wrap
 *  7. Project cards with status badges (UNDER CONSTRUCTION, PRE-LAUNCH)
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
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
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 24, stiffness: 180 },
  },
};

/* ═══ Bordered Section Card — Stitch style with collapsible header ═══ */
function SectionCard({ title, icon: Icon, children, badge, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer"
        style={{ borderBottom: open ? '1px solid rgba(255,255,255,0.08)' : 'none' }}
      >
        <div className="flex items-center gap-2.5">
          {Icon && (
            <Icon className="w-4 h-4" style={{ color: 'var(--gold)' }} />
          )}
          <span
            className="text-[12px] font-bold uppercase tracking-[0.08em]"
            style={{ color: 'var(--cream)' }}
          >
            {title}
          </span>
          {badge && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-md ml-1"
              style={{
                background: 'rgba(201,169,110,0.15)',
                color: 'var(--gold)',
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: open ? 0 : 180 }}
          transition={{ duration: 0.2 }}
        >
          <HiOutlineChevronUp
            className="w-4 h-4"
            style={{ color: 'var(--text-muted)' }}
          />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ZoneDetailPanel({ selectedZone, onClose }) {
  const { data, loading, error } = useZoneData(selectedZone);
  const [activeBHK, setActiveBHK] = useState('bhk2');

  return (
    <AnimatePresence mode="wait">
      {selectedZone && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key={selectedZone}
            className="fixed top-0 right-0 h-full z-50 flex"
            style={{
              width: 'min(96vw, 920px)',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 200 }}
          >
            {/* ═══════════ LEFT PANEL — Stitch Style ═══════════ */}
            <div
              className="hidden md:flex flex-col w-[280px] shrink-0 p-7"
              style={{
                background: '#0f1115',
                borderRight: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {/* Dayaar Logo */}
              <div className="flex items-center gap-2.5 mb-10">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--gold), var(--gold-dark))',
                  }}
                >
                  <span
                    className="font-[Outfit] font-black text-sm"
                    style={{ color: '#0f1115' }}
                  >
                    D
                  </span>
                </div>
                <span
                  className="font-[Outfit] font-bold text-[16px]"
                  style={{ color: 'var(--cream)' }}
                >
                  Dayaar
                </span>
              </div>

              <h2
                className="text-[24px] font-black leading-tight mb-4"
                style={{ color: 'var(--cream)', fontFamily: 'Outfit, sans-serif' }}
              >
                Full Market Data
              </h2>

              {data && (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className="text-[9px] uppercase tracking-[0.1em] font-bold px-2.5 py-1.5 rounded-md"
                      style={{
                        background: 'rgba(201,169,110,0.12)',
                        color: 'var(--gold)',
                        border: '1px solid rgba(201,169,110,0.15)',
                      }}
                    >
                      Premium Zone
                    </span>
                    <span
                      className="text-[11px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      · Inter
                    </span>
                  </div>

                  <p
                    className="text-[13px] leading-[1.7] mb-8"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {data.description}
                  </p>

                  <button
                    className="flex items-center gap-2 text-[13px] font-medium cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--gold)' }}
                  >
                    <HiOutlinePlusCircle className="w-4 h-4" />
                    Add s information
                  </button>
                </>
              )}

              <div className="flex-1" />
            </div>

            {/* ═══════════ RIGHT PANEL — Stitch Style ═══════════ */}
            <div
              className="flex-1 flex flex-col overflow-hidden"
              style={{ background: '#0a0c10' }}
            >
              {/* Header bar with gold dot */}
              <div
                className="shrink-0 px-6 py-4 flex items-center justify-between"
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(10,12,16,0.98)',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: 'var(--gold)',
                      boxShadow: '0 0 10px rgba(201,169,110,0.6)',
                    }}
                  />
                  <span
                    className="text-[11px] uppercase tracking-[0.15em] font-bold"
                    style={{ color: 'var(--cream)' }}
                  >
                    Full Market Data
                  </span>
                </div>
                <motion.button
                  className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-muted)',
                  }}
                  onClick={onClose}
                  whileHover={{
                    borderColor: 'rgba(255,255,255,0.2)',
                    color: 'var(--cream)',
                  }}
                  whileTap={{ scale: 0.92 }}
                >
                  <HiOutlineXMark className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {loading && (
                  <div className="flex items-center justify-center h-full">
                    <motion.div
                      className="w-10 h-10 rounded-full"
                      style={{
                        border: '2px solid var(--border)',
                        borderTopColor: 'var(--gold)',
                      }}
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    />
                  </div>
                )}

                {error && (
                  <div className="flex items-center justify-center h-full px-8">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {data && !loading && (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: { transition: { staggerChildren: 0.05 } },
                    }}
                  >
                    {/* ── Zone Header — Stitch Style ── */}
                    <motion.div variants={fadeIn} className="px-6 pt-6 pb-4">
                      <span
                        className="text-[9px] uppercase tracking-[0.1em] font-bold px-2.5 py-1.5 rounded-md inline-block mb-3"
                        style={{
                          background: 'rgba(201,169,110,0.12)',
                          color: 'var(--gold)',
                          border: '1px solid rgba(201,169,110,0.15)',
                        }}
                      >
                        Premium Zone
                      </span>
                      <h2
                        className="text-[36px] sm:text-[42px] font-black leading-[1.05] mb-2"
                        style={{ color: 'var(--cream)', fontFamily: 'Outfit, sans-serif' }}
                      >
                        {data.name}
                      </h2>
                      <p
                        className="text-[13px] font-semibold tracking-wide mb-3"
                        style={{ color: 'var(--gold-dark)' }}
                      >
                        {data.subtitle}
                      </p>
                      <p
                        className="text-[13px] leading-[1.6]"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {data.description}
                      </p>
                    </motion.div>

                    {/* ── Per Sq.Ft + Yield — Stitch Layout ── */}
                    <motion.div variants={fadeIn} className="px-6 pb-4">
                      <div className="grid grid-cols-2 gap-3">
                        {/* Per Sq.Ft */}
                        <div
                          className="p-4 rounded-xl"
                          style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.1)',
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <HiOutlineBuildingOffice
                              className="w-4 h-4"
                              style={{ color: 'var(--gold)' }}
                            />
                            <span
                              className="text-[10px] uppercase tracking-[0.08em] font-bold"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              Per Sq. Ft
                            </span>
                          </div>
                          <div
                            className="text-[22px] sm:text-[26px] font-black"
                            style={{ color: 'var(--cream)' }}
                          >
                            {data.pricePerSqFt}
                          </div>
                        </div>

                        {/* Yield */}
                        <div
                          className="p-4 rounded-xl"
                          style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.1)',
                          }}
                        >
                          <div className="flex items-center gap-1.5 mb-2">
                            <HiOutlineArrowTrendingUp
                              className="w-4 h-4"
                              style={{ color: '#22c55e' }}
                            />
                            <span
                              className="text-[10px] uppercase tracking-[0.08em] font-bold"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              Yield
                            </span>
                          </div>
                          <div
                            className="text-[22px] sm:text-[26px] font-black"
                            style={{ color: '#22c55e' }}
                          >
                            {data.rentalYield}
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* ── PRICE RANGES — Stitch Style ── */}
                    <motion.div variants={fadeIn} className="px-6 pb-4">
                      <SectionCard
                        title="Price Ranges"
                        icon={HiOutlineBuildingOffice}
                        defaultOpen={true}
                      >
                        {/* BHK Tab Pills — Stitch style segmented control */}
                        <div
                          className="grid grid-cols-3 rounded-lg overflow-hidden mb-5"
                          style={{
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(0,0,0,0.2)',
                          }}
                        >
                          {[
                            { key: 'bhk1', label: '1BHK' },
                            { key: 'bhk2', label: '2BHK' },
                            { key: 'bhk3', label: '3BHK' },
                          ].map((tab, i) => (
                            <button
                              key={tab.key}
                              className="py-3 text-[11px] font-bold tracking-wider cursor-pointer transition-all duration-200"
                              style={{
                                background:
                                  activeBHK === tab.key
                                    ? 'rgba(201,169,110,0.2)'
                                    : 'transparent',
                                color:
                                  activeBHK === tab.key
                                    ? 'var(--gold)'
                                    : 'var(--text-muted)',
                                borderLeft:
                                  i > 0
                                    ? '1px solid rgba(255,255,255,0.08)'
                                    : 'none',
                              }}
                              onClick={() => setActiveBHK(tab.key)}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* Buy / Rent — Large bold text */}
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={activeBHK}
                            className="grid grid-cols-2 gap-6"
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            transition={{ duration: 0.15 }}
                          >
                            <div>
                              <div className="flex items-center gap-1.5 mb-2">
                                <HiOutlineHome
                                  className="w-3.5 h-3.5"
                                  style={{ color: 'var(--gold-dark)' }}
                                />
                                <span
                                  className="text-[10px] uppercase tracking-[0.08em] font-bold"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  Buy
                                </span>
                              </div>
                              <p
                                className="text-[22px] sm:text-[26px] font-black leading-tight"
                                style={{ color: 'var(--cream)' }}
                              >
                                {data.priceRange?.[activeBHK]?.price || '—'}
                              </p>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 mb-2">
                                <HiOutlineBanknotes
                                  className="w-3.5 h-3.5"
                                  style={{ color: 'var(--gold-dark)' }}
                                />
                                <span
                                  className="text-[10px] uppercase tracking-[0.08em] font-bold"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  Rent/Mo
                                </span>
                              </div>
                              <p
                                className="text-[22px] sm:text-[26px] font-black leading-tight"
                                style={{ color: 'var(--cream)' }}
                              >
                                {data.priceRange?.[activeBHK]?.rent || '—'}
                              </p>
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </SectionCard>
                    </motion.div>

                    {/* ── CONNECTIVITY — Stitch Style ── */}
                    {data.demographics?.connectivity && (
                      <motion.div variants={fadeIn} className="px-6 pb-4">
                        <SectionCard
                          title="Connectivity"
                          icon={HiOutlineMapPin}
                          badge={data.demographics.connectivity.length}
                          defaultOpen={true}
                        >
                          <div className="flex flex-wrap gap-2">
                            {data.demographics.connectivity.map((c) => (
                              <span
                                key={c}
                                className="px-3 py-1.5 rounded-md text-[11px] font-medium"
                                style={{
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

                    {/* ── CURATED PROJECTS — Stitch Style ── */}
                    {data.projects?.length > 0 && (
                      <motion.div variants={fadeIn} className="px-6 pb-4">
                        <SectionCard
                          title="Curated Projects"
                          icon={HiOutlineSparkles}
                          badge={data.projects.length}
                          defaultOpen={true}
                        >
                          <div className="space-y-3">
                            {data.projects.map((project, i) => (
                              <ProjectCard
                                key={project.codename}
                                project={project}
                                index={i}
                              />
                            ))}
                          </div>
                        </SectionCard>
                      </motion.div>
                    )}

                    <div className="h-10" />
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
