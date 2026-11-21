import { useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import ScrollProgress from './components/layout/ScrollProgress';
import Footer from './components/layout/Footer';
import HeroSection from './components/hero/HeroSection';
import LeadForm from './components/lead/LeadForm';
import ChatbotWidget from './components/chatbot/ChatbotWidget';
import { CompanyOverview, ServiceDetail, Services } from './components/site/Services';
import { FAQ, ListProperty, PageIntro, PropertySearch } from './components/site/SitePages';
import { CalculatorLinks, EmiCalculator, StampDutyCalculator } from './components/site/Calculators';
import FeaturedDevelopments from './components/site/FeaturedDevelopments';
import CustomerReviews from './components/about/CustomerReviews';
import { services } from './data/services';
import './site.css';
import './landing.css';

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const search = new URLSearchParams(window.location.search);
  const service = services.find(({ slug }) => path === '/services/' + slug);

  useEffect(() => {
    const target = document.getElementById(window.location.hash.slice(1));
    if (!target) return;
    const frame = requestAnimationFrame(() => target.scrollIntoView({ behavior: 'instant' }));
    return () => cancelAnimationFrame(frame);
  }, []);

  const pages = {
    '/': ['Mumbai Property Experts', <>
      <HeroSection />
      <Services home />
      <FeaturedDevelopments />
      <CompanyOverview />
      <CalculatorLinks />
      <CustomerReviews />
    </>],
    '/services': ['Our Services', <Services />],
    '/enquiry': ['Property Enquiry', <LeadForm initialRequirement={search.get('requirement')?.slice(0, 1000)} />],
    '/list-your-property': ['List Your Property', <ListProperty />],
    '/help': ['FAQ', <FAQ />],
    '/emi-calculator': ['Home Loan EMI Calculator', <EmiCalculator />],
    '/stamp-duty-calculator': ['Stamp Duty & Registration Calculator', <StampDutyCalculator />],
    '/properties': ['Explore Properties', <PropertySearch budget={search.get('budget')} />],
  };
  const [title, page] = service
    ? [service.title, <ServiceDetail service={service} />]
    : Object.hasOwn(pages, path) ? pages[path] : ['Page unavailable', (
      <section className="site-section site-container">
        <PageIntro title="Page unavailable" description="Find our services and property tools from the homepage." />
        <a className="site-button" href="/">Go to Home</a>
      </section>
    )];

  useEffect(() => {
    document.title = title + ' | Dayaar Real Estate';
  }, [title]);

  return (
    <>
      <a className="site-skip-link" href="#main-content">Skip to content</a>
      <ScrollProgress />
      <Navbar path={path} />
      <main id="main-content" className={path === '/' ? 'site-main' : 'site-main site-inner-page'} tabIndex={-1}>
        {page}
      </main>
      <Footer />
      <ChatbotWidget />
    </>
  );
}

export default App;
