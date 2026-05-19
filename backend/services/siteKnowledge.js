const zoneData = require('../data/zoneData.json');

const companyFacts = [
  'Dayaar Real Estate Consultant is a Mumbai-focused real estate consultancy.',
  'The website helps users explore Mumbai property zones, compare indicative market data, see curated projects, and submit buying or investment preferences.',
  'Hero message: "Your Next Investment Starts Here". The main actions are Explore Zones and Get Expert Advice.',
  'Website sections: Our Journey, Zones, Get in Touch, and Contact.',
  'Visible website stats: 6 premium zones, 20+ curated projects, and 500+ happy families.',
  'Founded in Q1 2022. Started from a small 2x2 office setup and closed the first deal within three months through a Facebook digital card lead.',
  'Expanded in 2024 beyond Mira Road into broader Mumbai, key Western Suburbs, and Dubai market exposure.',
  'Opened a new 400 sq. ft. Mira Road office in May 2025.',
  'Current team: 25 specialists across pre-sales, sales, marketing, operations, and media.',
  'Current coverage spans Mira Road, Borivali, Kandivali, Malad, Andheri, Bandra, and wider Mumbai corridors.',
  'Services include resale, primary market, rentals, commercial leasing, and NRI property asset management.',
  'Dayaar has collaborated with 150+ developers and major brands.',
  'Award count has reached 25 to 30+ across Mumbai, including NAREDCO Mumbai Younger Achiever and young influencer/businessman recognition.',
  'Commercial leases have been secured for major brands including Tata, Reliance, and coffee chains.',
  'Future vision: expand into Tier 1, Tier 2, and Tier 3 cities with new branch offices across states.',
  'Lead form fields: full name, phone number, budget range, profession, BHK, location preferred, and specific requirement.',
  'Budget options: Under Rs 50 Lakh, Rs 50 Lakh to Rs 1 Crore, Rs 1 to Rs 2 Crore, Rs 2 to Rs 5 Crore, Rs 5 to Rs 10 Crore, and Rs 10 Crore plus.',
  'BHK options: 1 BHK, 2 BHK, 3 BHK, 4 BHK, and 5+ BHK.',
  'Lead form promises: response within 24 hours, verified RERA projects only, and secure data handling.',
  'Contact phone numbers: +91 84528 52324 and +91 91379 95833.',
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
