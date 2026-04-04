import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { ZONE_INFO, ZONE_PATHS } from '../../data/zones';
import { HiOutlineArrowRight } from 'react-icons/hi2';

const ZONE_IMAGES = {
  'mira-road': '/images/zones/mira-road.png',
  'makabo': '/images/zones/makabo.png',
  'andheri': '/images/zones/andheri.png',
  'western-suburbs': '/images/zones/western-suburbs.png',
  'south-central': '/images/zones/south-central.png',
  'sobo': '/images/zones/sobo.png',
};

const ZONE_HIGHLIGHTS = {
  'mira-road': { price: '₹10.5K – ₹14K/sqft', growth: '12% YoY', tag: 'Emerging' },
  'makabo': { price: '₹20K – ₹38K/sqft', growth: '8% YoY', tag: 'Established' },
  'andheri': { price: '₹25K – ₹45K/sqft', growth: '10% YoY', tag: 'Commercial Hub' },
  'western-suburbs': { price: '₹40K – ₹80K/sqft', growth: '7% YoY', tag: 'Aspirational' },
  'south-central': { price: '₹35K – ₹65K/sqft', growth: '9% YoY', tag: 'Renaissance' },
  'sobo': { price: '₹50K – ₹1.5L+/sqft', growth: '6% YoY', tag: 'Ultra-Premium' },
};

export default function ZoneStory({ zoneId, index, onExplore, isEven }) {
  const ref = useRef(null);
  const zone = ZONE_INFO[zoneId];
  const highlight = ZONE_HIGHLIGHTS[zoneId];
  const image = ZONE_IMAGES[zoneId];

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const imgY = useTransform(scrollYProgress, [0, 1], ['-10%', '10%']);
  const imgScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.1, 1, 1.1]);
  const contentOpacity = useTransform(scrollYProgress, [0.1, 0.3, 0.7, 0.9], [0, 1, 1, 0]);
  const contentY = useTransform(scrollYProgress, [0.1, 0.3, 0.7, 0.9], [60, 0, 0, -60]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center overflow-hidden"
      id={`zone-${zoneId}`}
    >
      {/* Parallax background image */}
      <motion.div className="absolute inset-0" style={{ y: imgY, scale: imgScale }}>
        <img
          src={image}
          alt={zone.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </motion.div>

      {/* Overlays — direction depends on even/odd */}
      <div className="absolute inset-0" style={{
        background: isEven
          ? 'linear-gradient(90deg, rgba(10,10,15,0.92) 0%, rgba(10,10,15,0.7) 45%, rgba(10,10,15,0.3) 70%, transparent 100%)'
          : 'linear-gradient(270deg, rgba(10,10,15,0.92) 0%, rgba(10,10,15,0.7) 45%, rgba(10,10,15,0.3) 70%, transparent 100%)',
      }} />
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, rgba(10,10,15,0.4) 0%, transparent 30%, transparent 70%, rgba(10,10,15,0.6) 100%)',
      }} />

      {/* Gold divider line */}
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{
        background: 'linear-gradient(90deg, transparent 20%, rgba(201,169,110,0.2) 50%, transparent 80%)',
      }} />

      {/* Content */}
      <motion.div
        className={`relative z-10 container-luxury w-full flex ${isEven ? 'justify-start' : 'justify-end'}`}
        style={{ opacity: contentOpacity, y: contentY }}
      >
        <div className={`max-w-lg ${isEven ? '' : 'text-right'}`}>
          {/* Zone number */}
          <motion.div
            className={`flex items-center gap-3 mb-6 ${isEven ? '' : 'justify-end'}`}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-[10px] uppercase tracking-[0.3em] font-medium" style={{ color: 'var(--gold)' }}>
              Zone {String(index + 1).padStart(2, '0')}
            </span>
            <span className="w-8 h-px" style={{ background: 'var(--gold-dark)' }} />
            <span
              className="text-[9px] uppercase tracking-wider font-bold px-3 py-1 rounded-full"
              style={{
                background: 'rgba(201,169,110,0.12)',
                color: 'var(--gold)',
                border: '1px solid rgba(201,169,110,0.2)',
              }}
            >
              {highlight.tag}
            </span>
          </motion.div>

          {/* Zone name */}
          <motion.h2
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-3 leading-[0.95]"
            style={{ color: 'var(--cream)' }}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            {zone.name}
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            className="text-sm mb-2"
            style={{ color: 'var(--gold)' }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ delay: 0.4 }}
          >
            {zone.subtitle}
          </motion.p>

          {/* Description */}
          <motion.p
            className="text-sm sm:text-base mb-8 leading-relaxed"
            style={{ color: 'var(--cream-dim)' }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ delay: 0.5 }}
          >
            {zone.description}
          </motion.p>

          {/* Quick stats */}
          <motion.div
            className={`flex gap-6 mb-8 ${isEven ? '' : 'justify-end'}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ delay: 0.6 }}
          >
            <div className={isEven ? '' : 'text-right'}>
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Price Range</div>
              <div className="text-lg sm:text-xl font-bold" style={{ color: 'var(--cream)' }}>{highlight.price}</div>
            </div>
            <div className="w-px" style={{ background: 'var(--border)' }} />
            <div className={isEven ? '' : 'text-right'}>
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Growth</div>
              <div className="text-lg sm:text-xl font-bold" style={{ color: 'var(--gold)' }}>{highlight.growth}</div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.button
            className={`btn-gold group ${isEven ? '' : 'ml-auto'}`}
            onClick={onExplore}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{ display: 'inline-flex' }}
          >
            View Full Market Data
            <HiOutlineArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </motion.button>
        </div>
      </motion.div>

      {/* Large zone number watermark */}
      <div
        className={`absolute ${isEven ? 'right-8 sm:right-16' : 'left-8 sm:left-16'} top-1/2 -translate-y-1/2 pointer-events-none select-none`}
        style={{
          fontSize: 'clamp(120px, 20vw, 280px)',
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 900,
          color: 'transparent',
          WebkitTextStroke: '1px rgba(201,169,110,0.08)',
          lineHeight: 1,
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </div>
    </section>
  );
}
