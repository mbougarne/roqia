import java.io.*;
import java.nio.file.*;
import java.security.*;
import java.util.*;
import java.util.zip.*;

import name.roqia.app.reader.SourceArchive;

public class SourceArchiveTest {
  static String hash(byte[] b) throws Exception {
    StringBuilder s = new StringBuilder();
    for (byte x : MessageDigest.getInstance("SHA-256").digest(b))
      s.append(String.format("%02x", x & 255));
    return s.toString();
  }

  interface Action {
    void run() throws Exception;
  }

  static void rejects(Action a) throws Exception {
    boolean failed = false;
    try {
      a.run();
    } catch (Exception e) {
      failed = true;
    }
    if (!failed) throw new AssertionError("Expected rejection");
  }

  public static void main(String[] args) throws Exception {
    Path dir = Files.createTempDirectory("roqia-source-test");
    try {
      byte[] text = "synthetic-only".getBytes("UTF-8");
      File zip = dir.resolve("source.zip").toFile(), target = dir.resolve("output").toFile();
      try (ZipOutputStream out = new ZipOutputStream(new FileOutputStream(zip))) {
        out.putNextEntry(new ZipEntry("source.txt"));
        out.write(text);
        out.closeEntry();
      }
      SourceArchive.verify(zip, zip.length(), hash(Files.readAllBytes(zip.toPath())));
      SourceArchive.extract(zip, "source.txt", target, text.length, hash(text));
      if (!Arrays.equals(text, Files.readAllBytes(target.toPath()))) throw new AssertionError();
      byte[] original = Files.readAllBytes(target.toPath());
      rejects(() -> SourceArchive.extract(zip, "source.txt", target, text.length, "0".repeat(64)));
      if (!Arrays.equals(original, Files.readAllBytes(target.toPath()))
          || new File(target + ".import").exists())
        throw new AssertionError("Failure damaged previous output");
      rejects(() -> SourceArchive.extract(zip, "missing", target, text.length, hash(text)));
      rejects(() -> SourceArchive.extract(zip, "source.txt", target, text.length - 1, hash(text)));
      rejects(() -> SourceArchive.extract(zip, "source.txt", target, 20 * 1024 * 1024, hash(text)));
      rejects(() -> SourceArchive.verify(zip, zip.length(), "0".repeat(64)));
      File document = dir.resolve("document.docx").toFile();
      try (ZipOutputStream out = new ZipOutputStream(new FileOutputStream(document))) {
        out.putNextEntry(new ZipEntry("word/document.xml"));
        out.write(
            "<!DOCTYPE x [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]><x>&xxe;</x>"
                .getBytes("UTF-8"));
        out.closeEntry();
      }
      rejects(() -> SourceArchive.openings(document));
      for (String opening : List.of("بِسْمِ", "بِسۡمِ", "بِّسۡمِ")) {
        StringBuilder xml =
            new StringBuilder(
                "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body>");
        for (int surah = 1; surah <= 114; surah++) {
          xml.append("<w:p><w:r><w:t>سُورَةُ TEST ONLY</w:t></w:r></w:p>");
          if (surah != 9)
            xml.append("<w:p><w:r><w:t>").append(opening).append(" TEST ONLY</w:t></w:r></w:p>");
        }
        xml.append("</w:body></w:document>");
        try (ZipOutputStream out = new ZipOutputStream(new FileOutputStream(document))) {
          out.putNextEntry(new ZipEntry("word/document.xml"));
          out.write(xml.toString().getBytes("UTF-8"));
          out.closeEntry();
        }
        Map<Integer, String> openings = SourceArchive.openings(document);
        if (openings.size() != 113
            || openings.containsKey(9)
            || !openings.get(95).equals(opening + " TEST ONLY"))
          throw new AssertionError("Source opening changed");
      }
      // Optional original documents support a local source check without an Android device.
      for (String originalDocument : args) {
        Map<Integer, String> openings = SourceArchive.openings(new File(originalDocument));
        if (openings.size() != 113 || openings.containsKey(9))
          throw new AssertionError("Original opening coverage");
      }
      System.out.println(
          "Source archive safety and all three opening forms passed; original documents: "
              + args.length);
    } finally {
      try (var paths = Files.walk(dir)) {
        paths
            .sorted(Comparator.reverseOrder())
            .forEach(
                p -> {
                  try {
                    Files.delete(p);
                  } catch (Exception e) {
                    throw new RuntimeException(e);
                  }
                });
      }
    }
  }
}
