// Renders the StyleDesk outro card as a Muppet-Show-style curtain close.
//
// Usage:
//   node render-animation.js               # GIF preview (540×960, 30fps)
//   node render-animation.js --mp4         # also generates 1080×1920 MP4 for Descript
//
// Pipeline: parameterize the outro SVG (clipPath wavy inner edge + content
// opacity), render N frames via sharp, then ffmpeg into GIF / MP4. Each curtain
// panel slides in horizontally from its outer edge toward the center stage line
// (x=540). The clip-path's inner vertical edge has a sinusoidal ripple along y
// (wavelength = 135px = one pleat unit) so the cloth reads as drape catching up
// with the panel's motion, not a sliding rectangle. The right panel starts
// RIGHT_DELAY seconds after the left for an organic, non-synchronized feel.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('/tmp/node_modules/sharp');

const FPS = 30;
const ANIM_DUR = 1.6;            // curtains closing — 1.6s per panel
const RIGHT_DELAY = 0.08;        // right panel starts 80ms after left
const FADE_DUR = 0.25;           // content fade in (snappy)
const HOLD_DUR = 0.6;            // final hold
const TOTAL_FRAMES = Math.round((ANIM_DUR + RIGHT_DELAY + FADE_DUR + HOLD_DUR) * FPS);

const PREVIEW_W = 540;
const PREVIEW_H = 960;
const FULL_W = 1080;
const FULL_H = 1920;

const WAVE_AMP = 22;             // inner-edge ripple amplitude (px)
const WAVE_LEN = 135;            // matches one pleat unit
const SAMPLES = 28;              // segments per panel along the inner edge
const SETTLE_START = 0.85;       // p > this: ripple tapers to 0 so the two
                                 // inner edges meet as clean vertical lines

const OUT_DIR = path.join(__dirname, 'png-ready', '_frames');
const GIF_OUT = path.join(__dirname, 'png-ready', 'outro-card-reels.gif');
const MP4_OUT = path.join(__dirname, 'png-ready', 'outro-card-reels.mp4');
const SVG_PATH = path.join(__dirname, 'outro-card-reels.svg');

// Quadratic-ish ease-out: starts moving immediately, settles into place at the
// end. Reads as a stagehand pulling the curtain in, then easing it shut.
const easeOut = t => 1 - Math.pow(1 - t, 2.4);

function innerEdgeX(innerX, y, phase, amp) {
  return innerX + amp * Math.sin((2 * Math.PI * y) / WAVE_LEN + phase);
}

function clipPathD(t, panel) {
  // Closing motion: each panel slides in from its outer edge toward the
  // centerline at x=540. Left panel grows from x=0 (zero width) to x=0..540.
  // Right panel grows from x=1080 (zero width) to x=540..1080.
  const ts = panel === 'right' ? Math.max(0, t - RIGHT_DELAY) : t;
  const p = Math.max(0, Math.min(ts / ANIM_DUR, 1));
  const eased = easeOut(p);

  // Inner vertical edge x position (the loose hem leading the slide).
  const innerX = panel === 'right' ? 1080 - 540 * eased : 540 * eased;

  // Phase shift over time + offset between panels so the two inner edges don't
  // ripple in lock-step.
  const phase = -ts * 5.0 + (panel === 'right' ? Math.PI / 3 : 0);

  // Ripple at full amplitude during the slide, then taper to 0 in the last
  // (1 - SETTLE_START) of the motion so the two panels meet as clean vertical
  // lines at the center — no zigzag seam at the final frame.
  const settle = p <= SETTLE_START ? 1 : 1 - (p - SETTLE_START) / (1 - SETTLE_START);
  const amp = WAVE_AMP * settle;

  const outerX = panel === 'right' ? 1080 : 0;

  // Walk: outer-top → inner-top → wavy down inner edge → inner-bottom →
  // outer-bottom → close.
  let d = `M ${outerX} 0 L ${innerX.toFixed(2)} 0`;
  for (let i = 0; i <= SAMPLES; i++) {
    const y = (1920 * i) / SAMPLES;
    d += ` L ${innerEdgeX(innerX, y, phase, amp).toFixed(2)} ${y.toFixed(2)}`;
  }
  return d + ` L ${outerX} 1920 Z`;
}

function svgForFrame(t) {
  // Content fades in once both panels have landed.
  const animEnd = ANIM_DUR + RIGHT_DELAY;
  let opacity = 0;
  if (t >= animEnd) {
    opacity = Math.min((t - animEnd) / FADE_DUR, 1);
  }

  let svg = fs.readFileSync(SVG_PATH, 'utf8');
  svg = svg.replace(/<path id="leftClipPath" d="[^"]*"\/>/,
                    `<path id="leftClipPath" d="${clipPathD(t, 'left')}"/>`);
  svg = svg.replace(/<path id="rightClipPath" d="[^"]*"\/>/,
                    `<path id="rightClipPath" d="${clipPathD(t, 'right')}"/>`);
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

  if (fs.existsSync(OUT_DIR)) {
    for (const f of fs.readdirSync(OUT_DIR)) fs.unlinkSync(path.join(OUT_DIR, f));
  } else {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  console.log(`Rendering ${TOTAL_FRAMES} frames at ${PREVIEW_W}×${PREVIEW_H}…`);
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    await renderFrame(i, PREVIEW_W, PREVIEW_H);
    if (i % 10 === 0) process.stdout.write(`  ${i}/${TOTAL_FRAMES}\r`);
  }
  console.log(`  ${TOTAL_FRAMES}/${TOTAL_FRAMES} done.`);

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
