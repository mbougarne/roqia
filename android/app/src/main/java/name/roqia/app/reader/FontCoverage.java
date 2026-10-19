package name.roqia.app.reader;

import java.io.*;
import java.nio.*;

/** Read only the verified source font's Unicode cmap. Never consult system fallback. */
public final class FontCoverage {
  private final ByteBuffer data;
  private final int cmap, limit, format, glyphs;

  public FontCoverage(File file) throws IOException {
    if (file.length() < 12 || file.length() > 16 * 1024 * 1024)
      throw new IOException("invalid_font_size");
    byte[] bytes = new byte[(int) file.length()];
    try (RandomAccessFile in = new RandomAccessFile(file, "r")) {
      in.readFully(bytes);
    }
    data = ByteBuffer.wrap(bytes).order(ByteOrder.BIG_ENDIAN);
    int count = u16(4), table = -1, tableEnd = -1, maxp = -1;
    check(12, count * 16);
    for (int i = 0; i < count; i++) {
      int p = 12 + 16 * i, tag = data.getInt(p), offset = u32(p + 8), length = u32(p + 12);
      check(offset, length);
      if (tag == 0x636d6170) {
        table = offset;
        tableEnd = offset + length;
      }
      if (tag == 0x6d617870) {
        if (length < 6) throw new IOException("invalid_maxp");
        maxp = offset;
      }
    }
    if (table < 0 || maxp < 0) throw new IOException("missing_font_tables");
    glyphs = u16(maxp + 4);
    int selected = -1, selectedEnd = -1, selectedFormat = 0;
    int records = u16(table + 2);
    if (table + 4L + records * 8L > tableEnd) throw new IOException("invalid_cmap_records");
    for (int i = 0; i < records; i++) {
      int p = table + 4 + i * 8, platform = u16(p), encoding = u16(p + 2);
      if (!(platform == 0 || platform == 3 && (encoding == 1 || encoding == 10))) continue;
      long position = (long) table + u32(p + 4);
      if (position + 4 > tableEnd) throw new IOException("invalid_cmap_offset");
      int start = (int) position, f = u16(start);
      if (f != 4 && f != 12) continue;
      int length = f == 4 ? u16(start + 2) : u32(start + 4);
      if (length < 16 || (long) start + length > tableEnd)
        throw new IOException("invalid_cmap_length");
      if (f > selectedFormat) {
        selected = start;
        selectedEnd = start + length;
        selectedFormat = f;
      }
    }
    if (selected < 0) throw new IOException("unsupported_cmap");
    cmap = selected;
    limit = selectedEnd;
    format = selectedFormat;
    if (format == 4) {
      int segments = u16(cmap + 6) / 2;
      if (segments < 1 || (u16(cmap + 6) & 1) != 0 || cmap + 16L + segments * 8L > limit)
        throw new IOException("invalid_cmap_segments");
    } else {
      int groups = u32(cmap + 12);
      if (cmap + 16L + groups * 12L > limit) throw new IOException("invalid_cmap_groups");
    }
  }

  private void check(int at, int size) throws IOException {
    if (at < 0 || size < 0 || (long) at + size > data.capacity())
      throw new IOException("invalid_font_bounds");
  }

  private int u16(int at) throws IOException {
    check(at, 2);
    return data.getShort(at) & 65535;
  }

  private int u32(int at) throws IOException {
    check(at, 4);
    long n = data.getInt(at) & 0xffffffffL;
    if (n > Integer.MAX_VALUE) throw new IOException("invalid_font_offset");
    return (int) n;
  }

  public boolean has(int cp) throws IOException {
    int glyph = 0;
    if (format == 12) {
      int n = u32(cmap + 12);
      for (int i = 0; i < n; i++) {
        int p = cmap + 16 + i * 12, start = u32(p), end = u32(p + 4);
        if (cp >= start && cp <= end) {
          long g = (long) u32(p + 8) + cp - start;
          return g > 0 && g < glyphs;
        }
      }
      return false;
    }
    if (cp > 65535) return false;
    int n = u16(cmap + 6) / 2,
        ends = cmap + 14,
        starts = ends + 2 * n + 2,
        deltas = starts + 2 * n,
        ranges = deltas + 2 * n;
    for (int i = 0; i < n; i++) {
      int end = u16(ends + i * 2), start = u16(starts + i * 2);
      if (cp < start || cp > end) continue;
      int delta = u16(deltas + i * 2), range = u16(ranges + i * 2);
      if (range == 0) glyph = (cp + delta) & 65535;
      else {
        long address = (long) ranges + i * 2 + range + (cp - start) * 2;
        if (address + 2 > limit) throw new IOException("invalid_glyph_address");
        glyph = u16((int) address);
        if (glyph != 0) glyph = (glyph + delta) & 65535;
      }
      return glyph > 0 && glyph < glyphs;
    }
    return false;
  }

  public void require(String text) throws IOException {
    for (int i = 0; i < text.length(); ) {
      int cp = text.codePointAt(i);
      i += Character.charCount(cp);
      // These are shaping controls, not rendered glyphs. No source text is changed.
      if (cp == 0x200c || cp == 0x200d) continue;
      if (!has(cp))
        throw new IOException("source_font_missing_codepoint_" + Integer.toHexString(cp));
    }
  }
}
