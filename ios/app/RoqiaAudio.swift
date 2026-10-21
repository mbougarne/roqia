import AVFoundation
import CryptoKit
import Foundation
import React

@objc(RoqiaAudio)
final class RoqiaAudio: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { false }

  // Called only after the coordinator has verified the complete recording's
  // SHA-256 and exact timing identity. Never use a JS timer to stop a verse.
  @objc(verseAudio:expectedHash:startMs:endMs:resolve:reject:)
  func verseAudio(
    _ path: String, expectedHash: String, startMs: Double, endMs: Double,
    resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      var temporary: URL?
      do {
        let manager = FileManager.default
        let root = manager.urls(for: .documentDirectory, in: .userDomainMask)[0]
          .appendingPathComponent("roqia").resolvingSymlinksInPath().standardizedFileURL
        let source = URL(fileURLWithPath: path).resolvingSymlinksInPath().standardizedFileURL
        guard source.path.hasPrefix(root.path + "/"),
          expectedHash.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil,
          startMs.isFinite, endMs.isFinite, startMs.rounded() == startMs,
          endMs.rounded() == endMs, startMs >= 0, endMs > startMs
        else { throw NSError(domain: "RoqiaAudio", code: 1) }
        let asset = AVURLAsset(url: source)
        let duration = try await asset.load(.duration)
        let durationMs = CMTimeGetSeconds(duration) * 1000
        guard durationMs.isFinite, endMs <= durationMs + 1 else {
          throw NSError(domain: "RoqiaAudio", code: 2)
        }
        let start = CMTime(seconds: startMs / 1000, preferredTimescale: 44100)
        let length = CMTime(
          seconds: (min(endMs, durationMs) - startMs) / 1000,
          preferredTimescale: 44100)
        let directory = manager.urls(for: .cachesDirectory, in: .userDomainMask)[0]
          .appendingPathComponent("RoqiaVerseAudio", isDirectory: true)
        try manager.createDirectory(at: directory, withIntermediateDirectories: true)
        let identity = "\(source.path):\(expectedHash):\(startMs):\(endMs)"
        let key = SHA256.hash(data: Data(identity.utf8)).map { String(format: "%02x", $0) }.joined()
        let target = directory.appendingPathComponent(key + ".m4a")
        if manager.fileExists(atPath: target.path) {
          let cached = try? await AVURLAsset(url: target).load(.duration)
          if let cached, abs(CMTimeGetSeconds(cached) - CMTimeGetSeconds(length)) < 0.1 {
            resolve(target.path)
            return
          }
          try manager.removeItem(at: target)
        }
        let composition = AVMutableComposition()
        try composition.insertTimeRange(
          CMTimeRange(start: start, duration: length), of: asset, at: .zero)
        guard
          let exporter = AVAssetExportSession(
            asset: composition, presetName: AVAssetExportPresetAppleM4A)
        else { throw NSError(domain: "RoqiaAudio", code: 3) }
        let output = directory.appendingPathComponent(UUID().uuidString + ".m4a")
        temporary = output
        exporter.outputURL = output
        exporter.outputFileType = .m4a
        await withCheckedContinuation { continuation in
          exporter.exportAsynchronously { continuation.resume() }
        }
        guard exporter.status == .completed else {
          throw exporter.error ?? NSError(domain: "RoqiaAudio", code: 4)
        }
        let exported = try await AVURLAsset(url: output).load(.duration)
        guard abs(CMTimeGetSeconds(exported) - CMTimeGetSeconds(length)) < 0.1 else {
          throw NSError(domain: "RoqiaAudio", code: 5)
        }
        try manager.moveItem(at: output, to: target)
        resolve(target.path)
      } catch {
        if let temporary { try? FileManager.default.removeItem(at: temporary) }
        reject("verse_audio_unavailable", error.localizedDescription, error)
      }
    }
  }

  @objc(audioDuration:resolve:reject:)
  func audioDuration(
    _ path: String, resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    let root = documents.appendingPathComponent("roqia").resolvingSymlinksInPath()
      .standardizedFileURL
    let url = URL(fileURLWithPath: path).resolvingSymlinksInPath().standardizedFileURL
    guard url.path.hasPrefix(root.path + "/") else {
      reject("audio_duration_unavailable", "invalid_audio_path", nil)
      return
    }
    Task {
      do {
        let duration = try await AVURLAsset(url: url).load(.duration)
        let milliseconds = CMTimeGetSeconds(duration) * 1000
        guard milliseconds.isFinite, milliseconds > 0, milliseconds < Double(Int.max) else {
          reject("audio_duration_unavailable", "invalid_audio_duration", nil)
          return
        }
        resolve(Int(milliseconds.rounded()))
      } catch { reject("audio_duration_unavailable", error.localizedDescription, error) }
    }
  }
}
