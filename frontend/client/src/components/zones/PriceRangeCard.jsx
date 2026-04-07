import { motion } from 'framer-motion';
import { HiOutlineHome, HiOutlineBanknotes } from 'react-icons/hi2';

export default function PriceRangeCard({ type, price, rent, index }) {
  return (
    <motion.div
      className="p-5 rounded-2xl flex items-center gap-5"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        border: '1px solid var(--border)',
      }}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', damping: 22 }}
      whileHover={{ borderColor: 'rgba(30,94,255,0.2)', background: 'rgba(255,255,255,0.04)' }}
    >
      {/* BHK Badge */}
      <div
        className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(30,94,255,0.12) 0%, rgba(30,94,255,0.04) 100%)',
          border: '1px solid rgba(30,94,255,0.1)',
        }}
      >
        <span className="text-xs font-black" style={{ color: '#1E5EFF' }}>
          {type}
        </span>
      </div>

      {/* Price Info */}
      <div className="flex-1 flex items-center justify-between gap-4 min-w-0">
        {/* Buy Price */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <HiOutlineHome className="w-3.5 h-3.5 shrink-0" style={{ color: '#4A7FBF', opacity: 0.7 }} />
            <span
              className="text-[9px] uppercase tracking-[0.1em] font-bold"
              style={{ color: 'var(--text-muted)' }}
            >
              Buy Price
            </span>
          </div>
          <p className="text-[15px] font-bold leading-tight truncate" style={{ color: 'var(--cream)' }}>
            {price || '—'}
          </p>
        </div>

        {/* Divider */}
        <div className="w-px h-10 shrink-0" style={{ background: 'var(--border)' }} />

        {/* Monthly Rent */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <HiOutlineBanknotes className="w-3.5 h-3.5 shrink-0" style={{ color: '#4A7FBF', opacity: 0.7 }} />
            <span
              className="text-[9px] uppercase tracking-[0.1em] font-bold"
              style={{ color: 'var(--text-muted)' }}
            >
              Monthly Rent
            </span>
          </div>
          <p className="text-[15px] font-semibold leading-tight truncate" style={{ color: 'var(--cream-dim)' }}>
            {rent || '—'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
