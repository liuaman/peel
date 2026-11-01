# Peel

**Tape that carries what's inside.**

Boxes are boring, but what's in them usually isn't: a move, a care package from home, a gift. Peel turns photos from your everyday life into packing tape designs, so the outside of the box says something too.

Peel is a web app. Everything runs in your browser; photos never leave your device.

## What it does

1. **Add photos.** Peel removes the background on your device and keeps just the subject. PNGs that already have a transparent background (like an iPhone "lift subject" copy) are used as they are.
2. **Pick a layout.**
   - **Pattern**: your cut-outs repeat like a washi tape roll.
   - **Message**: one line of text, set big.
   - **Both**: a message block next to a photo block, like Japanese produce labels.
3. **Pick a print treatment.** Silhouette, Halftone or Riso. Photos get flattened into one or two inks so the tape looks printed.
4. **Pick colors.** Two inks. Start from a preset, or press **Space** to shuffle (lock an ink to keep it), like [coolors.co](https://coolors.co).
5. **Add words.** A message, plus a details line. Peel fills the details from your photo's date and place when the photo has them.
6. **Download** the tape as a flat strip PNG, or the box mockup as a PNG.

## Run it locally

```bash
npm install
npm run dev
```

Then open the address Vite prints (http://localhost:5173/peel/).

## Deploy

The workflow in `.github/workflows/deploy.yml` builds the app and publishes it to GitHub Pages on every push to `main`.

One-time setup: in the repository on GitHub, go to **Settings → Pages** and set **Source** to **GitHub Actions**. The site will be at `https://<your-username>.github.io/peel/`.

## How it's built

- React + TypeScript + Vite
- Background removal: [`@imgly/background-removal`](https://github.com/imgly/background-removal-js), which downloads its model from IMG.LY's CDN the first time you add a photo
- Photo date and GPS: [`exifr`](https://github.com/MikeKovarik/exifr); place names from BigDataCloud's free reverse geocoding
- All tape and box drawing is plain Canvas 2D (`src/lib/tape.ts`, `src/lib/box.ts`)

| File | What it does |
| --- | --- |
| `src/lib/cutout.ts` | Photo → transparent cut-out, cropped tight |
| `src/lib/treatment.ts` | Cut-out → Silhouette / Halftone / Riso in your inks |
| `src/lib/tape.ts` | The three layouts, drawn as a repeating strip |
| `src/lib/box.ts` | Kraft box mockup and the peel animation |
| `src/lib/palette.ts` | Presets and the color shuffle |

## License note

`@imgly/background-removal` is licensed under AGPL-3.0. If you publish Peel, keep the source public (this repo) or swap in a different background-removal library.

## Roadmap

- [x] v1: photos → tape → box mockup, PNG export
- [ ] v2: animated GIF of the tape being pulled across the box
- [ ] Washi tape width (15mm)
- [ ] Parcel link: send a virtual box that the recipient peels open
