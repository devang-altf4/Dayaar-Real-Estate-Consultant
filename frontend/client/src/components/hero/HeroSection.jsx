import { animate, motion as Motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { HiOutlineArrowDown, HiOutlineArrowUpRight } from 'react-icons/hi2';
import { landingEase } from '../site/landingMotion';

const titleLines = ['The Right Property.', 'The Right Possibilities.'];
const statistics = [
  { value: 6, label: 'Mumbai Markets', suffix: '' },
  { value: 20, label: 'Curated Projects', suffix: '+' },
  { value: 500, label: 'Happy Families', suffix: '+' },
];

function StatCounter({ value, suffix, label, reducedMotion }) {
  const ref = useRef(null);
  const entered = useInView(ref, { once: true, amount: 0.3 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!entered || reducedMotion) return;
    const controls = animate(0, value, {
      duration: 1.15,
      ease: 'easeOut',
      onUpdate: (current) => setDisplay(Math.round(current)),
    });
    return () => controls.stop();
  }, [entered, reducedMotion, value]);

  return (
    <div className="landing-stat" ref={ref}>
      <dt>{label}</dt>
      <dd>
        <span className="sr-only">{value}{suffix}</span>
        <span aria-hidden="true">{reducedMotion ? value : display}{suffix}</span>
      </dd>
    </div>
  );
}

export default function HeroSection() {
  const ref = useRef(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '16%']);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);

  return (
    <section id="hero" ref={ref} className="site-hero landing-hero" aria-labelledby="hero-title">
      <Motion.div className="landing-hero-media" style={reducedMotion ? undefined : { y: imageY, scale: imageScale }}>
        <picture>
          <source media="(max-width: 640px)" srcSet="/images/marine-lines-mobile.webp" />
          <img
            src="/images/marine-lines.webp"
            alt="Marine Drive and the Mumbai skyline"
            className="site-hero-image"
            fetchPriority="high"
          />
        </picture>
      </Motion.div>
      <div className="landing-hero-shade" aria-hidden="true" />

      <div className="site-container landing-hero-layout">
        <div className="landing-hero-copy">
          <Motion.p
            className="site-eyebrow landing-hero-eyebrow"
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: landingEase }}
          >
            DAYAAR REAL ESTATE | YOUR TRUSTED PROPERTY PARTNER
          </Motion.p>
          <h1 id="hero-title" className="site-hero-title">
            {titleLines.map((line, index) => (
              <span className="landing-hero-line" key={line}>
                <Motion.span
                  className={index === 1 ? 'site-hero-accent' : undefined}
                  initial={reducedMotion ? false : { y: '105%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.8, delay: 0.08 + index * 0.095, ease: landingEase }}
                >
                  {line}{index < titleLines.length - 1 && ' '}
                </Motion.span>
              </span>
            ))}
          </h1>
          <Motion.div
            className="landing-hero-details"
            initial={reducedMotion ? false : { opacity: 0.45, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.26, ease: landingEase }}
          >
            <p>From finding your dream home to securing your next investment, discover thoughtfully selected properties backed by local expertise and personalised guidance.</p>
            <div className="site-actions">
              <a href="/services" className="btn-gold">Explore Services <HiOutlineArrowUpRight aria-hidden /></a>
              <a href="/list-your-property" className="btn-outline">List Your Property</a>
            </div>
          </Motion.div>
        </div>

        <div className="landing-hero-bottom">
          <dl className="landing-stats">
            {statistics.map((stat) => <StatCounter key={stat.label} {...stat} reducedMotion={reducedMotion} />)}
          </dl>
          <a href="#services" className="landing-scroll-link" aria-label="Scroll to services">
            <span>Scroll</span><HiOutlineArrowDown aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}
