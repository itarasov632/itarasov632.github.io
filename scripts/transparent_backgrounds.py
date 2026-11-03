"""Remove existing paper backgrounds without drawing or changing RGB pixels.

Usage: python scripts/transparent_backgrounds.py [--verify]
Already transparent assets, SVGs, video posters and paper.png are left intact.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def paper_alpha(image, lavender=False):
    """Only alter alpha. Keep every source RGB value and pixel coordinate."""
    rgba = np.array(image.convert('RGBA'))
    rgb = rgba[..., :3].astype(np.int16)
    paper = np.all(rgb == 255, axis=2)
    if lavender:
        # The source Fatiha sheet has several pale lavender paper fields.
        paper |= ((rgb.min(axis=2) >= 240)
                  & (rgb.max(axis=2) - rgb.min(axis=2) <= 12)
                  & (rgb[..., 2] >= rgb[..., 0])
                  & (rgb[..., 2] >= rgb[..., 1]))
    rgba[..., 3][paper] = 0
    return Image.fromarray(rgba)


def watercolor_alpha(image):
    """Flood only near-white paper connected to the outside of the image.

    Small enclosed highlights retain their source pixels. Larger paper gaps
    (including the hole inside the prayer beads) are also removed.
    Colorful pale washes are excluded from the neutral-paper mask.
    """
    rgba = np.array(image.convert('RGBA'))
    rgb = rgba[..., :3].astype(np.int16)
    candidates = ((rgb.min(axis=2) >= 225)
                  & (rgb.max(axis=2) - rgb.min(axis=2) <= 15))
    # A padded outside border seeds all four image edges in one flood fill.
    from PIL import ImageDraw
    mask = Image.fromarray(np.pad(candidates, 1, constant_values=True).astype('uint8') * 255).copy()
    ImageDraw.floodfill(mask, (0, 0), 128, thresh=0)
    exterior = np.asarray(mask)[1:-1, 1:-1] == 128
    from collections import deque
    remaining = candidates & ~exterior
    height, width = remaining.shape
    for y, x in zip(*np.where(remaining)):
        if not remaining[y, x]:
            continue
        queue = deque([(int(y), int(x))])
        component = []
        remaining[y, x] = False
        while queue:
            cy, cx = queue.popleft()
            component.append((cy, cx))
            for ny, nx in ((cy-1, cx), (cy+1, cx), (cy, cx-1), (cy, cx+1)):
                if 0 <= ny < height and 0 <= nx < width and remaining[ny, nx]:
                    remaining[ny, nx] = False
                    queue.append((ny, nx))
        if len(component) >= 64:
            for cy, cx in component:
                exterior[cy, cx] = True
    rgba[..., 3][exterior] = 0
    return Image.fromarray(rgba)


def transform(image, path):
    path = Path(path)
    if 'watercolor' in path.parts:
        return watercolor_alpha(image)
    return paper_alpha(image, lavender=('fatiha' in path.parts or path.name == '1-1.png'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify', action='store_true')
    args = parser.parse_args()
    paths = sorted((ROOT / 'assets/images').rglob('*.png'))
    changed = 0
    for path in paths:
        if path.name == 'paper.png':
            continue
        with Image.open(path) as source:
            rgba = source.convert('RGBA')
        if rgba.getchannel('A').getextrema()[0] < 255:
            continue
        if args.verify:
            raise AssertionError(f'Opaque image: {path.relative_to(ROOT)}')
        output = transform(rgba, path)
        assert output.getchannel('A').getextrema()[0] == 0, path
        assert np.array_equal(np.asarray(output)[..., :3], np.asarray(rgba)[..., :3]), path
        output.save(path)
        changed += 1
    if not args.verify:
        for name, records, hash_key in [('reading-card-sources.json', 'cards', 'sha256'),
                                         ('quran-scan-sources.json', 'screenshots', 'pngSha256')]:
            path = ROOT / 'scripts' / name
            meta = json.loads(path.read_text('utf-8'))
            items = meta[records].values() if records == 'cards' else meta[records]
            for item in items:
                item.setdefault('sourceRgbSha256', item[hash_key])
                item[hash_key] = hashlib.sha256((ROOT / item['file']).read_bytes()).hexdigest()
            meta['backgroundProcessing'] = 'Only paper alpha removed by transparent_backgrounds.py; original RGB pixels and geometry unchanged.'
            path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print(f'PASS: {len(paths) - 1} PNG assets checked; {changed} backgrounds removed; posters and paper texture excluded.')


if __name__ == '__main__':
    main()
