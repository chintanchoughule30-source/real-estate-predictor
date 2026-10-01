import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

const BHK_OPTIONS = [1, 2, 3, 4, 5];
const SQFT_MIN    = 300;
const SQFT_MAX    = 8000;
const BATH_MIN    = 1;
const BATH_MAX    = 8;

function updateRangeBackground(el) {
  if (!el) return;
  const min = parseFloat(el.min);
  const max = parseFloat(el.max);
  const val = parseFloat(el.value);
  const pct = ((val - min) / (max - min)) * 100;
  el.style.setProperty("--val", `${pct}%`);
}

export default function Form({ locations, onPredict, loading }) {
  const [bhk,       setBhk]       = useState(2);
  const [totalSqft, setTotalSqft] = useState(1200);
  const [bathrooms, setBathrooms] = useState(2);
  const [location,  setLocation]  = useState("");
  const [locSearch, setLocSearch] = useState("");
  const [dropOpen,  setDropOpen]  = useState(false);
  const [errors,    setErrors]    = useState({});

  const sqftRef = useRef(null);
  const bathRef = useRef(null);
  const dropRef = useRef(null);

  // Keep slider gradient in sync
  useEffect(() => { updateRangeBackground(sqftRef.current); }, [totalSqft]);
  useEffect(() => { updateRangeBackground(bathRef.current); }, [bathrooms]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filtered locations
  const filteredLocs = locations.filter((l) =>
    l.toLowerCase().includes(locSearch.toLowerCase())
  );

  const selectLocation = (loc) => {
    setLocation(loc);
    setLocSearch(loc);
    setDropOpen(false);
    setErrors((e) => ({ ...e, location: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!location) errs.location = "Please select a location.";
    if (totalSqft < SQFT_MIN || totalSqft > SQFT_MAX)
      errs.totalSqft = `Area must be between ${SQFT_MIN} – ${SQFT_MAX} sq. ft.`;
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    onPredict({ location, totalSqft, bhk, bathrooms });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0  }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass-card p-6 sm:p-8"
    >
      <h2 className="text-xl font-semibold text-slate-100 mb-1">Property Details</h2>
      <p className="text-slate-500 text-sm mb-7">
        Configure your property to get an instant price estimate.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-7">
        {/* ── BHK ──────────────────────────────────────── */}
        <div>
          <label className="block text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">
            Bedrooms (BHK)
          </label>
          <div className="flex flex-wrap gap-2">
            {BHK_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setBhk(n)}
                className={`btn-pill w-12 h-10 ${bhk === n ? "btn-pill-active" : "btn-pill-inactive"}`}
              >
                {n === 5 ? "5+" : n}
              </button>
            ))}
          </div>
        </div>

        {/* ── Area Slider ───────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
              Total Area
            </label>
            <motion.span
              key={totalSqft}
              initial={{ scale: 0.85, opacity: 0.5 }}
              animate={{ scale: 1,    opacity: 1   }}
              className="px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-sm font-semibold tabular-nums"
            >
              {totalSqft.toLocaleString()} sq.ft
            </motion.span>
          </div>
          <input
            ref={sqftRef}
            type="range"
            min={SQFT_MIN}
            max={SQFT_MAX}
            step={50}
            value={totalSqft}
            onChange={(e) => {
              setTotalSqft(Number(e.target.value));
              updateRangeBackground(e.target);
            }}
          />
          <div className="flex justify-between text-slate-600 text-xs mt-1">
            <span>{SQFT_MIN.toLocaleString()}</span>
            <span>{SQFT_MAX.toLocaleString()}</span>
          </div>
          {errors.totalSqft && (
            <p className="text-red-400 text-xs mt-1">{errors.totalSqft}</p>
          )}
        </div>

        {/* ── Bathrooms Slider ─────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
              Bathrooms
            </label>
            <motion.span
              key={bathrooms}
              initial={{ scale: 0.85, opacity: 0.5 }}
              animate={{ scale: 1,    opacity: 1   }}
              className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-sm font-semibold"
            >
              {bathrooms} Bath
            </motion.span>
          </div>
          <input
            ref={bathRef}
            type="range"
            min={BATH_MIN}
            max={BATH_MAX}
            step={1}
            value={bathrooms}
            onChange={(e) => {
              setBathrooms(Number(e.target.value));
              updateRangeBackground(e.target);
            }}
          />
          <div className="flex justify-between text-slate-600 text-xs mt-1">
            <span>{BATH_MIN}</span>
            <span>{BATH_MAX}</span>
          </div>
        </div>

        {/* ── Location Dropdown ─────────────────────────── */}
        <div ref={dropRef} className="relative">
          <label className="block text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">
            Location
          </label>
          <input
            type="text"
            placeholder={locations.length ? "Search location…" : "Loading locations…"}
            className="input-field"
            value={locSearch}
            onChange={(e) => {
              setLocSearch(e.target.value);
              setLocation("");
              setDropOpen(true);
            }}
            onFocus={() => setDropOpen(true)}
            autoComplete="off"
          />
          {errors.location && (
            <p className="text-red-400 text-xs mt-1">{errors.location}</p>
          )}

          {/* Dropdown list */}
          {dropOpen && filteredLocs.length > 0 && (
            <div className="absolute z-50 mt-2 w-full max-h-52 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-sm shadow-2xl">
              {filteredLocs.slice(0, 80).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onMouseDown={() => selectLocation(loc)}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-violet-500/15 hover:text-violet-300 transition-colors capitalize"
                >
                  {loc}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Submit ───────────────────────────────────── */}
        <motion.button
          type="submit"
          disabled={loading}
          whileTap={{ scale: 0.97 }}
          className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: loading
              ? "linear-gradient(135deg, #4c1d95 0%, #0e7490 100%)"
              : "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
            boxShadow: loading ? "none" : "0 0 30px rgba(124,58,237,0.35)",
          }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Estimating…
            </span>
          ) : (
            "✦ Estimate Price"
          )}
        </motion.button>
      </form>
    </motion.div>
  );
}
