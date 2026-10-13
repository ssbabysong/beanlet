import SwiftUI
import WidgetKit

@main
struct BeanletWidgetBundle: WidgetBundle {
    var body: some Widget {
        ShelfWidget()
        MonthWidget()
        YearWidget()
        BrewWidget()
    }
}

private func beanletWidget<Content: View>(kind: String, name: LocalizedStringKey, description: LocalizedStringKey, families: [WidgetFamily], @ViewBuilder content: @escaping (BeanletEntry) -> Content) -> some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: BeanletProvider()) { entry in
        content(entry).containerBackground(for: .widget) { PaperBackground() }
    }
    .configurationDisplayName(name)
    .description(description)
    .supportedFamilies(families)
}

// MARK: - 豆仓 (medium)

struct ShelfWidget: Widget {
    var body: some WidgetConfiguration {
        beanletWidget(kind: "BeanletShelf", name: "widget.shelf.name", description: "widget.shelf.description", families: [.systemMedium, .systemLarge]) { ShelfView(entry: $0) }
    }
}

struct ShelfView: View {
    let entry: BeanletEntry

    var body: some View {
        let copy = Copy(entry.snapshot)
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text(copy.shelf).font(.hand(16, copy)).foregroundStyle(Ink.title)
                Spacer()
                if let snapshot = entry.snapshot, snapshot.shelfCount > 0 {
                    Text(copy.bags(snapshot.shelfCount)).font(.hand(12, copy)).foregroundStyle(Ink.muted)
                }
            }
            if let snapshot = entry.snapshot, !snapshot.shelf.isEmpty {
                ShelfGrid(shelf: snapshot.shelf, copy: copy)
            } else {
                EmptyNote(icon: "bag", title: entry.snapshot == nil ? copy.openApp : copy.emptyShelf, detail: entry.snapshot == nil ? nil : copy.addBag, copy: copy)
            }
        }
        .widgetURL(.shelf)
    }
}

/// Lays every bag on the shelf out at once, picking the column count that keeps the bags largest.
private struct ShelfGrid: View {
    let shelf: [WidgetCoffee]
    let copy: Copy

    var body: some View {
        GeometryReader { geo in
            let layout = Self.layout(count: shelf.count, in: geo.size)
            VStack(alignment: .leading, spacing: layout.gap) {
                ForEach(0..<layout.rows, id: \.self) { row in
                    HStack(alignment: .bottom, spacing: layout.gap) {
                        ForEach(0..<layout.columns, id: \.self) { column in
                            let index = row * layout.columns + column
                            if index < shelf.count {
                                Link(destination: .bean(shelf[index].id)) {
                                    ShelfBag(coffee: shelf[index], copy: copy, bagHeight: layout.bagHeight, showName: layout.showName, showAmount: layout.showAmount)
                                }
                                .frame(width: layout.cellWidth)
                            } else {
                                Color.clear.frame(width: layout.cellWidth, height: 1)
                            }
                        }
                    }
                }
            }
            .frame(width: geo.size.width, height: geo.size.height, alignment: layout.rows == 1 ? .leading : .topLeading)
        }
    }

    struct Layout { var columns: Int; var rows: Int; var cellWidth: CGFloat; var bagHeight: CGFloat; var gap: CGFloat; var showName: Bool; var showAmount: Bool }

