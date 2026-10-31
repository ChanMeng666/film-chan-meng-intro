// Every frame is a pure function of its index. Colours and film parameters come
// from the brand tokens, the sections and copy from timeline.json, both injected
// by render.mjs as window.FILM.
(function () {
  "use strict";
  const { tokens, timeline } = window.FILM;
  const raw = tokens.color.raw;
  const C = { ink: raw.abyssalInk, ash: raw.ashWhite, orange: raw.digitalOrange, violet: raw.cyberViolet, glare: raw.pixelGlare, white: raw.pureWhite };
  const F = tokens.motion.film;
  const COPY = timeline.copy;
  const W = 1280, H = 720, S = 1.5;
  const BPM = timeline.bpm, BEAT = 60 / BPM, FPS = timeline.fps;
  const canvas = document.getElementById("stage");
  const ctx = canvas.getContext("2d");
  const layer = () => { const c = document.createElement("canvas"); c.width = W * S; c.height = H * S; return c; };
  const buf = layer(), fxA = layer(), fxB = layer();
  const g = buf.getContext("2d"), a = fxA.getContext("2d"), b = fxB.getContext("2d");
  g.setTransform(S, 0, 0, S, 0, 0);
  g.imageSmoothingEnabled = false;

  const clamp = (x, l = 0, h = 1) => Math.max(l, Math.min(h, x));
  const expoOut = (x) => { x = clamp(x); return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); };
  const cubicIO = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  function rng(s) {
    let t = s >>> 0;
    return () => {
      t = (t + 0x6d2b79f5) >>> 0;
      let r = t;
      r = Math.imul(r ^ (r >>> 15), r | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hash = (x, y, z) => rng((x * 73856093) ^ (y * 19349663) ^ (z * 83492791))();
  const BAYER = (() => {
    let m = [[0]];
    for (let s = 1; s < 8; s *= 2) {
      const n = Array.from({ length: s * 2 }, () => new Array(s * 2).fill(0));
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const v = m[y][x] * 4;
        n[y][x] = v; n[y][x + s] = v + 2; n[y + s][x] = v + 3; n[y + s][x + s] = v + 1;
      }
      m = n;
    }
    return m;
  })();

  const ANTON = (px) => `400 ${px}px Anton`;
  const plate = (c) => { g.fillStyle = c; g.fillRect(0, 0, W, H); };
  const fit = (t, target) => { g.font = ANTON(100); return (100 * target) / g.measureText(t).width; };
  function centred(t, x, y) {
    g.textAlign = "center"; g.textBaseline = "alphabetic";
    const m = g.measureText(t);
    g.fillText(t, x, y + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
  }
  const landing = (lb) => F.landing.fromScale - (F.landing.fromScale - 1) * expoOut(lb / F.landing.beats);

  function hold(lb) {
    plate(C.ink);
    const len = W * 0.5 * expoOut(lb / 2);
    g.fillStyle = "rgba(247,246,242,.5)"; g.fillRect(W / 2 - len, H / 2, len * 2, 1);
    for (let i = -12; i <= 12; i++) if (Math.abs(i * 50) < len) g.fillRect(W / 2 + i * 50, H / 2 - (i % 4 ? 2 : 6), 1, i % 4 ? 5 : 13);
    if (lb >= 4) { const s = 2 + 22 * expoOut(lb - 4); g.fillStyle = C.orange; g.fillRect(W / 2 - s / 2, H / 2 - s / 2, s, s); }
  }
  function name(lb) {
    const i = Math.min(1, Math.floor(lb / 2)), t = COPY.name[i], l = lb - i * 2;
    plate(i ? C.orange : C.ink);
    const sz = Math.min(fit(t, W * 1.04), H * 1.05), k = landing(l);
    g.save(); g.translate(W / 2, H / 2); g.scale(k, k); g.font = ANTON(sz); g.fillStyle = i ? C.ink : C.ash; centred(t, 0, 0); g.restore();
  }
  const STORY = [[C.ink, C.ash], [C.ash, C.ink], [C.orange, C.ink], [C.violet, C.white]];
  function story(lb) {
    const i = Math.min(3, Math.floor(lb / 4)), l = lb - i * 4, [bg, fg] = STORY[i];
    plate(bg);
    const k = landing(l), sz = fit(COPY.story[i], W * 0.86);
    g.save(); g.translate(W / 2, H / 2); g.scale(k, k); g.font = ANTON(sz); g.fillStyle = fg; centred(COPY.story[i], 0, 0); g.restore();
    if (bg === C.ink) { const w = W * 0.5 * expoOut((l - 0.2) / 0.6); g.fillStyle = C.orange; g.fillRect(W / 2 - w / 2, H - 150, w, 8); }
  }
  function outline(lb) {
    plate(C.ink);
    const t = COPY.outline, sz = fit(t, W * 0.92), sp = 4 + Math.min(lb, 8) * 1.8 + 6 * Math.exp(-3 * (lb % 2));
    g.font = ANTON(sz); g.lineJoin = "round"; g.lineWidth = 3; g.textAlign = "center"; g.textBaseline = "alphabetic";
    const y = H / 2 + sz * 0.36;
    [[C.violet, -1], [C.orange, 1], [C.ash, 0]].forEach(([c, d]) => { g.strokeStyle = c; g.strokeText(t, W / 2 + d * sp, y + d * sp * 0.55); });
  }
  function quad(p, c) {
    g.fillStyle = c; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[2], p[3]); g.lineTo(p[4], p[5]); g.lineTo(p[6], p[7]); g.closePath(); g.fill();
  }
  const tunnelOf = (walls) => (lb) => {
    plate(C.ink);
    const c = lb * 1.15, fr = c - Math.floor(c), base = Math.floor(c), roll = Math.sin(lb * 0.42) * 0.34 + lb * 0.03;
    const cx = W / 2 + Math.sin(lb * 0.5) * 60, cy = H / 2 + Math.cos(lb * 0.37) * 34;
    const cos = Math.cos(roll), sin = Math.sin(roll), N = 16;
    const corners = (z) => {
      const s = 1.5 / z, hw = W * 0.62 * s, hh = H * 0.62 * s;
      return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [cx + (x * cos - y * sin), cy + (x * sin + y * cos)]);
    };
    for (let i = N; i >= 0; i--) {
      const A = corners(i + 1 - fr + 0.35), B = corners(i + 2 - fr + 0.35), idx = base + i;
      for (let f = 0; f < 4; f++) {
        const e = (f + 1) % 4;
        quad([A[f][0], A[f][1], A[e][0], A[e][1], B[e][0], B[e][1], B[f][0], B[f][1]], walls[Math.floor(hash(idx, f, 3) * walls.length)]);
      }
    }
    const far = corners(N + 2 - fr + 0.35);
    quad([far[0][0], far[0][1], far[1][0], far[1][1], far[2][0], far[2][1], far[3][0], far[3][1]], C.ink);
    const hoop = corners(2.2 + ((lb * 0.5) % 1) * 3);
    g.strokeStyle = "rgba(247,246,242,.8)"; g.lineWidth = 1.5; g.beginPath();
    hoop.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); g.stroke();
    g.fillStyle = C.orange; g.fillRect(cx - 5, cy - 5, 10, 10);
  };
  const tiles = {};
  function tile(tone, fg, bg) {
    const k = tone + fg + bg;
    if (tiles[k]) return tiles[k];
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const q = c.getContext("2d"); q.fillStyle = bg; q.fillRect(0, 0, 64, 64); q.fillStyle = fg;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (BAYER[y][x] / 64 < tone) q.fillRect(x * 8 + 1, y * 8 + 1, 6, 6);
    return (tiles[k] = c);
  }
  const mosaicOf = (accent) => (lb) => {
    plate(C.ink);
    const cols = lb < 2 ? 4 : lb < 4 ? 8 : 16, rows = Math.ceil(cols * 9 / 16), cw = W / cols, ch = (W / cols);
    const tick = Math.floor(lb);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const seed = hash(x, y, cols), ph = hash(x, y, cols + tick * (hash(x, y, 9) < 0.14 ? 1 : 0) + 99), kind = Math.floor(ph * 7), px = x * cw, py = y * ch;
      const r = Math.hypot(x + 0.5 - cols / 2, (y + 0.5 - rows / 2) * 1.2) / (cols / 2);
      if (lb >= 6 && r < expoOut((lb - 6) / 1.6) * 0.72) { g.fillStyle = C.orange; g.fillRect(px, py, cw, ch); continue; }
      const bgs = [C.ink, C.ash, accent, C.ink, C.ash, accent, C.ink], bg = bgs[kind];
      g.fillStyle = bg; g.fillRect(px, py, cw, ch);
      if (kind < 3) {
        const onLight = bg === C.ash || bg === C.glare;
        g.drawImage(tile([0.25, 0.5, 0.75][Math.floor(seed * 3)], onLight ? C.ink : C.ash, bg), 0, 0, 64, 64, px, py, cw, ch);
      } else if (kind === 3) {
        const s = Math.max(5, cw * 0.12); g.fillStyle = C.orange; g.fillRect(px + cw / 2 - s / 2, py + ch / 2 - s / 2, s, s);
      } else if (kind === 4) {
        const q = Math.max(5, cw * 0.09), m = Math.max(5, cw * 0.14);
        g.strokeStyle = C.ink; g.lineWidth = 1; g.beginPath();
        g.moveTo(px + m, py + m + q); g.lineTo(px + m, py + m); g.lineTo(px + m + q, py + m);
        g.moveTo(px + cw - m - q, py + ch - m); g.lineTo(px + cw - m, py + ch - m); g.lineTo(px + cw - m, py + ch - m - q); g.stroke();
      } else if (kind === 6) {
        g.save(); g.beginPath(); g.rect(px, py, cw, ch); g.clip();
        g.fillStyle = C.ash; g.font = ANTON(ch * 0.82); g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillText(COPY.name[0], px + 6, py + ch * 0.88); g.restore();
      }
    }
  };
  const PARTICLES = (() => {
    const r = rng(42), o = [];
    for (let i = 0; i < 260; i++) o.push({ a: r() * Math.PI * 2, v: 0.3 + r() * 0.8, d: r() * 7.2, s: [8, 10, 10, 16, 24][Math.floor(r() * 5)], c: Math.floor(r() * 3), l: 1.3 + r() * 1.2 });
    return o;
  })();
  function storm(lb) {
    const flip = lb >= 4, bg = flip ? C.ink : C.orange, fg = flip ? C.orange : C.ink;
    plate(bg);
    const t = COPY.storm, sz = fit(t, W * 0.92);
    g.font = ANTON(sz); g.fillStyle = fg; centred(t, W / 2, H / 2);
    const cols = flip ? [C.ash, C.violet, C.ash] : [C.ink, C.ash, C.violet];
    for (const p of PARTICLES) {
      const age = (lb - p.d) / p.l;
      if (age < 0 || age > 1) continue;
      const e = expoOut(age) * 760 * p.v;
      const x = Math.round((W / 2 + Math.cos(p.a) * e) / 10) * 10, y = Math.round((H / 2 + Math.sin(p.a) * e * 0.72) / 10) * 10, s = p.s * (1 - 0.45 * age);
      g.fillStyle = cols[p.c]; g.fillRect(x - s / 2, y - s / 2, s, s);
    }
    g.fillStyle = flip ? C.ash : C.ink; g.fillRect(W / 2 - 9, H / 2 - 9, 18, 18);
  }
  function roles(lb) {
    plate(C.violet);
    const n = Math.min(3, 1 + Math.floor(lb / 4));
    g.textAlign = "left"; g.textBaseline = "alphabetic"; g.font = ANTON(92); g.fillStyle = C.white;
    for (let i = 0; i < n; i++) {
      const l = lb - i * 4, e = expoOut(l / 0.7), y = 262 + i * 122;
      g.save(); g.beginPath(); g.rect(0, y - 104, W, 122); g.clip(); g.fillText(COPY.roles[i], 112, y + (1 - e) * 122); g.restore();
    }
  }
  function retry(lb) {
    plate(C.ink);
    g.fillStyle = "rgba(247,246,242,.25)"; g.fillRect(0, H / 2, W, 1);
    g.fillStyle = C.orange; g.fillRect(W / 2 - 6, H / 2 - 6, 12, 12);
  }
  const RADIAL = [[C.ink, C.ash, C.orange, C.glare], [C.glare, C.ink, C.orange, C.ink]];
  function radial(lb) {
    const P = RADIAL[Math.min(1, Math.floor(lb / 4))], op = expoOut((lb % 4) / 0.8);
    plate(P[0]);
    g.save(); g.translate(W / 2, H / 2);
    [116, 206, 316, 446, 600].forEach((r, k) => {
      const n = [6, 12, 18, 24, 36][k], s = [22, 16, 16, 11, 9][k], rot = (k % 2 ? -1 : 1) * lb * 0.08 + k * 0.2, pulse = 1 + 0.5 * Math.exp(-5 * (lb % 1));
      g.strokeStyle = P[1]; g.globalAlpha = 0.25; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, r * op, 0, 7); g.stroke(); g.globalAlpha = 1;
      for (let j = 0; j < n; j++) {
        g.save(); g.rotate(rot + (j / n) * Math.PI * 2); g.fillStyle = k === 0 ? P[2] : k % 2 ? P[1] : P[3];
        g.fillRect(r * op - (s * pulse) / 2, -s / 2, s * pulse, s); g.restore();
      }
    });
    g.fillStyle = C.orange; g.fillRect(-14, -14, 28, 28); g.restore();
  }
  function close(lb) {
    plate(C.ink);
    const cell = 20, x0 = 800, tone = clamp(lb / 5);
    g.fillStyle = C.ash;
    for (let y = 0; y < H / cell; y++) for (let x = 0; x < (W - x0) / cell; x++) {
      const u = x / ((W - x0) / cell);
      if (BAYER[y % 8][x % 8] / 64 < u * u * tone * 1.1) g.fillRect(x0 + x * cell + 4, y * cell + 4, 12, 12);
    }
    g.textAlign = "left"; g.textBaseline = "alphabetic"; g.font = ANTON(94);
    COPY.motto.forEach((t, i) => {
      const e = expoOut((lb - i * 1.1) / 1), y = [310, 424][i];
      g.save(); g.beginPath(); g.rect(0, y - 112, W, 122); g.clip(); g.fillStyle = C.ash; g.fillText(t, 72, y + (1 - e) * 124); g.restore();
    });
    const ex = 72 + g.measureText(COPY.motto[1]).width + 8, m = cubicIO((lb - 4) / 3);
    if (lb >= 3.4) { g.fillStyle = C.orange; g.fillRect(1110 + (ex - 1110) * m, 280 + (412 - 280) * m, 12, 12); }
    if (lb >= 8) {
      const n = Math.floor(clamp((lb - 8) / 1.2) * COPY.sign.length);
      g.fillStyle = "rgba(247,246,242,.8)"; g.font = "400 15px JetBrains Mono"; g.fillText(COPY.sign.slice(0, n), 74, 492);
    }
  }

  const DRAW = { hold, name, story, outline, tunnel: tunnelOf([C.ink, C.orange, C.ash, C.violet]), mosaic: mosaicOf(C.violet), storm, roles, retry, tunnel2: tunnelOf([C.ink, C.orange, C.ash, C.glare]), mosaic2: mosaicOf(C.glare), radial, close };
  const IMPACTS = { name: [0, 2], story: [0, 4, 8, 12], outline: [0], tunnel: [0], mosaic: [0, 4], storm: [0, 4], tunnel2: [0], mosaic2: [0, 4], radial: [0, 4] };
  let start = 0;
  const SC = timeline.sections.map((s, i) => { const r = { ...s, i, start, draw: DRAW[s.id], imp: IMPACTS[s.id] ?? [] }; start += s.beats; return r; });
  const TOTAL = start, FRAMES = Math.round(TOTAL * BEAT * FPS);
  const sceneAt = (bt) => { for (let i = SC.length - 1; i >= 0; i--) if (bt >= SC[i].start) return SC[i]; return SC[0]; };
  function impactAt(s, lb) {
    let best = 0;
    for (const p of s.imp) if (lb >= p) best = Math.max(best, Math.pow(F.impact.decayPerFrame, (lb - p) * BEAT * F.impact.frameRate));
    return best < 0.03 ? 0 : best;
  }
  const pad = (n, w) => String(n).padStart(w, "0");
  function hud(s, bt, frame) {
    g.save(); g.globalCompositeOperation = "difference"; g.fillStyle = "#fff"; g.strokeStyle = "#fff"; g.globalAlpha = 0.72; g.lineWidth = 1.5;
    const i = 28, ar = 22, r = W - i, d = H - i;
    g.beginPath();
    g.moveTo(i, i + ar); g.lineTo(i, i); g.lineTo(i + ar, i); g.moveTo(r - ar, i); g.lineTo(r, i); g.lineTo(r, i + ar);
    g.moveTo(r, d - ar); g.lineTo(r, d); g.lineTo(r - ar, d); g.moveTo(i + ar, d); g.lineTo(i, d); g.lineTo(i, d - ar); g.stroke();
    g.font = "400 13px JetBrains Mono"; g.textBaseline = "middle"; g.textAlign = "left";
    g.fillText(`CHAN MENG  ${pad(s.i + 1, 2)} ${s.hud}`, i + 36, i + 6);
    g.textAlign = "right";
    g.fillText(`BAR ${pad(1 + Math.floor(bt / 4), 2)}.${1 + Math.floor(bt % 4)}  ${BPM} BPM`, r - 36, i + 6);
    g.fillText(`F ${pad(frame, 4)} / ${FRAMES}`, r - 36, d - 6);
    g.restore();
  }
  function renderFrame(frame) {
    const bt = (frame / FPS) / BEAT, s = sceneAt(bt), lb = bt - s.start;
    g.save(); s.draw(lb); g.restore();
    hud(s, bt, frame);
    const imp = impactAt(s, lb), Wp = W * S, Hp = H * S;
    ctx.globalCompositeOperation = "source-over";
    if (imp > 0) {
      const dx = imp * F.impact.peakPx;
      for (const [c, col, x] of [[a, "#f00", fxA], [b, "#0ff", fxB]]) {
        c.globalCompositeOperation = "source-over"; c.drawImage(buf, 0, 0);
        c.globalCompositeOperation = "multiply"; c.fillStyle = col; c.fillRect(0, 0, Wp, Hp);
      }
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, Wp, Hp);
      ctx.globalCompositeOperation = "lighter"; ctx.drawImage(fxA, dx, 0); ctx.drawImage(fxB, -dx, 0);
      ctx.globalCompositeOperation = "source-over";
    } else ctx.drawImage(buf, 0, 0);
    const v = ctx.createRadialGradient(Wp / 2, Hp / 2, Hp * 0.42, Wp / 2, Hp / 2, Wp * 0.66);
    v.addColorStop(0, "rgba(7,6,7,0)"); v.addColorStop(1, `rgba(7,6,7,${F.vignette.maxOpacity})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, Wp, Hp);
    return s.id;
  }
  window.__film = { renderFrame, FRAMES, starts: Object.fromEntries(SC.map((s) => [s.id, s.start])) };
})();
