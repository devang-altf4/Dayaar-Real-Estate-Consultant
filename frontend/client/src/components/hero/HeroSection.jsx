import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring, animate } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

/* ═══════════════════════════════════════════════════════════════
   Continuous Counting Counter — NEVER disappears
   - Always visible (shows the number at all times)
   - Smoothly counts 0 → target over `duration` seconds
   - Holds at target for 4s
   - Re-counts from 0 with a fresh animation
   - Uses framer-motion's `animate` for buttery-smooth interpolation
   ═══════════════════════════════════════════════════════════════ */
function ContinuousCounter({ target, suffix = '+', duration = 2.5 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: '-30px' });
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, { stiffness: 100, damping: 25 });
  const [display, setDisplay] = useState(0);
  const targetNum = parseInt(String(target).replace(/\D/g, ''));

  useEffect(() => {
    const unsub = springVal.on('change', (v) => {
      setDisplay(Math.round(v));
    });
    return unsub;
  }, [springVal]);

  useEffect(() => {
    if (!isInView) return;

    let cancelled = false;

    const runCycle = async () => {
      while (!cancelled) {
        // Count up: 0 → target
        await new Promise((resolve) => {
          const controls = animate(motionVal, targetNum, {
            duration: duration,
            ease: [0.25, 0.46, 0.45, 0.94],
            onComplete: resolve,
          });
          // Store cleanup
          if (cancelled) controls.stop();
        });

        if (cancelled) break;

        // Hold at target for 4 seconds
        await new Promise((res) => {
          const id = setTimeout(res, 4000);
          if (cancelled) clearTimeout(id);
        });

        if (cancelled) break;

        // Quick reset to 0 (very fast, 300ms)
        await new Promise((resolve) => {
          const controls = animate(motionVal, 0, {
            duration: 0.3,
            ease: 'easeIn',
            onComplete: resolve,
          });
          if (cancelled) controls.stop();
        });

        if (cancelled) break;

        // Brief pause before next cycle
        await new Promise((res) => {
          const id = setTimeout(res, 200);
          if (cancelled) clearTimeout(id);
        });
      }
    };

    runCycle();

    return () => {
      cancelled = true;
    };
  }, [isInView, motionVal, targetNum, duration]);

  return (
    <span ref={ref} style={{ display: 'inline-flex', alignItems: 'baseline', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
      <span>{display}</span>
      {suffix && <span style={{ marginLeft: 2, opacity: 0.8 }}>{suffix}</span>}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Hero Section
   ═══════════════════════════════════════════════════════════════ */
export default function HeroSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const imgY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section ref={ref} className="relative h-screen min-h-[600px] overflow-hidden" id="hero">
      {/* Parallax Background */}
      <motion.div className="absolute inset-0" style={{ y: imgY, scale: imgScale }}>
        <img
          src="/images/hero.png"
          alt="Mumbai skyline"
          className="w-full h-full object-cover"
          loading="eager"
        />
      </motion.div>

      {/* Overlays */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, rgba(11,11,13,0.5) 0%, rgba(11,11,13,0.3) 40%, rgba(11,11,13,0.7) 80%, rgba(11,11,13,1) 100%)',
      }} />
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(90deg, rgba(11,11,13,0.6) 0%, transparent 50%, rgba(11,11,13,0.4) 100%)',
      }} />

      {/* Blue bottom line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 opacity-60" style={{
        background: 'linear-gradient(90deg, transparent, #1E5EFF, transparent)',
      }} />

      {/* Content */}
      <motion.div
        className="relative z-10 h-full flex flex-col justify-center container-luxury"
        style={{ y: contentY, opacity }}
      >
        <div className="max-w-3xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-3 text-xs uppercase tracking-[0.3em] font-medium" style={{ color: '#1E5EFF' }}>
              <span className="w-12 h-px" style={{ background: '#1E5EFF' }} />
              Mumbai's Premier Real Estate Consultant
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            className="text-5xl sm:text-6xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-[0.98]"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1, type: 'spring', damping: 20 }}
          >
            <span style={{ color: '#FFFFFF' }}>Your Next</span>
            <br />
            <span className="text-gold-gradient">Investment</span>
            <br />
            <span style={{ color: '#FFFFFF' }}>Starts Here</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-base sm:text-lg max-w-lg mb-10 leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.6)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            Scroll through Mumbai's premium zones. Discover market data, curated projects,
            and investment opportunities — from Mira Road to South Bombay.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex flex-wrap items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <a href="#zones-section" className="btn-gold">
              Explore Zones
              <span>↓</span>
            </a>
            <a href="#lead-section" className="btn-outline">
              Get Expert Advice
            </a>
          </motion.div>
        </div>

        {/* ── Right-side Stat Counters ── */}
        <motion.div
          className="absolute right-6 sm:right-10 lg:right-16 bottom-16 sm:bottom-24 hidden md:flex"
          style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 40 }}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.2 }}
        >
          {[
            { value: 6, suffix: '', label: 'Premium Zones', dur: 1.5 },
            { value: 20, suffix: '+', label: 'Curated Projects', dur: 2 },
            { value: 500, suffix: '+', label: 'Happy Families', dur: 2.8 },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 160 }}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4 + i * 0.2 }}
            >
              {/* Glow */}
              <div
                style={{
                  position: 'absolute',
                  inset: -24,
                  borderRadius: 16,
                  opacity: 0.25,
                  filter: 'blur(24px)',
                  pointerEvents: 'none',
                  background: 'radial-gradient(circle, rgba(30,94,255,0.35) 0%, transparent 70%)',
                }}
              />
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  width: 200,
                  fontSize: 'clamp(2.4rem, 3.8vw, 3.7rem)',
                  fontFamily: "var(--font-heading)",
                  fontWeight: 900,
                  lineHeight: 1,
                  background: 'linear-gradient(135deg, #A9C9FF, #1E5EFF, #4A7FBF)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 24px rgba(30,94,255,0.25))',
                }}
              >
                <ContinuousCounter target={stat.value} suffix={stat.suffix} duration={stat.dur} />
              </div>
              <div
                style={{
                  position: 'relative',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.25em',
                  marginTop: 6,
                  fontWeight: 600,
                  textAlign: 'right',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="text-[9px] uppercase tracking-[0.3em]" style={{ color: 'rgba(255,255,255,0.4)' }}>Scroll</span>
        <div className="w-5 h-8 rounded-full border flex items-start justify-center pt-1.5" style={{ borderColor: '#4A7FBF' }}>
          <motion.div
            className="w-1 h-2 rounded-full"
            style={{ background: '#1E5EFF' }}
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
}

