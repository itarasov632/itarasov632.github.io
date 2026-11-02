"""Rebuild/verify reviewed reading cards from literal rectangles of the user's PDF.

python scripts/build-reading-cards.py SOURCE.pdf [--verify]
Requires pymupdf and Pillow. Never edits the PDF, typesets text, uses masks,
changes crop colors, or reconstructs marks. The reviewed manifest is the source
of crop coordinates and reading order. Only whole word groups change lines;
parts within a word always retain their original relative coordinates.
"""
import argparse
import hashlib
import json
from pathlib import Path
import pymupdf
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'scripts/reading-card-sources.json'
EXPECTED_PDF = 'b313b6fa45db8c35eb98bf3bba7447d05ab42f716e6bd96017c3793573cc2bed'

def sha(data):
    return hashlib.sha256(data).hexdigest()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    parser.add_argument('--verify', action='store_true')
    args = parser.parse_args()
    meta = json.loads(MANIFEST.read_text('utf-8'))
    assert sha(args.pdf.read_bytes()) == meta['pdfSha256'] == EXPECTED_PDF, 'Wrong source PDF'
    document = pymupdf.open(args.pdf)
    pages = {}
    data = {}
    count = 0
    for key, card in meta['cards'].items():
        canvas = Image.new('RGB', tuple(card['pixelSize']), tuple(card['paper']))
        offsets = {}
        for part in card['parts']:
            page_number = part['page']
            if page_number not in pages:
                pix = document[page_number - 1].get_pixmap(matrix=pymupdf.Matrix(meta['scale'], meta['scale']), alpha=False)
                pages[page_number] = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
            box = part['pixelRect']
            assert all(isinstance(v, int) for v in box + part['paste'])
            assert 0 <= box[0] < box[2] <= pages[page_number].width
            assert 0 <= box[1] < box[3] <= pages[page_number].height
            # Parts of a word retain EXACT original spacing and baseline.
            offset = (part['paste'][0] - box[0], part['paste'][1] - box[1])
            group = part['wordGroup']
            assert group not in offsets or offsets[group] == offset, (key, group, 'word distorted')
            offsets[group] = offset
            crop = pages[page_number].crop(box)
            assert part['paste'][0] >= 0 and part['paste'][1] >= 0
            assert part['paste'][0] + crop.width <= canvas.width
            assert part['paste'][1] + crop.height <= canvas.height
            canvas.paste(crop, part['paste'])
            count += 1
        target = ROOT / card['file']
        if args.verify:
            actual = Image.open(target)
            assert actual.mode == 'RGB' and actual.size == canvas.size, key
            assert actual.tobytes() == canvas.tobytes(), (key, 'source pixel mismatch')
            assert sha(target.read_bytes()) == card['sha256'], key
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            canvas.save(target)
            assert sha(target.read_bytes()) == card['sha256'], (key, 'encoder changed; inspect before updating hash')
        data[key] = {'src':card['file'], 'width':card['displayWidth'], 'height':card['displayHeight'], 'lines':card['lines']}
    js = '// Generated from the supplied PDF; see scripts/reading-card-sources.json.\nwindow.READING_CARDS = ' + json.dumps(data,separators=(',', ':')) + ';\n'
    js_path = ROOT / 'js/data/reading-cards.js'
    if args.verify:
        assert js_path.read_text('utf-8') == js
    else:
        js_path.write_text(js, 'utf-8')
    print(f'PASS: {len(data)} cards, {count} source rectangles, exact original RGB pixels and word geometry.')

if __name__ == '__main__':
    main()
