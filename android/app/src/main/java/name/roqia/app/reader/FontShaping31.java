package name.roqia.app.reader;

import java.io.File;

import android.graphics.Paint;
import android.graphics.text.PositionedGlyphs;
import android.graphics.text.TextRunShaper;

/** Kept separate so API 24-30 never loads classes introduced in API 31. */
final class FontShaping31 {
  static void require(String text, Paint paint, File file) throws Exception {
    PositionedGlyphs glyphs =
        TextRunShaper.shapeTextRun(text, 0, text.length(), 0, text.length(), 0f, 0f, true, paint);
    for (int g = 0; g < glyphs.glyphCount(); g++) {
      File used = glyphs.getFont(g).getFile();
      if (glyphs.getGlyphId(g) == 0
          || used == null
          || !used.getCanonicalPath().equals(file.getCanonicalPath()))
        throw new IllegalStateException("font_fallback_rejected");
    }
  }
}
