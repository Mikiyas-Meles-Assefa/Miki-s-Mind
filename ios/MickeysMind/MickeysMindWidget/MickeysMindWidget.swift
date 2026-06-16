import WidgetKit
import SwiftUI
import Charts

// MARK: - Timeline Provider
struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), metrics: sampleMetrics())
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let metrics = FirestoreClient.shared.getCachedMetrics() ?? sampleMetrics()
        let entry = SimpleEntry(date: Date(), metrics: metrics)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> ()) {
        Task {
            var metrics: WidgetMetrics
            do {
                metrics = try await FirestoreClient.shared.fetchMetrics()
            } catch {
                metrics = FirestoreClient.shared.getCachedMetrics() ?? sampleMetrics()
            }
            
            let currentDate = Date()
            let entry = SimpleEntry(date: currentDate, metrics: metrics)
            
            // Refresh every 15 minutes
            let nextRefreshDate = Calendar.current.date(byAdding: .minute, value: 15, to: currentDate)!
            let timeline = Timeline(entries: [entry], policy: .after(nextRefreshDate))
            completion(timeline)
        }
    }
    
    private func sampleMetrics() -> WidgetMetrics {
        WidgetMetrics(
            caloriesTarget: 3000,
            caloriesLogged: 1850,
            proteinTarget: 130,
            proteinLogged: 92,
            waterTarget: 3000,
            waterLogged: 1750,
            fatTarget: 80,
            fatLogged: 55,
            theme: "current",
            latestWeight: 78.4,
            latestWeightTime: "AM",
            yesterdayAMWeight: 78.2,
            yesterdayPMWeight: 78.6,
            weightHistory: [
                WeightPoint(date: "Mon 8", weight: 78.0, type: "AM"),
                WeightPoint(date: "Tue 9", weight: 78.1, type: "AM"),
                WeightPoint(date: "Wed 10", weight: 77.9, type: "AM"),
                WeightPoint(date: "Thu 11", weight: 78.3, type: "AM"),
                WeightPoint(date: "Fri 12", weight: 78.2, type: "AM"),
                WeightPoint(date: "Sat 13", weight: 78.5, type: "AM"),
                WeightPoint(date: "Sun 14", weight: 78.4, type: "AM")
            ],
            streakCount: 5,
            habits: [
                HabitProgress(name: "Deep Work 4 Hrs", streak: 5, completedToday: true, last7DaysCompletions: [true, true, true, true, true, false, false]),
                HabitProgress(name: "Stretch & Mobility", streak: 3, completedToday: false, last7DaysCompletions: [true, true, false, true, false, false, false]),
                HabitProgress(name: "Read 10 Pages", streak: 12, completedToday: true, last7DaysCompletions: [true, true, true, true, true, true, true])
            ]
        )
    }
}

// MARK: - Entry Model
struct SimpleEntry: TimelineEntry {
    let date: Date
    let metrics: WidgetMetrics
}

// MARK: - Styling & Themes
struct WidgetTheme {
    let background: AnyView
    let border: Color
    let text: Color
    let secondaryText: Color
    let accent: Color
    let secondaryAccent: Color
    
    static func get(for id: String) -> WidgetTheme {
        switch id {
        case "cyberpunk":
            return WidgetTheme(
                background: AnyView(Color(red: 0.00, green: 0.00, blue: 0.01)),
                border: Color(red: 0.22, green: 1.00, blue: 0.08),
                text: Color(red: 0.22, green: 1.00, blue: 0.08),
                secondaryText: Color.yellow,
                accent: Color(red: 0.22, green: 1.00, blue: 0.08),
                secondaryAccent: Color.cyan
            )
        case "nordic":
            return WidgetTheme(
                background: AnyView(Color(red: 0.88, green: 0.91, blue: 0.94)),
                border: Color.slateBorder.opacity(0.3),
                text: Color(red: 0.18, green: 0.24, blue: 0.35),
                secondaryText: Color(red: 0.38, green: 0.44, blue: 0.55),
                accent: Color(red: 0.24, green: 0.52, blue: 0.78),
                secondaryAccent: Color.teal
            )
        case "forest":
            return WidgetTheme(
                background: AnyView(LinearGradient(colors: [Color(red: 0.04, green: 0.07, blue: 0.06), Color(red: 0.08, green: 0.12, blue: 0.10)], startPoint: .top, endPoint: .bottom)),
                border: Color(red: 0.15, green: 0.25, blue: 0.20),
                text: Color(red: 0.90, green: 0.85, blue: 0.75),
                secondaryText: Color(red: 0.60, green: 0.55, blue: 0.45),
                accent: Color(red: 0.76, green: 0.62, blue: 0.38),
                secondaryAccent: Color.green
            )
        case "sepia":
            return WidgetTheme(
                background: AnyView(Color(red: 0.95, green: 0.93, blue: 0.86)),
                border: Color(red: 0.85, green: 0.80, blue: 0.70),
                text: Color(red: 0.26, green: 0.18, blue: 0.10),
                secondaryText: Color(red: 0.46, green: 0.38, blue: 0.30),
                accent: Color(red: 0.65, green: 0.40, blue: 0.20),
                secondaryAccent: Color.orange
            )
        case "apple-dark", "apple-reminders-dark":
            return WidgetTheme(
                background: AnyView(Color.black),
                border: Color.white.opacity(0.1),
                text: Color.white,
                secondaryText: Color.gray,
                accent: Color.red,
                secondaryAccent: Color.blue
            )
        case "apple-light":
            return WidgetTheme(
                background: AnyView(Color(red: 0.95, green: 0.95, blue: 0.97)),
                border: Color.zincBorder,
                text: Color.black,
                secondaryText: Color.gray,
                accent: Color.red,
                secondaryAccent: Color.blue
            )
        case "apple-health":
            return WidgetTheme(
                background: AnyView(Color.white),
                border: Color(red: 1.00, green: 0.18, blue: 0.33).opacity(0.2),
                text: Color.black,
                secondaryText: Color.gray,
                accent: Color(red: 1.00, green: 0.18, blue: 0.33),
                secondaryAccent: Color.green
            )
        case "apple-glass", "apple-glass-forest", "apple-glass-mountain", "apple-glass-night":
            return WidgetTheme(
                background: AnyView(
                    ZStack {
                        Color(red: 0.07, green: 0.11, blue: 0.18)
                        LinearGradient(colors: [Color.white.opacity(0.06), Color.white.opacity(0.01)], startPoint: .top, endPoint: .bottom)
                    }
                ),
                border: Color.white.opacity(0.15),
                text: Color.white,
                secondaryText: Color.gray.opacity(0.8),
                accent: Color(red: 0.00, green: 0.62, blue: 1.00),
                secondaryAccent: Color.emerald
            )
        default: // slate obsidian / current
            return WidgetTheme(
                background: AnyView(LinearGradient(colors: [Color(red: 0.02, green: 0.02, blue: 0.03), Color(red: 0.05, green: 0.06, blue: 0.08)], startPoint: .top, endPoint: .bottom)),
                border: Color.white.opacity(0.05),
                text: Color.white,
                secondaryText: Color.gray,
                accent: Color.emerald,
                secondaryAccent: Color.blue
            )
        }
    }
}

