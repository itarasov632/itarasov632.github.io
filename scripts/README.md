# Surah screenshots

`build-surah-images.py` produces 180 transparent PNGs for the 20 reading pages
(67 and 96-114). Al-Fatiha retains its separate video lessons.

Run from any directory, supplying the original Quran PDF:

```sh
python -m pip install pymupdf pypdf pillow numpy
python scripts/build-surah-images.py /path/to/source.pdf
```

The source PDF checksum and one-based page/crop coordinates are recorded in
`surah-image-sources.json`. Existing PNGs are retained as sources. Output files
live in `assets/images/surahs/reading/`; `js/data/surah-images.js` records their
display dimensions. Images are at most 330 CSS pixels wide and retain their
aspect ratio. Lines are 60 pixels high for existing screenshots and 70 pixels
for PDF excerpts, including room for all vowel and stop marks.

The script does not transcribe, typeset or generate Arabic. For PDF excerpts,
the existing text layer supplies a selection mask that separates overlapping
marks on adjacent lines. The output ink is restricted to pixels present in
the original page screenshot. White paper and decorative backgrounds are
removed; intact screenshot words are arranged in right-to-left reading order.
The script checks for clipped vertical edges and verifies all expected ayahs.
Review the generated PNGs visually after changing any crop or word boundary.

Al-Mulk previously stored fragments and duplicate images under ayah-like
filenames. Its reading images now contain all 30 complete ayahs. The page groups
the original recordings for ayahs 1-12; no recordings are invented for the
remaining ayahs or for surahs 96 and 98.

To check the site, make Playwright and its WebKit browser available, start a
static server at port 8765, then run:

```sh
node scripts/check-surah-pages.cjs http://127.0.0.1:8765
```

Set `SURAH_QA_DIR` to an output directory to save browser screenshots and the
JSON report. The check loads every reading image in an iPhone-sized WebKit
viewport, verifies dimensions and navigation, and exercises grouped audio
with a stub (no sound is played).
