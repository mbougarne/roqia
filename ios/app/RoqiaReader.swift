import CoreText
import CryptoKit
import Foundation
import React
import UIKit
import ZIPFoundation

private let sourceLimit = 16 * 1024 * 1024
private let wordNamespace = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

private func sourceError(_ code: String) -> NSError {
  NSError(domain: "RoqiaReader", code: 1, userInfo: [NSLocalizedDescriptionKey: code])
}

private func privateFile(_ path: String) throws -> URL {
  let root = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    .appendingPathComponent("roqia").resolvingSymlinksInPath().standardizedFileURL
  let file = URL(fileURLWithPath: path).resolvingSymlinksInPath().standardizedFileURL
  guard file.path.hasPrefix(root.path + "/") else { throw sourceError("invalid_source_path") }
  return file
}

private func verifiedData(_ url: URL, size: Int, hash: String) throws -> Data {
  let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
  guard size > 0, size <= sourceLimit,
    attributes[.type] as? FileAttributeType == .typeRegular,
    (attributes[.size] as? NSNumber)?.intValue == size,
    hash.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil
  else { throw sourceError("invalid_source_file") }
  let data = try Data(contentsOf: url)
  guard SHA256.hash(data: data).map({ String(format: "%02x", $0) }).joined() == hash else {
    throw sourceError("source_hash_mismatch")
  }
  return data
}

private func memberData(_ archive: Archive, name: String, size: Int? = nil) throws -> Data {
  let matches = archive.filter { $0.path == name }
  guard matches.count == 1, let entry = matches.first, entry.type == .file,
    entry.uncompressedSize > 0, entry.uncompressedSize <= sourceLimit,
    size == nil || entry.uncompressedSize == UInt64(size!)
  else { throw sourceError("source_member_mismatch") }
  var result = Data()
  let checksum = try archive.extract(entry) { chunk in
    guard result.count + chunk.count <= Int(entry.uncompressedSize) else {
      throw sourceError("oversized_source_member")
    }
    result.append(chunk)
  }
  guard checksum == entry.checksum, result.count == Int(entry.uncompressedSize) else {
    throw sourceError("source_member_integrity_failed")
  }
  return result
}

private final class OpeningParser: NSObject, XMLParserDelegate {
  var paragraphs: [String] = []
  private var depth = 0
  private var bodyDepth: Int?
  private var paragraphDepth: Int?
  private var textDepth: Int?
  private var paragraph = ""

  func parser(
    _ parser: XMLParser, didStartElement name: String, namespaceURI: String?,
    qualifiedName: String?, attributes: [String: String]
  ) {
    depth += 1
    guard namespaceURI == wordNamespace else { return }
    if name == "body" { bodyDepth = depth }
    if name == "p", let bodyDepth, depth == bodyDepth + 1 {
      paragraphDepth = depth
      paragraph = ""
    }
    if name == "t", paragraphDepth != nil { textDepth = depth }
  }

  func parser(_ parser: XMLParser, foundCharacters string: String) {
    if textDepth != nil { paragraph += string }
  }

  func parser(
    _ parser: XMLParser, didEndElement name: String, namespaceURI: String?,
    qualifiedName: String?
  ) {
    if depth == textDepth { textDepth = nil }
    if depth == paragraphDepth {
      paragraphs.append(paragraph)
      paragraphDepth = nil
    }
    depth -= 1
  }
}

