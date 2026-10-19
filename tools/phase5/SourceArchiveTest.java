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
      System.out.println("7 source archive safety checks passed");
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
