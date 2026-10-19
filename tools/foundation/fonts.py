"""Instantiate the licensed UI variable font; never process Quran pack fonts.
Run with fonttools==4.60.1. The source font and OFL notice remain unchanged.
"""

import shutil
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

root = Path(__file__).resolve().parents[2]
for weight in (400, 500, 600, 700):
    source = TTFont(root / 'src/assets/fonts/NotoSansArabic.ttf')
    font = instantiateVariableFont(source, {'wght': weight, 'wdth': 100}, inplace=False)
    family = f'RoqiaArabic{weight}'
    for record in font['name'].names:
        if record.nameID in (1, 4, 6, 16):
            record.string = family.encode(record.getEncoding())
        elif record.nameID in (2, 17):
            record.string = 'Regular'.encode(record.getEncoding())
    # Explicit native font families avoid synthetic weight substitution on Android.
    output = root / f'src/assets/fonts/{family}.ttf'
    font.save(output)
    shutil.copyfile(output, root / f'android/app/src/main/assets/fonts/{family}.ttf')
    print(
        f'{family}: usWeightClass={font["OS/2"].usWeightClass}, glyphs={len(font.getBestCmap())}'
    )
shutil.copyfile(
    root / 'src/assets/fonts/OFL-NotoSansArabic.txt',
    root / 'android/app/src/main/assets/fonts/OFL-RoqiaArabic.txt',
)