@objc(RoqiaReader)
final class RoqiaReader: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc func keepAwake(_ enabled: Bool) {
    DispatchQueue.main.async {
      UIApplication.shared.isIdleTimerDisabled = enabled
    }
  }

  @objc(extractSource:size:hash:members:resolve:reject:)
  func extractSource(
    _ path: String, size: Int, hash: String, members: [[String: Any]],
    resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock
  ) {
    do {
      let source = try privateFile(path)
      _ = try verifiedData(source, size: size, hash: hash)
      guard !members.isEmpty, members.count <= 8 else { throw sourceError("invalid_members") }
      let archive = try Archive(url: source, accessMode: .read)
      for member in members {
        guard let targetPath = member["path"] as? String,
          let name = member["entry"] as? String,
          let bytes = member["bytes"] as? Int,
          let expected = member["sha256"] as? String,
          bytes > 0, bytes <= sourceLimit
        else { throw sourceError("invalid_member") }
        let target = try privateFile(targetPath)
        guard target.deletingLastPathComponent() == source.deletingLastPathComponent(),
          target != source
        else { throw sourceError("invalid_member_target") }
        let data = try memberData(archive, name: name, size: bytes)
        guard SHA256.hash(data: data).map({ String(format: "%02x", $0) }).joined() == expected
        else { throw sourceError("source_hash_mismatch") }
        try data.write(to: target, options: .atomic)
      }
      resolve(nil)
    } catch { reject("source_extract_failed", error.localizedDescription, error) }
  }

  @objc(sourceOpenings:size:hash:resolve:reject:)
  func sourceOpenings(
    _ path: String, size: Int, hash: String,
    resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock
  ) {
    do {
      let source = try privateFile(path)
      _ = try verifiedData(source, size: size, hash: hash)
      let archive = try Archive(url: source, accessMode: .read)
      let xml = try memberData(archive, name: "word/document.xml")
      guard let text = String(data: xml, encoding: .utf8), !text.contains("\0"),
        !text.contains("<!DOCTYPE"), !text.contains("<!ENTITY")
      else { throw sourceError("xml_declarations_forbidden") }
      let delegate = OpeningParser()
      let parser = XMLParser(data: xml)
      parser.shouldProcessNamespaces = true
      parser.shouldResolveExternalEntities = false
      parser.delegate = delegate
      guard parser.parse() else { throw sourceError("invalid_word_document") }
      var surah = 0
      var openings: [String: String] = [:]
      for (index, paragraph) in delegate.paragraphs.enumerated() where paragraph.hasPrefix("سُورَةُ") {
        surah += 1
        if index + 1 < delegate.paragraphs.count,
          delegate.paragraphs[index + 1].hasPrefix("بِسْمِ")
        {
          openings[String(surah)] = delegate.paragraphs[index + 1]
        }
      }
      guard surah == 114, openings.count == 113, openings["9"] == nil else {
        throw sourceError("chapter_opening_mismatch")
      }
      resolve(openings)
    } catch { reject("source_openings_failed", error.localizedDescription, error) }
  }

  @objc(loadFont:expectedHash:verses:resolve:reject:)
  func loadFont(
    _ path: String, expectedHash: String, verses: [String],
    resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock
  ) {
    do {
      let url = try privateFile(path)
      let size = try FileManager.default.attributesOfItem(atPath: url.path)[.size] as? NSNumber
      _ = try verifiedData(url, size: size?.intValue ?? 0, hash: expectedHash)
      guard !verses.isEmpty, verses.count <= 300,
        verses.allSatisfy({ $0.utf16.count <= 20000 }),
        let provider = CGDataProvider(url: url as CFURL),
        let graphicsFont = CGFont(provider)
      else { throw sourceError("invalid_chapter_font") }
      // Use the file's default face, rather than the first named variable-font instance.
      let font = CTFontCreateWithGraphicsFont(graphicsFont, 32, nil, nil)
      let fontName = CTFontCopyPostScriptName(font) as String
      let registered = CTFontCreateWithName(fontName as CFString, 32, nil)
      if CTFontCopyPostScriptName(registered) as String == fontName {
        // Hafs uses the same font already included in UIAppFonts. Reuse it only
        // when its actual file matches the pinned source, not merely its name.
        guard let registeredURL = CTFontCopyAttribute(registered, kCTFontURLAttribute) as? URL,
          registeredURL.isFileURL
        else { throw sourceError("font_registration_failed") }
        _ = try verifiedData(registeredURL, size: size?.intValue ?? 0, hash: expectedHash)
      } else {
        var registrationError: Unmanaged<CFError>?
        if !CTFontManagerRegisterFontsForURL(url as CFURL, .process, &registrationError) {
          guard let error = registrationError?.takeRetainedValue(),
            CFErrorGetCode(error) == CTFontManagerError.alreadyRegistered.rawValue
          else { throw sourceError("font_registration_failed") }
        }
      }
      for verse in verses {
        let text = NSAttributedString(
          string: verse,
          attributes: [
            NSAttributedString.Key(kCTFontAttributeName as String): font
          ])
        let line = CTLineCreateWithAttributedString(text)
        for run in CTLineGetGlyphRuns(line) as! [CTRun] {
          let attributes = CTRunGetAttributes(run) as NSDictionary
          let runFont = attributes[kCTFontAttributeName] as! CTFont
          guard CTFontCopyPostScriptName(runFont) as String == fontName else {
            throw sourceError("font_fallback_forbidden")
          }
        }
      }
      resolve(fontName)
    } catch { reject("quran_font_unavailable", error.localizedDescription, error) }
  }
}
