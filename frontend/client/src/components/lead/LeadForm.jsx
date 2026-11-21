/**
 * Property enquiry form and submission states.
 */

import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  HiOutlineUser,
  HiOutlinePhone,
  HiOutlineCurrencyRupee,
  HiOutlineBriefcase,
  HiOutlineHomeModern,
  HiOutlineMapPin,
  HiOutlineClipboardDocumentList,
  HiOutlineCheckCircle,
  HiOutlineShieldCheck,
  HiOutlineClock,
  HiOutlineDocumentCheck,
} from 'react-icons/hi2';
import api from '../../utils/api';
import { contactPhone } from '../../data/contact';

const BUDGET_OPTIONS = [
  'Under ₹50 Lakh',
  '₹50 Lakh – ₹1 Crore',
  '₹1 – ₹2 Crore',
  '₹2 – ₹5 Crore',
  '₹5 – ₹10 Crore',
  '₹10 Crore+',
];

const BHK_OPTIONS = [
  '1 BHK',
  '2 BHK',
  '3 BHK',
  '4 BHK',
  '5+ BHK',
];

// Inline styles - COMPACT spacing
const styles = {
  section: {
    position: 'relative',
    overflow: 'hidden',
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
    background: 'rgba(82, 147, 228, 0.12)',
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
    fontFamily: 'var(--font-display)',
    color: 'var(--site-ink)',
    fontSize: 'clamp(2.75rem, 4.4vw, 4.1rem)',
    marginBottom: 16,
    fontWeight: 400,
    lineHeight: 1,
    letterSpacing: '-0.01em',
  },
  description: {
    marginBottom: 32,
    maxWidth: 400,
    fontSize: 14,
    lineHeight: 1.6,
    color: 'var(--site-muted)',
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
    border: '1px solid var(--site-border)',
    background: 'var(--site-tint)',
    color: 'var(--site-accent)',
  },
  iconBoxIcon: {
    height: 16,
    width: 16,
  },
  featureText: {
    fontSize: 14,
    color: 'var(--site-ink)',
  },
  rightPanel: {
    minWidth: 0,
    padding: 'clamp(16px, 3vw, 30px)',
    borderRadius: 18,
    border: '1px solid var(--site-border)',
    background: 'var(--site-panel)',
    boxShadow: 'var(--site-shadow)',
  },
  formTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'clamp(1.25rem, 1.4vw, 1.5rem)',
    marginBottom: 20,
    letterSpacing: '0.02em',
    color: 'var(--site-ink)',
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
    color: 'var(--site-ink)',
  },
  labelIcon: {
    height: 12,
    width: 12,
    color: 'var(--site-accent)',
  },
  input: {
    height: 46,
    width: '100%',
    borderRadius: 6,
    border: '1px solid var(--site-input-border)',
    background: 'var(--site-canvas)',
    colorScheme: 'dark',
    padding: '0 14px',
    fontSize: 14,
    color: 'var(--site-ink)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: "var(--font-body)",
  },
  textarea: {
    minHeight: 88,
    width: '100%',
    resize: 'vertical',
    borderRadius: 6,
    border: '1px solid var(--site-input-border)',
    background: 'var(--site-canvas)',
    colorScheme: 'dark',
    padding: '12px 14px',
    fontSize: 14,
    color: 'var(--site-ink)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: "var(--font-body)",
    lineHeight: 1.5,
  },
  select: {
    height: 46,
    width: '100%',
    borderRadius: 6,
    border: '1px solid var(--site-input-border)',
    background: 'var(--site-canvas)',
    colorScheme: 'dark',
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
    background: 'var(--site-panel)',
    color: 'var(--site-ink)',
  },
  twoColGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  error: {
    marginTop: 4,
    fontSize: 11,
    color: '#ffb4be',
  },
  serverError: {
    borderRadius: 6,
    border: '1px solid rgb(255 152 167 / 45%)',
    background: '#342335',
    padding: 10,
    fontSize: 13,
    color: '#ffb4be',
  },
  submitButton: {
    marginTop: 8,
    height: 48,
    width: '100%',
    borderRadius: 6,
    border: 'none',
    background: 'var(--site-action)',
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
    color: 'var(--site-accent)',
  },
  successTitle: {
    marginBottom: 10,
    fontSize: 26,
    color: 'var(--site-ink)',
    fontFamily: 'var(--font-heading)',
  },
  successText: {
    margin: '0 auto',
    maxWidth: 360,
    fontSize: 14,
    color: 'var(--site-muted)',
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

export default function LeadForm({ initialRequirement = '' }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    budget: '',
    profession: '',
    bhk: '',
    locationPreferred: '',
    specificRequirement: initialRequirement,
  });
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
    if (!form.bhk) e.bhk = 'Select BHK';
    if (!form.locationPreferred.trim()) e.locationPreferred = 'Required';
    if (!form.specificRequirement.trim()) e.specificRequirement = 'Required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const phone = form.phone.replace(/\s+/g, '').replace(/^\+91/, '');
    try {
      const response = await api.post('/leads', {
        ...form,
        phone,
      });
      if (!response.data?.success) throw new Error('Lead submission unavailable');
      setDone(true);
    } catch (err) {
      setErrors({ server: err.response?.data?.errors?.join(', ') || 'We couldn’t send your enquiry. Please try again or call us on ' + contactPhone + '.' });
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
    borderColor: focusedField === fieldName ? 'var(--site-accent)' : 'var(--site-input-border)',
    boxShadow: focusedField === fieldName ? '0 0 0 2px rgb(32 85 160 / 18%)' : 'none',
  });

  const getSelectStyle = (fieldName, hasValue) => ({
    ...styles.select,
    color: hasValue ? 'var(--site-ink)' : 'var(--site-muted)',
    borderColor: focusedField === fieldName ? 'var(--site-accent)' : 'var(--site-input-border)',
    boxShadow: focusedField === fieldName ? '0 0 0 2px rgb(32 85 160 / 18%)' : 'none',
  });

  const getTextareaStyle = (fieldName) => ({
    ...styles.textarea,
    borderColor: focusedField === fieldName ? 'var(--site-accent)' : 'var(--site-input-border)',
    boxShadow: focusedField === fieldName ? '0 0 0 2px rgb(32 85 160 / 18%)' : 'none',
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
          <Motion.div
            style={styles.leftPanel}
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h1 style={styles.heading}>
              Property Enquiry
            </h1>

            <p style={styles.description}>
              Looking for your ideal property? Tell us what you&apos;re looking for, and let Dayaar&apos;s experts connect you with carefully selected residential, commercial and investment opportunities tailored to your needs, preferences and budget.
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
          </Motion.div>

          <Motion.div
            style={styles.rightPanel}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <AnimatePresence mode="wait">
              {done ? (
                <Motion.div
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
                </Motion.div>
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
                      style={getSelectStyle('budget', !!form.budget)}
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
                        <HiOutlineHomeModern style={styles.labelIcon} />
                        BHK
                      </label>
                      <select
                        value={form.bhk}
                        onChange={(e) => set('bhk', e.target.value)}
                        onFocus={() => setFocusedField('bhk')}
                        onBlur={() => setFocusedField(null)}
                        style={getSelectStyle('bhk', !!form.bhk)}
                      >
                        <option value="" disabled>Select BHK</option>
                        {BHK_OPTIONS.map((o) => (
                          <option key={o} value={o} style={styles.selectOption}>
                            {o}
                          </option>
                        ))}
                      </select>
                      {errors.bhk && <p style={styles.error}>{errors.bhk}</p>}
                    </div>
                  </div>

                  <div>
                    <label style={styles.label}>
                      <HiOutlineMapPin style={styles.labelIcon} />
                      LOCATION PREFERRED
                    </label>
                    <input
                      type="text"
                      value={form.locationPreferred}
                      onChange={(e) => set('locationPreferred', e.target.value)}
                      onFocus={() => setFocusedField('locationPreferred')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="e.g. Andheri West, Bandra, Juhu"
                      style={getInputStyle('locationPreferred')}
                    />
                    {errors.locationPreferred && <p style={styles.error}>{errors.locationPreferred}</p>}
                  </div>

                  <div>
                    <label style={styles.label}>
                      <HiOutlineClipboardDocumentList style={styles.labelIcon} />
                      SPECIFIC REQUIREMENT
                    </label>
                    <textarea
                      value={form.specificRequirement}
                      onChange={(e) => set('specificRequirement', e.target.value)}
                      onFocus={() => setFocusedField('specificRequirement')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Share your preferred amenities, possession timeline, or any other requirement"
                      style={getTextareaStyle('specificRequirement')}
                    />
                    {errors.specificRequirement && <p style={styles.error}>{errors.specificRequirement}</p>}
                  </div>

                  {errors.server && (
                    <div style={styles.serverError}>
                      {errors.server}
                    </div>
                  )}

                  <Motion.button
                    type="submit"
                    disabled={submitting}
                    style={styles.submitButton}
                    whileHover={{ transform: 'translateY(-1px)', boxShadow: '0 8px 24px rgba(30, 94, 255, 0.25)' }}
                    whileTap={{ transform: 'scale(0.98)' }}
                  >
                    {submitting ? 'SUBMITTING...' : 'GET EXPERT RECOMMENDATIONS'}
                  </Motion.button>
                </form>
              )}
            </AnimatePresence>
          </Motion.div>
        </div>
      </div>
    </section>
  );
}

