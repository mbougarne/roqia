import CoreLocation
import Foundation
import React
import UIKit

@objc(RoqiaPrayer)
final class RoqiaPrayer: RCTEventEmitter, CLLocationManagerDelegate {
  private lazy var manager: CLLocationManager = {
    let manager = CLLocationManager()
    manager.delegate = self
    manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    return manager
  }()
  private var locationResolve: RCTPromiseResolveBlock?
  private var locationReject: RCTPromiseRejectBlock?
  private var timeout: DispatchWorkItem?
  private var observing = false
  private var timeObserver: NSObjectProtocol?

  @objc override static func requiresMainQueueSetup() -> Bool { true }

  override func supportedEvents() -> [String]! { ["RoqiaHeading", "RoqiaPrayerTimeChanged"] }

  override func startObserving() {
    observing = true
    timeObserver = NotificationCenter.default.addObserver(
      forName: UIApplication.significantTimeChangeNotification, object: nil, queue: .main
    ) { [weak self] _ in
      self?.sendEvent(withName: "RoqiaPrayerTimeChanged", body: [:])
    }
  }

  override func stopObserving() {
    observing = false
    if let timeObserver { NotificationCenter.default.removeObserver(timeObserver) }
    timeObserver = nil
  }

  @objc(locate:reject:)
  func locate(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock)
  {
    DispatchQueue.main.async {
      guard self.locationResolve == nil else {
        reject("location_busy", "location_busy", nil)
        return
      }
      self.locationResolve = resolve
      self.locationReject = reject
      self.requestLocation()
    }
  }

  private func requestLocation() {
    switch manager.authorizationStatus {
    case .notDetermined:
      manager.requestWhenInUseAuthorization()
    case .authorizedAlways, .authorizedWhenInUse:
      timeout?.cancel()
      let work = DispatchWorkItem { [weak self] in self?.failLocation("location_timeout") }
      timeout = work
      DispatchQueue.main.asyncAfter(deadline: .now() + 20, execute: work)
      manager.requestLocation()
    default:
      failLocation("location_denied")
    }
  }

  private func failLocation(_ code: String) {
    timeout?.cancel()
    timeout = nil
    let reject = locationReject
    locationResolve = nil
    locationReject = nil
    reject?(code, code, nil)
  }

  @objc func cancelLocation() {
    DispatchQueue.main.async {
      self.manager.stopUpdatingLocation()
      self.failLocation("location_cancelled")
    }
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    if locationResolve != nil { requestLocation() }
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let resolve = locationResolve,
      let fix = locations.last,
      fix.horizontalAccuracy >= 0, fix.horizontalAccuracy <= 10000,
      abs(fix.timestamp.timeIntervalSinceNow) <= 120
    else { return }
    timeout?.cancel()
    timeout = nil
    locationResolve = nil
    locationReject = nil
    resolve([
      "latitude": fix.coordinate.latitude, "longitude": fix.coordinate.longitude,
      "accuracy": fix.horizontalAccuracy, "acquiredAt": fix.timestamp.timeIntervalSince1970 * 1000,
    ])
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    if locationResolve != nil { failLocation("location_unavailable") }
  }

  @objc(startHeading:longitude:resolve:reject:)
  func startHeading(
    _ latitude: Double, longitude: Double,
    resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      guard CLLocationManager.headingAvailable(),
        [.authorizedAlways, .authorizedWhenInUse].contains(self.manager.authorizationStatus)
      else {
        resolve(false)
        return
      }
      self.manager.headingFilter = 1
      self.manager.headingOrientation = .portrait
      self.manager.startUpdatingLocation()
      self.manager.startUpdatingHeading()
      resolve(true)
    }
  }

  @objc func stopHeading() {
    DispatchQueue.main.async {
      self.manager.stopUpdatingHeading()
      if self.locationResolve == nil { self.manager.stopUpdatingLocation() }
    }
  }

  func locationManager(_ manager: CLLocationManager, didUpdateHeading heading: CLHeading) {
    guard observing, heading.headingAccuracy >= 0, heading.trueHeading >= 0 else { return }
    sendEvent(
      withName: "RoqiaHeading",
      body: [
        "heading": heading.trueHeading, "accuracy": heading.headingAccuracy,
        "at": heading.timestamp.timeIntervalSince1970 * 1000,
      ])
  }

  func locationManagerShouldDisplayHeadingCalibration(_ manager: CLLocationManager) -> Bool { true }

  deinit {
    timeout?.cancel()
    if let timeObserver { NotificationCenter.default.removeObserver(timeObserver) }
  }
}
