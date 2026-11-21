import { HiOutlineArrowUpRight } from 'react-icons/hi2';
import { formatRupees } from '../../utils/calculatorMath';

export default function PropertyCard({ property, enquiryNote = '', heading = 'h2' }) {
  const Heading = heading;
  const requirement = ['I’m interested in ' + property.name + '.', enquiryNote].filter(Boolean).join(' ');

  return (
    <article className="site-card site-property-card">
      <img src={'/images/projects/' + property.image} alt="" loading="lazy" />
      <div>
        <p className="site-eyebrow">{property.location}</p>
        <Heading>{property.name}</Heading>
        <p>From {formatRupees(property.from)}</p>
        <a className="site-text-link" href={'/enquiry?' + new URLSearchParams({ requirement })}>
          Enquire about this project <HiOutlineArrowUpRight aria-hidden />
        </a>
      </div>
    </article>
  );
}
