const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
});

export const formatRupees = (amount) => rupees.format(amount);

export function money(value) {
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount > 0 && amount <= 1_000_000_000_000 ? amount : null;
}

export function calculateEmi(principal, annualRate, years) {
  const months = years * 12;
  const monthlyRate = annualRate / 1200;
  const monthly = monthlyRate
    ? principal * monthlyRate / -Math.expm1(-months * Math.log1p(monthlyRate))
    : principal / months;
  const total = monthly * months;
  const interest = Math.max(0, total - principal);
  const schedule = [];
  let balance = principal;
  let principalPaid = 0;
  let interestPaid = 0;

  for (let month = 1; month <= months; month += 1) {
    const interestForMonth = balance * monthlyRate;
    const principalForMonth = month === months ? balance : monthly - interestForMonth;
    balance -= principalForMonth;
    principalPaid += principalForMonth;
    interestPaid += interestForMonth;
    if (month % 12 === 0) {
      schedule.push({ year: month / 12, principal: principalPaid, interest: interestPaid, balance });
      principalPaid = 0;
      interestPaid = 0;
    }
  }

  return { monthly, total, interest, schedule };
}

export const stampLocations = {
  'mumbai-city': 'Mumbai City (within BMC limits)',
  'mumbai-suburban': 'Mumbai Suburban (within BMC limits)',
};

export const officialAsrUrl = 'https://easr.igrmaharashtra.gov.in/';

export function calculateStampDuty({ location, price, readyReckoner, ownership, propertyType }) {
  if (!Object.hasOwn(stampLocations, location)) return null;

  const valuation = Math.max(price, readyReckoner);
  const eligibleResidential = propertyType === 'apartment' || propertyType === 'bungalow';
  // Maharashtra Stamp Act Article 25(b)(i), Mumbai metro cess and the 31 March 2021 residential concession.
  const rate = eligibleResidential && ownership === 'women' ? 5 : 6;
  const stampDuty = Math.round(valuation * rate / 100);
  // Maharashtra Registration Table of Fees, Article I (ad valorem scale).
  const registration = Math.min(30_000, Math.max(100, Math.ceil(valuation / 1000) * 10));
  const fees = stampDuty + registration;

  return { valuation, rate, stampDuty, registration, fees, total: price + fees };
}
