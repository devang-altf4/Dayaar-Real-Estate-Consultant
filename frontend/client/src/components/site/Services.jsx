import {
  HiOutlineArrowLeft, HiOutlineArrowUpRight, HiOutlineBanknotes, HiOutlineBuildingOffice,
  HiOutlineBuildingOffice2, HiOutlineHomeModern, HiOutlinePaintBrush,
  HiOutlinePaperAirplane, HiOutlineTag, HiOutlineWrenchScrewdriver,
} from 'react-icons/hi2';
import { services } from '../../data/services';
import { LandingImage, LandingReveal } from './LandingReveal';
import { PageIntro } from './SitePages';

const serviceIcons = {
  'buy-a-property': HiOutlineHomeModern,
  'sell-a-property': HiOutlineTag,
  'corporate-leasing': HiOutlineBuildingOffice2,
  'property-redevelopment': HiOutlineBuildingOffice,
  'home-loan-financing': HiOutlineBanknotes,
  'property-management': HiOutlineWrenchScrewdriver,
  'nri-property-solutions': HiOutlinePaperAirplane,
  'interiors-renovations': HiOutlinePaintBrush,
};

const propertyTypes = ['Residential', 'Commercial', 'Bungalows', 'Plots', 'Land'];

export function Services({ home = false }) {
  const Reveal = home ? LandingReveal : 'div';

  return (
    <section id={home ? 'services' : undefined} className="site-section site-services">
      <div className="site-container">
        <div className="site-services-heading">
          <Reveal>
            <PageIntro
              as={home ? 'h2' : 'h1'}
              eyebrow={home ? 'Our Services' : undefined}
              title={home ? 'End-to-end real estate services' : 'Our Services'}
              description="Buy, sell, lease, invest in or manage property in Mumbai with Dayaar."
            />
            <ul className="site-property-types" aria-label="Property types we handle">
              {propertyTypes.map((type) => <li key={type}>{type}</li>)}
            </ul>
          </Reveal>
          {home
            ? <LandingImage className="site-image-panel site-services-image" />
            : <div className="site-image-panel site-services-image" aria-hidden="true" />}
        </div>
        <Reveal className={home ? 'site-service-grid landing-service-grid' : 'site-service-grid'}>
          {(home ? services.slice(0, 3) : services).map(({ slug, title, summary }) => {
            const Icon = serviceIcons[slug];
            return (
              <a key={slug} className="site-card site-service-card" href={'/services/' + slug}>
                <span className="site-icon"><Icon aria-hidden /></span>
                <h3>{title}</h3>
                <p>{summary}</p>
                <HiOutlineArrowUpRight className="site-card-arrow" aria-hidden />
              </a>
            );
          })}
        </Reveal>
        {home && <a href="/services" className="site-text-link site-all-services">View all services <HiOutlineArrowUpRight aria-hidden /></a>}
      </div>
    </section>
  );
}

export function CompanyOverview() {
  return (
    <section className="site-section site-company">
      <div className="site-container site-company-inner">
        <LandingImage className="site-image-panel site-company-image" />
        <LandingReveal className="site-company-copy">
          <PageIntro as="h2" eyebrow="About Dayaar" title="A team based in Mumbai." />
          <p>Our in-house team helps clients buy, sell and lease flats, bungalows, commercial spaces, plots and larger parcels of land. We handle the shortlist and property visits, then coordinate the paperwork and follow-up as the deal progresses.</p>
        </LandingReveal>
      </div>
    </section>
  );
}

export function ServiceDetail({ service }) {
  const Icon = serviceIcons[service.slug];
  const enquiry = '/enquiry?' + new URLSearchParams({ requirement: 'I’m interested in ' + service.title + '.' });

  return (
    <section className="site-section site-container">
      <a className="site-text-link site-back" href="/services"><HiOutlineArrowLeft aria-hidden /> All services</a>
      <PageIntro title={service.title} description={service.summary} />
      <div className="site-card site-service-detail">
        <span className="site-icon"><Icon aria-hidden /></span>
        {service.detail && <p>{service.detail}</p>}
        <h2>How we can help</h2>
        <ul>{service.support.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
      <div className="site-actions site-detail-actions">
        {service.action && <a className="site-button" href={service.action[1]}>{service.action[0]} <HiOutlineArrowUpRight aria-hidden /></a>}
        <a className={service.action ? 'site-button site-button-outline' : 'site-button'} href={enquiry}>Make an Enquiry</a>
      </div>
    </section>
  );
}
