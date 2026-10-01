import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

// Animated counter hook
function useCountUp(target, duration = 1200) {
  const ref     = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const start = performance.now();
    const from  = 0;

    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (target - from) * eased;
      el.textContent = current.toFixed(2);
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return ref;
}

function formatLakhs(val) {
  if (val >= 100) return `₹${(val / 100).toFixed(2)} Cr`;
  return `₹${val.toFixed(2)} L`;
}

function PriceBar({ low, mid, high }) {
  const range   = high - low;
  const midPct  = range > 0 ? ((mid - low) / range) * 100 : 50;

  return (
    <div className="w-full mt-1">
      <div className="relative h-2 rounded-full overflow-hidden bg-white/5">
        {/* Full band */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: "100%",
            background: "linear-gradient(90deg, rgba(34,211,238,0.25) 0%, rgba(139,92,246,0.25) 100%)",
          }}
        />
        {/* Mid marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-violet-400 border-2 border-slate-950"
          style={{ left: `calc(${midPct}% - 6px)` }}
        />
      </div>
      <div className="flex justify-between text-slate-500 text-xs mt-1.5">
        <span>{formatLakhs(low)}</span>
        <span className="text-slate-400 font-medium">Estimated range</span>
        <span>{formatLakhs(high)}</span>
      </div>
    </div>
  );
}

export default function Result({ data }) {
  const { estimated_price, price_low, price_high, location, total_sqft, bhk, bathrooms } = data;

  const priceRef = useCountUp(estimated_price, 1400);

  const stats = [
    { label: "Location",  value: location,        icon: "📍" },
    { label: "Area",      value: `${total_sqft.toLocaleString()} sq.ft`, icon: "📐" },
    { label: "BHK",       value: `${bhk} BHK`,    icon: "🛏" },
    { label: "Bathrooms", value: `${bathrooms}`,   icon: "🚿" },
  ];

  const containerVariants = {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden:  { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0,  transition: { duration: 0.4 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="glass-card p-6 sm:p-8 flex flex-col gap-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
          Estimated Market Value
        </p>
        <div className="flex items-end gap-2">
          <span className="gradient-text font-extrabold text-4xl sm:text-5xl tabular-nums leading-none">
            ₹<span ref={priceRef}>0.00</span>
          </span>
          <span className="text-slate-400 text-lg mb-1">Lakhs</span>
        </div>
        {estimated_price >= 100 && (
          <p className="text-slate-400 text-sm mt-1">
            ≈ {formatLakhs(estimated_price)}
          </p>
        )}
      </motion.div>

      {/* Price band */}
      <motion.div variants={itemVariants} className="bg-white/3 rounded-xl p-4 border border-white/5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          ±10% Confidence Band
        </p>
        <PriceBar low={price_low} mid={estimated_price} high={price_high} />
      </motion.div>

      {/* Stats grid */}
      <motion.div variants={itemVariants}>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Property Summary
        </p>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-white/3 rounded-xl p-3 border border-white/5 flex items-center gap-3"
            >
              <span className="text-xl">{s.icon}</span>
              <div>
                <p className="text-slate-500 text-xs">{s.label}</p>
                <p className="text-slate-200 text-sm font-semibold capitalize truncate max-w-[110px]">
                  {s.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Disclaimer */}
      <motion.p variants={itemVariants} className="text-slate-600 text-xs leading-relaxed">
        * Prediction based on Bengaluru historical data. Actual market prices may vary.
        Not financial advice.
      </motion.p>
    </motion.div>
  );
}
