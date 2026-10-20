package name.roqia.app.reader;

import java.io.File;
import java.util.HashSet;
import java.util.Set;

import android.graphics.Paint;
import android.graphics.fonts.Font;
import android.graphics.text.PositionedGlyphs;
import android.graphics.text.TextRunShaper;

/** Kept separate so API 24-30 never loads classes introduced in API 31. */
final class FontShaping31 {
  static void require(String text, Paint paint, File file) throws Exception {
    PositionedGlyphs glyphs =
        TextRunShaper.shapeTextRun(text, 0, text.length(), 0, text.length(), 0f, 0f, true, paint);
    String expectedPath = file.getCanonicalPath();
    Set<Font> checked = new HashSet<>();
    for (int g = 0; g < glyphs.glyphCount(); g++) {
      if (glyphs.getGlyphId(g) == 0) throw new IllegalStateException("font_fallback_rejected");
      Font font = glyphs.getFont(g);
      // A shaped run repeats the same font for thousands of glyphs. Resolve its
      // file once per run; every glyph still has to be present in that font.
      if (checked.add(font)) {
        File used = font.getFile();
        if (used == null || !used.getCanonicalPath().equals(expectedPath))
          throw new IllegalStateException("font_fallback_rejected");
      }
    }
  }
}