// MARK: - Color extensions
extension Color {
    static let slateBorder = Color(red: 0.15, green: 0.20, blue: 0.28)
    static let zincBorder = Color(red: 0.85, green: 0.85, blue: 0.88)
    static let emerald = Color(red: 0.04, green: 0.73, blue: 0.44)
}

// MARK: - 1. Water Status Widget
struct WaterStatusView: View {
    var entry: SimpleEntry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        let theme = WidgetTheme.get(for: entry.metrics.theme)
        
        Group {
            switch family {
            case .accessoryCircular:
                let percent = min(1.0, entry.metrics.waterLogged / entry.metrics.waterTarget)
                ZStack {
                    AccessoryWidgetBackground()
                    ProgressView(value: percent) {
                        Image(systemName: "drop.fill")
                            .font(.system(size: 10))
                    }
                    .progressViewStyle(.circular)
                }
            case .accessoryRectangular:
                let percent = min(1.0, entry.metrics.waterLogged / entry.metrics.waterTarget)
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 4) {
                        Image(systemName: "drop.fill")
                            .font(.system(size: 10))
                        Text("WATER")
                            .font(.system(.caption2, design: .monospaced))
                            .fontWeight(.bold)
                    }
                    Text("\(Int(entry.metrics.waterLogged)) / \(Int(entry.metrics.waterTarget)) ml")
                        .font(.system(.caption, design: .default))
                        .fontWeight(.semibold)
                    ProgressView(value: percent)
                        .progressViewStyle(.linear)
                }
            default: // systemSmall
                let percent = min(1.0, entry.metrics.waterLogged / entry.metrics.waterTarget)
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("WATER")
                            .font(.system(.caption2, design: .monospaced))
                            .fontWeight(.bold)
                            .foregroundColor(theme.secondaryText)
                        Spacer()
                        Image(systemName: "drop.fill")
                            .font(.caption2)
                            .foregroundColor(theme.accent)
                    }
                    
                    Spacer()
                    
                    HStack {
                        Spacer()
                        // Droplet graphical indicator
                        ZStack(alignment: .bottom) {
                            // Background water glass outline
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(theme.accent.opacity(0.3), lineWidth: 2)
                                .frame(width: 48, height: 64)
                                .background(theme.accent.opacity(0.05).cornerRadius(16))
                            
                            // Fluid fill level
                            RoundedRectangle(cornerRadius: 14)
                                .fill(
                                    LinearGradient(
                                        colors: [theme.accent.opacity(0.8), theme.accent],
                                        startPoint: .top,
                                        endPoint: .bottom
                                    )
                                )
                                .frame(width: 44, height: CGFloat(60 * percent))
                                .padding(2)
                        }
                        Spacer()
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .leading, spacing: 1) {
                        Text("\(Int(entry.metrics.waterLogged)) ml")
                            .font(.system(.subheadline, design: .default))
                            .fontWeight(.bold)
                            .foregroundColor(theme.text)
                        Text("Target: \(Int(entry.metrics.waterTarget)) ml")
                            .font(.system(.caption2))
                            .foregroundColor(theme.secondaryText)
                    }
                }
                .padding(14)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .containerBackground(for: .widget) {
                    theme.background
                }
                .overlay(ContainerRelativeShape().inset(by: 0.75).stroke(theme.border, lineWidth: 1.5))
            }
        }
    }
}

// MARK: - 2. Habit Streaks Widget
struct HabitStreaksView: View {
    var entry: SimpleEntry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        let theme = WidgetTheme.get(for: entry.metrics.theme)
        
