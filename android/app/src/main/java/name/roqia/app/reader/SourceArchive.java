package name.roqia.app.reader;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.zip.*;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.*;

/** Bounded extraction of named, hash-pinned source members. Never unpack arbitrary ZIP paths. */
public final class SourceArchive {
  private static final int LIMIT = 16 * 1024 * 1024;
  private static final String WORD = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  public static void verify(File file, long size, String hash) throws Exception {
    if (!file.isFile() || file.length() != size || size < 1 || size > LIMIT || !hash.matches("[a-f0-9]{64}")) throw new IOException("invalid_source_file");
    MessageDigest digest = MessageDigest.getInstance("SHA-256");
    try (InputStream input = new FileInputStream(file)) {
      byte[] buffer = new byte[16384]; int n;
      while ((n = input.read(buffer)) != -1) digest.update(buffer, 0, n);
    }
    StringBuilder actual = new StringBuilder();
    for (byte b : digest.digest()) actual.append(String.format("%02x", b & 255));
    if (!actual.toString().equals(hash)) throw new IOException("source_hash_mismatch");
  }
  public static void extract(File archive, String entryName, File target, long size, String hash) throws Exception {
    if (size < 1 || size > LIMIT) throw new IOException("invalid_member_size");
    File part = new File(target.getPath() + ".import");
    try (ZipFile zip = new ZipFile(archive)) {
      ZipEntry entry = zip.getEntry(entryName);
      if (entry == null || entry.isDirectory() || entry.getSize() != size) throw new IOException("source_member_mismatch");
      int duplicates = 0;
      for (Enumeration<? extends ZipEntry> entries = zip.entries(); entries.hasMoreElements();) if (entries.nextElement().getName().equals(entryName)) duplicates++;
      if (duplicates != 1) throw new IOException("duplicate_source_member");
      try (InputStream in = zip.getInputStream(entry); FileOutputStream out = new FileOutputStream(part)) {
        byte[] buffer = new byte[16384]; int n; long total = 0;
        while ((n = in.read(buffer)) != -1) { total += n; if (total > size) throw new IOException("oversized_source_member"); out.write(buffer, 0, n); }
        out.getFD().sync();
      }
      verify(part, size, hash);
      if (!part.renameTo(target)) throw new IOException("source_rename_failed");
    } finally { part.delete(); }
  }
  public static Map<Integer, String> openings(File document) throws Exception {
    byte[] xml;
    try (ZipFile zip = new ZipFile(document)) {
      ZipEntry entry = zip.getEntry("word/document.xml");
      if (entry == null || entry.getSize() > LIMIT) throw new IOException("invalid_word_document");
      try (InputStream in = zip.getInputStream(entry); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
        byte[] buffer = new byte[16384]; int n;
        while ((n = in.read(buffer)) != -1) { if (out.size() + n > LIMIT) throw new IOException("oversized_document"); out.write(buffer, 0, n); }
        xml = out.toByteArray();
      }
    }
    // Android's JAXP provider does not implement all desktop setFeature flags.
    // Decode strictly, reject DTD/entity declarations before parsing, and deny external resolution.
    String xmlText = StandardCharsets.UTF_8.newDecoder()
      .onMalformedInput(java.nio.charset.CodingErrorAction.REPORT)
      .onUnmappableCharacter(java.nio.charset.CodingErrorAction.REPORT)
      .decode(java.nio.ByteBuffer.wrap(xml)).toString();
    if (xmlText.indexOf('\0') >= 0 || xmlText.contains("<!DOCTYPE") || xmlText.contains("<!ENTITY")) throw new IOException("xml_declarations_forbidden");
    DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
    factory.setNamespaceAware(true);
    javax.xml.parsers.DocumentBuilder builder = factory.newDocumentBuilder();
    builder.setEntityResolver((publicId, systemId) -> { throw new org.xml.sax.SAXException("external_xml_forbidden"); });
    Document dom = builder.parse(new org.xml.sax.InputSource(new StringReader(xmlText)));
    Node body = dom.getElementsByTagNameNS(WORD, "body").item(0);
    if (body == null) throw new IOException("missing_document_body");
    List<String> paragraphs = new ArrayList<>();
    for (Node node = body.getFirstChild(); node != null; node = node.getNextSibling()) {
      if (!(node instanceof Element) || !WORD.equals(node.getNamespaceURI()) || !"p".equals(node.getLocalName())) continue;
      NodeList runs = ((Element) node).getElementsByTagNameNS(WORD, "t"); StringBuilder text = new StringBuilder();
      for (int i = 0; i < runs.getLength(); i++) text.append(runs.item(i).getTextContent());
      paragraphs.add(text.toString());
    }
    Map<Integer, String> result = new LinkedHashMap<>(); int surah = 0;
    for (int i = 0; i < paragraphs.size(); i++) {
      if (!paragraphs.get(i).startsWith("سُورَةُ")) continue;
      surah++;
      if (i + 1 < paragraphs.size() && paragraphs.get(i + 1).startsWith("بِسْمِ")) result.put(surah, paragraphs.get(i + 1));
    }
    if (surah != 114 || result.size() != 113 || result.containsKey(9)) throw new IOException("chapter_opening_mismatch");
    return result;
  }
}
