/**
 * Footer — Matching screenshot 1 design with COMPACT spacing
 * Using inline CSS to avoid Tailwind v4 issues
 */
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { HiOutlinePhone, HiOutlineEnvelope, HiOutlineMapPin } from 'react-icons/hi2';
import { FaWhatsapp, FaInstagram, FaYoutube } from 'react-icons/fa';

// Inline styles - COMPACT spacing
const styles = {
  footer: {
    borderTop: '1px solid #1d2028',
    background: '#070912',
  },
  container: {
    margin: '0 auto',
    width: '100%',
    maxWidth: 1200,
    padding: '40px 24px 32px',
  },
  containerMd: {
    padding: '48px 40px 36px',
  },
  containerLg: {
    padding: '56px 56px 40px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 32,
  },
  gridMd: {
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 32,
  },
  gridLg: {
    gridTemplateColumns: '1.3fr 0.7fr 1fr 0.6fr',
    gap: 24,
  },
  brandSection: {},
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  logoBox: {
    display: 'flex',
    height: 36,
    width: 36,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    background: '#d4b67f',
  },
  logoLetter: {
    fontSize: 18,
    fontWeight: 900,
    fontFamily: "'Outfit', sans-serif",
    color: 'black',
  },
  brandTextContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  brandName: {
    fontSize: 22,
    fontWeight: 600,
    lineHeight: 1,
    color: '#f4f1ea',
    fontFamily: "'Outfit', sans-serif",
  },
  brandTagline: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    color: '#8e939c',
  },
  description: {
    marginBottom: 20,
    maxWidth: 340,
    fontSize: 13,
    lineHeight: 1.55,
    color: '#a8acb4',
  },
  whatsappButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    borderRadius: 20,
    background: '#25d366',
    padding: '7px 14px',
    fontSize: 13,
    fontWeight: 600,
    color: 'white',
    textDecoration: 'none',
    cursor: 'pointer',
    border: 'none',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  whatsappIcon: {
    height: 16,
    width: 16,
  },
  navSection: {},
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionHeaderLine: {
    height: 1,
    width: 20,
    background: '#a79167',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    color: '#e9e5dd',
  },
  navLinks: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  navLink: {
    fontSize: 14,
    color: '#a8acb4',
    textDecoration: 'none',
    transition: 'color 0.2s',
    cursor: 'pointer',
  },
  contactSection: {},
  contactItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    textDecoration: 'none',
    cursor: 'pointer',
  },
  contactIconBox: {
    display: 'flex',
    height: 36,
    width: 36,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    border: '1px solid #2a2d35',
    background: '#0d1018',
    transition: 'border-color 0.2s',
  },
  contactIcon: {
    height: 14,
    width: 14,
    color: '#d4b67f',
  },
  contactText: {
    wordBreak: 'break-word',
    fontSize: 13,
    color: '#a8acb4',
    transition: 'color 0.2s',
  },
  socialSection: {},
  socialHeader: {
    marginBottom: 12,
  },
  socialIcons: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  socialIconBox: {
    display: 'flex',
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    border: '1px solid #2a2d35',
    background: '#0d1018',
    color: '#a8acb4',
    textDecoration: 'none',
    transition: 'border-color 0.2s, color 0.2s',
  },
  socialIcon: {
    height: 14,
    width: 14,
  },
  bottomBar: {
    marginTop: 28,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    borderTop: '1px solid #1c1f27',
    paddingTop: 20,
    fontSize: 10,
    color: '#767b86',
  },
  bottomBarMd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