        Group {
            switch family {
            case .accessoryCircular:
                let completed = entry.metrics.habits.filter { $0.completedToday }.count
                let total = entry.metrics.habits.count
                let percent = total > 0 ? Double(completed) / Double(total) : 0.0
                ZStack {
                    AccessoryWidgetBackground()
                    ProgressView(value: percent) {
                        Text("\(entry.metrics.streakCount)")
                            .font(.system(.caption, design: .monospaced))
                            .fontWeight(.bold)
                    }
                    .progressViewStyle(.circular)
                }
            case .accessoryRectangular:
                let completed = entry.metrics.habits.filter { $0.completedToday }.count
                let total = entry.metrics.habits.count
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 4) {
                        Image(systemName: "flame.fill")
                            .font(.system(size: 10))
                        Text("HABITS")
                            .font(.system(.caption2, design: .monospaced))
                            .fontWeight(.bold)
                    }
                    Text("\(completed)/\(total) Completed")
                        .font(.system(.caption, design: .default))
                        .fontWeight(.semibold)
                    Text("Top Streak: \(entry.metrics.streakCount) days")
                        .font(.system(.caption2))
                }
            case .systemMedium:
                let habits = Array(entry.metrics.habits.prefix(6))
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text("HABITS & STREAKS")
                            .font(.system(.caption2, design: .monospaced))
                            .fontWeight(.bold)
                            .foregroundColor(theme.secondaryText)
                        Spacer()
                        Image(systemName: "flame.fill")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                    
                    if habits.isEmpty {
                        Text("No habits registered.")
                            .font(.system(.caption2))
                            .foregroundColor(theme.secondaryText)
                    } else {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                            ForEach(habits) { habit in
                                HStack {
                                    Image(systemName: habit.completedToday ? "checkmark.circle.fill" : "circle")
                                        .foregroundColor(habit.completedToday ? theme.accent : theme.secondaryText.opacity(0.4))
                                        .font(.system(size: 14))
                                    Text(habit.name)
                                        .font(.system(.caption2))
                                        .fontWeight(.semibold)
                                        .foregroundColor(theme.text)
                                        .lineLimit(1)
                                    Spacer()
                                    HStack(spacing: 2) {
                                        Image(systemName: "flame.fill")
                                            .font(.system(size: 9))
                                            .foregroundColor(habit.completedToday ? .orange : theme.secondaryText)
                                        Text("\(habit.streak)")
                                            .font(.system(.caption2, design: .monospaced))
                                            .fontWeight(.bold)
                                            .foregroundColor(theme.text)
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(14)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .containerBackground(for: .widget) {
                    theme.background
                }
                .overlay(ContainerRelativeShape().inset(by: 0.75).stroke(theme.border, lineWidth: 1.5))
                
            case .systemLarge:
                let habits = Array(entry.metrics.habits.prefix(8))
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("HABITS CONTINUUM")
                            .font(.system(.caption2, design: .monospaced))
                            .fontWeight(.bold)
                            .foregroundColor(theme.secondaryText)
                        Spacer()
                        Text("7-Day Calendar & Streak")
                            .font(.system(.caption2, design: .monospaced))
                            .foregroundColor(theme.secondaryText)
                    }
                    
                    if habits.isEmpty {
                        Text("No habits registered.")
                            .font(.system(.caption2))
                            .foregroundColor(theme.secondaryText)
                    } else {
                        VStack(spacing: 10) {
                            ForEach(habits) { habit in
                                HStack(spacing: 8) {
                                    Image(systemName: habit.completedToday ? "checkmark.circle.fill" : "circle")
                                        .foregroundColor(habit.completedToday ? theme.accent : theme.secondaryText.opacity(0.4))
                                        .font(.system(size: 16))
                                    
                                    Text(habit.name)
                                        .font(.system(.caption2))
                                        .fontWeight(.bold)
                                        .foregroundColor(theme.text)
                                        .lineLimit(1)
                                        .frame(width: 110, alignment: .leading)
                                    
                                    Spacer()
                                    
                                    HStack(spacing: 4) {
                                        ForEach(0..<min(7, habit.last7DaysCompletions.count), id: \.self) { idx in
                                            let completed = habit.last7DaysCompletions[idx]
                                            Circle()
                                                .fill(completed ? theme.accent : theme.secondaryText.opacity(0.1))
                                                .frame(width: 10, height: 10)
                                        }
                                    }
                                    
                                    Spacer()
                                    
                                    HStack(spacing: 2) {
                                        Image(systemName: "flame.fill")
                                            .font(.system(size: 9))
                                            .foregroundColor(.orange)
                                        Text("\(habit.streak)")
                                            .font(.system(.caption2, design: .monospaced))
                                            .fontWeight(.bold)
                                            .foregroundColor(theme.text)
                                    }
                                    .frame(width: 30, alignment: .trailing)
                                }
                                if habit.id != habits.last?.id {
                                    Divider().background(theme.border.opacity(0.5))
                                }
                            }
                        }
                    }
                }
                .padding(14)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .containerBackground(for: .widget) {
                    theme.background
                }
                .overlay(ContainerRelativeShape().inset(by: 0.75).stroke(theme.border, lineWidth: 1.5))
                
            default: // systemSmall
                let displayHabits = Array(entry.metrics.habits.prefix(4))
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("STREAKS")
                            .font(.system(.caption2, design: .monospaced))
                            .fontWeight(.bold)
                            .foregroundColor(theme.secondaryText)
                        Spacer()
                        Image(systemName: "flame.fill")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                    
                    Spacer()
                    
                    if displayHabits.isEmpty {
                        Text("No habits.")
                            .font(.system(.caption2))
                            .foregroundColor(theme.secondaryText)
                    } else {
                        VStack(spacing: 6) {
                            ForEach(displayHabits) { habit in
                                HStack {
                                    Text(habit.name)
                                        .font(.system(.caption2, design: .default))
                                        .fontWeight(.semibold)
                                        .foregroundColor(theme.text)
                                        .lineLimit(1)
                                    Spacer()
                                    HStack(spacing: 2) {
                                        Image(systemName: "flame.fill")
                                            .font(.system(size: 10))
                                            .foregroundColor(habit.completedToday ? .orange : theme.secondaryText)
                                        Text("\(habit.streak)")
                                            .font(.system(.caption2, design: .monospaced))
                                            .fontWeight(.bold)
                                            .foregroundColor(habit.completedToday ? theme.text : theme.secondaryText)
                                    }
                                }
                            }
                        }
                    }
                    Spacer()
                }
                .padding(14)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .containerBackground(for: .widget) {
                    theme.background
                }
                .overlay(ContainerRelativeShape().inset(by: 0.75).stroke(theme.border, lineWidth: 1.5))
            }
        }
    }
}

