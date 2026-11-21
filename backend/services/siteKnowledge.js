const zoneData = require('../data/zoneData.json');

const companyFacts = [
  'Dayaar Real Estate Consultant is a Mumbai-focused real estate consultancy.',
  'Website navigation: Home, Our Services, Property Enquiry, List Your Property, Contact Us, FAQ, EMI Calculator, and STD Calculator (stamp duty and registration).',
  'The website has a budget-filtered shortlist of new apartments at /properties. Property owners can prepare a WhatsApp listing enquiry at /list-your-property.',
  'The EMI calculator at /emi-calculator estimates monthly payments and a repayment schedule. The stamp duty calculator at /stamp-duty-calculator estimates charges for standard purchases within Greater Mumbai.',
  'The in-house team handles flats, bungalows, offices, shops, plots and land and coordinates shortlisting, visits and paperwork.',
  'Current coverage spans Mira Road, Borivali, Kandivali, Malad, Andheri, Bandra, and wider Mumbai corridors.',
  'Services include buying and resale, residential and commercial leasing, corporate leasing, property redevelopment, financing assistance, property management, NRI support, and interiors and renovations.',
  'Lead form fields: full name, phone number, budget range, profession, BHK, location preferred, and specific requirement.',
  'Budget options: Under Rs 50 Lakh, Rs 50 Lakh to Rs 1 Crore, Rs 1 to Rs 2 Crore, Rs 2 to Rs 5 Crore, Rs 5 to Rs 10 Crore, and Rs 10 Crore plus.',
  'BHK options: 1 BHK, 2 BHK, 3 BHK, 4 BHK, and 5+ BHK.',
  'Lead form promises: response within 24 hours, verified RERA projects only, and secure data handling.',
  'Phone and WhatsApp: +91 91521 53500.',
  'Email: Info@dayaarrealestate.com.',
  'Office address: Office no.7, 1st Floor, Oswal Garden, Kanakia Road, near Park View Hotel, Mira Road East, Thane 401107.',
  'Social channels shown on the website include WhatsApp, Instagram, YouTube, Facebook, Threads, and Say More/Google review link.',
  'Customer reviews emphasize NRI purchase support, paperwork help, professionalism, patience, market knowledge, negotiation support, coordination, and trustworthy service.',
];

function formatBhkKey(key) {
  const count = key.replace('bhk', '').toUpperCase();
  return `${count} BHK`;
}

function formatPriceRange(priceRange = {}) {
  return Object.entries(priceRange)
    .map(([key, value]) => {
      const price = value?.price || 'price on request';
      const rent = value?.rent || 'rent on request';
      return `${formatBhkKey(key)} buy ${price}, rent ${rent}`;
    })
    .join('; ');
}

function formatProjectConfigs(configs = {}) {
  return Object.entries(configs)
    .map(([key, value]) => {
      const price = value?.startingPrice || 'price on request';
      const carpet = value?.carpet ? `, carpet ${value.carpet}` : '';
      return `${formatBhkKey(key)} ${price}${carpet}`;
    })
    .join('; ');
}

function formatProjects(projects = []) {
  return projects
    .map((project) => {
      const configs = formatProjectConfigs(project.configs);
      const amenities = Array.isArray(project.amenities) && project.amenities.length
        ? ` Amenities/features: ${project.amenities.join(', ')}.`
        : '';

      return [
        `${project.codename}: ${project.tagline || 'curated project'}`,
        `Type ${project.type || 'Residential'}`,
        `status ${project.status || 'available'}`,
        project.possession ? `possession ${project.possession}` : null,
        configs ? `configs ${configs}` : null,
        amenities.trim(),
      ].filter(Boolean).join('. ');
    })
    .join('\n');
}

function buildZoneKnowledge() {
  return zoneData
    .map((zone) => {
      const priceRanges = formatPriceRange(zone.priceRange);
      const connectivity = zone.demographics?.connectivity?.join(', ') || 'connectivity details available in the zone panel';
      const projects = formatProjects(zone.projects);

      return [
        `Zone: ${zone.name} (${zone.subtitle}).`,
        `Description: ${zone.description}`,
        `Price per sq.ft: ${zone.pricePerSqFt}. Rental yield: ${zone.rentalYield}.`,
        priceRanges ? `Indicative ranges: ${priceRanges}.` : null,
        zone.demographics?.character ? `Market character: ${zone.demographics.character}.` : null,
        zone.demographics?.buildingStyle ? `Building style: ${zone.demographics.buildingStyle}.` : null,
        `Connectivity: ${connectivity}.`,
        projects ? `Curated projects:\n${projects}` : null,
      ].filter(Boolean).join('\n');
    })
    .join('\n\n');
}

function getSiteKnowledge() {
  return [
    'DAYAAR WEBSITE FACTS',
    companyFacts.map((fact) => `- ${fact}`).join('\n'),
    '',
    'MUMBAI ZONE AND PROJECT DATA',
    buildZoneKnowledge(),
  ].join('\n');
}

module.exports = {
  getSiteKnowledge,
};
