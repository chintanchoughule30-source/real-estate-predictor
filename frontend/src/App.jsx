import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header  from "./components/Header.jsx";
import Form    from "./components/Form.jsx";
import Result  from "./components/Result.jsx";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export default function App() {
  const [locations, setLocations]   = useState([]);
  const [locError,  setLocError]    = useState(null);
  const [result,    setResult]      = useState(null);
  const [loading,   setLoading]     = useState(false);
  const [apiError,  setApiError]    = useState(null);

  // ── Load location list on mount ────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/locations`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setLocations(data.locations))
      .catch((e) =>
        setLocError(
          "Could not reach the backend. Make sure the API server is running on port 8000."
        )
      );
  }, []);

  // ── Prediction handler ─────────────────────────────
  const handlePredict = useCallback(async (formData) => {
    setLoading(true);
    setApiError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          location:   formData.location,
          total_sqft: formData.totalSqft,
          bhk:        formData.bhk,
          bathrooms:  formData.bathrooms,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? `Server error ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setApiError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Background radial glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(139,92,246,0.2) 0%, transparent 70%)",
        }}
      />
      {/* Ambient grid */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />

        <main className="flex-1 flex items-start justify-center px-4 py-10">
          <div className="w-full max-w-5xl">
            {locError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
              >
                ⚠️ {locError}
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <Form
                locations={locations}
                onPredict={handlePredict}
                loading={loading}
              />

              <AnimatePresence mode="wait">
                {apiError && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass-card p-6 text-red-400 border-red-500/30"
                  >
                    <p className="font-semibold mb-1">Prediction failed</p>
                    <p className="text-sm text-red-300/80">{apiError}</p>
                  </motion.div>
                )}

                {result && !apiError && (
                  <Result key="result" data={result} />
                )}

                {!result && !apiError && !loading && (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-card p-8 flex flex-col items-center justify-center text-center gap-4 min-h-[260px]"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-3xl">
                      🏠
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                      Fill in the property details on the left and click{" "}
                      <span className="text-violet-400 font-medium">
                        Estimate Price
                      </span>{" "}
                      to get an instant AI-powered valuation.
                    </p>
                  </motion.div>
                )}

                {loading && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-card p-8 flex flex-col items-center justify-center gap-4 min-h-[260px]"
                  >
                    <div className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
                    <p className="text-slate-400 text-sm">Calculating valuation…</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>

        <footer className="text-center py-6 text-slate-600 text-xs border-t border-white/5">
          EstateIQ · Real Estate Valuation · Powered by ML
        </footer>
      </div>
    </div>
  );
}
