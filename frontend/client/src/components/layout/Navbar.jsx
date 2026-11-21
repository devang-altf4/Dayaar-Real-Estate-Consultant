import { useMotionValueEvent, useScroll } from 'framer-motion';
import { useState } from 'react';
import { HiOutlineBars3, HiOutlineXMark } from 'react-icons/hi2';
import dayaarLogo from '../../assets/dayaar-nav-logo.webp';

const links = [
  ['Home', '/'],
  ['Our Services', '/services'],
  ['Property Enquiry', '/enquiry'],
  ['List Your Property', '/list-your-property'],
  ['Contact Us', '#footer'],
  ['FAQ', '/help'],
  ['EMI Calculator', '/emi-calculator'],
  ['STD Calculator', '/stamp-duty-calculator'],
];

export default function Navbar({ path }) {
  const [scrolled, setScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > 50);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (value) => setScrolled(value > 50));

  return (
    <header
      className="site-header"
      data-home={path === '/'}
      data-scrolled={scrolled}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && mobileOpen) {
          setMobileOpen(false);
          document.getElementById('site-menu-toggle').focus();
        }
      }}
    >
      <div className="site-nav-inner">
        <a className="site-brand" href="/" aria-label="Dayaar home">
          <span className="site-brand-mark">
            <img src={dayaarLogo} alt="" width="30" height="30" />
          </span>
          <span>Dayaar</span>
        </a>
        <button
          id="site-menu-toggle"
          className="site-menu-toggle"
          type="button"
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileOpen}
          aria-controls="site-navigation"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <HiOutlineXMark aria-hidden /> : <HiOutlineBars3 aria-hidden />}
        </button>
        <nav id="site-navigation" className="site-nav" data-open={mobileOpen} aria-label="Main navigation">
          {links.map(([label, href]) => (
            <a
              key={href}
              href={href}
              aria-current={href === path ? 'page' : undefined}
              data-current={href === path || (href === '/services' && path.startsWith('/services/'))}
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
