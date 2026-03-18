"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

type Stage = "form" | "loading" | "result" | "error";

const EMOJIS = [
  "⭐","🎙️","🎮","⚡","🌟","🎬","🔥","👁️","🐶","🦋","🎵","💥","🌈",
  "🎉","👾","🦄","💫","🍕","🏆","🎯","💜","🧨","🐉","🌸","🎪","🤖",
  "🎸","🧃","🪩","🫶","💎","🌙","✨","🦊","🎠","🪄","🎭","🛸","🧸",
];

interface FallingEmoji {
  id: number;
  emoji: string;
  left: number;      // %
  duration: number;  // seconds
  delay: number;     // seconds
  size: number;      // rem
  opacity: number;
  rotation: number;
}

function FallingEmojis() {
  const [emojis, setEmojis] = useState<FallingEmoji[]>([]);

  useEffect(() => {
    const count = 45;
    const items: FallingEmoji[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      emoji: EMOJIS[i % EMOJIS.length],
      left: Math.random() * 98,
      duration: 6 + Math.random() * 10,
      delay: -(Math.random() * 16), // negativo = ya empezó a caer
      size: 1.2 + Math.random() * 1.8,
      opacity: 0.12 + Math.random() * 0.2,
      rotation: (Math.random() - 0.5) * 40,
    }));
    setEmojis(items);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      {emojis.map((e) => (
        <div
          key={e.id}
          className="absolute"
          style={{
            left: `${e.left}%`,
            top: "-80px",
            fontSize: `${e.size}rem`,
            opacity: e.opacity,
            animation: `fall ${e.duration}s ${e.delay}s linear infinite`,
            transform: `rotate(${e.rotation}deg)`,
            userSelect: "none",
          }}
        >
          {e.emoji}
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("form");
  const [name, setName] = useState("");
  const [selectorEstilo, setSelectorEstilo] = useState<number>(1);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [statusMsg, setStatusMsg] = useState("Subiendo tu foto...");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo || !name) return;

    setStage("loading");
    setStatusMsg("Subiendo tu foto...");

    try {
      // 1. Subir foto a Vercel Blob
      const uploadForm = new FormData();
      uploadForm.append("photo", photo);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: uploadForm,
      });
      if (!uploadRes.ok) throw new Error("No se pudo subir la foto. Intentá de nuevo.");
      const { url: photoUrl } = await uploadRes.json();

      setStatusMsg("Lanzando el generador...");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl, name, selectorEstilo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar");

      const runId = data.run_id;
      setStatusMsg("Generando tu credencial... esto tarda ~30 segundos 🎨");

      // Poll hasta 8 minutos (120 × 4s)
      const MAX_ATTEMPTS = 120;
      let attempts = 0;
      while (attempts < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 4000));
        attempts++;

        try {
          const statusRes = await fetch(`/api/status/${runId}`);
          const statusData = await statusRes.json();

          if (statusData.status === "success" && statusData.output_url) {
            setResultUrl(statusData.output_url);
            setStage("result");
            return;
          }
          if (statusData.status === "failed") throw new Error("La generación falló. Intentá de nuevo.");
        } catch (pollErr) {
          // Ignorar errores de red transitorios y seguir polling
          if (pollErr instanceof Error && pollErr.message.includes("falló")) throw pollErr;
        }

        const progress = Math.min(Math.round((attempts / MAX_ATTEMPTS) * 100), 95);
        setStatusMsg(`Generando tu credencial... ${progress}% ✨`);
      }
      throw new Error("Tiempo de espera superado. Intentá de nuevo.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
      setStage("error");
    }
  };

  const reset = () => {
    setStage("form");
    setPhoto(null);
    setPhotoPreview(null);
    setResultUrl(null);
    setErrorMsg("");
  };

  return (
    <>
      <style>{`
        @keyframes fall {
          0%   { transform: translateY(-80px) rotate(var(--r, 0deg)); }
          100% { transform: translateY(110vh) rotate(var(--r, 0deg)); }
        }
      `}</style>

      <div className="noise min-h-screen relative overflow-hidden">
        {/* Background gradient mesh */}
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[var(--luzu-teal)] opacity-[0.07] blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[var(--luzu-pink)] opacity-[0.07] blur-[100px]" />
          <div className="absolute top-[40%] right-[20%] w-[30vw] h-[30vw] rounded-full bg-[var(--luzu-yellow)] opacity-[0.05] blur-[80px]" />
        </div>

        {/* Falling emojis — detrás del contenido */}
        <FallingEmojis />

        {/* Main container */}
        <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ zIndex: 2 }}>

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Image
              src="/luzu-logo-transparent.png"
              alt="Luzu TV"
              width={220}
              height={88}
              className="object-contain drop-shadow-lg"
              priority
            />
          </motion.div>

          <AnimatePresence mode="wait">

            {/* ── FORM ──────────────────────────────────────────── */}
            {stage === "form" && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md"
              >
                <div className="text-center mb-8">
                  <h1 className="fredoka text-5xl font-bold mb-3 leading-tight">
                    <span style={{ color: "var(--luzu-teal)" }}>Hacé</span> tu{" "}
                    <span style={{ color: "var(--luzu-yellow)" }}>credencial</span>{" "}
                    <span style={{ color: "var(--luzu-pink)" }}>Luzu</span>
                  </h1>
                  <p className="text-white/60 text-lg font-semibold">
                    Subí tu foto y generamos tu credencial exclusiva 🪄
                  </p>
                </div>

                <div className="card-luzu rounded-2xl p-6 space-y-5">
                  <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Photo */}
                    <div>
                      <label className="fredoka text-lg font-semibold text-white/80 block mb-2">Tu foto 📸</label>
                      <div
                        className={`upload-zone rounded-xl p-6 text-center cursor-pointer ${isDragging ? "active" : ""}`}
                        onClick={() => fileRef.current?.click()}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                      >
                        {photoPreview ? (
                          <div>
                            <img
                              src={photoPreview}
                              alt="Preview"
                              className="w-32 h-32 object-cover rounded-xl mx-auto border-4 border-[var(--luzu-teal)]"
                              style={{ boxShadow: "4px 4px 0 var(--luzu-black)" }}
                            />
                            <p className="text-[var(--luzu-teal)] mt-3 font-bold text-sm">✓ Cargada — clic para cambiar</p>
                          </div>
                        ) : (
                          <div>
                            <div className="text-5xl mb-3">📷</div>
                            <p className="font-bold text-white/70">Arrastrá o hacé clic para subir</p>
                            <p className="text-sm text-white/40 mt-1">JPG, PNG · Máx 10MB</p>
                          </div>
                        )}
                      </div>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                    </div>

                    {/* Name */}
                    <div>
                      <label className="fredoka text-lg font-semibold text-white/80 block mb-2">Tu nombre ✌️</label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="¿Cómo te llamás?" className="input-luzu w-full rounded-xl px-4 py-3" required />
                    </div>

                    {/* Estilo */}
                    <div>
                      <label className="fredoka text-lg font-semibold text-white/80 block mb-2">Elegí tu estilo 🎨</label>
                      <select
                        value={selectorEstilo}
                        onChange={(e) => setSelectorEstilo(Number(e.target.value))}
                        className="input-luzu w-full rounded-xl px-4 py-3 appearance-none cursor-pointer"
                      >
                        <option value={1}>✂️ Collage</option>
                        <option value={2}>🧸 Pixar</option>
                        <option value={3}>💥 Pop Art</option>
                      </select>
                    </div>

                    <button type="submit" disabled={!photo || !name} className="btn-luzu w-full rounded-xl py-4 mt-2">
                      ¡Generá mi credencial! 🚀
                    </button>
                  </form>
                </div>

                <p className="text-center text-white/30 text-sm mt-4">
                  Tu foto se usa solo para generar la imagen. No se comparte. 🔒
                </p>
              </motion.div>
            )}

            {/* ── LOADING ───────────────────────────────────────── */}
            {stage === "loading" && (
              <motion.div key="loading" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }} className="text-center w-full max-w-sm">
                <div className="card-luzu rounded-2xl p-10">
                  <div className="relative w-24 h-24 mx-auto mb-6">
                    <div className="spinner absolute inset-0 rounded-full border-4 border-transparent"
                      style={{ borderTopColor: "var(--luzu-teal)", borderRightColor: "var(--luzu-yellow)" }} />
                    <div className="absolute inset-3 rounded-full flex items-center justify-center text-3xl">🎨</div>
                  </div>
                  <h2 className="fredoka text-2xl font-bold text-white mb-3">Generando tu credencial...</h2>
                  <p className="text-white/60 text-sm leading-relaxed">{statusMsg}</p>
                  <div className="flex justify-center gap-2 mt-6">
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} className="w-2 h-2 rounded-full" style={{ background: "var(--luzu-yellow)" }}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── RESULT ────────────────────────────────────────── */}
            {stage === "result" && resultUrl && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }} className="text-center w-full max-w-sm">
                <motion.div initial={{ y: -10 }} animate={{ y: 0 }} className="mb-6">
                  <h2 className="fredoka text-4xl font-bold">
                    <span style={{ color: "var(--luzu-yellow)" }}>¡Lista!</span>{" "}
                    <span style={{ color: "var(--luzu-teal)" }}>Tu credencial 🎉</span>
                  </h2>
                </motion.div>
                <div className="result-glow rounded-2xl overflow-hidden border-4 border-[var(--luzu-black)] mb-6">
                  <img src={resultUrl} alt="Tu credencial Luzu" className="w-full" />
                </div>
                <div className="space-y-3">
                  <a href={resultUrl} download="mi-credencial-luzu.jpg"
                    className="btn-luzu w-full rounded-xl py-4 block" style={{ textDecoration: "none" }}>
                    ⬇️ Descargar imagen
                  </a>
                  <button onClick={reset}
                    className="w-full py-3 rounded-xl border-2 border-white/20 text-white/60 font-bold hover:text-white hover:border-white/40 transition-colors">
                    Generar otra →
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── ERROR ─────────────────────────────────────────── */}
            {stage === "error" && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center w-full max-w-sm">
                <div className="card-luzu rounded-2xl p-8">
                  <div className="text-5xl mb-4">😬</div>
                  <h2 className="fredoka text-2xl font-bold text-[var(--luzu-red)] mb-2">Algo salió mal</h2>
                  <p className="text-white/60 mb-6 text-sm">{errorMsg}</p>
                  <button onClick={reset} className="btn-luzu w-full rounded-xl py-3">Intentar de nuevo</button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
