# Reading cards from the supplied Quran PDF

The current reader combines the watercolor shell from `9bbe694` with the
individual text-card interaction of `5a496d0`. Each surah ayah, Kursi clause,
Al-Hashr audio fragment and Fatiha explanation has its own image. Clicking the
image activates its existing card handler. Audio and video assets were not changed.

## Reproducible images

```sh
python scripts/build-reading-cards.py /path/to/source.pdf
python scripts/build-reading-cards.py /path/to/source.pdf --verify
node scripts/check-reading-cards.cjs http://127.0.0.1:8765
node scripts/check-published-reading.cjs COMMIT_SHA
```

The only Quran image source is the supplied PDF with SHA-256
`b313b6fa45db8c35eb98bf3bba7447d05ab42f716e6bd96017c3793573cc2bed`.
`reading-card-sources.json` is the reviewed crop plan: one-based PDF pages,
4x render scale, integer source rectangles, output positions, word grouping,
canvas dimensions, paper color, PNG hashes and display dimensions. The builder
renders each original page, crops RGB rectangles and pastes them unchanged.
It does not edit PDF content, generate text, apply masks, remove paper, recolor,
retouch or reconstruct symbols. Verification compares every output pixel with
a reconstruction from those source rectangles and checks within-word geometry.

Only whole word groups move to new lines. In three places where neighboring
lines nearly overlap (67:22, 67:23, 104:1), a word consists of several source
rectangles retaining exactly their original relative positions. This excludes
unrelated neighboring marks while preserving all its own strokes and marks.
The source's own border overlaps the lowest marks in 105:4-5; the small original
border fragments are deliberately retained without reconstructing hidden ink.
Page 1's pale lavender paper is also preserved.

There are 207 images: 160 ayahs and 20 basmalas for surahs 67 and 96-114,
8 Kursi clauses, 10 Al-Hashr fragments, 8 Fatiha explanation fragments and
1 complete Fatiha image. Fatiha explanations 7 and 8 split the seventh ayah at
`opening_part` / `closing_part` as in the unchanged video manifest.

## Existing media and missing recordings

Al-Mulk retains the exact audio groups from the reference commit: ayahs 1-12
use their existing fragments; duplicate files 16-20 are not inserted. Surahs
96 and 98 and Al-Mulk 13-30 still have no recordings. No audio is invented.

Neither referenced commit, nor earlier repository history, contains the eight
Kursi PNGs/MP3s: only placeholder README files and references to `1` through `8`.
After this was reported, the user instructed using the PDF. Eight clauses of
2:255 were therefore cropped from PDF pages 38-39. `fragmentsData` retains the
original MP3 filenames, with `available: false`; missing recordings produce a
visible status, without broken requests. Enable a file only after its content
has been checked against the corresponding image. Sequence and recording
controls remain implemented.

Isti'adha is not Quran text. Its original teaching image and audio are retained
byte-for-byte. Image provenance: `3b7b9dd` (vector export from teaching Excel),
subsequently wrapped as `fragments/istiadhah-line.svg`. Audio provenance:
`ee9dfce` (the original 12-second voice recording converted from Opus to MP3).
It is not substituted with a Quran verse.

## Verification

`check-reading-cards.cjs` checks image/card counts, every surah audio mapping,
Al-Mulk grouping, restarting a card, switching cards, stale callbacks, full
sequences, navigation, all 9 video lessons, actual MP3/video decoding in mobile
WebKit and microphone recording/playback in Chromium with a synthetic input.
It checks all main routes at 320, 390 and 768 px, broken assets, runtime errors,
proportions, absence of horizontal overflow, and continued removal of mahraj.
It saves real browser screenshots and a report to `../design/reading-restored/`.
Set `READING_QA_DIR` to choose another output directory. Playwright with WebKit
and Chromium is required; the PNG verifier needs PyMuPDF and Pillow.

The original watercolor artwork, alphabet, random-ayah training and video files
are unchanged. Historical `quran-scans` and `surahs/reading` assets and their
builders remain in the repository for provenance; the four reading pages now
use `reading-cards.js`. Historical browser checks for the previous page-scan
layout are superseded by `check-reading-cards.cjs`.
