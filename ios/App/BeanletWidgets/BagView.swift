import SwiftUI

// The shelf's paper pouch (components/bag-paper.tsx), drawn in its 160 × 200 viewBox.
private struct PouchPath: Shape {
    enum Part { case outline, side, folds, creases, liquid(Double) }
    let part: Part

    func path(in rect: CGRect) -> Path {
        let sx = rect.width / 160, sy = rect.height / 200
        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: rect.minX + x * sx, y: rect.minY + y * sy) }
        var path = Path()
        switch part {
        case .outline:
            path.move(to: p(38, 24))
            path.addQuadCurve(to: p(35, 40), control: p(32, 20))
            path.addQuadCurve(to: p(13, 168), control: p(13, 96))
            path.addQuadCurve(to: p(50, 198), control: p(13, 188))
            path.addQuadCurve(to: p(144, 184), control: p(93, 198))
            path.addQuadCurve(to: p(149, 154), control: p(152, 180))
            path.addQuadCurve(to: p(126, 36), control: p(146, 80))
            path.addQuadCurve(to: p(115, 14), control: p(131, 16))
            path.closeSubpath()
        case .side:
            path.move(to: p(35, 40))
            path.addQuadCurve(to: p(13, 168), control: p(13, 100))
            path.addQuadCurve(to: p(50, 197), control: p(13, 184))
            path.addQuadCurve(to: p(38, 84), control: p(39, 154))
            path.closeSubpath()
        case .folds:
            path.move(to: p(38, 36)); path.addLine(to: p(123, 24))
            path.move(to: p(40, 40)); path.addQuadCurve(to: p(49, 194), control: p(42, 120))
        case .creases:
            path.move(to: p(24, 150)); path.addQuadCurve(to: p(30, 180), control: p(20, 173))
            path.move(to: p(24, 184)); path.addLine(to: p(31, 190))
            path.move(to: p(134, 44)); path.addQuadCurve(to: p(143, 60), control: p(141, 50))
        case .liquid(let ratio):
            let y = 14 + (1 - ratio) * 184
            path.move(to: p(-40, y + 18)); path.addLine(to: p(200, y - 18))
            path.addLine(to: p(200, 250)); path.addLine(to: p(-40, 250))
            path.closeSubpath()
        }
        return path
    }
}

/// Slightly crooked paper label, like `.label-shape-0` in the app.
private struct LabelShape: Shape {
    func path(in rect: CGRect) -> Path {
        let points: [(CGFloat, CGFloat)] = [(4, 10), (8, 7), (49, 6), (88, 2), (92, 6), (96, 48), (98, 86), (95, 91), (53, 96), (15, 98), (11, 94), (8, 50)]
        var path = Path()
        path.addLines(points.map { CGPoint(x: rect.minX + rect.width * $0.0 / 100, y: rect.minY + rect.height * $0.1 / 100) })
        path.closeSubpath()
        return path
    }
}

struct BagView: View {
    let coffee: WidgetCoffee

    var body: some View {
        if coffee.cutout == true, let image = WidgetStore.thumbnail(coffee.thumb) {
            RealBag(image: image, ratio: coffee.ratio.map { min(1, max(0, $0)) } ?? 1)
                .aspectRatio(160 / 200, contentMode: .fit)
        } else {
            pouch
        }
    }

    @ViewBuilder private var pouch: some View {
        let fill = Color(hex: coffee.fill), line = Color(hex: coffee.line), side = Color(hex: coffee.side)
        let ratio = coffee.ratio.map { min(1, max(0, $0)) }
        let partial = ratio.map { $0 > 0 && $0 < 1 } ?? false
        GeometryReader { geo in
            let w = geo.size.width, h = geo.size.height
            ZStack(alignment: .topLeading) {
                PouchPath(part: .outline).fill(fill.opacity(ratio == nil || ratio == 1 ? 1 : 0.12))
                if partial, let ratio {
                    PouchPath(part: .liquid(ratio)).fill(fill).clipShape(PouchPath(part: .outline))
                }
                PouchPath(part: .side).fill(side.opacity(ratio == nil || ratio == 1 ? 0.7 : 0.14))
                PouchPath(part: .outline).stroke(line, style: StrokeStyle(lineWidth: max(1, w / 80), lineJoin: .round))
                PouchPath(part: .folds).stroke(line.opacity(0.75), style: StrokeStyle(lineWidth: max(0.8, w / 120), lineCap: .round))
                PouchPath(part: .creases).stroke(line.opacity(0.6), style: StrokeStyle(lineWidth: max(0.8, w / 120), lineCap: .round))
                RoundedRectangle(cornerRadius: w * 3 / 160)
                    .fill(Ink.cream)
                    .overlay(RoundedRectangle(cornerRadius: w * 3 / 160).stroke(line, lineWidth: max(0.8, w / 120)))
                    .frame(width: w * 19 / 160, height: h * 36 / 200)
                    .offset(x: w * 75 / 160, y: h * 9 / 200)
                label
                    .padding(w * 0.02)
                    .frame(width: w * 0.52, height: h * 0.46)
                    .background(Ink.cream)
                    .clipShape(LabelShape())
                    .rotationEffect(.degrees(-1.15))
                    .offset(x: w * 0.31, y: h * 0.33)
            }
        }
        .aspectRatio(160 / 200, contentMode: .fit)
    }

    @ViewBuilder private var label: some View {
        if let image = WidgetStore.thumbnail(coffee.thumb) {
            Image(uiImage: image).resizable().scaledToFill()
                .frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, maxHeight: .infinity)
                .clipped()
        } else {
            StickerImage(icon: coffee.icon).padding(1)
        }
    }
}

/// A photographed, cut-out bag shown whole, standing on the shelf's floor. As in the app, what's been drunk fades to grey
/// from the top: a faint grey copy underneath, the full-colour bag above it clipped to what's left.
private struct RealBag: View {
    let image: UIImage
    let ratio: Double

    var body: some View {
        let bag = Image(uiImage: image).resizable()
        ZStack {
            bag.saturation(0).opacity(ratio < 1 ? 0.3 : 0)
            bag.mask(GeometryReader { g in
                Rectangle().frame(height: g.size.height * ratio).frame(maxHeight: .infinity, alignment: .bottom)
            })
        }
        .aspectRatio(image.size.width / max(1, image.size.height), contentMode: .fit)
        .shadow(color: .black.opacity(0.12), radius: 1.5, y: 1)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
    }
}

/// Bundled copies of the app's hand-drawn stickers.
struct StickerImage: View {
    let icon: String
    static let known: Set<String> = ["bag", "cup", "dripper", "flower", "berry", "blueberry", "citrus", "peach", "grape", "jasmine", "honey", "chocolate", "hazelnut", "tea", "brownie"]

    var body: some View {
        Image("sticker-" + (Self.known.contains(icon) ? icon : "bag"))
            .resizable()
            .scaledToFit()
    }
}
