import { motion } from 'framer-motion';

export default function MapZone({
  zoneId,
  pathData,
  color,
  index,
  isSelected,
  isHovered,
  onHover,
  onClick,
}) {
  const isActive = isSelected || isHovered;

  return (
    <motion.path
      d={pathData}
      fill={`url(#fill-${zoneId})`}
      stroke={color}
      strokeWidth={isActive ? 3 : 1.5}
      className="cursor-pointer"
      style={{
        filter: isActive
          ? `drop-shadow(0 0 20px ${color}90) drop-shadow(0 0 40px ${color}40)`
          : `drop-shadow(0 0 6px ${color}30)`,
        fillOpacity: isActive ? 1 : 0.7,
      }}
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{
        pathLength: { duration: 1.5, delay: index * 0.2, ease: 'easeInOut' },
        opacity: { duration: 0.6, delay: index * 0.2 },
      }}
      whileHover={{
        strokeWidth: 3,
        fillOpacity: 1,
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.97 }}
      onMouseEnter={() => onHover(zoneId)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(zoneId)}
    />
  );
}
