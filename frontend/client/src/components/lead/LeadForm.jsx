/**
 * LeadForm — Exact match to reference image
 * Black background, gold heading, clean dark inputs
 * Using inline CSS to avoid Tailwind v4 issues
 * COMPACT SPACING to match screenshot 1
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  HiOutlineUser,
  HiOutlinePhone,
  HiOutlineCurrencyRupee,
  HiOutlineBriefcase,
  HiOutlineUserGroup,
  HiOutlineCheckCircle,
  HiOutlineShieldCheck,
  HiOutlineClock,
  HiOutlineDocumentCheck,
} from 'react-icons/hi2';
import api from '../../utils/api';

const BUDGET_OPTIONS = [
  'Under ₹50 Lakh',
  '₹50 Lakh – ₹1 Crore',
  '₹1 – ₹2 Crore',
  '₹2 – ₹5 Crore',
  '₹5 – ₹10 Crore',
  '₹10 Crore+',
];

// Inline styles - COMPACT spacing
const styles = {
  section: {
    position: 'relative',
    overflow: 'hidden',
    background: '#06070b',
    scrollMarginTop: 96,
  },
  glowContainer: {
    pointerEvents: 'none',
    position: 'absolute',
    inset: 0,
  },
  glowLeft: {
    position: 'absolute',
    left: -96,
    top: -80,
    height: 288,
    width: 288,
    borderRadius: '50%',
    background: 'rgba(30, 94, 255, 0.05)',
    filter: 'blur(48px)',
  },
  glowRight: {
    position: 'absolute',
    bottom: -80,
    right: -64,
    height: 288,
    width: 288,
    borderRadius: '50%',
    background: 'rgba(29, 38, 57, 0.35)',
    filter: 'blur(48px)',
  },
  container: {
    position: 'relative',
    margin: '0 auto',
    width: '100%',
    maxWidth: 1200,
    padding: '48px 24px 40px',
  },
  containerMd: {
    padding: '56px 40px 48px',
  },
  containerLg: {
    padding: '64px 56px 56px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.15fr',
    gap: 48,
    alignItems: 'start',
  },
  gridMobile: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 32,
    alignItems: 'start',
  },
  leftPanel: {
    alignSelf: 'start',
  },
  heading: {
    fontFamily: 'var(--font-heading)',
    color: '#1E5EFF',
    fontSize: 'clamp(2.2rem, 3.5vw, 3.2rem)',
    marginBottom: 16,
    fontWeight: 500,
    lineHeight: 1,
    letterSpacing: '-0.01em',
    fontStyle: 'italic',
  },
  description: {
    marginBottom: 32,
    maxWidth: 400,
    fontSize: 14,
    lineHeight: 1.6,
    color: '#a8acb4',
  },
  featuresContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  featureRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    display: 'inline-flex',
    height: 36,
    width: 36,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    border: '1px solid #2a2d35',
    background: '#11141a',
    color: '#1E5EFF',
  },
  iconBoxIcon: {
    height: 16,
    width: 16,
  },
  featureText: {
    fontSize: 14,
    color: '#f0eee8',
  },
  rightPanel: {
    paddingTop: 0,
  },
  formTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'clamp(1.25rem, 1.4vw, 1.5rem)',
    marginBottom: 20,
    letterSpacing: '0.02em',
    color: '#f3efe7',
    fontWeight: 600,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  label: {
    marginBottom: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#f1ede2',
  },
  labelIcon: {
    height: 12,
    width: 12,
    color: '#a5a9b0',
  },
  input: {
    height: 46,
    width: '100%',
    borderRadius: 6,
    border: '1px solid #2a2d35',
    background: '#121520',
    padding: '0 14px',
    fontSize: 14,
    color: '#f2eee6',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: "var(--font-body)",
  },
  select: {
    height: 46,
    width: '100%',
    borderRadius: 6,
    border: '1px solid #2a2d35',
    background: '#121520',
    padding: '0 14px',
    paddingRight: 36,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
    fontFamily: "var(--font-body)",
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%237d828c'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    backgroundSize: '18px',
  },
  selectOption: {
    background: '#13151a',
    color: '#f2eee6',
  },
  twoColGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  error: {
    marginTop: 4,
    fontSize: 11,
    color: '#f87171',
  },
  serverError: {
    borderRadius: 6,
    border: '1px solid rgba(153, 27, 27, 0.3)',
    background: 'rgba(127, 29, 29, 0.2)',
    padding: 10,
    fontSize: 13,
    color: '#f87171',
  },
  submitButton: {
    marginTop: 8,
    height: 48,
    width: '100%',
    borderRadius: 6,
    border: 'none',
    background: '#1E5EFF',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.05em',
    color: 'white',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    fontFamily: "var(--font-body)",
  },
  successContainer: {
    padding: '48px 0',
    textAlign: 'center',
  },
  successIcon: {
    margin: '0 auto 16px',
    height: 56,
    width: 56,
    color: '#1E5EFF',
  },
  successTitle: {
    marginBottom: 10,
    fontSize: 26,
    color: '#f4f1e9',
    fontFamily: 'var(--font-heading)',
  },
  successText: {
    margin: '0 auto',
    maxWidth: 360,
    fontSize: 14,
    color: '#a8acb4',
  },
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

export default function LeadForm() {
  const [form, setForm] = useState({ name: '', phone: '', budget: '', profession: '', familySize: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const isMobile = useMediaQuery('(max-width: 768px)');
  const isMd = useMediaQuery('(min-width: 768px)');
  const isLg = useMediaQuery('(min-width: 1024px)');

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    const normalizedPhone = form.phone.replace(/\s+/g, '');
    if (!/^(\+91)?[6-9]\d{9}$/.test(normalizedPhone)) e.phone = 'Enter valid Indian phone number';
    if (!form.budget) e.budget = 'Select a budget range';
    if (!form.profession.trim()) e.profession = 'Required';
    const familyCount = Number(form.familySize);
    if (!Number.isInteger(familyCount) || familyCount < 1) e.familySize = 'Required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.post('/leads', {
        ...form,
        phone: form.phone.replace(/\s+/g, ''),
        familySize: parseInt(form.familySize, 10),
      });
      setDone(true);
    } catch (err) {
      setErrors({ server: err.response?.data?.errors?.join(', ') || 'Something went wrong.' });
    } finally {
      setSubmitting(false);
    }
  };

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const getInputStyle = (fieldName) => ({
    ...styles.input,
    borderColor: focusedField === fieldName ? '#646b78' : '#2a2d35',
    boxShadow: focusedField === fieldName ? '0 0 0 2px rgba(100, 107, 120, 0.28)' : 'none',
  });

  const getSelectStyle = (hasValue) => ({
    ...styles.select,
    color: hasValue ? '#f2eee6' : '#7d828c',
    borderColor: focusedField === 'budget' ? '#646b78' : '#2a2d35',
    boxShadow: focusedField === 'budget' ? '0 0 0 2px rgba(100, 107, 120, 0.28)' : 'none',
  });

  const getContainerStyle = () => {
    if (isLg) return { ...styles.container, ...styles.containerLg };
    if (isMd) return { ...styles.container, ...styles.containerMd };
    return styles.container;
  };

  return (
    <section id="lead-section" style={styles.section}>
      <div style={styles.glowContainer}>
        <div style={styles.glowLeft} />
        <div style={styles.glowRight} />
      </div>

      <div style={getContainerStyle()}>
        <div style={isMobile ? styles.gridMobile : styles.grid}>
          <motion.div
            style={styles.leftPanel}
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h1 style={styles.heading}>
              Get in Touch
            </h1>

            <p style={styles.description}>
              Share your preferences and our experts will curate personalized property recommendations from Mumbai&apos;s finest developments.
            </p>

            <div style={styles.featuresContainer}>
              <div style={styles.featureRow}>
                <span style={styles.iconBox}>
                  <HiOutlineClock style={styles.iconBoxIcon} />
                </span>
                <span style={styles.featureText}>Response within 24 hours</span>
              </div>

              <div style={styles.featureRow}>
                <span style={styles.iconBox}>
                  <HiOutlineDocumentCheck style={styles.iconBoxIcon} />
                </span>
                <span style={styles.featureText}>Verified RERA projects only</span>
              </div>

              <div style={styles.featureRow}>
                <span style={styles.iconBox}>
                  <HiOutlineShieldCheck style={styles.iconBoxIcon} />
                </span>
                <span style={styles.featureText}>Your data is 100% secure</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            style={styles.rightPanel}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <AnimatePresence mode="wait">
              {done ? (
                <motion.div
                  key="success"
                  style={styles.successContainer}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <HiOutlineCheckCircle style={styles.successIcon} />
                  <h3 style={styles.successTitle}>
                    Thank You!
                  </h3>
                  <p style={styles.successText}>
                    Our experts will reach out within 24 hours with personalized recommendations.
                  </p>
                </motion.div>
              ) : (
                <form key="form" onSubmit={submit} style={styles.form}>
                  <h2 style={styles.formTitle}>
                    SHARE YOUR PREFERENCES
                  </h2>

                  <div>
                    <label style={styles.label}>
                      <HiOutlineUser style={styles.labelIcon} />
                      FULL NAME
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Enter your name"
                      style={getInputStyle('name')}
                    />
                    {errors.name && <p style={styles.error}>{errors.name}</p>}
                  </div>

                  <div>
                    <label style={styles.label}>
                      <HiOutlinePhone style={styles.labelIcon} />
                      PHONE NUMBER
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => {
                        const value = e.target.value
                          .replace(/[^\d+]/g, '')
                          .replace(/(?!^)\+/g, '')
                          .slice(0, 13);
                        set('phone', value);
                      }}
                      onFocus={() => setFocusedField('phone')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="+919876543210"
                      style={getInputStyle('phone')}
                    />
                    {errors.phone && <p style={styles.error}>{errors.phone}</p>}
                  </div>

                  <div>
                    <label style={styles.label}>
                      <HiOutlineCurrencyRupee style={styles.labelIcon} />
                      BUDGET RANGE
                    </label>
                    <select
                      value={form.budget}
                      onChange={(e) => set('budget', e.target.value)}
                      onFocus={() => setFocusedField('budget')}
                      onBlur={() => setFocusedField(null)}
                      style={getSelectStyle(!!form.budget)}
                    >
                      <option value="" disabled>Select your budget</option>
                      {BUDGET_OPTIONS.map((o) => (
                        <option key={o} value={o} style={styles.selectOption}>
                          {o}
                        </option>
                      ))}
                    </select>
                    {errors.budget && <p style={styles.error}>{errors.budget}</p>}
                  </div>

                  <div style={isMobile ? { display: 'flex', flexDirection: 'column', gap: 16 } : styles.twoColGrid}>
                    <div>
                      <label style={styles.label}>
                        <HiOutlineBriefcase style={styles.labelIcon} />
                        PROFESSION
                      </label>
                      <input
                        type="text"
                        value={form.profession}
                        onChange={(e) => set('profession', e.target.value)}
                        onFocus={() => setFocusedField('profession')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="e.g. IT Professional"
                        style={getInputStyle('profession')}
                      />
                      {errors.profession && <p style={styles.error}>{errors.profession}</p>}
                    </div>

                    <div>
                      <label style={styles.label}>
                        <HiOutlineUserGroup style={styles.labelIcon} />
                        FAMILY SIZE
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.familySize}
                        onChange={(e) => set('familySize', e.target.value.replace(/\D/g, '').slice(0, 2))}
                        onFocus={() => setFocusedField('familySize')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="e.g. 4"
                        style={getInputStyle('familySize')}
                      />
                      {errors.familySize && <p style={styles.error}>{errors.familySize}</p>}
                    </div>
                  </div>

                  {errors.server && (
                    <div style={styles.serverError}>
                      {errors.server}
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={submitting}
                    style={styles.submitButton}
                    whileHover={{ transform: 'translateY(-1px)', boxShadow: '0 8px 24px rgba(30, 94, 255, 0.25)' }}
                    whileTap={{ transform: 'scale(0.98)' }}
                  >
                    {submitting ? 'SUBMITTING...' : 'GET EXPERT RECOMMENDATIONS'}
                  </motion.button>
                </form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

