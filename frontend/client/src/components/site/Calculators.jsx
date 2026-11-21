import { useState } from 'react';
import { HiOutlineArrowUpRight, HiOutlineCalculator, HiOutlineDocumentCurrencyRupee } from 'react-icons/hi2';
import { calculateEmi, calculateStampDuty, formatRupees, money, officialAsrUrl, stampLocations } from '../../utils/calculatorMath';
import { PageIntro } from './SitePages';
import { LandingReveal } from './LandingReveal';

const moneyInput = { type: 'number', inputMode: 'numeric', min: 1, max: 1_000_000_000_000, step: 1 };

export function CalculatorLinks() {
  return (
    <section className="site-section site-tools">
      <LandingReveal className="site-container site-tools-panel">
        <PageIntro as="h2" title="Plan smart. Buy confidently." description="Use our free tools to estimate your monthly repayments and the upfront costs of buying property." />
        <div className="site-tool-grid">
          <a className="site-card site-service-card" href="/emi-calculator">
            <span className="site-icon"><HiOutlineCalculator aria-hidden /></span>
            <h3>Calculate Your EMI</h3><p>Know your monthly repayment.</p>
            <HiOutlineArrowUpRight className="site-card-arrow" aria-hidden />
          </a>
          <a className="site-card site-service-card" href="/stamp-duty-calculator">
            <span className="site-icon"><HiOutlineDocumentCurrencyRupee aria-hidden /></span>
            <h3>Estimate Stamp Duty</h3><p>Plan for stamp duty and registration fees.</p>
            <HiOutlineArrowUpRight className="site-card-arrow" aria-hidden />
          </a>
        </div>
      </LandingReveal>
    </section>
  );
}

function Estimate({ title, amount, items }) {
  return (
    <div className="site-card site-estimate" aria-live="polite" aria-atomic="true">
      <p className="site-estimate-label">{title}</p>
      <output>{formatRupees(amount)}</output>
      <dl>{items.map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{formatRupees(value)}</dd></div>
      ))}</dl>
    </div>
  );
}

