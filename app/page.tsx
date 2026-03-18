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

const GRID = 20;
const CELL = 15;
const BOARD = GRID * CELL; // 300px

type SnakeState = "idle" | "playing" | "dead";

function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SnakeState>("idle");
  const snakeRef = useRef([{ x: 10, y: 10 }]);
  const dirRef = useRef({ x: 1, y: 0 });
  const nextDirRef = useRef({ x: 1, y: 0 });
  const foodRef = useRef({ x: 15, y: 10 });
  const scoreRef = useRef(0);
  const bestRef = useRef(0);
  const [display, setDisplay] = useState<{ state: SnakeState; score: number; best: number }>({
    state: "idle", score: 0, best: 0,
  });

  const spawnFood = useCallback((snake: { x: number; y: number }[]) => {
    let pos: { x: number; y: number };
    do {
      pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
    foodRef.current = pos;
  }, []);

  const startGame = useCallback(() => {
    snakeRef.current = [{ x: 10, y: 10 }];
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    scoreRef.current = 0;
    spawnFood(snakeRef.current);
    stateRef.current = "playing";
    setDisplay({ state: "playing", score: 0, best: bestRef.current });
  }, [spawnFood]);

  // Touch controls
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      // Tap — start game if idle/dead
      if (stateRef.current !== "playing") startGame();
      return;
    }
    const d = dirRef.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && d.x === 0) nextDirRef.current = { x: 1, y: 0 };
      else if (dx < 0 && d.x === 0) nextDirRef.current = { x: -1, y: 0 };
    } else {
      if (dy > 0 && d.y === 0) nextDirRef.current = { x: 0, y: 1 };
      else if (dy < 0 && d.y === 0) nextDirRef.current = { x: 0, y: -1 };
    }
    touchStartRef.current = null;
  }, [startGame]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"].includes(key)) return;
      e.preventDefault();
      if (stateRef.current !== "playing") { startGame(); return; }
      const d = dirRef.current;
      switch (key) {
        case "arrowup": case "w": if (d.y === 0) nextDirRef.current = { x: 0, y: -1 }; break;
        case "arrowdown": case "s": if (d.y === 0) nextDirRef.current = { x: 0, y: 1 }; break;
        case "arrowleft": case "a": if (d.x === 0) nextDirRef.current = { x: -1, y: 0 }; break;
        case "arrowright": case "d": if (d.x === 0) nextDirRef.current = { x: 1, y: 0 }; break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [startGame]);

  // Game loop
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const drawGrid = () => {
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, BOARD, BOARD);
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= GRID; i++) {
        ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, BOARD); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(BOARD, i * CELL); ctx.stroke();
      }
    };

    const drawIdle = () => {
      drawGrid();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "bold 14px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🐍 SNAKE", BOARD / 2, BOARD / 2 - 12);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "12px Nunito, sans-serif";
      ctx.fillText("WASD / Flechas / Swipe para jugar", BOARD / 2, BOARD / 2 + 12);
    };

    const drawDead = () => {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, BOARD, BOARD);
      ctx.fillStyle = "#E63A3A";
      ctx.font = "bold 16px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Game Over", BOARD / 2, BOARD / 2 - 8);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "12px Nunito, sans-serif";
      ctx.fillText("Tocá o presioná para reiniciar", BOARD / 2, BOARD / 2 + 14);
    };

    // Initial draw
    drawIdle();

    const tick = setInterval(() => {
      if (stateRef.current !== "playing") {
        if (stateRef.current === "idle") drawIdle();
        return;
      }

      dirRef.current = nextDirRef.current;
      const snake = snakeRef.current;
      const dir = dirRef.current;
      const head = {
        x: (snake[0].x + dir.x + GRID) % GRID,
        y: (snake[0].y + dir.y + GRID) % GRID,
      };

      if (snake.some((s) => s.x === head.x && s.y === head.y)) {
        if (scoreRef.current > bestRef.current) bestRef.current = scoreRef.current;
        stateRef.current = "dead";
        setDisplay({ state: "dead", score: scoreRef.current, best: bestRef.current });
        drawDead();
        return;
      }

      const newSnake = [head, ...snake];
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        spawnFood(newSnake);
        scoreRef.current++;
        setDisplay((d) => ({ ...d, score: scoreRef.current }));
      } else {
        newSnake.pop();
      }
      snakeRef.current = newSnake;

      // Draw
      drawGrid();

      // Food glow
      const fx = foodRef.current.x * CELL + CELL / 2;
      const fy = foodRef.current.y * CELL + CELL / 2;
      const grd = ctx.createRadialGradient(fx, fy, 2, fx, fy, CELL);
      grd.addColorStop(0, "rgba(249,185,40,0.3)");
      grd.addColorStop(1, "transparent");
      ctx.fillStyle = grd;
      ctx.fillRect(foodRef.current.x * CELL - 4, foodRef.current.y * CELL - 4, CELL + 8, CELL + 8);

      // Food
      ctx.fillStyle = "#F9B928";
      ctx.beginPath();
      ctx.roundRect(foodRef.current.x * CELL + 2, foodRef.current.y * CELL + 2, CELL - 4, CELL - 4, 3);
      ctx.fill();

      // Snake
      newSnake.forEach((s, i) => {
        const r = i === 0 ? 5 : 3;
        ctx.fillStyle = i === 0 ? "#00D5C8" : `rgba(0,${180 - i * 2},${168 - i * 2},1)`;
        ctx.beginPath();
        ctx.roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, r);
        ctx.fill();
      });
    }, 110);

    return () => clearInterval(tick);
  }, [spawnFood]);

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-white/30 text-xs font-semibold">
          {display.state === "idle" ? "Mientras esperás..." : `Score: ${display.score}`}
        </p>
        {display.best > 0 && (
          <p className="text-[var(--luzu-yellow)] text-xs font-bold">Best: {display.best}</p>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={BOARD}
        height={BOARD}
        className="rounded-xl border-2 border-white/10 mx-auto block touch-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  );
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
  const [email, setEmail] = useState("");
  const [selectorEstilo, setSelectorEstilo] = useState<number>(1);
  const [productSelector, setProductSelector] = useState<number>(1);
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
    if (!photo || !name || !email) return;

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

      setStatusMsg("Estamos creando tu credencial... esto puede demorar unos minutos");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl, name, email, selectorEstilo, productSelector }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar");

      const runId = data.run_id;

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
            // Enviar email con la credencial (fire-and-forget)
            fetch("/api/send-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, name, imageUrl: statusData.output_url }),
            }).catch(() => {});
            return;
          }
          if (statusData.status === "failed") throw new Error("La generación falló. Intentá de nuevo.");
        } catch (pollErr) {
          if (pollErr instanceof Error && pollErr.message.includes("falló")) throw pollErr;
        }

        setStatusMsg("Estamos creando tu credencial... esto puede demorar unos minutos");
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

                    {/* Email */}
                    <div>
                      <label className="fredoka text-lg font-semibold text-white/80 block mb-2">Tu mail 📩</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@mail.com" className="input-luzu w-full rounded-xl px-4 py-3" required />
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

                    {/* Marca / Sponsor */}
                    <div>
                      <label className="fredoka text-lg font-semibold text-white/80 block mb-2">Elegí tu marca 🏷️</label>
                      <select
                        value={productSelector}
                        onChange={(e) => setProductSelector(Number(e.target.value))}
                        className="input-luzu w-full rounded-xl px-4 py-3 appearance-none cursor-pointer"
                      >
                        <option value={1}>Mercado Libre</option>
                        <option value={2}>CIF</option>
                        <option value={3}>Luzu TV Shop</option>
                        <option value={4}>Honor</option>
                      </select>
                    </div>

                    <button type="submit" disabled={!photo || !name || !email} className="btn-luzu w-full rounded-xl py-4 mt-2">
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
                <div className="card-luzu rounded-2xl p-6">
                  <div className="flex items-center justify-center gap-3 mb-1">
                    <div className="relative w-10 h-10">
                      <div className="spinner absolute inset-0 rounded-full border-[3px] border-transparent"
                        style={{ borderTopColor: "var(--luzu-teal)", borderRightColor: "var(--luzu-yellow)" }} />
                      <div className="absolute inset-1.5 rounded-full flex items-center justify-center text-base">🎨</div>
                    </div>
                    <h2 className="fredoka text-xl font-bold text-white">Generando tu credencial...</h2>
                  </div>
                  <p className="text-white/50 text-sm">{statusMsg}</p>
                  <SnakeGame />
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
