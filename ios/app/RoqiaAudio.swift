import AVFoundation
import Foundation
import React

@objc(RoqiaAudio)
final class RoqiaAudio: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { false }

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
