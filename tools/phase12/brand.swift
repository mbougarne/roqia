import CoreGraphics
import CoreText
import Foundation

let fontURL = URL(fileURLWithPath: CommandLine.arguments[1])
let descriptor =
  (CTFontManagerCreateFontDescriptorsFromURL(fontURL as CFURL)! as! [CTFontDescriptor])[0]
func shape(_ text: String, size: CGFloat, baseline: CGFloat, center: CGFloat) -> String {
  let font = CTFontCreateWithFontDescriptor(descriptor, size, nil)
  let line = CTLineCreateWithAttributedString(
    NSAttributedString(
      string: text, attributes: [NSAttributedString.Key(kCTFontAttributeName as String): font]))
  let width = CTLineGetTypographicBounds(line, nil, nil, nil)
  var commands = ""
  for run in CTLineGetGlyphRuns(line) as! [CTRun] {
    let count = CTRunGetGlyphCount(run)
    var glyphs = [CGGlyph](repeating: 0, count: count)
    var positions = [CGPoint](repeating: .zero, count: count)
    CTRunGetGlyphs(run, CFRange(location: 0, length: 0), &glyphs)
    CTRunGetPositions(run, CFRange(location: 0, length: 0), &positions)
    let runFont = (CTRunGetAttributes(run) as NSDictionary)[kCTFontAttributeName] as! CTFont
    for i in 0..<count {
      guard let path = CTFontCreatePathForGlyph(runFont, glyphs[i], nil) else { continue }
      let px = CGFloat(center - width / 2) + positions[i].x
      func point(_ p: CGPoint) -> String {
        String(format: "%.3f,%.3f", Double(px + p.x), Double(baseline - p.y - positions[i].y))
      }
      path.applyWithBlock { e in
        let el = e.pointee
        switch el.type {
        case .moveToPoint: commands += "M" + point(el.points[0])
        case .addLineToPoint: commands += "L" + point(el.points[0])
        case .addQuadCurveToPoint: commands += "Q" + point(el.points[0]) + " " + point(el.points[1])
        case .addCurveToPoint:
          commands +=
            "C" + point(el.points[0]) + " " + point(el.points[1]) + " " + point(el.points[2])
        case .closeSubpath: commands += "Z"
        @unknown default: break
        }
      }
    }
  }
  return commands
}
print(
  "<vector xmlns:android=\"http://schemas.android.com/apk/res/android\" android:width=\"288dp\" android:height=\"288dp\" android:viewportWidth=\"288\" android:viewportHeight=\"288\">"
)
for i in 0..<8 {
  print(
    "<group android:rotation=\"\(i*45)\" android:pivotX=\"144\" android:pivotY=\"85\"><path android:pathData=\"M144,52 L154,64 L149,78 L139,78 L134,64 Z\" android:fillColor=\"@android:color/transparent\" android:strokeColor=\"@color/roqia_launch_accent\" android:strokeWidth=\"1.6\"/></group>"
  )
}
print(
  "<path android:pathData=\"\(shape("الرقية",size: 42,baseline: 165,center: 144))\" android:fillColor=\"@color/roqia_launch_text\"/>"
)
print(
  "<path android:pathData=\"\(shape("R O Q I A",size: 12,baseline: 190,center: 144))\" android:fillColor=\"@color/roqia_launch_accent\"/>"
)
print("</vector>")
