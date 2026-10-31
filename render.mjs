#!/usr/bin/env node
// Renders the picture and muxes it with dist/score.wav.
//   node render.mjs                     the whole film → dist/chan-meng-intro.mp4
//   node render.mjs --stills 12,300     named frames → dist/stills/
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

const ROOT = dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const TOKENS = process.env.BRAND_TOKENS ?? join(ROOT, "brand/tokens.json");
const timeline = JSON.parse(readFileSync(join(ROOT, "timeline.json"), "utf8"));
const tokens = JSON.parse(readFileSync(TOKENS, "utf8"));
const OUT = join(ROOT, "dist");
mkdirSync(join(OUT, "stills"), { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--allow-file-access-from-files"] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
await page.goto(pathToFileURL(join(ROOT, "src/index.html")).href);
await page.evaluate((f) => { window.FILM = f; }, { tokens, timeline });
await page.addScriptTag({ path: join(ROOT, "src/film.js") });
await page.evaluate(async () => {
  await Promise.all([document.fonts.load("400 100px Anton"), document.fonts.load("400 13px 'JetBrains Mono'")]);
  if (!document.fonts.check("400 100px Anton")) throw new Error("Anton did not load");
});
const shot = (i) =>
  page.evaluate((n) => {
    window.__film.renderFrame(n);
    return document.getElementById("stage").toDataURL("image/jpeg", 0.97).split(",")[1];
  }, i);
const FRAMES = await page.evaluate(() => window.__film.FRAMES);

const stillsAt = process.argv.indexOf("--stills");
if (stillsAt >= 0) {
  for (const n of process.argv[stillsAt + 1].split(",").map(Number)) {
    writeFileSync(join(OUT, "stills", `f${String(n).padStart(4, "0")}.jpg`), Buffer.from(await shot(n), "base64"));
  }
  await browser.close();
  console.log("stills written");
  process.exit(0);
}

const ff = spawn("ffmpeg", [
  "-y", "-v", "error",
  "-f", "image2pipe", "-framerate", String(timeline.fps), "-c:v", "mjpeg", "-i", "-",
  "-i", join(OUT, "score.wav"),
  "-map", "0:v", "-map", "1:a", "-frames:v", String(FRAMES),
  "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p",
  "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
  "-c:a", "aac", "-b:a", "320k", "-movflags", "+faststart",
  join(OUT, "chan-meng-intro.mp4"),
], { stdio: ["pipe", "inherit", "inherit"] });
const done = new Promise((res, rej) => ff.on("close", (c) => (c ? rej(new Error(`ffmpeg ${c}`)) : res())));
for (let i = 0; i < FRAMES; i++) {
  const data = Buffer.from(await shot(i), "base64");
  if (!ff.stdin.write(data)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % 150 === 0) console.log(`frame ${i} / ${FRAMES}`);
}
ff.stdin.end();
await done;
await browser.close();
console.log(`rendered ${FRAMES} frames`);