// MARK: - 3. Streak Calendar Widget (Medium)
struct StreakCalendarView: View {
    var entry: SimpleEntry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        let theme = WidgetTheme.get(for: entry.metrics.theme)
        let limit = family == .systemLarge ? 8 : 4
        let habits = Array(entry.metrics.habits.prefix(limit))
        
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("7-DAY HABIT CONTINUUM")
                    .font(.system(.caption2, design: .monospaced))
                    .fontWeight(.bold)
                    .foregroundColor(theme.secondaryText)
                Spacer()
                Text("Streaks")
                    .font(.system(.caption2, design: .monospaced))
                    .foregroundColor(theme.secondaryText)
            }
            
            VStack(spacing: 8) {
                ForEach(habits) { habit in
                    HStack(spacing: 8) {
                        Text(habit.name)
                            .font(.system(.caption2))
                            .fontWeight(.semibold)
                            .foregroundColor(theme.text)
                            .lineLimit(1)
                            .frame(width: 110, alignment: .leading)
                        
                        Spacer()
                        
                        // Last 7 days bubbles
                        HStack(spacing: 6) {
                            ForEach(0..<min(7, habit.last7DaysCompletions.count), id: \.self) { idx in
                                let completed = habit.last7DaysCompletions[idx]
                                Circle()
                                    .fill(completed ? theme.accent : theme.secondaryText.opacity(0.15))
                                    .frame(width: 12, height: 12)
                                    .overlay(
                                        Circle()
                                            .stroke(completed ? theme.accent : theme.border, lineWidth: 1)
                                    )
                            }
                        }
                        
                        Spacer()
                        
                        HStack(spacing: 2) {
                            Image(systemName: "flame.fill")
                                .font(.system(size: 9))
                                .foregroundColor(.orange)
                            Text("\(habit.streak)")
                                .font(.system(.caption2, design: .monospaced))
                                .fontWeight(.bold)
                                .foregroundColor(theme.text)
                        }
                        .frame(width: 30, alignment: .trailing)
                    }
                    if family == .systemLarge && habit.id != habits.last?.id {
                        Divider().background(theme.border.opacity(0.5))
                    }
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(for: .widget) {
            theme.background
        }
        .overlay(ContainerRelativeShape().inset(by: 0.75).stroke(theme.border, lineWidth: 1.5))
    }
}

// MARK: - 4. Macros Rings Widget
struct MacrosRingsView: View {
    var entry: SimpleEntry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        let theme = WidgetTheme.get(for: entry.metrics.theme)
        
        Group {
            switch family {
            case .accessoryCircular:
                let caloriePercent = min(1.0, entry.metrics.caloriesLogged / entry.metrics.caloriesTarget)
                ZStack {
                    AccessoryWidgetBackground()
                    ProgressView(value: caloriePercent) {
                        Image(systemName: "flame.fill")
                            .font(.system(size: 10))
                    }
                    .progressViewStyle(.circular)
                }
            default: // systemSmall
                let caloriePercent = min(1.0, entry.metrics.caloriesLogged / entry.metrics.caloriesTarget)
                let proteinPercent = min(1.0, entry.metrics.proteinLogged / entry.metrics.proteinTarget)
                
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("NUTRITION")
                            .font(.system(.caption2, design: .monospaced))
                            .fontWeight(.bold)
                            .foregroundColor(theme.secondaryText)
                        Spacer()
                        Image(systemName: "heart.fill")
                            .font(.caption2)
                            .foregroundColor(theme.accent)
                    }
                    
                    Spacer()
                    
                    HStack {
                        Spacer()
                        ZStack {
                            // Calorie Ring (Outer)
                            Circle()
                                .stroke(theme.secondaryText.opacity(0.1), lineWidth: 8)
                                .frame(width: 64, height: 64)
                            Circle()
                                .trim(from: 0.0, to: CGFloat(caloriePercent))
                                .stroke(theme.accent, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                                .frame(width: 64, height: 64)
                                .rotationEffect(.degrees(-90))
                            
                            // Protein Ring (Inner)
                            Circle()
                                .stroke(theme.secondaryText.opacity(0.1), lineWidth: 8)
                                .frame(width: 44, height: 44)
                            Circle()
                                .trim(from: 0.0, to: CGFloat(proteinPercent))
                                .stroke(theme.secondaryAccent, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                                .frame(width: 44, height: 44)
                                .rotationEffect(.degrees(-90))
                        }
                        Spacer()
                    }
                    
                    Spacer()
                    
                    HStack(spacing: 8) {
                        VStack(alignment: .leading, spacing: 1) {
                            Text("\(Int(entry.metrics.caloriesLogged)) kcal")
                                .font(entry.metrics.theme == "cyberpunk" ? .system(.caption, design: .monospaced) : .system(size: 10))
                                .fontWeight(.bold)
                                .foregroundColor(theme.text)
                            Text("Cal")
                                .font(.system(size: 8))
                                .foregroundColor(theme.secondaryText)
                        }
                        
                        VStack(alignment: .leading, spacing: 1) {
                            Text("\(Int(entry.metrics.proteinLogged))g")
                                .font(entry.metrics.theme == "cyberpunk" ? .system(.caption, design: .monospaced) : .system(size: 10))
                                .fontWeight(.bold)
                                .foregroundColor(theme.text)
                            Text("Prot")
                                .font(.system(size: 8))
                                .foregroundColor(theme.secondaryText)
                        }
                    }
                }
                .padding(14)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .containerBackground(for: .widget) {
                    theme.background
                }
                .overlay(ContainerRelativeShape().inset(by: 0.75).stroke(theme.border, lineWidth: 1.5))
            }
        }
    }
}

