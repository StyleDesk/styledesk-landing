# Descript — Editing Guide

Descript edits video by editing the transcript. This is where the recording becomes a polished asset.

## Order of operations

Always do these in order — later steps depend on earlier ones:

1. **Import** the Tella export → let Descript transcribe
2. **Studio Sound** (one toggle) — removes room echo, makes voiceover sound like a $2k mic
3. **Remove Filler Words** — Edit → Remove Filler Words, applied to the whole transcript
4. **Shorten Word Gaps** to 0.3s — Edit → Shorten Word Gaps. Second-biggest "pro" trick after auto-zoom.
5. **Captions** — Sequence → Captions → "Big & Bold" or "Wrap"
6. **B-roll cuts** — drop in 1s screenshots when product names are mentioned
7. **Music bed** — instrumental, -18 to -24 dB under the voice
8. **Outro card** — 3s end card with logo + `styledesk.ai`
9. **Export** 1080p MP4

## Caption style

Match the brand:

- Font: **Inter** (Descript has it built in), weight 700–900
- Color: white text
- Background: semi-transparent dark (matches `#1a000b`)
- Position: lower third, large enough to read on a phone
- Animation: word-by-word highlight (keeps eyes on screen)

~80% of feature videos are watched muted. Captions are not optional.

## Music

- Use Descript's stock library, instrumental only
- Volume: -18 to -24 dB under the voice
- Cut on the beat at section transitions (hook → walkthrough → payoff)
- No vocals — they fight your voiceover

## B-roll triggers

When you say one of these words, cut to a 1s screenshot:

- "Booksy" / "Square" / "Fresha" / "Vagaro" → integration logo
- "Dashboard" → `images/basic-dashboard.png` or `pro-dashboard.png` or `premium-dashboard.png`
- "Text" / "SMS" → phone mockup screenshot from the hero section
- "Call" → phone receiver icon or ringing UI

## Skip these traps

- Captions smaller than 32pt
- Music louder than the voice
- Dead air over 0.5s anywhere
- Videos longer than 90s for Reels (algorithm penalty after that)
- Auto-generated captions without proofreading — Descript misspells "Booksy" as "Booksey"