function RepaymentChart({ schedule }) {
  const maxPayment = Math.max(...schedule.map(({ principal, interest }) => principal + interest));
  return (
    <figure className="site-card site-chart">
      <figcaption>
        <h2>Annual repayment breakdown</h2>
        <div className="site-chart-legend">
          <span><i className="site-chart-principal" /> Principal</span>
          <span><i className="site-chart-interest" /> Interest</span>
        </div>
      </figcaption>
      <div className="site-chart-bars" aria-hidden="true">
        {schedule.map(({ year, principal, interest }) => (
          <div key={year} className="site-chart-column" title={'Year ' + year + ' · Principal ' + formatRupees(principal) + ' · Interest ' + formatRupees(interest)}>
            <span className="site-chart-principal" style={{ height: principal / maxPayment * 100 + '%' }} />
            <span className="site-chart-interest" style={{ height: interest / maxPayment * 100 + '%' }} />
          </div>
        ))}
      </div>
      <div className="site-chart-years" aria-hidden="true">
        <span>Year 1</span>{schedule.length > 1 && <span>Year {schedule.length}</span>}
      </div>
      <details className="site-schedule">
        <summary>View repayment schedule</summary>
        <div className="site-table-scroll">
          <table>
            <thead><tr><th scope="col">Year</th><th scope="col">Principal</th><th scope="col">Interest</th><th scope="col">Balance</th></tr></thead>
            <tbody>{schedule.map(({ year, principal, interest, balance }) => (
              <tr key={year}><th scope="row">{year}</th><td>{formatRupees(principal)}</td><td>{formatRupees(interest)}</td><td>{formatRupees(balance)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

export function EmiCalculator() {
  const [amount, setAmount] = useState('8000000');
  const [rate, setRate] = useState('8.5');
  const [tenure, setTenure] = useState('20');
  const [downPayment, setDownPayment] = useState('');
  const principal = money(amount);
  const years = Number(tenure);
  const annualRate = Number(rate);
  const validRate = rate !== '' && Number.isFinite(annualRate) && annualRate >= 0 && annualRate <= 100;
  const result = principal && validRate && Number.isInteger(years) && years >= 1 && years <= 40
    ? calculateEmi(principal, annualRate, years) : null;
  const budget = principal + (money(downPayment) ?? 0);
  const validBudget = result && money(budget) && (downPayment === '' || Number(downPayment) === 0 || money(downPayment));

  return (
    <section className="site-section site-container">
      <PageIntro title="Home Loan EMI Calculator" description="Enter your loan amount, interest rate and tenure to see your estimated monthly payment and total interest." />
      <div className="site-calculator-grid">
        <div className="site-card site-form">
          <label>Loan amount (₹)<input {...moneyInput} value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <div className="site-field-grid">
            <label>Annual interest rate (%)<input type="number" inputMode="decimal" min="0" max="100" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} /></label>
            <label>Loan tenure (years)<input type="number" inputMode="numeric" min="1" max="40" step="1" value={tenure} onChange={(event) => setTenure(event.target.value)} /></label>
          </div>
          <label>Down payment (₹, optional)
            <input {...moneyInput} min="0" placeholder="0" value={downPayment} onChange={(event) => setDownPayment(event.target.value)} />
            <small>Add your planned down payment to estimate your property budget.</small>
          </label>
        </div>
        {result ? <Estimate title="Estimated monthly EMI" amount={result.monthly} items={[
          ['Loan principal', principal], ['Total interest', result.interest], ['Total repayment', result.total],
        ]} /> : <div className="site-card site-estimate" role="status">Enter a valid loan amount, an annual rate from 0–100% and a tenure from 1–40 years.</div>}
      </div>
      {result && <RepaymentChart schedule={result.schedule} />}
      <p className="site-fine-print">This estimate assumes a fixed interest rate and monthly payments. Lender fees and other purchase costs are excluded.</p>
      {validBudget && <a className="site-button" href={'/properties?budget=' + budget}>Explore Properties up to {formatRupees(budget)} <HiOutlineArrowUpRight aria-hidden /></a>}
      {result && !validBudget && <p className="site-fine-print" role="status">Enter a valid down payment to explore properties within your estimated budget.</p>}
    </section>
  );
}

export function StampDutyCalculator() {
  const [location, setLocation] = useState('mumbai-city');
  const [ownership, setOwnership] = useState('standard');
  const [propertyType, setPropertyType] = useState('apartment');
  const [saleValue, setSaleValue] = useState('');
  const [asrValue, setAsrValue] = useState('');
  const price = money(saleValue);
  const readyReckoner = money(asrValue);
  const estimate = price && readyReckoner && calculateStampDuty({ location, price, readyReckoner, ownership, propertyType });
  const estimatePrompt = location === 'outside'
    ? 'For a property outside Greater Mumbai, confirm the applicable rate with the Maharashtra registration department.'
    : 'Enter the purchase price and full ready-reckoner valuation to see your estimate.';

  return (
    <section className="site-section site-container">
      <PageIntro title="Stamp Duty & Registration Calculator" description="Estimate government charges for a standard property purchase within Greater Mumbai." />
      <div className="site-calculator-grid">
        <div className="site-card site-form">
          <label>Property location<select value={location} onChange={(event) => setLocation(event.target.value)}>
            {Object.entries(stampLocations).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            <option value="outside">Outside Greater Mumbai</option>
          </select></label>
          <div className="site-field-grid">
            <label>Purchase price (₹)<input {...moneyInput} placeholder="e.g. 10000000" value={saleValue} onChange={(event) => setSaleValue(event.target.value)} /></label>
            <label>Ready-reckoner valuation (₹)<input {...moneyInput} placeholder="e.g. 10500000" value={asrValue} onChange={(event) => setAsrValue(event.target.value)} /></label>
          </div>
          <a className="site-text-link" href={officialAsrUrl} target="_blank" rel="noreferrer">Look up ready-reckoner rates on e-ASR <HiOutlineArrowUpRight aria-hidden /></a>
          <label>Ownership category<select value={ownership} onChange={(event) => setOwnership(event.target.value)}>
            <option value="standard">Standard rate (individual, mixed joint or entity)</option>
            <option value="women">Woman buyer or women buyers only</option>
          </select></label>
          <label>Property type<select value={propertyType} onChange={(event) => setPropertyType(event.target.value)}>
            <option value="apartment">Flat or apartment (residential)</option>
            <option value="bungalow">Bungalow (residential)</option>
            <option value="commercial">Commercial</option>
            <option value="plot">Plot</option>
            <option value="land">Land</option>
          </select></label>
        </div>
        {estimate ? <Estimate title="Estimated total government fees" amount={estimate.fees} items={[
          ['Assessed value (higher of the two)', estimate.valuation],
          ['Stamp duty including metro cess (' + estimate.rate + '%)', estimate.stampDuty],
          ['Registration fee', estimate.registration],
          ['Purchase price plus estimated fees', estimate.total],
        ]} /> : <div className="site-card site-estimate" role="status">{estimatePrompt}</div>}
      </div>
      <p className="site-fine-print">The estimate covers stamp duty and registration for a standard sale or conveyance. GST, brokerage, legal fees and any special exemptions or adjustments are excluded. Confirm the amount with the registering office before paying.</p>
      <a className="site-text-link" href="https://igrmaharashtra.gov.in/" target="_blank" rel="noreferrer">Maharashtra Registration & Stamps Department <HiOutlineArrowUpRight aria-hidden /></a>
    </section>
  );
}
