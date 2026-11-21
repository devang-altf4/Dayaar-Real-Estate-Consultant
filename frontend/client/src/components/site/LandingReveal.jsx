import { motion as Motion, useReducedMotion } from 'framer-motion';
import { landingEase } from './landingMotion';

export function LandingReveal({ children, className, delay = 0 }) {
  const reducedMotion = useReducedMotion();

  return (
    <Motion.div
      className={className ? 'landing-reveal ' + className : 'landing-reveal'}
      initial={reducedMotion ? false : { opacity: 0.48, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.72, delay, ease: landingEase }}
    >
      {children}
    </Motion.div>
  );
}

export function LandingImage({ className }) {
  const reducedMotion = useReducedMotion();

  return (
    <div className={className} aria-hidden="true">
      {!reducedMotion && (
        <Motion.div
          className="landing-image-wipe"
          initial={{ scaleX: 0.78 }}
          whileInView={{ scaleX: 0 }}
          viewport={{ once: true, amount: 0.28 }}
          transition={{ duration: 0.95, ease: landingEase }}
        />
      )}
    </div>
  );
}
