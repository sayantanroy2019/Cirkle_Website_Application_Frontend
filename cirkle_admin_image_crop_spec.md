# FRONTEND SPEC — Admin Portal: Event Banner & Gallery Image Pipeline

For the admin portal frontend agent. Swagger authoritative for all API shapes.

## Goal

The consumer app already has a working image pipeline for user profile photos: whatever the
user picks — including iPhone HEIC — is decoded, cropped to a fixed aspect ratio in a
full-screen crop tool, exported as WebP, and uploaded direct-to-S3 via a presigned URL. The
result is that every stored image has a known format and a known aspect ratio, so no screen
ever has to defend against a 12MB portrait HEIC or a 5000×200 panorama.

Build the same pipeline in the admin portal for **event banner** and **event gallery**
uploads. The mechanism is identical; only the aspect ratio, the endpoints, and the counts
differ.

This is a port, not a redesign. The reference implementation lives in the consumer repo at
`Cirkle_Website_Application_Frontend`. Read those files first — they encode several
non-obvious fixes that are easy to lose in a rewrite (see **Invariants** below).

## Reference implementation to port

| Consumer file | What it does | Port as |
|---|---|---|
| `src/lib/crop.js` | HEIC detection + decode, canvas crop, WebP export | Near-verbatim; parameterize the ratio |
| `src/components/PhotoCropper.jsx` | Full-screen pan/zoom crop UI, locked ratio | Near-verbatim; `aspect` becomes a prop |
| `src/components/PhotoGrid.jsx` | Slot grid, crop queue, per-slot upload/progress/retry | Adapt: counts, ratio, upload fn |
| `src/lib/uploads.js` | Presign → PUT to S3 → return `{ key, previewUrl }` | Adapt: different endpoint + body |

### Dependencies

```
react-easy-crop   ^6.2.3    the crop surface
heic2any          ^0.0.4    HEIC → JPEG decode (dynamic import only)
```

## The pipeline

Five stages. Each one exists for a reason; do not collapse them.

```
pick file(s)
   → decodeForCrop()      HEIC → JPEG. JPEG/PNG/WebP pass through untouched.
   → PhotoCropper         Pan/zoom behind a frame locked to the target ratio.
   → getCroppedWebp()     Render crop region to canvas, export WebP.
   → upload               Presign → PUT bytes to S3 → hold the returned key.
   → save                 Attach key(s) via the admin attach endpoint.
```

The crop step is the universal normalizer. Everything downstream can assume WebP at a
known ratio because nothing else can get through.

## Target ratios and export settings

| | Banner | Gallery |
|---|---|---|
| Aspect ratio | **16:9** | **1:1 square** |
| Count | exactly 1 | up to 5 (positions 0–4) |
| Max long edge | **1920px** | **1080px** |
| Quality | 0.8 | 0.8 |
| Output format | `image/webp` | `image/webp` |

Never upscale — if the crop region is smaller than the cap, export it at its native size.
`getCroppedWebp` already does this (`scale = longEdge > maxLong ? maxLong / longEdge : 1`).

Banner gets a larger cap than profile photos (1080) because it renders as a full-width hero;
1080 across a 16:9 frame is only 1080×608 and visibly soft on a desktop viewport.

> **Consumer-side follow-up, not your task:** the consumer app does not render `bannerUrl` or
> `gallery` yet — the event hero and feed card are still gradient placeholders, and the hero
> placeholder is currently 4:3. It will be updated to 16:9 to match this spec. Flagging it so
> the mismatch isn't mistaken for a bug in your work.

## API contract

All three are admin-authenticated. Confirm exact shapes against Swagger before coding.

### 1. Get a presigned upload URL

```
POST /admin/events/{id}/image-url
body: { contentType: "image/webp", kind: "banner" | "gallery" }
→ 200 { uploadUrl, key }
```

Key is server-generated: `events/{eventId}/{kind}/{uuid}.{ext}`. The event must already exist —
images are keyed to an event id, so a new event is created first and images attached after.

### 2. PUT the bytes straight to S3

```
PUT {uploadUrl}
headers: { "Content-Type": "image/webp" }   // must match what was signed, exactly
body: the cropped WebP File
```

No `Authorization` header — the signed URL *is* the authorization. Use a bare axios/fetch
call, not your API instance, or an interceptor will attach headers that break the signature.

### 3. Attach the key(s)

```
PATCH /admin/events/{id}/banner
body: { s3Key }
→ 200 { bannerUrl }        // presigned view URL for the new banner

PUT /admin/events/{id}/gallery
body: { photos: [{ s3Key, position }] }    // max 5, positions 0-4, no duplicates
```

Gallery is **replace-all**: delete-and-reinsert in a transaction. Always send the complete
desired gallery, never a delta. It is also **all-or-nothing** — if any key isn't actually in
S3, the whole request is rejected and the existing gallery is left untouched. So do not call
it until every upload in the set has succeeded.

