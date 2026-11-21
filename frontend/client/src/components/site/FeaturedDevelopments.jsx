import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { HiOutlineArrowLeft, HiOutlineArrowRight, HiOutlineArrowUpRight } from 'react-icons/hi2';
import { featuredProperties } from '../../data/featuredProperties';
import { LandingReveal } from './LandingReveal';
import PropertyCard from './PropertyCard';

export default function FeaturedDevelopments() {
  const trackRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const track = trackRef.current;
    const measure = () => {
      const start = track.scrollLeft <= 2;
      const end = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
      setEdges((previous) => previous.start === start && previous.end === end ? previous : { start, end });
    };
    const resize = new ResizeObserver(measure);
    resize.observe(track);
    track.addEventListener('scroll', measure, { passive: true });
    measure();
    return () => {
      track.removeEventListener('scroll', measure);
      resize.disconnect();
    };
  }, []);

  function step(direction) {
    const track = trackRef.current;
    const cardWidth = track.firstElementChild.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({ left: direction * (cardWidth + gap), behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  return (
    <section className="site-section landing-properties" aria-labelledby="featured-title">
      <LandingReveal className="site-container">
        <div className="landing-properties-header">
          <div className="site-page-intro">
            <h2 id="featured-title">Featured developments</h2>
          </div>
          <div className="landing-rail-actions">
            <a href="/properties" className="site-text-link">Explore all properties <HiOutlineArrowUpRight aria-hidden /></a>
            <button type="button" aria-label="Previous development" aria-controls="featured-track" disabled={edges.start} onClick={() => step(-1)}>
              <HiOutlineArrowLeft aria-hidden />
            </button>
            <button type="button" aria-label="Next development" aria-controls="featured-track" disabled={edges.end} onClick={() => step(1)}>
              <HiOutlineArrowRight aria-hidden />
            </button>
          </div>
        </div>
        <div id="featured-track" className="landing-property-rail" role="region" aria-label="Featured properties" tabIndex={0} ref={trackRef}>
          {featuredProperties.map((property) => <PropertyCard key={property.name} property={property} heading="h3" />)}
        </div>
        <p className="site-fine-print">Prices are indicative and subject to availability.</p>
      </LandingReveal>
    </section>
  );
}
