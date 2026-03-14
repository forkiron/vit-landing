"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const CHARSET = "@#W$9876543210?!abc;:+=-,._ ";

const PALETTES = [
  [[255, 240, 180], [255, 210, 120], [255, 180, 80], [255, 255, 220]],
  [[180, 210, 255], [140, 190, 255], [220, 235, 255], [255, 255, 255]],
  [[255, 150, 110], [255, 110, 150], [255, 190, 140], [255, 170, 190]],
  [[100, 255, 230], [70, 210, 255], [170, 255, 250], [190, 255, 210]],
];

function AsciiOverlay({ src, onDecodeComplete }) {
  const preRef = useRef(null);
  const canvasRef = useRef(null);
  const lastSizeRef = useRef({ width: 0, height: 0 });
  const gridRef = useRef(null);
  const metricsRef = useRef(null);
  const effectsRef = useRef({ twinkles: [], fireworks: [], sparks: [], lastFirework: 0 });
  const [ascii, setAscii] = useState("");
  const revealRef = useRef(null); // { startTime, delays[][], done }
  const scrambleFrameRef = useRef(0);

  const updateMetrics = useCallback(() => {
    const el = preRef.current;
    if (!el) return;
    const style = getComputedStyle(el);
    const fontSize = parseFloat(style.fontSize) || 12;

    const probe = document.createElement("span");
    probe.style.cssText =
      "position:absolute;visibility:hidden;white-space:pre;" +
      `font:${style.font};letter-spacing:${style.letterSpacing};`;
    probe.textContent = "MMMMMMMMMM";
    el.appendChild(probe);
    const cw = probe.getBoundingClientRect().width / 10;
    el.removeChild(probe);

    metricsRef.current = {
      paddingTop: parseFloat(style.paddingTop) || 10,
      paddingLeft: parseFloat(style.paddingLeft) || 8,
      charWidth: Math.max(1, cw),
      lineHeight: Math.max(4, fontSize * 0.78),
      fontSize,
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight,
    };
  }, []);

  // ASCII generation
  useEffect(() => {
    const element = preRef.current;
    if (!element) return undefined;

    let af = 0, cancelled = false;
    const image = new Image();
    image.decoding = "async";

    const renderAscii = () => {
      if (cancelled || !image.complete || !image.naturalWidth) return;

      const el = element.parentElement || element;
      const width = Math.max(1, el.clientWidth || Math.floor(el.getBoundingClientRect().width));
      const height = Math.max(1, el.clientHeight || Math.floor(el.getBoundingClientRect().height));
      if (width < 2 || height < 2) return;
      lastSizeRef.current = { width, height };

      const style = getComputedStyle(element);
      const pT = parseFloat(style.paddingTop) || 10;
      const pB = parseFloat(style.paddingBottom) || 8;
      const pL = parseFloat(style.paddingLeft) || 8;
      const pR = parseFloat(style.paddingRight) || 8;
      const cH = Math.max(1, height - pT - pB);
      const cW = Math.max(1, width - pL - pR);
      const fs = parseFloat(style.fontSize) || 12;
      const lh = Math.max(4, fs * 0.78);
      const baseRows = Math.ceil(cH / lh);
      const rows = Math.max(32, baseRows + Math.max(8, Math.ceil(baseRows * 0.2)));

      const probe = document.createElement("span");
      probe.style.cssText =
        "position:absolute;visibility:hidden;white-space:pre;" +
        `font:${style.font};letter-spacing:${style.letterSpacing};`;
      probe.textContent = "MMMMMMMMMM";
      element.appendChild(probe);
      const mw = probe.getBoundingClientRect().width / 10;
      element.removeChild(probe);
      const charW = Math.max(1, mw);
      const columns = Math.max(36, Math.floor(cW / charW));

      const cvs = document.createElement("canvas");
      const ctx = cvs.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      cvs.width = columns; cvs.height = rows;

      const ia = image.naturalWidth / image.naturalHeight;
      const ca = columns / rows;
      let dw = columns, dh = rows, ox = 0, oy = 0;
      if (ia > ca) { dh = rows; dw = rows * ia; ox = (columns - dw) / 2; }
      else { dw = columns; dh = columns / ia; oy = (rows - dh) / 2; }

      ctx.drawImage(image, ox, oy, dw, dh);
      const px = ctx.getImageData(0, 0, columns, rows).data;
      const lines = [];

      for (let y = 0; y < rows; y++) {
        let line = "";
        for (let x = 0; x < columns; x++) {
          const i = (y * columns + x) * 4;
          if (px[i + 3] < 12) { line += " "; continue; }
          const lum = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
          line += CHARSET[Math.min(CHARSET.length - 1, Math.floor(Math.pow(1 - lum, 0.82) * (CHARSET.length - 1)))];
        }
        lines.push(line);
      }

      gridRef.current = { lines, columns, rows };
      updateMetrics();

      // Init decode reveal on first render
      if (!revealRef.current) {
        const DURATION = 2400;
        const delays = [];
        for (let y = 0; y < rows; y++) {
          const row = [];
          for (let x = 0; x < columns; x++) {
            const diag = (x / columns + y / rows) / 2;
            const jitter = Math.random() * 0.3;
            row.push((diag * 0.7 + jitter * 0.3) * DURATION);
          }
          delays.push(row);
        }
        revealRef.current = {
          startTime: performance.now(),
          delays,
          duration: DURATION,
          done: false,
        };
        // Start scramble animation loop
        const scramble = () => {
          const rev = revealRef.current;
          if (!rev || rev.done) return;
          const grid = gridRef.current;
          if (!grid) { scrambleFrameRef.current = requestAnimationFrame(scramble); return; }

          const elapsed = performance.now() - rev.startTime;
          const { lines: target, columns: cols, rows: numRows } = grid;
          const result = [];

          let allDone = true;
          for (let y = 0; y < numRows; y++) {
            let line = "";
            for (let x = 0; x < cols; x++) {
              const targetCh = target[y]?.[x] || " ";
              const delay = rev.delays[y]?.[x] || 0;
              const charAge = elapsed - delay;

              if (targetCh === " ") {
                line += " ";
              } else if (charAge >= 400) {
                line += targetCh;
              } else if (charAge >= 0) {
                // Cycling through random chars before locking in
                const flickerRate = Math.max(2, Math.floor(8 - (charAge / 400) * 6));
                if (Math.floor(elapsed / (30 * flickerRate)) % 2 === 0) {
                  line += CHARSET[Math.floor(Math.random() * (CHARSET.length - 1))];
                } else {
                  line += targetCh;
                }
                allDone = false;
              } else {
                // Not yet started — show random or blank
                if (Math.random() < 0.15) {
                  line += CHARSET[Math.floor(Math.random() * (CHARSET.length - 1))];
                } else {
                  line += " ";
                }
                allDone = false;
              }
            }
            result.push(line);
          }

          setAscii(result.join("\n"));

          if (allDone) {
            rev.done = true;
            setAscii(target.join("\n"));
            if (onDecodeComplete) onDecodeComplete();
          } else {
            scrambleFrameRef.current = requestAnimationFrame(scramble);
          }
        };
        scrambleFrameRef.current = requestAnimationFrame(scramble);
      } else if (revealRef.current.done) {
        setAscii(lines.join("\n"));
      }
    };

    const schedule = () => {
      cancelAnimationFrame(af);
      af = requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(renderAscii)));
    };

    image.addEventListener("load", schedule);
    image.src = src;
    if (image.complete) schedule();

    const obs = new ResizeObserver(() => { updateMetrics(); schedule(); });
    obs.observe(element);
    if (element.parentElement) obs.observe(element.parentElement);

    let t1 = 0, t2 = 0;
    const onRz = () => { clearTimeout(t1); clearTimeout(t2); t1 = window.setTimeout(schedule, 80); t2 = window.setTimeout(schedule, 400); };
    const onVis = () => { if (document.visibilityState === "visible") onRz(); };
    window.addEventListener("resize", onRz);
    window.addEventListener("orientationchange", onRz);
    document.addEventListener("visibilitychange", onVis);
    if (window.visualViewport) { window.visualViewport.addEventListener("resize", onRz); window.visualViewport.addEventListener("scroll", onRz); }
    const poll = window.setInterval(() => {
      if (cancelled) return;
      const e = element.parentElement || element;
      const w = e.clientWidth || 0, h = e.clientHeight || 0, l = lastSizeRef.current;
      if (l.width > 0 && (Math.abs(w - l.width) > 2 || Math.abs(h - l.height) > 2)) schedule();
    }, 400);

    return () => {
      cancelled = true; clearInterval(poll); clearTimeout(t1); clearTimeout(t2);
      cancelAnimationFrame(af); cancelAnimationFrame(scrambleFrameRef.current);
      obs.disconnect();
      window.removeEventListener("resize", onRz); window.removeEventListener("orientationchange", onRz);
      document.removeEventListener("visibilitychange", onVis);
      if (window.visualViewport) { window.visualViewport.removeEventListener("resize", onRz); window.visualViewport.removeEventListener("scroll", onRz); }
      image.removeEventListener("load", schedule);
    };
  }, [src, updateMetrics]);

  // Effects animation
  useEffect(() => {
    const cvs = canvasRef.current;
    const pre = preRef.current;
    if (!cvs || !pre) return;

    let running = true, frame = 0;
    const fx = effectsRef.current;

    const ch = (grid, c, r) => {
      if (r < 0 || r >= grid.rows || c < 0 || c >= grid.columns) return null;
      const v = grid.lines[r]?.[c];
      return v && v !== " " ? v : null;
    };

    const spawnTwinkle = (grid, now) => {
      const c = Math.floor(Math.random() * grid.columns);
      const r = Math.floor(Math.random() * grid.rows);
      if (!ch(grid, c, r)) return;
      const pal = PALETTES[Math.floor(Math.random() * PALETTES.length)];
      fx.twinkles.push({
        c, r, ch: ch(grid, c, r),
        born: now, life: 500 + Math.random() * 1000,
        color: pal[Math.floor(Math.random() * pal.length)],
      });
    };

    const spawnFirework = (grid, now) => {
      const cx = 8 + Math.floor(Math.random() * (grid.columns - 16));
      const cy = 6 + Math.floor(Math.random() * (grid.rows - 12));
      const pal = PALETTES[Math.floor(Math.random() * PALETTES.length)];
      const n = 40 + Math.floor(Math.random() * 30);
      const maxR = 12 + Math.random() * 18;

      // Outer burst
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.5;
        const spd = 0.4 + Math.random() * 0.6;
        fx.fireworks.push({
          cx, cy, angle, dist: maxR * spd,
          born: now + Math.random() * 100,
          life: 700 + Math.random() * 1000,
          color: pal[Math.floor(Math.random() * pal.length)],
          trail: 3 + Math.floor(Math.random() * 3),
        });
      }

      // Center flash
      for (let i = 0; i < 16; i++) {
        fx.fireworks.push({
          cx, cy, angle: Math.random() * Math.PI * 2,
          dist: 2 + Math.random() * 4,
          born: now, life: 200 + Math.random() * 300,
          color: [255, 255, 255], trail: 1,
        });
      }

      // Spawn glowing sparks that drift down
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 4 + Math.random() * maxR * 0.7;
        fx.sparks.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r * 0.45,
          vx: (Math.random() - 0.5) * 0.3,
          vy: 0.05 + Math.random() * 0.15,
          born: now + 200 + Math.random() * 400,
          life: 800 + Math.random() * 1200,
          color: pal[Math.floor(Math.random() * pal.length)],
        });
      }

      fx.lastFirework = now;
    };

    const drawGlow = (ctx, x, y, radius, color, alpha) => {
      if (alpha < 0.02) return;
      const [cr, cg, cb] = color;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha})`);
      grad.addColorStop(0.4, `rgba(${cr},${cg},${cb},${alpha * 0.4})`);
      grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    };

    const drawChar = (ctx, char, x, y, color, alpha, m) => {
      if (alpha < 0.02) return;
      const [cr, cg, cb] = color;
      ctx.save();
      ctx.font = `${m.fontWeight} ${m.fontSize}px ${m.fontFamily}`;
      ctx.textBaseline = "top";
      ctx.shadowColor = `rgba(${cr},${cg},${cb},${Math.min(1, alpha)})`;
      ctx.shadowBlur = 12;
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${Math.min(1, alpha)})`;
      ctx.fillText(char, x, y);
      ctx.fillText(char, x, y);
      ctx.restore();
    };

    const animate = (now) => {
      if (!running) return;
      frame = requestAnimationFrame(animate);

      const grid = gridRef.current;
      const m = metricsRef.current;
      if (!grid || !m) return;

      const parent = pre.parentElement || pre;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      cvs.width = rect.width * dpr;
      cvs.height = rect.height * dpr;
      cvs.style.width = rect.width + "px";
      cvs.style.height = rect.height + "px";

      const ctx = cvs.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Spawn twinkles
      if (fx.twinkles.length < 30 && Math.random() < 0.3) spawnTwinkle(grid, now);

      // Spawn fireworks
      if (now - fx.lastFirework > 3000 + Math.random() * 2000) spawnFirework(grid, now);

      // Twinkles
      fx.twinkles = fx.twinkles.filter((t) => {
        const age = now - t.born;
        if (age > t.life) return false;
        if (age < 0) return true;
        const p = age / t.life;
        const i = p < 0.12 ? p / 0.12 : Math.pow(1 - (p - 0.12) / 0.88, 2.5);

        const px = m.paddingLeft + t.c * m.charWidth;
        const py = m.paddingTop + t.r * m.lineHeight;
        const cx = px + m.charWidth * 0.5;
        const cy = py + m.fontSize * 0.3;

        drawGlow(ctx, cx, cy, 4 + i * 12, t.color, i * 0.5);
        drawChar(ctx, t.ch, px, py, t.color, i * 0.95, m);
        return true;
      });

      // Firework particles
      fx.fireworks = fx.fireworks.filter((p) => {
        const age = now - p.born;
        if (age > p.life) return false;
        if (age < 0) return true;
        const prog = age / p.life;
        const eT = 1 - Math.pow(1 - Math.min(1, prog * 2.2), 3);
        const dist = p.dist * eT;
        const i = prog < 0.08 ? prog / 0.08 : Math.pow(1 - (prog - 0.08) / 0.92, 2);

        for (let t = 0; t < p.trail; t++) {
          const d = dist - t * 1.2;
          if (d < 0) continue;
          const col = Math.round(p.cx + Math.cos(p.angle) * d);
          const row = Math.round(p.cy + Math.sin(p.angle) * d * 0.45);
          const c = ch(grid, col, row);
          if (!c) continue;

          const tf = 1 - t / p.trail;
          const alpha = i * tf * (t === 0 ? 1.0 : 0.45);

          const px = m.paddingLeft + col * m.charWidth;
          const py = m.paddingTop + row * m.lineHeight;
          const cx = px + m.charWidth * 0.5;
          const cy = py + m.fontSize * 0.3;

          if (t === 0) {
            drawGlow(ctx, cx, cy, 6 + i * 18, p.color, alpha * 0.7);
            drawChar(ctx, c, px, py,
              [Math.min(255, p.color[0] + 40), Math.min(255, p.color[1] + 40), Math.min(255, p.color[2] + 40)],
              alpha, m);
          } else {
            drawGlow(ctx, cx, cy, 3 + i * 8, p.color, alpha * 0.4);
            drawChar(ctx, c, px, py, p.color, alpha * 0.6, m);
          }
        }
        return true;
      });

      // Falling sparks
      fx.sparks = fx.sparks.filter((s) => {
        const age = now - s.born;
        if (age > s.life) return false;
        if (age < 0) return true;
        const prog = age / s.life;
        const i = Math.pow(1 - prog, 2);

        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.003;

        const col = Math.round(s.x);
        const row = Math.round(s.y);
        const c = ch(grid, col, row);
        if (!c) return i > 0.05;

        const px = m.paddingLeft + col * m.charWidth;
        const py = m.paddingTop + row * m.lineHeight;
        const cx = px + m.charWidth * 0.5;
        const cy = py + m.fontSize * 0.3;

        drawGlow(ctx, cx, cy, 3 + i * 8, s.color, i * 0.4);
        drawChar(ctx, c, px, py, s.color, i * 0.7, m);
        return true;
      });
    };

    frame = requestAnimationFrame(animate);
    return () => { running = false; cancelAnimationFrame(frame); };
  }, []);

  return (
    <>
      <pre ref={preRef} className="ascii-overlay" aria-hidden="true">
        {ascii}
      </pre>
      <canvas ref={canvasRef} className="ascii-effects" aria-hidden="true" />
    </>
  );
}

export default AsciiOverlay;