## Invariants — the things that will bite you

These are the fixes already baked into the consumer implementation. Each one cost real
debugging; preserve them.

1. **Decode HEIC before cropping, never after.** Browsers cannot draw HEIC to a canvas. The
   crop surface and the canvas export both fail on a raw HEIC.

2. **HEIC detection is a three-step fallback, not a filename check.** iOS and some browsers
   transcode HEIC→JPEG on selection but keep the `.heic` filename, so trusting the extension
   alone converts an already-JPEG file and corrupts it. Order: explicit `image/heic`/`image/heif`
   MIME → true; a known-good image MIME (`jpeg`/`png`/`webp`) → false *even if the name says
   .heic*; unknown/empty MIME → fall back to extension.

3. **`heic2any` must stay a dynamic `import()`.** It is ~1.3MB minified. A static import puts
   it in the main bundle for every admin page load. Import it inside the HEIC branch only.

4. **The backend only signs `image/jpeg`, `image/png`, `image/webp` — never HEIC.** The WebP
   export is precisely what makes HEIC uploads possible. Send `contentType: "image/webp"`
   because that is what the crop step produces, and it must match the PUT header.

5. **The file input's `accept` must include HEIC** even though the API won't take it:
   `accept="image/jpeg,image/png,image/webp,image/heic,image/heif"`. Otherwise iPhone users
   can't select their own photos.

6. **Guard the decode with a ref, not with state.** In `PhotoGrid` the "am I currently
   preparing a file" flag is a `useRef`, because flipping a state value re-runs the effect and
   orphans the in-flight decode, producing a stuck spinner. This looks like a redundant ref
   until you remove it.

7. **Multi-select crops sequentially.** Files go into a queue; the cropper opens for one at a
   time; confirm or cancel advances the queue. Never open N croppers.

8. **Revoke object URLs.** Every `URL.createObjectURL` — crop sources and previews — needs a
   matching `revokeObjectURL` on unmount/removal, tracked with an `isObjectUrl` flag so
   server-provided presigned URLs aren't revoked by mistake.

9. **Retry must reuse the already-cropped `File`.** Keep it on the slot. A failed upload should
   not send the user back through the crop tool.

10. **Upload on crop-confirm, save keys on form-submit.** Uploads run immediately and
    independently so the organizer sees per-slot progress; the keys are only attached when
    they save the event. Block save while any slot is `uploading` or `error`.

## UX requirements

- **Crop tool:** full-screen, frame locked to the target ratio, pan + pinch/zoom, a zoom
  slider, `restrictPosition` on (no dragging the image out of the frame), `minZoom` 1 /
  `maxZoom` 4, `objectFit="contain"` so the whole source is reachable. Confirm / Cancel.
- **Confirm shows a processing state** — the canvas export on a large image is not instant.
- **Per-slot states:** `uploading` with a percentage, `done` with the preview, `error` with a
  tappable Retry and the reason.
- **Banner:** single slot at 16:9. Replacing it goes through the crop tool again.
- **Gallery:** up to 5 slots at 1:1, add-one-at-a-time or multi-select, removable, and
  **reorderable if you can** — position is meaningful and is what the consumer renders in.
- **A "Preparing photo…" overlay while a HEIC decodes.** It is slow enough (seconds on a large
  file) that silence reads as a freeze.

## Verification checklist

- [ ] JPEG, PNG, and WebP all upload end-to-end
- [ ] **iPhone HEIC** uploads end-to-end (the whole point — test on a real device or a real
      `.heic` file, not a renamed JPEG)
- [ ] A `.heic`-named file that the browser already transcoded to JPEG still works
- [ ] Banner exports 16:9; gallery exports 1:1 — verify the stored object's real dimensions,
      not just the preview
- [ ] A small source image is not upscaled
- [ ] Cancel in the crop tool discards cleanly and advances a multi-file queue
- [ ] Failed upload → Retry works without re-cropping
- [ ] Save is blocked while any slot is uploading or errored
- [ ] Gallery replace-all: removing one photo and saving leaves exactly the intended set
- [ ] Gallery is not submitted until all uploads succeed (all-or-nothing rejection never fires)
- [ ] Object URLs are revoked — no leak after adding/removing many photos
- [ ] `heic2any` is in a lazy chunk, not the main bundle (check the build output)

## Out of scope

- Server-side re-encoding or validation of dimensions — the backend stores what it is given.
- EXIF orientation handling beyond what the canvas already does.
- The consumer-side rendering of banner/gallery (tracked separately).
- Artist photos (`event_artists.photo_s3_key`) — same pipeline will apply, but confirm the
  ratio separately before building it.

## Note on the diagnostics

`crop.js` in the consumer repo carries `console.info` / `console.time` calls marked as safe to
remove. They were added to trace which path a file takes through HEIC detection and are
genuinely useful while getting this working. Keep them during development; strip before
shipping.
