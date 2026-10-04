// Prints the text Apple's Vision framework reads in each image, one line per image:
//   <file>\t<word count>\t<recognised text>
// Usage: swift scripts/ocrWords.swift <image> [<image> ...]
import Foundation
import Vision
import AppKit

func recognisedText(at path: String) -> String {
    guard let image = NSImage(contentsOfFile: path),
          let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return "" }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = false
    request.minimumTextHeight = 0.008
    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    try? handler.perform([request])
    let lines = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
    return lines.joined(separator: " | ")
}

for path in CommandLine.arguments.dropFirst() {
    let text = recognisedText(at: path)
    let words = text.replacingOccurrences(of: "|", with: " ").split(whereSeparator: { $0.isWhitespace }).filter { token in
        token.contains(where: { $0.isLetter || $0.isNumber })
    }
    print("\(path)\t\(words.count)\t\(text)")
}