export default function Footer() {
  const isMd = useMediaQuery('(min-width: 768px)');
  const isLg = useMediaQuery('(min-width: 1024px)');
  const [hoveredLink, setHoveredLink] = useState(null);
  const [hoveredContact, setHoveredContact] = useState(null);
  const [hoveredSocial, setHoveredSocial] = useState(null);

  const navLinks = [
    { label: 'Explore Zones', href: '#zones-section' },
    { label: 'Contact Us', href: '#lead-section' },
    { label: 'Back to Top', href: '#hero' },
  ];

  const contactItems = [
    { icon: HiOutlinePhone, val: '08452 852324', href: 'tel:08452852324' },
    { icon: HiOutlineEnvelope, val: 'info@idayaar.in', href: 'mailto:info@idayaar.in' },
    { icon: HiOutlineMapPin, val: 'Mumbai, Maharashtra', href: '#' },
  ];

  const socialItems = [
    { icon: FaWhatsapp, href: 'https://wa.me/918452852324', label: 'WhatsApp' },
    { icon: FaInstagram, href: 'https://www.instagram.com/dayaarrealestate/', label: 'Instagram' },
    { icon: FaYoutube, href: '#', label: 'YouTube' },
  ];

  const getContainerStyle = () => {
    if (isLg) return { ...styles.container, ...styles.containerLg };
    if (isMd) return { ...styles.container, ...styles.containerMd };
    return styles.container;
  };

  const getGridStyle = () => {
    if (isLg) return { ...styles.grid, ...styles.gridLg };
    if (isMd) return { ...styles.grid, ...styles.gridMd };
    return styles.grid;
  };

  return (
    <footer id="footer" style={styles.footer}>
      <motion.div
        style={getContainerStyle()}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.4 }}
      >
        <div style={getGridStyle()}>
          {/* Brand Section */}
          <motion.div
            style={styles.brandSection}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', damping: 22, stiffness: 160 }}
          >
            <div style={styles.logoContainer}>
              <img
                src="/images/1000002758.jpg.jpeg"
                alt="Dayaar Real Estate Logo"
                style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={styles.brandTextContainer}>
                <h3 style={styles.brandName}>Dayaar</h3>
                <p style={styles.brandTagline}>Real Estate Consultant</p>
              </div>
            </div>

            <p style={styles.description}>
              Your trusted partner in finding premium properties across Mumbai&apos;s most sought-after neighborhoods — from Mira Road to South Bombay.
            </p>

            <motion.a
              href="https://wa.me/918452852324?text=Hi%2C%20I'm%20interested%20in%20Mumbai%20properties"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.whatsappButton}
              whileHover={{ y: -1, boxShadow: '0 8px 16px rgba(37,211,102,0.2)' }}
              whileTap={{ scale: 0.97 }}
            >
              <FaWhatsapp style={styles.whatsappIcon} />
              Chat on WhatsApp
            </motion.a>
          </motion.div>

          {/* Navigate Section */}
          <motion.div
            style={styles.navSection}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', damping: 22, stiffness: 160, delay: 0.05 }}
          >
            <div style={styles.sectionHeader}>
              <span style={styles.sectionHeaderLine} />
              <h4 style={styles.sectionTitle}>Navigate</h4>
            </div>
            <div style={styles.navLinks}>
              {navLinks.map((link) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  style={{
                    ...styles.navLink,
                    color: hoveredLink === link.label ? '#f1ede5' : '#a8acb4',
                  }}
                  onMouseEnter={() => setHoveredLink(link.label)}
                  onMouseLeave={() => setHoveredLink(null)}
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.2 }}
                >
                  {link.label}
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Contact Section */}
          <motion.div
            style={styles.contactSection}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', damping: 22, stiffness: 160, delay: 0.1 }}
          >
            <div style={styles.sectionHeader}>
              <span style={styles.sectionHeaderLine} />
              <h4 style={styles.sectionTitle}>Contact</h4>
            </div>
            <div style={styles.contactItems}>
              {contactItems.map((c, i) => (
                <motion.a
                  key={i}
                  href={c.href}
                  style={styles.contactItem}
                  onMouseEnter={() => setHoveredContact(i)}
                  onMouseLeave={() => setHoveredContact(null)}
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    style={{
                      ...styles.contactIconBox,
                      borderColor: hoveredContact === i ? '#3b404a' : '#2a2d35',
                    }}
                  >
                    <c.icon style={styles.contactIcon} />
                  </div>
                  <span
                    style={{
                      ...styles.contactText,
                      color: hoveredContact === i ? '#f1ede5' : '#a8acb4',
                    }}
                  >
                    {c.val}
                  </span>
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Social Section */}
          <motion.div
            style={styles.socialSection}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', damping: 22, stiffness: 160, delay: 0.15 }}
          >
            <div style={{ ...styles.sectionHeader, ...styles.socialHeader }}>
              <span style={styles.sectionHeaderLine} />
              <h4 style={styles.sectionTitle}>Follow Us</h4>
            </div>
            <div style={styles.socialIcons}>
              {socialItems.map((item) => (
                <motion.a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.label}
                  style={{
                    ...styles.socialIconBox,
                    borderColor: hoveredSocial === item.label ? '#3b404a' : '#2a2d35',
                    color: hoveredSocial === item.label ? '#d4b67f' : '#a8acb4',
                  }}
                  onMouseEnter={() => setHoveredSocial(item.label)}
                  onMouseLeave={() => setHoveredSocial(null)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <item.icon style={styles.socialIcon} />
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          style={isMd ? { ...styles.bottomBar, ...styles.bottomBarMd } : styles.bottomBar}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <p>© 2026 Dayaa Real Estate Consultant. All rights reserved. Made by Devang </p>
          <p>RERA registered consultant. Prices shown are indicative.</p>
        </motion.div>
      </motion.div>
    </footer>
  );
}
