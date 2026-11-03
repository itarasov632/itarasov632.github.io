"""Rectangular screenshots of the supplied PDF; no ink processing.

Rendering and integer pixel cropping followed by paper alpha removal.
No RGB color correction, text substitution or word reflow.
Usage: python build-quran-scans.py SOURCE.pdf [--verify]
"""
import argparse
import hashlib
import json
from io import BytesIO
from pathlib import Path
import pymupdf
from PIL import Image
from transparent_backgrounds import transform

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/images/quran-scans'
MANIFEST = ROOT / 'scripts/quran-scan-sources.json'
SCALE = 3
COUNTS = {67:30,96:19,97:5,98:8,99:8,100:11,101:11,102:8,103:3,
          104:9,105:5,106:4,107:7,108:3,109:6,110:3,111:5,112:4,113:5,114:6}
STARTS = {524:[67],525:[],526:[68],562:[95,96],563:[97,98],564:[99,100],
          565:[101,102],566:[103,104,105],567:[106,107,108],568:[109,110,111],569:[112,113,114]}

def sha(data):
    return hashlib.sha256(data).hexdigest()

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf',type=Path)
    parser.add_argument('--verify',action='store_true')
    args=parser.parse_args()
    doc=pymupdf.open(args.pdf)
    cache={}
    def page_image(n):
        if n not in cache:
            pix=doc[n-1].get_pixmap(matrix=pymupdf.Matrix(SCALE,SCALE),alpha=False)
            cache[n]=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
        return cache[n]
    if args.verify:
        manifest=json.loads(MANIFEST.read_text('utf-8'))
        assert sha(args.pdf.read_bytes())==manifest['pdfSha256'], 'Different PDF'
        for rec in manifest['screenshots']:
            expected=transform(page_image(rec['page']).crop(rec['pixelRect']), rec['file'])
            actual=Image.open(ROOT/rec['file'])
            assert actual.mode=='RGBA' and actual.size==expected.size
            assert actual.tobytes()==expected.tobytes(), rec['file']
            assert sha((ROOT/rec['file']).read_bytes())==rec['pngSha256']
        print(f"PASS: {len(manifest['screenshots'])} screenshots preserve original PDF RGB with transparent paper.")
        return
    OUT.mkdir(parents=True,exist_ok=True)
    records=[]
    data={}
    def crop(key,n,rect):
        box=[round(v*SCALE) for v in rect]
        im=page_image(n).crop(box)
        index=len(data.get(str(key),[]))+1
        path=OUT/f'{key}-{index}.png'
        source_png=BytesIO()
        im.save(source_png,format='PNG')
        source_hash=sha(source_png.getvalue())
        im=transform(im,path)
        im.save(path)
        entry={'src':path.relative_to(ROOT).as_posix(),'page':n,'width':im.width,'height':im.height}
        data.setdefault(str(key),[]).append(entry)
        records.append({'key':str(key),'page':n,'pixelRect':box,'file':entry['src'],
                        'pngSha256':sha(path.read_bytes()),'sourceRgbSha256':source_hash})

    # The complete reading panel, including original paper and ornamental frame.
    crop(1,1,[170,291,429,708])
    current=None
    previous=None
    for n,starts in STARTS.items():
        if previous is None or n!=previous+1:
            current=None
        previous=n
        basmalas=[]
        for block in doc[n-1].get_text('dict')['blocks']:
            for line in block.get('lines',[]):
                if not any(s['font']=='MSTT31c29b00' and s['size']>20 for s in line['spans']):
                    continue
                text=''.join(s['text'] for s in line['spans'])
                if text.startswith('Öα'):
                    basmalas.append(line['bbox'][1])
        basmalas.sort()
        assert len(basmalas)==len(starts),(n,basmalas,starts)
        top=88
        for y,sid in zip(basmalas,starts):
            boundary=round(y-55)
            if current in COUNTS:
                crop(current,n,[75,top,520,boundary])
            current=sid
            top=boundary
        if current in COUNTS:
            crop(current,n,[75,top,520,780])

    # Preserve the original line layout across the page break (2:255).
    crop('kursi',38,[75,585,413,632])
    crop('kursi',38,[75,628,520,780])
    crop('kursi',39,[207,88,520,136])
    # Beginning of 59:22 at the left of a line, followed by the complete block.
    crop('hashr',510,[75,408,193,449])
    crop('hashr',510,[75,449,520,680])
    assert all(str(sid) in data for sid in COUNTS)
    MANIFEST.write_text(json.dumps({'pdfSha256':sha(args.pdf.read_bytes()),'scale':SCALE,
        'method':'Full original RGB page render followed by unmodified integer rectangular crop',
        'backgroundProcessing':'Only paper alpha removed by transparent_backgrounds.py; original RGB pixels and geometry unchanged.',
        'screenshots':records},ensure_ascii=False,indent=2)+'\n','utf-8')
    (ROOT/'js/data/quran-scans.js').write_text('// Literal PDF screenshots; see scripts/quran-scan-sources.json.\nwindow.QURAN_SCANS = '+json.dumps(data,separators=(',',':'))+';\n','utf-8')
    print(f'Created {len(records)} literal screenshots from {len(cache)} original pages.')

if __name__=='__main__':
    main()
