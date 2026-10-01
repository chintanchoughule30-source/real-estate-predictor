import React from "react";
import { motion } from "framer-motion";

export default function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y:   0 }}
      transition={{ duration: 0.5 }}
      className="w-full border-b border-white/5 backdrop-blur-sm bg-slate-950/60 sticky top-0 z-50"
    >
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
            }}
          >
            E
          </div>
          <div>
            <span className="gradient-text font-bold text-lg tracking-tight">
              EstateIQ
            </span>
            <span className="ml-2 text-xs text-slate-500 font-medium uppercase tracking-widest hidden sm:inline">
              Price Intelligence
            </span>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ML Powered
          </span>
          <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium">
            Bengaluru Market
          </span>
        </div>
      </div>
    </motion.header>
  );
}
