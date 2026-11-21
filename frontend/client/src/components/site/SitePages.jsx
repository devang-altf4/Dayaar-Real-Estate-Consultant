import { useState } from 'react';
import { HiOutlineArrowUpRight, HiOutlineChatBubbleLeftRight, HiOutlineEnvelope, HiOutlinePhone } from 'react-icons/hi2';
import { contactPhoneHref, contactWhatsAppHref } from '../../data/contact';
import { featuredProperties } from '../../data/featuredProperties';
import { formatRupees, money } from '../../utils/calculatorMath';
import PropertyCard from './PropertyCard';

export function PageIntro({ as = 'h1', eyebrow, title, description }) {
  const Heading = as;
  return (
    <div className="site-page-intro">
      {eyebrow && <p className="site-eyebrow">{eyebrow}</p>}
      <Heading>{title}</Heading>
      {description && <p className="site-page-description">{description}</p>}
    </div>
  );
}

export function ListProperty() {
  const [message, setMessage] = useState('');

  function prepareMessage(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setMessage([
      'Hi Dayaar, I would like to list a property.',
      'Name: ' + fields.get('name').trim(),
      'Purpose: ' + fields.get('purpose'),
      'Property type: ' + fields.get('propertyType'),
      'Location: ' + fields.get('location').trim(),
      fields.get('price').trim() && 'Expected price or rent: ' + fields.get('price').trim(),
      fields.get('details').trim() && 'Details: ' + fields.get('details').trim(),
    ].filter(Boolean).join('\n'));
  }

  return (
    <section className="site-section site-container">
      <PageIntro
        title="List Your Property"
        description={
          <>
            Looking to sell or rent your property? Share a few details, and let Dayaar connect you with genuine buyers or suitable tenants through our extensive network.{' '}
            <strong>A faster, simpler way to find the right match.</strong>
          </>
        }
      />
      <form className="site-card site-form site-list-form" onSubmit={prepareMessage} onInput={() => setMessage('')}>
        <div className="site-field-grid">
          <label>Your name<input name="name" autoComplete="name" required pattern=".*\S.*" maxLength={100} /></label>
          <label>Location<input name="location" placeholder="e.g. Marine Lines, Mumbai" required pattern=".*\S.*" maxLength={150} /></label>
          <label>Listing purpose<select name="purpose"><option>Sell</option><option>Lease or rent out</option></select></label>
          <label>Property type<select name="propertyType">
            <option>Flat or apartment</option><option>Bungalow</option><option>Commercial</option><option>Plot</option><option>Land</option>
          </select></label>
        </div>
        <label>Expected price or monthly rent (optional)<input name="price" placeholder="e.g. ₹1.2 crore or ₹45,000/month" maxLength={100} /></label>
        <label>Property details (optional)<textarea name="details" rows="4" placeholder="Carpet area, configuration or availability" maxLength={700} /></label>
        <button className="site-button" type="submit">Prepare WhatsApp Message</button>
        {message && (
          <div className="site-list-message" role="status">
            <p>Your draft is ready. Review it in WhatsApp before sending.</p>
            <a className="site-text-link" href={contactWhatsAppHref + '?' + new URLSearchParams({ text: message })} target="_blank" rel="noreferrer">Open WhatsApp <HiOutlineArrowUpRight aria-hidden /></a>
          </div>
        )}
      </form>
    </section>
  );
}

const questions = [
  ['What types of properties does Dayaar handle?', 'We handle flats and apartments, bungalows, offices, retail and commercial spaces, plots and larger land parcels.'],
  ['How do I enquire about a property?', 'Use the Property Enquiry page to tell us your preferred location, budget and requirements. If you have a project in mind, include its name.'],
  ['Can I list a property for sale or rent?', 'Yes. Use List Your Property to prepare a WhatsApp message with the property type, location and expected price or rent.'],
  ['Where do I get the ready-reckoner valuation?', 'Use the Maharashtra government’s e-ASR service to look up the applicable rates and valuation guidance for the property. You can enter the resulting property valuation in the stamp duty calculator.'],
  ['Can the EMI calculator tell me my loan eligibility?', 'It estimates repayments from the amount, interest rate and term you enter. Your lender determines the amount you can borrow and the terms available to you.'],
];

export function FAQ() {
  return (
    <section className="site-section site-container">
      <PageIntro title="FAQ" description="Find answers about property enquiries, listings and the calculators." />
      <div className="site-faq">
        {questions.map(([question, answer]) => (
          <details className="site-card" key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
      <div className="site-actions site-detail-actions">
        <a className="site-button" href={contactPhoneHref}><HiOutlinePhone aria-hidden /> Call Dayaar</a>
        <a className="site-button site-button-outline" href="mailto:info@dayaarrealestate.com"><HiOutlineEnvelope aria-hidden /> Email Us</a>
        <a className="site-button site-button-outline" href={contactWhatsAppHref}><HiOutlineChatBubbleLeftRight aria-hidden /> WhatsApp</a>
      </div>
    </section>
  );
}

export function PropertySearch({ budget }) {
  const maxBudget = money(budget);
  const [priceLimit, setPriceLimit] = useState(maxBudget ? String(maxBudget) : '');
  const limit = money(priceLimit);
  const invalidLimit = priceLimit !== '' && limit === null;
  const matches = limit ? featuredProperties.filter((property) => property.from <= limit) : featuredProperties;
  const requirement = limit ? 'I’m looking for a property with a budget of up to ' + formatRupees(limit) + '.' : 'I’m looking for property recommendations.';

  return (
    <section className="site-section site-container">
      <PageIntro title="Explore Properties" description="Browse a shortlist of new Mumbai apartments and filter by indicative starting price." />
      <div className="site-card site-form site-budget-filter">
        <label>Maximum property budget (₹)<input type="number" min="1" max="1000000000000" step="1" inputMode="numeric" placeholder="Any starting price" value={priceLimit} aria-invalid={invalidLimit} onChange={(event) => setPriceLimit(event.target.value)} /></label>
        <button className="site-button site-button-outline" type="button" onClick={() => setPriceLimit('')} disabled={!priceLimit}>Clear budget</button>
      </div>
      <p className="site-search-status" role="status">
        {invalidLimit ? 'Enter a valid whole-rupee budget to filter the shortlist.' : matches.length + (matches.length === 1 ? ' project' : ' projects') + (limit ? ' starting within ' + formatRupees(limit) : '')}
      </p>
      {matches.length ? (
        <div className="site-service-grid">
          {matches.map((property) => <PropertyCard key={property.name} property={property} enquiryNote={requirement} />)}
        </div>
      ) : <p>There are no matches in this shortlist. Tell us your budget so we can help you look for other options.</p>}
      <p className="site-fine-print">Prices are indicative and subject to availability. Confirm current pricing and charges with Dayaar.</p>
      <a className="site-button" href={'/enquiry?' + new URLSearchParams({ requirement })}>Ask Dayaar for Options <HiOutlineArrowUpRight aria-hidden /></a>
    </section>
  );
}