// MARK: - 5. Detailed Nutrition Board (Medium)
struct DetailedNutritionView: View {
    var entry: SimpleEntry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        let theme = WidgetTheme.get(for: entry.metrics.theme)
        
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(family == .systemLarge ? "NUTRITION & MACROS DETAIL" : "DETAILED DAILY NUTRITION")
                    .font(.system(.caption2, design: .monospaced))
                    .fontWeight(.bold)
                    .foregroundColor(theme.secondaryText)
                Spacer()
                Image(systemName: "chart.bar.fill")
                    .font(.caption2)
                    .foregroundColor(theme.accent)
            }
            
            VStack(spacing: 8) {
                MacroRow(label: "Calories", logged: entry.metrics.caloriesLogged, target: entry.metrics.caloriesTarget, unit: "kcal", color: theme.accent, theme: theme)
                MacroRow(label: "Protein", logged: entry.metrics.proteinLogged, target: entry.metrics.proteinTarget, unit: "g", color: theme.secondaryAccent, theme: theme)
                MacroRow(label: "Fat", logged: entry.metrics.fatLogged, target: entry.metrics.fatTarget, unit: "g", color: .yellow, theme: theme)
                
                if family == .systemLarge {
                    Divider().background(theme.border).padding(.vertical, 4)
                    
                    HStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("WATER CONSUMED")
                                .font(.system(size: 8, weight: .bold, design: .monospaced))
                                .foregroundColor(theme.secondaryText)
                            Text("\(Int(entry.metrics.waterLogged)) / \(Int(entry.metrics.waterTarget)) ml")
                                .font(.system(.caption, design: .monospaced))
                                .fontWeight(.bold)
                                .foregroundColor(theme.text)
                        }
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("CURRENT WEIGHT")
                                .font(.system(size: 8, weight: .bold, design: .monospaced))
                                .foregroundColor(theme.secondaryText)
                            Text(String(format: "%.1f kg", entry.metrics.latestWeight))
                                .font(.system(.caption, design: .monospaced))
                                .fontWeight(.bold)
                                .foregroundColor(theme.text)
                        }
                    }
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(for: .widget) {
            theme.background
        }
        .overlay(ContainerRelativeShape().inset(by: 0.75).stroke(theme.border, lineWidth: 1.5))
    }
}

// MARK: - Macro Row Component
struct MacroRow: View {
    let label: String
    let logged: Double
    let target: Double
    let unit: String
    let color: Color
    let theme: WidgetTheme
    
    var body: some View {
        let percent = min(1.0, logged / target)
        
        VStack(spacing: 4) {
            HStack {
                Text(label)
                    .font(.system(.caption2))
                    .fontWeight(.semibold)
                    .foregroundColor(theme.text)
                Spacer()
                Text("\(Int(logged))/\(Int(target)) \(unit)")
                    .font(.system(.caption2, design: .monospaced))
                    .foregroundColor(theme.secondaryText)
            }
            
            // Progress Bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(theme.secondaryText.opacity(0.1))
                        .frame(height: 6)
                    
                    Capsule()
                        .fill(color)
                        .frame(width: geo.size.width * CGFloat(percent), height: 6)
                }
            }
            .frame(height: 6)
        }
    }
}

// MARK: - 6. Calorie History Chart (Medium)
struct CalorieHistoryView: View {
    var entry: SimpleEntry
    
    struct CalorieDay: Identifiable {
        let id = UUID()
        let day: String
        let calories: Double
    }
    
    var body: some View {
        let theme = WidgetTheme.get(for: entry.metrics.theme)
        
        let barData = [
            CalorieDay(day: "Mon", calories: entry.metrics.caloriesLogged * 0.9),
            CalorieDay(day: "Tue", calories: entry.metrics.caloriesLogged * 1.1),
            CalorieDay(day: "Wed", calories: entry.metrics.caloriesLogged * 0.75),
            CalorieDay(day: "Thu", calories: entry.metrics.caloriesLogged * 1.05),
            CalorieDay(day: "Fri", calories: entry.metrics.caloriesLogged * 0.95),
            CalorieDay(day: "Sat", calories: entry.metrics.caloriesLogged * 0.8),
            CalorieDay(day: "Sun", calories: entry.metrics.caloriesLogged)
        ]
        
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("CALORIC GRAPH (7 DAYS)")
                    .font(.system(.caption2, design: .monospaced))
                    .fontWeight(.bold)
                    .foregroundColor(theme.secondaryText)
                Spacer()
                Text("Target: \(Int(entry.metrics.caloriesTarget)) kcal")
                    .font(.system(.caption2, design: .monospaced))
                    .foregroundColor(theme.secondaryText)
            }
            
