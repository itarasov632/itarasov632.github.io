"""Crop the supplied Quran PDF and existing PNGs; never typeset Arabic.

Usage: python scripts/build-surah-images.py path/to/source.pdf
Requires PyMuPDF, pypdf, Pillow and numpy. Original PNGs remain untouched.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import pymupdf
from PIL import Image
from pypdf import PdfReader
from pypdf.generic import ArrayObject, ByteStringObject, ContentStream, NumberObject, TextStringObject

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/images/surahs'
OUTPUT = SOURCE / 'reading'
COUNTS = {67: 30, 96: 19, 97: 5, 98: 8, 99: 8, 100: 11, 101: 11,
          102: 8, 103: 3, 104: 9, 105: 5, 106: 4, 107: 7, 108: 3,
          109: 6, 110: 3, 111: 5, 112: 4, 113: 5, 114: 6}
FROM_PDF = {67, 96, 98, 105, 106, 108, 109, 110, 111, 112, 113, 114}
# Basmalas in page order (PDF page numbers are one-based).
PAGE_STARTS = {524: [67], 525: [], 526: [68], 562: [95, 96],
               563: [97, 98], 564: [99, 100], 566: [103, 104, 105],
               567: [106, 107, 108], 568: [109, 110, 111],
               569: [112, 113, 114]}
SCALE = 4
ROW_HEIGHT = 240
PDF_DISPLAY_HEIGHT = 70
DISPLAY_HEIGHT = 60
MAX_WIDTH = 330
PAD = 8


def transparent(image):
    """Remove only the white paper matte, preserving antialiasing and color."""
    rgb = np.asarray(image.convert('RGB')).astype(np.float32)
    alpha = 255 - rgb.min(axis=2)
    out = np.zeros((*alpha.shape, 4), dtype=np.uint8)
    mask = alpha > 0
    out[..., :3][mask] = np.clip(
        (rgb[mask] - (255 - alpha[mask, None])) * 255 / alpha[mask, None],
        0, 255).astype(np.uint8)
    out[..., 3] = alpha.astype(np.uint8)
    return Image.fromarray(out)


def blank_runs(image):
    blank = np.asarray(image.getchannel('A')).max(axis=0) == 0
    edges = np.diff(np.r_[False, blank, False].astype(int))
    return list(zip(np.where(edges == 1)[0], np.where(edges == -1)[0]))


def nearest_blank(runs, target, radius):
    choices = [min(max(round(target), a), b - 1) for a, b in runs
               if b > target - radius and a < target + radius]
    if not choices:
        raise ValueError(f'No clean whitespace at {target}')
    return min(choices, key=lambda x: abs(x - target))


def trim_horizontal(image):
    box = image.getbbox()
    if not box:
        return None
    result = Image.new('RGBA', (box[2] - box[0] + PAD * 2, image.height))
    result.paste(image.crop((box[0], 0, box[2], image.height)), (PAD, 0))
    return result


def wrap(image, candidates=None):
    """Split right-to-left at verified empty columns; never cut ink."""
    limit = int(MAX_WIDTH * image.height / DISPLAY_HEIGHT) - 2 * PAD
    bbox = image.getbbox()
    if not bbox:
        return []
    left, right = bbox[0], bbox[2]
    runs = blank_runs(image)
    if candidates is None:
        # Existing scans: generous inter-word gaps, reviewed in contact sheets.
        candidates = [(a + b) // 2 for a, b in runs if b-a >= image.height * .045]
    cuts, pieces = [], []
    while right - left > limit:
        allowed = [x for x in candidates if right - limit <= x < right - limit * .35]
        if not allowed:
            raise ValueError(f'No safe word boundary: {image.size}, {left}, {right}')
        cut = min(allowed)
        assert np.asarray(image.getchannel('A'))[:, cut].max() == 0
        pieces.append(trim_horizontal(image.crop((cut, 0, right, image.height))))
        cuts.append(cut)
        right = cut
    pieces.append(trim_horizontal(image.crop((left, 0, right, image.height))))
    return pieces


def words(image, candidates):
    boundaries = [image.width, *sorted(set(candidates), reverse=True), 0]
    return [piece for right, left in zip(boundaries, boundaries[1:])
            if (piece := trim_horizontal(image.crop((left, 0, right, image.height)))) is not None]


def pack_words(pieces):
    """Reflow intact screenshot words, including across PDF line/page boundaries."""
    limit = int(MAX_WIDTH * ROW_HEIGHT / PDF_DISPLAY_HEIGHT)
    groups, current, width = [], [], 0
    for piece in pieces:
        assert piece.width <= limit, piece.size
        if current and width + piece.width > limit:
            groups.append(current)
            current, width = [], 0
        current.append(piece)
        width += piece.width
    if current:
        groups.append(current)
    rows = []
    for group in groups:
        row = Image.new('RGBA', (sum(piece.width for piece in group), ROW_HEIGHT))
        x = row.width
        for piece in group:
            x -= piece.width
            row.paste(piece, (x, 0))
        rows.append(row)
    return rows


def raw_operand(value):
    if isinstance(value, TextStringObject):
        return ByteStringObject(value.original_bytes)
    if isinstance(value, ArrayObject):
        return ArrayObject([raw_operand(item) for item in value])
    return value


def isolate_line(operations, reader, baseline):
    """Select the source PDF's original text layer for a screenshot.

    Some vowel/stop marks overlap the neighboring line's rectangle. Hide other
    lines with PDF rendering mode 3; retain all original font bytes, positions,
    kerning and clipping. No Arabic text is generated, replaced or typeset.
    """
    result = []
    y, c, scale, leading = 0, 0, 1, 0
    for args, op in operations:
        if op == b'Tm':
            c, scale, y = float(args[2]), float(args[3]), float(args[5])
        elif op in (b'Td', b'TD'):
            y += float(args[0])*c + float(args[1])*scale
            if op == b'TD':
                leading = -float(args[1])
        elif op == b'TL':
            leading = float(args[0])
        elif op in (b'T*', b"'", b'"'):
            y -= leading*scale
        if op in (b'Tj', b'TJ', b"'", b'"'):
            visible = abs(842-y-baseline) < 3
            result.append(([NumberObject(0 if visible else 3)], b'Tr'))
        if op in (b'S', b's', b'f', b'F', b'f*', b'B', b'B*', b'b', b'b*'):
            result.append(([], b'n'))  # Omit the page frame and decoration.
        elif op != b'Do':
            result.append((args, op))
    stream = ContentStream(None, reader)
    stream.operations = result
    return stream.get_data()


def pdf_images(document, reader, render_document):
    images, provenance = {}, {}
    current, ayah = None, 1
    pending = []
    previous_page = None
    for page_number, starts in PAGE_STARTS.items():
        if previous_page is None or page_number != previous_page + 1:
            current, ayah, pending = None, 1, []
        previous_page = page_number
        page = document[page_number - 1]
        render_page = render_document[page_number - 1]
        operations = [([raw_operand(arg) for arg in args], op)
                      for args, op in reader.pages[page_number-1].get_contents().operations]
        lines = []
        for block in page.get_text('rawdict')['blocks']:
            for line in block.get('lines', []):
                if any(s['font'] == 'MSTT31c29b00' and s['size'] > 20 for s in line['spans']):
                    lines.append(line)
        lines.sort(key=lambda l: l['bbox'][1])
        start_index = 0
        for line in lines:
            chars = [(c, s['font']) for s in line['spans'] for c in s['chars']]
            text = ''.join(c['c'] for c, _ in chars)
            is_basmala = text.startswith('Öα')
            if is_basmala:
                if current in FROM_PDF:
                    assert ayah == COUNTS[current] + 1 and not pending, (current, ayah)
                current = starts[start_index]
                start_index += 1
                ayah, pending = 1, []
            if current not in FROM_PDF:
                continue
            baseline = next(c['origin'][1] for c, font in chars if font == 'MSTT31c29b00')
            clip = pymupdf.Rect(78, round(baseline-37), 518, round(baseline+23))
            render_document.update_stream(render_page.get_contents()[0],
                                          isolate_line(operations, reader, baseline))
            pix = render_page.get_pixmap(matrix=pymupdf.Matrix(SCALE, SCALE), clip=clip, alpha=False)
            source_pix = page.get_pixmap(matrix=pymupdf.Matrix(SCALE, SCALE), clip=clip, alpha=False)
            # Use the isolated layer only as a selection mask for the original
            # screenshot. Never restore ink hidden behind the book's decoration.
            selected = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, 3)
            original = np.frombuffer(source_pix.samples, np.uint8).reshape(pix.height, pix.width, 3)
            screenshot = np.maximum(selected, original)
            screenshot[np.ptp(original, axis=2) > 2] = 255
            assert np.all(screenshot >= original)  # No ink absent from the screenshot.
            raster = transparent(Image.fromarray(screenshot))
            assert raster.height == ROW_HEIGHT
            alpha = np.asarray(raster.getchannel('A'))
            assert not alpha[0].any() and not alpha[-1].any(), (current, ayah, 'clipped marks')
            runs = blank_runs(raster)
            spaces = []
            for c, font in chars:
                if c['c'] == '\x03':
                    target = ((c['bbox'][0] + c['bbox'][2]) / 2 - clip.x0) * SCALE
                    try:
                        spaces.append(nearest_blank(runs, target, 3 * SCALE))
                    except ValueError:
                        pass  # An overhanging vowel mark makes this gap unsafe.
            if is_basmala:
                try:
                    images[(current, 'basmala')] = words(raster, spaces)
                except ValueError as error:
                    raise ValueError((current, page_number, baseline, clip)) from error
                provenance[f'{current}/basmala'] = [{'page': page_number, 'clip': list(clip)}]
                continue
            markers = [(i, c) for i, (c, font) in enumerate(chars)
                       if c['c'] == '0' and font == 'MSTT31c29b00']
            markers.sort(key=lambda pair: pair[1]['bbox'][0], reverse=True)
            right = raster.width
            for index, marker in markers:
                # The rosette extends left of its nominal glyph box. Its preceding
                # word-space identifies the separator without OCR or redrawing.
                prior_spaces = [c for c, _ in chars[:index] if c['c'] == '\x03']
                if prior_spaces:
                    c = prior_spaces[-1]
                    target = ((c['bbox'][0] + c['bbox'][2]) / 2 - clip.x0) * SCALE
                else:
                    target = 0
                cut = nearest_blank(runs, target, 3 * SCALE)
                fragment = raster.crop((cut, 0, right, raster.height))
                pending.extend(words(fragment, [x-cut for x in spaces if cut < x < right]))
                key = f'{current}/{ayah}'
                provenance.setdefault(key, []).append({'page': page_number,
                    'clip': [clip.x0+cut/SCALE, clip.y0, clip.x0+right/SCALE, clip.y1]})
                images[(current, str(ayah))] = pending
                pending = []
                ayah += 1
                right = cut
            remainder = raster.crop((0, 0, right, raster.height))
            if remainder.getbbox():
                pending.extend(words(remainder, [x for x in spaces if x < right]))
                provenance.setdefault(f'{current}/{ayah}', []).append({'page': page_number,
                    'clip': [clip.x0, clip.y0, clip.x0+right/SCALE, clip.y1]})
        assert start_index == len(starts)
    assert not pending
    for sid in FROM_PDF:
        assert all((sid, str(i)) in images for i in range(1, COUNTS[sid]+1)), sid
    return images, provenance


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    args = parser.parse_args()
    document = pymupdf.open(args.pdf)
    images, provenance = pdf_images(document, PdfReader(args.pdf), pymupdf.open(args.pdf))
    manifest = {}
    for sid, count in COUNTS.items():
        manifest[sid] = {}
        for key in ['basmala', *map(str, range(1, count+1))]:
            if sid in FROM_PDF:
                rows = pack_words(images[(sid, key)])
                display_height = PDF_DISPLAY_HEIGHT
            else:
                original = SOURCE / str(sid) / f'{key}.png'
                if sid == 97 and key == 'basmala':
                    original = original.with_name('basmla.png')
                raster = Image.open(original).convert('RGBA')
                # Existing PNGs have transparency, but some still contain small
                # opaque white patches. Remove those without touching the ink.
                white = Image.new('RGBA', raster.size, 'white')
                white.alpha_composite(raster)
                raster = transparent(white)
                # Detached Arabic letters are not word boundaries. These two
                # gaps are explicitly chosen after visual source comparison.
                manual = {(101, '4'): [306], (107, '5'): [254]}
                cuts = [nearest_blank(blank_runs(raster), x, 15) for x in manual[(sid, key)]] if (sid, key) in manual else None
                rows = wrap(raster, cuts)
                display_height = DISPLAY_HEIGHT
                provenance[f'{sid}/{key}'] = {'png': original.relative_to(ROOT).as_posix(),
                    'sha256': hashlib.sha256(original.read_bytes()).hexdigest()}
            assert rows and all(row is not None for row in rows)
            height = rows[0].height
            assert all(row.height == height for row in rows)
            image = Image.new('RGBA', (max(row.width for row in rows), len(rows)*height))
            for i, row in enumerate(rows):
                image.paste(row, (image.width-row.width, i*height))
            target = OUTPUT / str(sid) / f'{key}.png'
            target.parent.mkdir(parents=True, exist_ok=True)
            image.save(target)
            manifest[sid][key] = {'width': round(image.width * display_height / height, 3),
                                  'height': len(rows)*display_height, 'lines': len(rows)}
            assert manifest[sid][key]['width'] <= MAX_WIDTH + .01
        print(f'Surah {sid}: {count} ayahs + basmala')
    (ROOT / 'js/data/surah-images.js').write_text(
        '// Generated by scripts/build-surah-images.py. Dimensions are CSS pixels.\n'
        'const SURAH_IMAGES = ' + json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + ';\n',
        encoding='utf-8')
    (ROOT / 'scripts/surah-image-sources.json').write_text(json.dumps({
        'pdfSha256': hashlib.sha256(args.pdf.read_bytes()).hexdigest(),
        'pdfPageNumbers': 'one-based', 'renderScale': SCALE,
        'sources': provenance}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
