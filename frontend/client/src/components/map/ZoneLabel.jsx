import { motion } from 'framer-motion';

export default function ZoneLabel({ zoneId, name, position, color, index, isSelected, isHovered }) {
  const isActive = isSelected || isHovered;

  // Calculate dynamic width based on label text length
  const labelWidth = Math.max(90, name.length * 9 + 24);

  return (
    <motion.g
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
      style={{ cursor: 'pointer' }}
    >
      {/* Label background */}
      <motion.rect
        x={position.x - labelWidth / 2}
        y={position.y - 12}
        width={labelWidth}
        height="24"
        rx="12"
        fill={isActive ? color : 'rgba(15,23,42,0.9)'}
        stroke={color}
        strokeWidth={isActive ? 2 : 1}
        animate={{
          fill: isActive ? color : 'rgba(15,23,42,0.9)',
          strokeWidth: isActive ? 2 : 1,
        }}
        transition={{ duration: 0.2 }}
      />
      {/* Label text */}
      <text
        x={position.x}
        y={position.y + 4}
        textAnchor="middle"
        fill={isActive ? '#0f172a' : '#f1f5f9'}
        fontSize="10"
        fontFamily="Outfit, sans-serif"
        fontWeight={isActive ? '800' : '600'}
        letterSpacing="0.3"
        style={{ pointerEvents: 'none' }}
      >
        {name}
      </text>
    </motion.g>
  );
}