            Chart {
                ForEach(barData) { item in
                    BarMark(
                        x: .value("Day", item.day),
                        y: .value("Calories", item.calories)
                    )
                    .foregroundStyle(theme.accent.gradient)
                    .cornerRadius(4)
                }
                
                // Target Threshold Line
                RuleMark(y: .value("Target", entry.metrics.caloriesTarget))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                    .foregroundStyle(Color.red.opacity(0.8))
            }
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisValueLabel()
                        .font(.system(size: 8, design: .monospaced))
                        .foregroundStyle(theme.secondaryText)
                }
            }
            .chartXAxis {
                AxisMarks { value in
                    AxisValueLabel()
                        .font(.system(size: 8, design: .monospaced))
                        .foregroundStyle(theme.secondaryText)
                }
            }
            .frame(height: 90)
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(for: .widget) {
            theme.background
        }
        .overlay(ContainerRelativeShape().inset(by: 0.75).stroke(theme.border, lineWidth: 1.5))
    }
}

// MARK: - 7. Latest Weight Card
struct WeightTrackerView: View {
    var entry: SimpleEntry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        let theme = WidgetTheme.get(for: entry.metrics.theme)
        
        Group {
            switch family {
            case .accessoryCircular:
                ZStack {
                    AccessoryWidgetBackground()
                    VStack(spacing: 0) {
                        Text(String(format: "%.1f", entry.metrics.latestWeight))
                            .font(.system(size: 12, weight: .bold, design: .default))
                        Text("kg")
                            .font(.system(size: 8))
                    }
                }
            case .accessoryRectangular:
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 4) {
                        Image(systemName: "scalemass.fill")
                            .font(.system(size: 10))
                        Text("WEIGHT")
                            .font(.system(.caption2, design: .monospaced))
                            .fontWeight(.bold)
                    }
                    Text("\(String(format: "%.1f", entry.metrics.latestWeight)) kg")
                        .font(.system(.caption, design: .default))
                        .fontWeight(.bold)
                    HStack(spacing: 8) {
                        Text("AM: \(entry.metrics.yesterdayAMWeight != nil ? String(format: "%.1f", entry.metrics.yesterdayAMWeight!) : "--.-")")
                        Text("PM: \(entry.metrics.yesterdayPMWeight != nil ? String(format: "%.1f", entry.metrics.yesterdayPMWeight!) : "--.-")")
                    }
                    .font(.system(size: 8, design: .monospaced))
                }
            default: // systemSmall
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("WEIGHT")
                            .font(.system(.caption2, design: .monospaced))
                            .fontWeight(.bold)
                            .foregroundColor(theme.secondaryText)
                        Spacer()
                        Image(systemName: "scalemass.fill")
                            .font(.caption2)
                            .foregroundColor(theme.accent)
                    }
                    
                    Spacer()
                    
                    if entry.metrics.latestWeight > 0 {
                        VStack(alignment: .leading, spacing: 1) {
                            HStack(alignment: .lastTextBaseline, spacing: 2) {
                                Text(String(format: "%.1f", entry.metrics.latestWeight))
                                    .font(.system(size: 32, weight: .black, design: .default))
                                    .foregroundColor(theme.text)
                                Text("kg")
                                    .font(.system(.body, design: .default))
                                    .fontWeight(.semibold)
                                    .foregroundColor(theme.secondaryText)
                            }
                            Text("Latest: \(entry.metrics.latestWeightTime)")
                                .font(.system(.caption2, design: .monospaced))
                                .foregroundColor(theme.accent)
                        }
                    } else {
                        Text("No weights logged today")
                            .font(.system(.caption))
                            .foregroundColor(theme.secondaryText)
                    }
                    
                    Spacer()
                    
                    Divider()
                        .background(theme.border)
                        .padding(.vertical, 2)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("YESTERDAY")
                            .font(.system(size: 8, weight: .bold, design: .monospaced))
                            .foregroundColor(theme.secondaryText)
                        HStack(spacing: 8) {
                            Text("AM: \(entry.metrics.yesterdayAMWeight != nil ? String(format: "%.1f", entry.metrics.yesterdayAMWeight!) : "--.-")")
                            Text("PM: \(entry.metrics.yesterdayPMWeight != nil ? String(format: "%.1f", entry.metrics.yesterdayPMWeight!) : "--.-")")
                        }
                        .font(.system(size: 9, design: .monospaced))
                        .foregroundColor(theme.text)
                    }
                }
                .padding(14)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .containerBackground(for: .widget) {
                    theme.background
                }
                .overlay(ContainerRelativeShape().inset(by: 0.75).stroke(theme.border, lineWidth: 1.5))
            }
        }
    }
}

// MARK: - 8. Weight Trend Graph (Medium)
struct WeightTrendView: View {
    var entry: SimpleEntry
    
    var body: some View {
        let theme = WidgetTheme.get(for: entry.metrics.theme)
        let weightData = entry.metrics.weightHistory
        
        // Calculate min/max weights to bound chart
        let weights = weightData.map { $0.weight }
        let minWeight = (weights.min() ?? 70.0) - 0.5
        let maxWeight = (weights.max() ?? 80.0) + 0.5
        
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("WEIGHT FLUCTUATIONS (7 DAYS)")
                    .font(.system(.caption2, design: .monospaced))
                    .fontWeight(.bold)
                    .foregroundColor(theme.secondaryText)
                Spacer()
                if let last = weightData.last {
                    Text("Latest: \(String(format: "%.1f kg", last.weight))")
                        .font(.system(.caption2, design: .monospaced))
                        .foregroundColor(theme.accent)
                }
            }
            
