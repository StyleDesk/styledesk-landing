// Renders the StyleDesk outro card as a closing-curtain animation.
//
// Usage:
//   node render-animation.js               # generates GIF preview (540×960, 30fps, ~2.5s)
//   node render-animation.js --mp4         # also generates MP4 at 1080×1920 for Descript
//
// Pipeline: parameterize the outro SVG (panel translates + content opacity),
// render N frames via sharp, then ffmpeg into GIF / MP4.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('/tmp/node_modules/sharp');

const FPS = 30;
const ANIM_DUR = 1.5;          // curtains closing — 1.5s
const FADE_DUR = 0.5;          // content fade in — 0.5s
const HOLD_DUR = 0.6;          // final hold
const TOTAL_FRAMES = Math.round((ANIM_DUR + FADE_DUR + HOLD_DUR) * FPS);

const PREVIEW_W = 540;         // GIF preview width (half-res for size)
const PREVIEW_H = 960;
const FULL_W = 1080;
const FULL_H = 1920;

const OUT_DIR = path.join(__dirname, 'png-ready', '_frames');
const GIF_OUT = path.join(__dirname, 'png-ready', 'outro-card-reels.gif');
const MP4_OUT = path.join(__dirname, 'png-ready', 'outro-card-reels.mp4');
const SVG_PATH = path.join(__dirname, 'outro-card-reels.svg');

// cubic ease-out: t' = 1 - (1-t)^3
const easeOut = t => 1 - Math.pow(1 - t, 3);

function svgForFrame(t /* seconds */) {
  // Panel translates: linear ease-out from off-screen to 0 over ANIM_DUR.
  let p = Math.min(t / ANIM_DUR, 1);
  let eased = easeOut(p);
  let leftTx = -540 * (1 - eased);  // -540 → 0
  let rightTx = 540 * (1 - eased);  // +540 → 0

  // Content opacity: starts at 0, fades in 0→1 between ANIM_DUR and ANIM_DUR+FADE_DUR.
  let opacity = 0;
  if (t >= ANIM_DUR) {
    opacity = Math.min((t - ANIM_DUR) / FADE_DUR, 1);
  }

  let svg = fs.readFileSync(SVG_PATH, 'utf8');
  svg = svg.replace('<g id="leftCurtain" transform="translate(0 0)">',
                    `<g id="leftCurtain" transform="translate(${leftTx} 0)">`);
  svg = svg.replace('<g id="rightCurtain" transform="translate(0 0)">',
                    `<g id="rightCurtain" transform="translate(${rightTx} 0)">`);
  svg = svg.replace('<g id="content" opacity="1">',
                    `<g id="content" opacity="${opacity.toFixed(3)}">`);
  return svg;
}

async function renderFrame(i, width, height) {
  const t = i / FPS;
  const svg = svgForFrame(t);
  const out = path.join(OUT_DIR, `f${String(i).padStart(4, '0')}.png`);
  await sharp(Buffer.from(svg))
    .resize(width, height)
    .png({ compressionLevel: 6 })
    .toFile(out);
}

async function main() {
  const wantMp4 = process.argv.includes('--mp4');

  // Clean + recreate frames dir
  if (fs.existsSync(OUT_DIR)) {
    for (const f of fs.readdirSync(OUT_DIR)) fs.unlinkSync(path.join(OUT_DIR, f));
  } else {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  // Render all frames at preview size for GIF
  console.log(`Rendering ${TOTAL_FRAMES} frames at ${PREVIEW_W}×${PREVIEW_H}…`);
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    await renderFrame(i, PREVIEW_W, PREVIEW_H);
    if (i % 10 === 0) process.stdout.write(`  ${i}/${TOTAL_FRAMES}\r`);
  }
  console.log(`  ${TOTAL_FRAMES}/${TOTAL_FRAMES} done.`);

  // Build GIF via ffmpeg (with palette for size + quality)
  const palette = path.join(OUT_DIR, '_palette.png');
  console.log('Building palette…');
  execSync(`ffmpeg -y -framerate ${FPS} -i ${OUT_DIR}/f%04d.png ` +
           `-vf "palettegen=stats_mode=diff" ${palette}`, { stdio: 'inherit' });
  console.log('Encoding GIF…');
  execSync(`ffmpeg -y -framerate ${FPS} -i ${OUT_DIR}/f%04d.png -i ${palette} ` +
           `-lavfi "paletteuse=dither=bayer:bayer_scale=4" ${GIF_OUT}`,
           { stdio: 'inherit' });
  console.log(`GIF: ${GIF_OUT}`);

  if (wantMp4) {
    // Re-render at full resolution for MP4
    console.log(`Rendering ${TOTAL_FRAMES} frames at ${FULL_W}×${FULL_H} for MP4…`);
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      await renderFrame(i, FULL_W, FULL_H);
      if (i % 10 === 0) process.stdout.write(`  ${i}/${TOTAL_FRAMES}\r`);
    }
    console.log(`  ${TOTAL_FRAMES}/${TOTAL_FRAMES} done.`);
    console.log('Encoding MP4 (H.264, yuv420p, faststart)…');
    execSync(`ffmpeg -y -framerate ${FPS} -i ${OUT_DIR}/f%04d.png ` +
             `-c:v libx264 -pix_fmt yuv420p -movflags +faststart -crf 18 ${MP4_OUT}`,
             { stdio: 'inherit' });
    console.log(`MP4: ${MP4_OUT}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
