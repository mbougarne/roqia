"""Exercise the production shaping guard with controlled Android glyph results."""

import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
JAVA = (
    Path(
        os.environ.get('JAVA_HOME', '/Users/mbougarne/.sdkman/candidates/java/current')
    )
    / 'bin'
)


class FontShapingTest(unittest.TestCase):
    def test_every_glyph_is_checked_and_each_shaped_font_is_resolved_once(self):
        sources = {
            'android/graphics/Paint.java': 'package android.graphics; public class Paint {}',
            'android/graphics/fonts/Font.java': """package android.graphics.fonts;
                public class Font {private final java.io.File file;
                public Font(java.io.File f){file=f;} public java.io.File getFile(){return file;}}""",
            'android/graphics/text/PositionedGlyphs.java': """package android.graphics.text;
                import android.graphics.fonts.Font;
                public class PositionedGlyphs {public Font[] fonts; public int missing=-1;
                public int glyphCount(){return fonts.length;} public Font getFont(int i){return fonts[i];}
                public int getGlyphId(int i){return i==missing?0:1;}}""",
            'android/graphics/text/TextRunShaper.java': """package android.graphics.text;
                public class TextRunShaper {public static PositionedGlyphs result;
                public static PositionedGlyphs shapeTextRun(String s,int a,int b,int c,int d,
                float x,float y,boolean rtl,android.graphics.Paint p){return result;}}""",
            'name/roqia/app/reader/ShapingCheck.java': """package name.roqia.app.reader;
                import java.io.*; import java.util.*; import android.graphics.fonts.Font;
                import android.graphics.text.*;
                public class ShapingCheck {
                static class CountedFile extends File {int reads=0;
                  CountedFile(String p){super(p);} public String getCanonicalPath() throws IOException {
                  reads++;return super.getCanonicalPath();}}
                static void reject(File expected) throws Exception {
                  try {FontShaping31.require("text",null,expected);throw new AssertionError("accepted invalid glyphs");}
                  catch(IllegalStateException ok) {}}
                public static void main(String[] args) throws Exception {
                  CountedFile expected=new CountedFile("/tmp/source.ttf"), used=new CountedFile("/tmp/source.ttf");
                  PositionedGlyphs g=new PositionedGlyphs();g.fonts=new Font[1000];
                  Font source=new Font(used);Arrays.fill(g.fonts,source);TextRunShaper.result=g;
                  FontShaping31.require("text",null,expected);
                  if(expected.reads!=1||used.reads!=1)throw new AssertionError("repeated file resolution");
                  g.missing=999;reject(expected);g.missing=-1;
                  g.fonts[999]=new Font(new File("/tmp/fallback.ttf"));reject(expected);
                  g.fonts[999]=new Font(null);reject(expected);
                  // A new run must verify again, including a changed source path.
                  Arrays.fill(g.fonts,source);reject(new File("/tmp/other-edition.ttf"));
                }}""",
        }
        with tempfile.TemporaryDirectory() as directory:
            tmp = Path(directory)
            files = []
            for name, content in sources.items():
                file = tmp / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_text(content)
                files.append(str(file))
            files.append(
                str(
                    ROOT
                    / 'android/app/src/main/java/name/roqia/app/reader/FontShaping31.java'
                )
            )
            subprocess.run(
                [str(JAVA / 'javac'), '-d', str(tmp), *files],
                check=True,
                capture_output=True,
            )
            subprocess.run(
                [
                    str(JAVA / 'java'),
                    '-cp',
                    str(tmp),
                    'name.roqia.app.reader.ShapingCheck',
                ],
                check=True,
                capture_output=True,
            )