            Chart {
                ForEach(weightData) { item in
                    LineMark(
                        x: .value("Date", item.date),
                        y: .value("Weight", item.weight)
                    )
                    .foregroundStyle(theme.accent.gradient)
                    .interpolationMethod(.monotone)
                    .lineStyle(StrokeStyle(lineWidth: 3))
                    
                    PointMark(
                        x: .value("Date", item.date),
                        y: .value("Weight", item.weight)
                    )
                    .foregroundStyle(item.type == "AM" ? theme.accent : theme.secondaryAccent)
                }
            }
            .chartYScale(domain: minWeight...maxWeight)
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisValueLabel()
                        .font(.system(size: 8, design: .monospaced))
                        .foregroundStyle(theme.secondaryText)
                }
            }
            .chartXAxis {
                AxisMarks { value in
                    AxisValueLabel()
                        .font(.system(size: 8, design: .monospaced))
                        .foregroundStyle(theme.secondaryText)
                }
            }
            .frame(height: 90)
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(for: .widget) {
            theme.background
        }
        .overlay(ContainerRelativeShape().inset(by: 0.75).stroke(theme.border, lineWidth: 1.5))
    }
}

// MARK: - 9. Combined Dashboard Widget (Medium)
struct CombinedDashboardView: View {
    var entry: SimpleEntry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        let theme = WidgetTheme.get(for: entry.metrics.theme)
        
