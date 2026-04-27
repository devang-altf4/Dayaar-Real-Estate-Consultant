/**
 * ProjectCard — Stitch style with prominent status badges
 * Using inline CSS to avoid Tailwind v4 issues
 */
import { motion } from 'framer-motion';
import { HiOutlineBuildingOffice2, HiOutlineClock, HiOutlineCheckCircle } from 'react-icons/hi2';

// Inline styles
const styles = {
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  imageSection: {
    padding: '12px 12px 0',
  },
  image: {
    width: '100%',
    display: 'block',
    height: 'clamp(140px, 24vw, 210px)',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    objectFit: 'cover',
    objectPosition: 'center',
    background: 'rgba(255,255,255,0.03)',
  },
  header: {
    padding: '16px 16px 12px',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  projectName: {
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.2,
    marginBottom: 2,
    color: 'var(--cream)',
  },
  tagline: {
    fontSize: 11,
    fontStyle: 'italic',
    color: 'var(--text-muted)',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    flexShrink: 0,
  },
  statusIcon: {
    width: 12,
    height: 12,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 10,
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  metaIcon: {
    width: 12,
    height: 12,
    color: '#4A7FBF',
  },
  configSection: {
    padding: '0 16px 12px',
  },
  configGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 16,
  },
  configLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 700,
    display: 'block',
    marginBottom: 4,
    color: '#4A7FBF',
  },
  configPrice: {
    fontSize: 16,
    fontWeight: 900,
    color: 'var(--cream)',
  },
  configCarpet: {
    fontSize: 10,
    display: 'block',
    color: 'var(--text-muted)',
  },
  amenitiesSection: {
    padding: '0 16px 16px',
  },
  amenitiesGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  amenityTag: {
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 500,
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--cream-dim)',
  },
  amenityMore: {
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 500,
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--text-muted)',
  },
};

export default function ProjectCard({ project, index }) {
  const isPreLaunch = project.status === 'Pre-Launch';
  const configItems = [
    { key: 'bhk1', label: '1 BHK' },
    { key: 'bhk2', label: '2 BHK' },
    { key: 'bhk3', label: '3 BHK' },
  ].filter(({ key }) => project.configs?.[key]);
  
  const getStatusStyle = () => {
    if (isPreLaunch) {
      return {
        color: '#1E5EFF',
        text: 'PRE-LAUNCH',
      };
    }
    return {
      color: '#22c55e',
      text: 'UNDER CONSTRUCTION',
    };
  };
  
  const statusStyle = getStatusStyle();

  return (
    <motion.div
      style={styles.card}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', damping: 24 }}
    >
      {project.imageUrl && (
        <div style={styles.imageSection}>
          <img
            src={project.imageUrl}
            alt={`${project.codename} preview`}
            style={styles.image}
            loading="lazy"
          />
        </div>
      )}

      {/* Header with status badge */}
      <div style={styles.header}>
        <div style={styles.headerRow}>
          <div style={styles.headerLeft}>
            <h4 style={styles.projectName}>
              {project.codename}
            </h4>
            <p style={styles.tagline}>
              {project.tagline}
            </p>
          </div>
          {/* Stitch-style status badge */}
          <span style={{ ...styles.statusBadge, color: statusStyle.color }}>
            <HiOutlineCheckCircle style={styles.statusIcon} />
            {statusStyle.text}
          </span>
        </div>

        {/* Meta row */}
        <div style={styles.metaRow}>
          <span style={styles.metaItem}>
            <HiOutlineBuildingOffice2 style={styles.metaIcon} />
            {project.type}
          </span>
          <span style={styles.metaItem}>
            <HiOutlineClock style={styles.metaIcon} />
            {project.possession}
          </span>
        </div>
      </div>

      {/* BHK Configs - Stitch layout */}
      <div style={styles.configSection}>
        <div
          style={{
            ...styles.configGrid,
            gridTemplateColumns: `repeat(${Math.max(1, Math.min(configItems.length, 3))}, minmax(0, 1fr))`,
          }}
        >
          {configItems.map(({ key, label }) => (
            <div key={key}>
              <span style={styles.configLabel}>{label}</span>
              <p style={styles.configPrice}>
                {project.configs[key].startingPrice}
              </p>
              <span style={styles.configCarpet}>
                {project.configs[key].carpet}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Amenities - horizontal tags */}
      {project.amenities && project.amenities.length > 0 && (
        <div style={styles.amenitiesSection}>
          <div style={styles.amenitiesGrid}>
            {project.amenities.slice(0, 4).map((a) => (
              <span key={a} style={styles.amenityTag}>
                {a}
              </span>
            ))}
            {project.amenities.length > 4 && (
              <span style={styles.amenityMore}>
                +{project.amenities.length - 4}
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
