package name.roqia.app.feasibility;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.security.MessageDigest;
import java.util.TreeSet;

import android.content.Context;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.graphics.text.PositionedGlyphs;
import android.graphics.text.TextRunShaper;
import android.os.Build;

import com.facebook.react.common.assets.ReactFontManager;
import org.json.JSONArray;
import org.json.JSONObject;

/** Local, opt-in font comparison; no downloaded resources are bundled in the APK. */
final class FontProbe {
  private static byte[] read(File file) throws Exception {
    try (FileInputStream in = new FileInputStream(file);
        ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      byte[] buffer = new byte[16384];
      int count;
      while ((count = in.read(buffer)) != -1) out.write(buffer, 0, count);
      return out.toByteArray();
    }
  }

  private static String sha(byte[] bytes) throws Exception {
    StringBuilder out = new StringBuilder();
    for (byte b : MessageDigest.getInstance("SHA-256").digest(bytes))
      out.append(String.format("%02x", b & 255));
    return out.toString();
  }

  static JSONObject prepare(Context context) throws Exception {
    if (Build.VERSION.SDK_INT < 31)
      throw new IllegalStateException(
          "Glyph-font inspection requires Android API 31+; test older devices visually separately");
    File dir = new File(context.getFilesDir(), "feasibility/warsh-fonts");
    byte[] payload = read(new File(dir, "font-probe.json"));
    JSONObject input = new JSONObject(new String(payload, java.nio.charset.StandardCharsets.UTF_8));
    JSONArray fonts = input.getJSONArray("fonts"),
        verses = input.getJSONArray("verses"),
        reports = new JSONArray();
    for (int f = 0; f < fonts.length(); f++) {
      JSONObject info = fonts.getJSONObject(f);
      String name = info.getString("file");
      if (!name.equals("warsh.ttf") && !name.equals("maghribi.otf"))
        throw new IllegalArgumentException("Unexpected font filename");
      File file = new File(dir, name);
      String hash = sha(read(file));
      if (!hash.equals(info.getString("sha256")))
        throw new IllegalStateException("Font checksum mismatch");
      Typeface face = Typeface.createFromFile(file);
      ReactFontManager.getInstance().addCustomFont(info.getString("family"), face);
      Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
      paint.setTypeface(face);
      paint.setTextSize(28);
      int fallbackGlyphs = 0, zeroGlyphs = 0, affected = 0;
      TreeSet<String> fallbackFiles = new TreeSet<>();
      JSONArray examples = new JSONArray();
      for (int v = 0; v < verses.length(); v++) {
        JSONObject verse = verses.getJSONObject(v);
        String text = verse.getString("text");
        PositionedGlyphs glyphs =
            TextRunShaper.shapeTextRun(
                text, 0, text.length(), 0, text.length(), 0f, 0f, true, paint);
        boolean fallback = false;
        for (int g = 0; g < glyphs.glyphCount(); g++) {
          if (glyphs.getGlyphId(g) == 0) zeroGlyphs++;
          File used = glyphs.getFont(g).getFile();
          if (used == null || !used.getCanonicalPath().equals(file.getCanonicalPath())) {
            fallbackGlyphs++;
            fallback = true;
            fallbackFiles.add(used == null ? "unknown font file" : used.getName());
          }
        }
        if (fallback) {
          affected++;
          if (examples.length() < 8) examples.put(verse.getString("ref"));
        }
      }
      reports.put(
          new JSONObject()
              .put("family", info.getString("family"))
              .put("fontSha256", hash)
              .put("versesShaped", verses.length())
              .put("fallbackGlyphs", fallbackGlyphs)
              .put("zeroGlyphs", zeroGlyphs)
              .put("versesWithFallback", affected)
              .put("fallbackExamples", examples)
              .put("fallbackFontFiles", new JSONArray(fallbackFiles)));
    }
    JSONObject report =
        new JSONObject()
            .put("editionId", input.getString("editionId"))
            .put("payloadSha256", sha(payload))
            .put("sourceSha256", input.getString("sourceSha256"))
            .put("api", Build.VERSION.SDK_INT)
            .put("device", Build.MODEL)
            .put("fontScale", context.getResources().getConfiguration().fontScale)
            .put("fonts", reports)
            .put("qualifiedReview", "pending");
    ProbeLog.write(context, "warsh-font-shaping", report);
    return new JSONObject().put("report", report).put("samples", input.getJSONArray("samples"));
  }
}
