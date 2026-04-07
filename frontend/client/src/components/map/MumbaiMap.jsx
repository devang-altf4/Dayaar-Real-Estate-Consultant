import { motion } from 'framer-motion';
import { useState } from 'react';
import { ZONE_ORDER, ZONE_INFO } from '../../data/zones';
import { ZONE_PATHS } from '../../data/zones';
import { HiOutlineArrowRight } from 'react-icons/hi2';

const ZONE_IMAGES = {
  'mira-road': '/images/zones/mira-road.png',
  'makabo': '/images/zones/makabo.png',
  'andheri': '/images/zones/andheri.png',
  'western-suburbs': '/images/zones/western-suburbs.png',
  'south-central': '/images/zones/south-central.png',
  'sobo': '/images/zones/sobo.png',
};

export default function MumbaiMap({ onZoneSelect, selectedZone }) {
  const [hoveredZone, setHoveredZone] = useState(null);

  return (
    <section id="zones-section" className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#050a18]" />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `
            radial-gradient(ellipse 50% 40% at 20% 30%, rgba(245,158,11,0.1) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 80% 70%, rgba(6,182,212,0.08) 0%, transparent 50%)
          `,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.span
            className="inline-block text-amber-500 text-xs font-bold uppercase tracking-[0.25em] mb-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Explore Mumbai
          </motion.span>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mt-2 mb-5"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Premium{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #fbbf24, #f97316)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Investment Zones
            </span>
          </h2>
          <p className="text-slate-500 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Click on any zone to discover real-time market data, pricing, and curated project listings across Mumbai's most sought-after neighborhoods.
          </p>
        </motion.div>

        {/* Zone Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ZONE_ORDER.map((zoneId, index) => {
            const zone = ZONE_INFO[zoneId];
            const color = ZONE_PATHS[zoneId].color;
            const isActive = hoveredZone === zoneId;

            return (
              <motion.div
                key={zoneId}
                className="group relative cursor-pointer"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: index * 0.1, duration: 0.6, type: 'spring', damping: 15 }}
                whileHover={{ y: -8 }}
                whileTap={{ scale: 0.98 }}
                onMouseEnter={() => setHoveredZone(zoneId)}
                onMouseLeave={() => setHoveredZone(null)}
                onClick={() => onZoneSelect(zoneId)}
                style={{ perspective: '800px' }}
              >
                <motion.div
                  className="relative rounded-3xl overflow-hidden"
                  style={{
                    transformStyle: 'preserve-3d',
                    boxShadow: isActive
                      ? `0 20px 60px rgba(0,0,0,0.5), 0 0 30px ${color}20`
                      : '0 10px 40px rgba(0,0,0,0.3)',
                  }}
                  whileHover={{ rotateX: -3, rotateY: 2 }}
                >
                  {/* Image */}
                  <div className="relative h-56 sm:h-64 overflow-hidden">
                    <motion.img
                      src={ZONE_IMAGES[zoneId]}
                      alt={zone.name}
                      className="w-full h-full object-cover"
                      whileHover={{ scale: 1.08 }}
                      transition={{ duration: 0.6 }}
                    />
                    {/* Image overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />

                    {/* Zone color indicator */}
                    <div className="absolute top-4 left-4">
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          background: 'rgba(0,0,0,0.5)',
                          backdropFilter: 'blur(8px)',
                          border: `1px solid ${color}50`,
                          color: color,
                        }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
                        {zone.name}
                      </div>
                    </div>

                    {/* Explore arrow (appears on hover) */}
                    <motion.div
                      className="absolute top-4 right-4"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: isActive ? 1 : 0, scale: isActive ? 1 : 0.8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{
                          background: color,
                          boxShadow: `0 0 20px ${color}60`,
                        }}
                      >
                        <HiOutlineArrowRight className="w-4 h-4 text-white" />
                      </div>
                    </motion.div>
                  </div>

                  {/* Content */}
                  <div className="p-5" style={{ background: 'linear-gradient(180deg, #0a1628, #0d1b30)' }}>
                    <p className="text-slate-500 text-xs mb-2">{zone.subtitle}</p>
                    <p className="text-slate-400 text-xs leading-relaxed">{zone.description}</p>

                    {/* Bottom bar with accent */}
                    <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: `1px solid rgba(255,255,255,0.06)` }}>
                      <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">View Market Data</span>
                      <motion.span
                        className="text-xs font-bold"
                        style={{ color }}
                        animate={{ x: isActive ? 4 : 0 }}
                      >
                        →
                      </motion.span>
                    </div>
                  </div>

                  {/* Border glow on hover */}
                  <motion.div
                    className="absolute inset-0 rounded-3xl pointer-events-none"
                    style={{ border: `1px solid ${isActive ? color + '40' : 'rgba(255,255,255,0.06)'}` }}
                    animate={{
                      borderColor: isActive ? color + '40' : 'rgba(255,255,255,0.06)',
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