    static func layout(count: Int, in size: CGSize) -> Layout {
        var options: [(layout: Layout, score: CGFloat)] = []
        for columns in 1...max(1, min(count, 12)) {
            let rows = Int(ceil(Double(count) / Double(columns)))
            let gap: CGFloat = columns > 6 ? 4 : columns > 4 ? 6 : 10
            let cellWidth = (size.width - gap * CGFloat(columns - 1)) / CGFloat(columns)
            let cellHeight = (size.height - gap * CGFloat(rows - 1)) / CGFloat(rows)
            // Labels need room; drop the grams, then the name, as bags get small.
            for (showName, showAmount, text) in [(true, true, CGFloat(28)), (true, false, 15), (false, false, 0)] {
                let bagHeight = min(cellHeight - text, cellWidth * 1.25, 74)
                guard bagHeight >= (showAmount ? 48 : showName ? 36 : 1) else { continue }
                let layout = Layout(columns: columns, rows: rows, cellWidth: cellWidth, bagHeight: bagHeight, gap: gap, showName: showName, showAmount: showAmount)
                options.append((layout, bagHeight * (showName ? 1.15 : 1) * (showAmount ? 1.08 : 1)))
                break
            }
        }
        // Labels are worth a little bag size. Among near-equal sizes, fill the grid evenly, then spread wider.
        let top = options.map(\.score).max() ?? 0
        let waste = { (l: Layout) in l.columns * l.rows - count }
        return options.filter { $0.score >= top * 0.94 }.min {
            waste($0.layout) != waste($1.layout) ? waste($0.layout) < waste($1.layout)
                : $0.layout.columns != $1.layout.columns ? $0.layout.columns > $1.layout.columns
                : $0.score > $1.score
        }?.layout ?? Layout(columns: count, rows: 1, cellWidth: size.width / CGFloat(max(count, 1)), bagHeight: 20, gap: 4, showName: false, showAmount: false)
    }
}

private struct ShelfBag: View {
    let coffee: WidgetCoffee
    let copy: Copy
    var bagHeight: CGFloat = 70
    var showName = true
    var showAmount = true