        Group {
            if family == .systemLarge {
                VStack(spacing: 12) {
                    HStack {
                        Text("PREMIUM METRICS DASHBOARD")
                            .font(.system(.caption2, design: .monospaced))
                            .fontWeight(.bold)
                            .foregroundColor(theme.secondaryText)
                        Spacer()
                        HStack(spacing: 4) {
                            Image(systemName: "flame.fill")
                                .font(.caption)
                                .foregroundColor(.orange)
                            Text("\(entry.metrics.streakCount)")
                                .font(.system(.caption2, design: .monospaced))
                                .fontWeight(.bold)
                                .foregroundColor(theme.text)
                        }
                    }
                    
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("WATER PROGRESS")
                                .font(.system(size: 8, weight: .bold, design: .monospaced))
                                .foregroundColor(theme.secondaryText)
                            Text("\(Int(entry.metrics.waterLogged)) / \(Int(entry.metrics.waterTarget)) ml")
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundColor(theme.text)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        
                        Divider().background(theme.border)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("CALORIES INGESTED")
                                .font(.system(size: 8, weight: .bold, design: .monospaced))
                                .foregroundColor(theme.secondaryText)
                            Text("\(Int(entry.metrics.caloriesLogged)) / \(Int(entry.metrics.caloriesTarget)) kcal")
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundColor(theme.text)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    
                    Divider().background(theme.border)
                    
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("CURRENT WEIGHT")
                                .font(.system(size: 8, weight: .bold, design: .monospaced))
                                .foregroundColor(theme.secondaryText)
                            HStack(alignment: .lastTextBaseline, spacing: 2) {
                                Text(String(format: "%.1f", entry.metrics.latestWeight))
                                    .font(.system(size: 16, weight: .bold, design: .default))
                                    .foregroundColor(theme.text)
                                Text("kg")
                                    .font(.system(size: 9))
                                    .foregroundColor(theme.secondaryText)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        
                        Divider().background(theme.border)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("YESTERDAY STATS")
                                .font(.system(size: 8, weight: .bold, design: .monospaced))
                                .foregroundColor(theme.secondaryText)
                            HStack(spacing: 8) {
                                Text("AM: \(entry.metrics.yesterdayAMWeight != nil ? String(format: "%.1f", entry.metrics.yesterdayAMWeight!) : "--.-")")
                                Text("PM: \(entry.metrics.yesterdayPMWeight != nil ? String(format: "%.1f", entry.metrics.yesterdayPMWeight!) : "--.-")")
                            }
                            .font(.system(size: 9, design: .monospaced))
                            .foregroundColor(theme.text)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    
                    Divider().background(theme.border)
                    
                    VStack(alignment: .leading, spacing: 6) {
                        Text("ACTIVE HABITS CONTINUUM")
                            .font(.system(size: 8, weight: .bold, design: .monospaced))
                            .foregroundColor(theme.secondaryText)
                        
                        let habits = Array(entry.metrics.habits.prefix(3))
                        if habits.isEmpty {
                            Text("No habits registered.")
                                .font(.system(.caption2))
                                .foregroundColor(theme.secondaryText)
                        } else {
                            VStack(spacing: 4) {
                                ForEach(habits) { habit in
                                    HStack {
                                        Image(systemName: habit.completedToday ? "checkmark.circle.fill" : "circle")
                                            .foregroundColor(habit.completedToday ? theme.accent : theme.secondaryText.opacity(0.4))
                                            .font(.system(size: 10))
                                        Text(habit.name)
                                            .font(.system(size: 10, weight: .semibold))
                                            .foregroundColor(theme.text)
                                            .lineLimit(1)
                                        Spacer()
                                        HStack(spacing: 2) {
                                            Image(systemName: "flame.fill")
                                                .font(.system(size: 8))
                                                .foregroundColor(.orange)
                                            Text("\(habit.streak)")
                                                .font(.system(size: 10, weight: .bold, design: .monospaced))
                                                .foregroundColor(theme.text)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(14)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .containerBackground(for: .widget) {
                    theme.background
                }
                .overlay(ContainerRelativeShape().inset(by: 0.75).stroke(theme.border, lineWidth: 1.5))
            } else {
                HStack(spacing: 12) {
                    // Left Column: Hydration & Weight
                    VStack(alignment: .leading, spacing: 8) {
                        // Water block
                        VStack(alignment: .leading, spacing: 4) {
                            Text("WATER LOG")
                                .font(.system(size: 8, weight: .bold, design: .monospaced))
                                .foregroundColor(theme.secondaryText)
                            Text("\(Int(entry.metrics.waterLogged)) / \(Int(entry.metrics.waterTarget)) ml")
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundColor(theme.text)
                        }
                        
                        Divider().background(theme.border)
                        
                        // Weight block
                        VStack(alignment: .leading, spacing: 4) {
                            Text("CURRENT WEIGHT")
                                .font(.system(size: 8, weight: .bold, design: .monospaced))
                                .foregroundColor(theme.secondaryText)
                            HStack(alignment: .lastTextBaseline, spacing: 2) {
                                Text(String(format: "%.1f", entry.metrics.latestWeight))
                                    .font(.system(size: 16, weight: .bold, design: .default))
                                    .foregroundColor(theme.text)
                                Text("kg")
                                    .font(.system(size: 9))
                                    .foregroundColor(theme.secondaryText)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    
                    Divider().background(theme.border)
                    
                    // Right Column: Macros Summary & Streak
                    VStack(alignment: .leading, spacing: 8) {
                        // Calorie progress block
                        VStack(alignment: .leading, spacing: 4) {
                            Text("CALORIES INGESTED")
                                .font(.system(size: 8, weight: .bold, design: .monospaced))
                                .foregroundColor(theme.secondaryText)
                            Text("\(Int(entry.metrics.caloriesLogged)) / \(Int(entry.metrics.caloriesTarget)) kcal")
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundColor(theme.text)
                        }
                        
                        Divider().background(theme.border)
                        
                        // Habits/Streaks block
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("ACTIVE HABITS")
                                    .font(.system(size: 8, weight: .bold, design: .monospaced))
                                    .foregroundColor(theme.secondaryText)
                                Text("\(entry.metrics.habits.filter { $0.completedToday }.count) of \(entry.metrics.habits.count) Done")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(theme.text)
                            }
                            Spacer()
                            HStack(spacing: 2) {
                                Image(systemName: "flame.fill")
                                    .font(.caption)
                                    .foregroundColor(.orange)
                                Text("\(entry.metrics.streakCount)")
                                    .font(.system(size: 14, weight: .black, design: .monospaced))
                                    .foregroundColor(theme.text)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(14)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .containerBackground(for: .widget) {
                    theme.background
                }
                .overlay(ContainerRelativeShape().inset(by: 0.75).stroke(theme.border, lineWidth: 1.5))
            }
        }
    }
}

// MARK: - Widget Declarations
struct WaterStatusWidget: Widget {
    let kind: String = "MickeysMindWaterWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            WaterStatusView(entry: entry)
        }
        .configurationDisplayName("Water Tracker")
        .description("Glassmorphic visual progress of your daily water intake.")
        .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryRectangular])
        .contentMarginsDisabled()
    }
}

struct HabitsStreakWidget: Widget {
    let kind: String = "MickeysMindHabitsWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            HabitStreaksView(entry: entry)
        }
        .configurationDisplayName("Habit Streaks")
        .description("Shows streaks of registered custom habits.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryCircular, .accessoryRectangular])
        .contentMarginsDisabled()
    }
}

struct StreakCalendarWidget: Widget {
    let kind: String = "MickeysMindCalendarWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            StreakCalendarView(entry: entry)
        }
        .configurationDisplayName("Streak Calendar")
        .description("Visual grid displaying completion streaks over the last 7 days.")
        .supportedFamilies([.systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

struct MacrosRingsWidget: Widget {
    let kind: String = "MickeysMindRingsWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            MacrosRingsView(entry: entry)
        }
        .configurationDisplayName("Nutrition Rings")
        .description("Summarizes calories and protein intake targets.")
        .supportedFamilies([.systemSmall, .accessoryCircular])
        .contentMarginsDisabled()
    }
}

struct DetailedNutritionWidget: Widget {
    let kind: String = "MickeysMindNutritionWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            DetailedNutritionView(entry: entry)
        }
        .configurationDisplayName("Detailed Nutrition")
        .description("Progress board detailing calories, protein, and fat.")
        .supportedFamilies([.systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

struct CalorieHistoryWidget: Widget {
    let kind: String = "MickeysMindCalorieChartWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            CalorieHistoryView(entry: entry)
        }
        .configurationDisplayName("Calorie History")
        .description("Bar chart plotting calorie history for the past 7 days.")
        .supportedFamilies([.systemMedium])
        .contentMarginsDisabled()
    }
}

struct WeightTrackerWidget: Widget {
    let kind: String = "MickeysMindWeightWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            WeightTrackerView(entry: entry)
        }
        .configurationDisplayName("Weight Tracker")
        .description("Displays your latest recorded weight and yesterday AM/PM values.")
        .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryRectangular])
        .contentMarginsDisabled()
    }
}

struct WeightTrendWidget: Widget {
    let kind: String = "MickeysMindWeightChartWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            WeightTrendView(entry: entry)
        }
        .configurationDisplayName("Weight Graph")
        .description("Line chart depicting weight trend for the past 7 days.")
        .supportedFamilies([.systemMedium])
        .contentMarginsDisabled()
    }
}

struct CombinedDashboardWidget: Widget {
    let kind: String = "MickeysMindDashboardWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            CombinedDashboardView(entry: entry)
        }
        .configurationDisplayName("Combined Dashboard")
        .description("Premium glassmorphic overview of all core metrics.")
        .supportedFamilies([.systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}
