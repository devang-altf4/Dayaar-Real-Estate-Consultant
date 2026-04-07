import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { useState } from 'react';
import { HiOutlineBars3, HiOutlineXMark, HiOutlinePhone } from 'react-icons/hi2';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (val) => {
    setScrolled(val > 50);
  });

  const navLinks = [
    { label: 'Zones', href: '#zones-section' },
    { label: 'Get in Touch', href: '#lead-section' },
    { label: 'Contact', href: '#footer' },
  ];

  return (
    <motion.nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: 'all 0.5s ease',
        background: scrolled ? 'rgba(11,11,13,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(30,94,255,0.15)' : '1px solid transparent',
      }}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Main bar */}
      <div
        style={{
          width: '100%',
          maxWidth: 1440,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
        }}
      >
        {/* Logo */}
        <a href="#hero" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <img
            src="/images/1000002758.jpg.jpeg"
            alt="Dayaar Real Estate Logo"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              objectFit: 'cover',
            }}
          />
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18, color: '#FFFFFF' }}>
           Dayaar Real Estate Consultant
          </span>
        </a>

        {/* Desktop links */}
        <div
          style={{
            alignItems: 'center',
            gap: 32,
          }}
          className="hidden md:flex"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                transition: 'color 0.3s',
              }}
              onMouseEnter={(e) => (e.target.style.color = '#1E5EFF')}
              onMouseLeave={(e) => (e.target.style.color = 'rgba(255,255,255,0.6)')}
            >
              {link.label}
            </a>
          ))}
          <a
            href="tel:08452852324"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #1E5EFF, #4A7FBF)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 12,
              borderRadius: 10,
              border: 'none',
              textDecoration: 'none',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <HiOutlinePhone style={{ width: 14, height: 14 }} />
            Call Now
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden"
          style={{
            padding: 8,
            color: '#FFFFFF',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {mobileOpen ? (
            <HiOutlineXMark style={{ width: 24, height: 24 }} />
          ) : (
            <HiOutlineBars3 style={{ width: 24, height: 24 }} />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <motion.div
          className="md:hidden"
          style={{
            background: 'rgba(11, 11, 13, 0.98)',
            borderTop: '1px solid rgba(30, 94, 255, 0.15)',
            padding: '24px 24px 28px',
          }}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  fontFamily: "'Inter', sans-serif",
                  color: 'rgba(255,255,255,0.6)',
                  textDecoration: 'none',
                  padding: '14px 0',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  transition: 'color 0.2s',
                }}
                onClick={() => setMobileOpen(false)}
                onMouseEnter={(e) => (e.target.style.color = '#1E5EFF')}
                onMouseLeave={(e) => (e.target.style.color = 'rgba(255,255,255,0.6)')}
              >
                {link.label}
              </a>
            ))}
            <a
              href="tel:08452852324"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginTop: 16,
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #1E5EFF, #4A7FBF)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 13,
                borderRadius: 12,
                border: 'none',
                textDecoration: 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              <HiOutlinePhone style={{ width: 16, height: 16 }} />
              Call Now
            </a>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}