    var body: some View {
        VStack(spacing: 2) {
            BagView(coffee: coffee).frame(height: bagHeight)
            if showName {
                Text(coffee.name).font(.hand(bagHeight < 55 ? 10 : 11.5, copy)).foregroundStyle(Ink.body).lineLimit(1).minimumScaleFactor(0.75)
            }
            if showAmount {
                Group {
                    if let remaining = coffee.remaining {
                        Text("\(Int(remaining.rounded()))") .font(.number(10.5)) + Text(" g").font(.number(8.5, weight: .medium))
                    } else {
                        Text(coffee.roaster.isEmpty ? " " : coffee.roaster).font(.hand(9.5, copy))
                    }
                }
                .foregroundStyle(Ink.muted)
                .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - 月历 (medium)

struct MonthWidget: Widget {
    var body: some WidgetConfiguration {
        beanletWidget(kind: "BeanletMonth", name: "widget.month.name", description: "widget.month.description", families: [.systemMedium]) { MonthView(entry: $0) }
    }
}

struct MonthView: View {
    let entry: BeanletEntry

    var body: some View {
        let copy = Copy(entry.snapshot), calendar = Calendar.current
        let year = calendar.component(.year, from: entry.date), month = calendar.component(.month, from: entry.date)
        let totals = entry.snapshot?.totals(year: year, month: month) ?? (cups: 0, activeDays: 0)
        HStack(alignment: .top, spacing: 14) {
            VStack(alignment: .leading, spacing: 0) {
                Text(copy.monthTitle(entry.date)).font(.hand(17, copy)).foregroundStyle(Ink.title)
                Spacer(minLength: 4)
                HStack(alignment: .firstTextBaseline, spacing: 3) {
                    Text("\(totals.cups)").font(.number(36, weight: .bold)).foregroundStyle(Ink.accent)
                    Text(copy.cups).font(.hand(13, copy)).foregroundStyle(Ink.muted)
                }
                Text(copy.coffeeDays(totals.activeDays)).font(.hand(11.5, copy)).foregroundStyle(Ink.muted)
                Spacer(minLength: 6)
                StickerImage(icon: "cup").frame(width: 40, height: 40).rotationEffect(.degrees(-8))
            }
            .frame(width: 92, alignment: .leading)
            MonthGrid(date: entry.date, snapshot: entry.snapshot, copy: copy)
        }
        .widgetURL(.calendar)
    }
}

private struct MonthGrid: View {
    let date: Date
    let snapshot: WidgetSnapshot?
    let copy: Copy

    var body: some View {
        let calendar = Calendar.current
        let first = calendar.date(from: calendar.dateComponents([.year, .month], from: date)) ?? date
        let count = calendar.range(of: .day, in: .month, for: first)?.count ?? 30
        let lead = (calendar.component(.weekday, from: first) + 5) % 7 // Monday first, like the app.
        let cells: [Int?] = Array(repeating: nil, count: lead) + (1...count).map { Optional($0) }
        let rows = stride(from: 0, to: cells.count, by: 7).map { Array(cells[$0..<min($0 + 7, cells.count)]) + Array(repeating: nil, count: max(0, $0 + 7 - cells.count)) }
        let today = calendar.component(.day, from: date)
        VStack(spacing: 2) {
            HStack(spacing: 2) {
                ForEach(0..<7, id: \.self) { i in
                    Text(copy.weekdays[i]).font(.hand(9, copy)).foregroundStyle(Ink.muted).frame(maxWidth: .infinity)
                }
            }
            ForEach(rows.indices, id: \.self) { r in
                HStack(spacing: 2) {
                    ForEach(0..<7, id: \.self) { c in
                        if let day = rows[r][c], let dayDate = calendar.date(byAdding: .day, value: day - 1, to: first) {
                            DayDot(day: day, colors: snapshot?.colors(on: dayDate) ?? [], cups: snapshot?.cups(on: dayDate) ?? 0, isToday: day == today, isFuture: day > today)
                        } else {
                            Color.clear.frame(maxWidth: .infinity)
                        }
                    }
                }
                .frame(maxHeight: .infinity)
            }
        }
    }
}

private struct DayDot: View {
    let day: Int
    let colors: [String]
    let cups: Int
    let isToday: Bool
    let isFuture: Bool

    var body: some View {
        ZStack {
            if cups > 0 {
                // Two beans on one day split the dot diagonally, like the in-app calendar.
                Circle().fill(Color(hex: colors.first ?? "#dce7f1"))
                if colors.count > 1 {
                    Circle().fill(Color(hex: colors[1])).mask(Rectangle().rotationEffect(.degrees(45)).offset(x: 9, y: 9))
                }
            }
            if isToday { Circle().stroke(Ink.accent, lineWidth: 1.4) }
            Text("\(day)")
                .font(.number(9.5, weight: cups > 0 || isToday ? .semibold : .regular))
                .foregroundStyle(cups > 0 ? Ink.title : isFuture ? Ink.muted.opacity(0.55) : Ink.muted)
        }
        .frame(width: 18, height: 18)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - 年历 (large)

struct YearWidget: Widget {
    var body: some WidgetConfiguration {
        beanletWidget(kind: "BeanletYear", name: "widget.year.name", description: "widget.year.description", families: [.systemLarge]) { YearView(entry: $0) }
    }
}

struct YearView: View {
    let entry: BeanletEntry

    var body: some View {
        let copy = Copy(entry.snapshot), year = Calendar.current.component(.year, from: entry.date)
        let totals = entry.snapshot?.totals(year: year) ?? (cups: 0, activeDays: 0)
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(String(year)).font(.number(22, weight: .bold)).foregroundStyle(Ink.title)
                Text(copy.coffeeDays(totals.activeDays)).font(.hand(12, copy)).foregroundStyle(Ink.muted)
                Spacer()
                Text("\(totals.cups)").font(.number(22, weight: .bold)).foregroundStyle(Ink.accent)
                Text(copy.cups).font(.hand(12, copy)).foregroundStyle(Ink.muted)
            }
            Grid(horizontalSpacing: 10, verticalSpacing: 12) {
                ForEach(0..<3, id: \.self) { row in
                    GridRow {
                        ForEach(1...4, id: \.self) { column in
                            MiniMonth(year: year, month: row * 4 + column, today: entry.date, snapshot: entry.snapshot, copy: copy)
                        }
                    }
                }
            }
            Spacer(minLength: 0)
            HStack(spacing: 6) {
                StickerImage(icon: "flower").frame(width: 22, height: 22)
                Text(copy.streak(entry.snapshot?.longestStreak(year: year) ?? 0)).font(.hand(12, copy)).foregroundStyle(Ink.body)
                Spacer()
                HeatLegend()
            }
        }
        .widgetURL(.year)
    }
}

private func heatColor(_ cups: Int) -> Color {
    Ink.heat[min(cups, Ink.heat.count) - 1]
}

private struct MiniMonth: View {
    let year: Int
    let month: Int
    let today: Date
    let snapshot: WidgetSnapshot?
    let copy: Copy

    var body: some View {
        let calendar = Calendar.current
        let first = calendar.date(from: DateComponents(year: year, month: month, day: 1)) ?? today
        let count = calendar.range(of: .day, in: .month, for: first)?.count ?? 30
        let lead = (calendar.component(.weekday, from: first) + 5) % 7
        let startOfToday = calendar.startOfDay(for: today)
        VStack(alignment: .leading, spacing: 3) {
            Text(copy.shortMonth(month)).font(.hand(10, copy)).foregroundStyle(calendar.component(.month, from: today) == month ? Ink.accent : Ink.muted)
            LazyVGrid(columns: Array(repeating: GridItem(.fixed(9.4), spacing: 2), count: 7), alignment: .leading, spacing: 2) {
                ForEach(0..<(lead + count), id: \.self) { index in
                    if index < lead {
                        Color.clear.frame(width: 9.4, height: 9.4)
                    } else {
                        let date = calendar.date(byAdding: .day, value: index - lead, to: first) ?? first
                        let cups = snapshot?.cups(on: date) ?? 0
                        RoundedRectangle(cornerRadius: 2)
                            .fill(cups > 0 ? heatColor(cups) : date > startOfToday ? Ink.future : Ink.empty)
                            .overlay(calendar.isDate(date, inSameDayAs: today) ? RoundedRectangle(cornerRadius: 2).stroke(Ink.accent, lineWidth: 1) : nil)
                            .frame(width: 9.4, height: 9.4)
                    }
                }
            }
            .frame(height: 6 * 9.4 + 5 * 2, alignment: .top)
        }
    }
}

private struct HeatLegend: View {
    var body: some View {
        HStack(spacing: 2) {
            RoundedRectangle(cornerRadius: 2).fill(Ink.empty).frame(width: 8, height: 8)
            ForEach(1...3, id: \.self) { RoundedRectangle(cornerRadius: 2).fill(heatColor($0)).frame(width: 8, height: 8) }
        }
    }
}

// MARK: - 冲一杯 (small)

struct BrewWidget: Widget {
    var body: some WidgetConfiguration {
        beanletWidget(kind: "BeanletBrew", name: "widget.brew.name", description: "widget.brew.description", families: [.systemSmall]) { BrewView(entry: $0) }
    }
}

struct BrewView: View {
    let entry: BeanletEntry

    var body: some View {
        let copy = Copy(entry.snapshot), snapshot = entry.snapshot
        let cups = snapshot?.cups(on: entry.date) ?? 0
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top) {
                StickerImage(icon: snapshot?.brewKind == "milk" ? "cup" : "dripper")
                    .frame(width: 66, height: 66)
                    .rotationEffect(.degrees(-6))
                Spacer()
                Image(systemName: "plus")
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .frame(width: 30, height: 30)
                    .background(Circle().fill(Ink.accent))
            }
            Spacer(minLength: 4)
            Text(copy.brew).font(.hand(21, copy)).foregroundStyle(Ink.title)
            Text(copy.today(cups)).font(.hand(12, copy)).foregroundStyle(cups > 0 ? Ink.accent : Ink.muted)
                .padding(.top, 1)
            HStack(spacing: 5) {
                if let bean = snapshot?.brewBean {
                    Circle().fill(Color(hex: bean.fill)).overlay(Circle().stroke(Color(hex: bean.line), lineWidth: 0.8)).frame(width: 9, height: 9)
                    Text(bean.name).font(.hand(11, copy)).foregroundStyle(Ink.body).lineLimit(1)
                } else {
                    Text(snapshot == nil ? copy.openApp : copy.pickBean).font(.hand(10.5, copy)).foregroundStyle(Ink.muted).lineLimit(2)
                }
            }
            .padding(.top, 5)
        }
        .widgetURL(.brew)
    }
}

// MARK: - Shared

private struct EmptyNote: View {
    let icon: String
    let title: String
    let detail: String?
    let copy: Copy

    var body: some View {
        HStack(spacing: 14) {
            StickerImage(icon: icon).frame(width: 66, height: 66).rotationEffect(.degrees(-10))
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.hand(15, copy)).foregroundStyle(Ink.body)
                if let detail { Text(detail).font(.hand(12, copy)).foregroundStyle(Ink.muted) }
            }
            Spacer(minLength: 0)
        }
        .frame(maxHeight: .infinity)
    }
}
