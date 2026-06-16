import Foundation

public struct WidgetMetrics: Codable {
    public let caloriesTarget: Double
    public let caloriesLogged: Double
    public let proteinTarget: Double
    public let proteinLogged: Double
    public let waterTarget: Double
    public let waterLogged: Double
    public let fatTarget: Double
    public let fatLogged: Double
    public let theme: String
    public let latestWeight: Double
    public let latestWeightTime: String // "AM" or "PM"
    public let yesterdayAMWeight: Double?
    public let yesterdayPMWeight: Double?
    public let weightHistory: [WeightPoint]
    public let streakCount: Int
    public let habits: [HabitProgress]
}

public struct WeightPoint: Codable, Identifiable {
    public var id: String { date }
    public let date: String // MM-dd
    public let weight: Double
    public let type: String // "AM" or "PM"
}

public struct HabitProgress: Codable, Identifiable {
    public var id: String { name }
    public let name: String
    public let streak: Int
    public let completedToday: Bool
    public let last7DaysCompletions: [Bool] // [Mon, Tue, Wed...]
}

public class FirestoreClient {
    public static let shared = FirestoreClient()
    private let appGroupSuite = "group.com.miki.mikismind"
    
    private init() {}
    
    public func getStoredUserId() -> String? {
        return UserDefaults(suiteName: appGroupSuite)?.string(forKey: "userId")
    }
    
    public func saveUserId(_ userId: String) {
        UserDefaults(suiteName: appGroupSuite)?.set(userId, forKey: "userId")
    }
    
    public func fetchMetrics() async throws -> WidgetMetrics {
        guard let userId = getStoredUserId(), !userId.isEmpty else {
            throw NSError(domain: "FirestoreClient", code: 401, userInfo: [NSLocalizedDescriptionKey: "User ID not set. Please open Mickey's Mind app."])
        }
        
        let urlString = "https://firestore.googleapis.com/v1/projects/mikismind-6b4a9/databases/(default)/documents/users/\(userId)"
        guard let url = URL(string: urlString) else {
            throw NSError(domain: "FirestoreClient", code: 400, userInfo: [NSLocalizedDescriptionKey: "Invalid project setup."])
        }
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw NSError(domain: "FirestoreClient", code: 500, userInfo: [NSLocalizedDescriptionKey: "Failed to connect to Mickey's Mind database."])
        }
        
        let json = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any]
        guard let fields = json?["fields"] as? [String: Any] else {
            throw NSError(domain: "FirestoreClient", code: 500, userInfo: [NSLocalizedDescriptionKey: "Empty account state."])
        }
        
        // 1. Theme (local device override, fallback to synced Firestore theme)
        let localTheme = UserDefaults(suiteName: appGroupSuite)?.string(forKey: "localWidgetTheme")
        let theme = localTheme ?? (getStringValue(fields["theme"]) ?? "current")
        
        // 2. Widget Today Summary (or fallback targets)
        var calTarget = 3000.0, calLogged = 0.0
        var protTarget = 130.0, protLogged = 0.0
        var waterTarget = 3000.0, waterLogged = 0.0
        var fatTarget = 80.0, fatLogged = 0.0
        
        if let widgetToday = getMapFields(fields["widgetToday"]) {
            calTarget = getDoubleValue(widgetToday["caloriesTarget"]) ?? calTarget
            calLogged = getDoubleValue(widgetToday["caloriesLogged"]) ?? calLogged
            protTarget = getDoubleValue(widgetToday["proteinTarget"]) ?? protTarget
            protLogged = getDoubleValue(widgetToday["proteinLogged"]) ?? protLogged
            waterTarget = getDoubleValue(widgetToday["waterTarget"]) ?? waterTarget
            waterLogged = getDoubleValue(widgetToday["waterLogged"]) ?? waterLogged
            fatTarget = getDoubleValue(widgetToday["fatTarget"]) ?? fatTarget
            fatLogged = getDoubleValue(widgetToday["fatLogged"]) ?? fatLogged
        }
        
        // 3. Streaks & Daily Logs
        let dailyLogsMap = getMapFields(fields["dailyLogs"]) ?? [:]
        
        // Sort dates descending
        let dateKeys = dailyLogsMap.keys.sorted(by: >)
        
        // Find latest weights
        var latestWeight = 0.0
        var latestWeightTime = ""
        var yesterdayAMWeight: Double? = nil
        var yesterdayPMWeight: Double? = nil
        
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let todayStr = formatter.string(from: Date())
        let yesterdayStr = formatter.string(from: Calendar.current.date(byAdding: .day, value: -1, to: Date())!)
        
        // Scan for weight logs
        for dateKey in dateKeys {
            if let log = getMapFields(dailyLogsMap[dateKey]) {
                let night = getDoubleValue(log["nightWeight"])
                let morning = getDoubleValue(log["morningWeight"])
                
                if latestWeight == 0.0 {
                    if let n = night, n > 0 {
                        latestWeight = n
                        latestWeightTime = "PM"
                    } else if let m = morning, m > 0 {
                        latestWeight = m
                        latestWeightTime = "AM"
                    }
                }
                
                if dateKey == yesterdayStr {
                    yesterdayAMWeight = morning
                    yesterdayPMWeight = night
                }
            }
        }
        
        // Weight History last 7 days
        var weightHistory: [WeightPoint] = []
        for i in (0..<7).reversed() {
            let targetDate = Calendar.current.date(byAdding: .day, value: -i, to: Date())!
            let targetDateStr = formatter.string(from: targetDate)
            
            // Format for charts
            let displayFormatter = DateFormatter()
            displayFormatter.dateFormat = "E d"
            let chartLabel = displayFormatter.string(from: targetDate)
            
            if let log = getMapFields(dailyLogsMap[targetDateStr]) {
                if let m = getDoubleValue(log["morningWeight"]), m > 0 {
                    weightHistory.append(WeightPoint(date: chartLabel, weight: m, type: "AM"))
                }
                if let n = getDoubleValue(log["nightWeight"]), n > 0 {
                    weightHistory.append(WeightPoint(date: chartLabel, weight: n, type: "PM"))
                }
            }
        }
        
        // Habits Progress & Streak Calculations
        let targetsMap = getMapFields(fields["targets"]) ?? [:]
        let customHabitsListArray = getArrayValues(fields["customHabitsList"])
        var habits: [HabitProgress] = []
        var mainStreak = 0
        
        // 1. Water, Gym, Meals tracking as default habits
        let defaultHabitsConfig = [
            ("Water Intake", "water"),
            ("Gym Workout", "gym"),
            ("Meals & Nutrition", "meals")
        ]
        
        for (habitName, type) in defaultHabitsConfig {
            var streak = 0
            var completedToday = false
            var last7Completions: [Bool] = []
            
            // Calculate streak
            var offset = 0
            while true {
                let checkDate = Calendar.current.date(byAdding: .day, value: -offset, to: Date())!
                let checkDateStr = formatter.string(from: checkDate)
                
                let isCompleted = getDailyLogCompletion(for: checkDateStr, type: type, dailyLogsMap: dailyLogsMap, targetsMap: targetsMap)
                if isCompleted {
                    streak += 1
                    if offset == 0 { completedToday = true }
                    offset += 1
                } else {
                    if offset == 0 {
                        // Check if yesterday was completed to preserve yesterday's streak
                        offset += 1
                        continue
                    }
                    break
                }
            }
            
            // Calculate last 7 days completions
            for i in (0..<7).reversed() {
                let checkDate = Calendar.current.date(byAdding: .day, value: -i, to: Date())!
                let checkDateStr = formatter.string(from: checkDate)
                let isCompleted = getDailyLogCompletion(for: checkDateStr, type: type, dailyLogsMap: dailyLogsMap, targetsMap: targetsMap)
                last7Completions.append(isCompleted)
            }
            
            habits.append(HabitProgress(name: habitName, streak: streak, completedToday: completedToday, last7DaysCompletions: last7Completions))
            
            if streak > mainStreak {
                mainStreak = streak
            }
        }
        
        // 2. Custom habits from Firestore user profile list
        for habitNameVal in customHabitsListArray {
            guard let habitName = getStringValue(habitNameVal) else { continue }
            
            var streak = 0
            var completedToday = false
            var last7Completions: [Bool] = []
            
            // Calculate streak
            var offset = 0
            while true {
                let checkDate = Calendar.current.date(byAdding: .day, value: -offset, to: Date())!
                let checkDateStr = formatter.string(from: checkDate)
                
                if let log = getMapFields(dailyLogsMap[checkDateStr]),
                   let habitsCheckedMap = getMapFields(log["customHabits"]),
                   let isChecked = getBoolValue(habitsCheckedMap[habitName]), isChecked {
                    
                    streak += 1
                    if offset == 0 { completedToday = true }
                    offset += 1
                } else {
                    if offset == 0 {
                        // Check if yesterday was completed to preserve yesterday's streak
                        offset += 1
                        continue
                    }
                    break
                }
            }
            
            // Calculate last 7 days completions
            for i in (0..<7).reversed() {
                let checkDate = Calendar.current.date(byAdding: .day, value: -i, to: Date())!
                let checkDateStr = formatter.string(from: checkDate)
                
                var done = false
                if let log = getMapFields(dailyLogsMap[checkDateStr]),
                   let habitsCheckedMap = getMapFields(log["customHabits"]),
                   let isChecked = getBoolValue(habitsCheckedMap[habitName]) {
                    done = isChecked
                }
                last7Completions.append(done)
            }
            
            habits.append(HabitProgress(name: habitName, streak: streak, completedToday: completedToday, last7DaysCompletions: last7Completions))
            
            // Use highest habit streak as main streak representation
            if streak > mainStreak {
                mainStreak = streak
            }
        }
        
        let metrics = WidgetMetrics(
            caloriesTarget: calTarget,
            caloriesLogged: calLogged,
            proteinTarget: protTarget,
            proteinLogged: protLogged,
            waterTarget: waterTarget,
            waterLogged: waterLogged,
            fatTarget: fatTarget,
            fatLogged: fatLogged,
            theme: theme,
            latestWeight: latestWeight,
            latestWeightTime: latestWeightTime,
            yesterdayAMWeight: yesterdayAMWeight,
            yesterdayPMWeight: yesterdayPMWeight,
            weightHistory: weightHistory,
            streakCount: mainStreak,
            habits: habits
        )
        
        // Cache in UserDefaults for offline backup
        if let encoded = try? JSONEncoder().encode(metrics) {
            UserDefaults(suiteName: appGroupSuite)?.set(encoded, forKey: "cachedMetrics")
        }
        
        return metrics
    }
    
    public func getCachedMetrics() -> WidgetMetrics? {
        if let data = UserDefaults(suiteName: appGroupSuite)?.data(forKey: "cachedMetrics"),
           let decoded = try? JSONDecoder().decode(WidgetMetrics.self, from: data) {
            return decoded
        }
        return nil
    }
    
    // Firestore REST Parsing Helpers
    private func getStringValue(_ val: Any?) -> String? {
        guard let dict = val as? [String: Any] else { return nil }
        return dict["stringValue"] as? String
    }
    
    private func getBoolValue(_ val: Any?) -> Bool? {
        guard let dict = val as? [String: Any] else { return nil }
        return dict["booleanValue"] as? Bool
    }
    
    private func getDoubleValue(_ val: Any?) -> Double? {
        guard let dict = val as? [String: Any] else { return nil }
        if let doubleVal = dict["doubleValue"] as? Double {
            return doubleVal
        }
        if let stringVal = dict["integerValue"] as? String, let doubleVal = Double(stringVal) {
            return doubleVal
        }
        if let intVal = dict["integerValue"] as? Int {
            return Double(intVal)
        }
        return nil
    }
    
    private func getMapFields(_ val: Any?) -> [String: Any]? {
        guard let dict = val as? [String: Any],
              let mapValue = dict["mapValue"] as? [String: Any] else { return nil }
        return mapValue["fields"] as? [String: Any]
    }
    
    private func getArrayValues(_ val: Any?) -> [Any] {
        guard let dict = val as? [String: Any],
              let arrayValue = dict["arrayValue"] as? [String: Any] else { return [] }
        return arrayValue["values"] as? [Any] ?? []
    }
    
    private func getDailyLogCompletion(for dateStr: String, type: String, dailyLogsMap: [String: Any], targetsMap: [String: Any]) -> Bool {
        guard let log = getMapFields(dailyLogsMap[dateStr]) else { return false }
        let routineId = getStringValue(log["routineId"]) ?? "R"
        let routineTargets = getMapFields(targetsMap[routineId])
        
        if type == "water" {
            let waterTargetVal = getDoubleValue(routineTargets?["water"]) ?? 2500.0
            let waterLoggedVal = getDoubleValue(log["waterIntake"]) ?? 0.0
            return waterLoggedVal >= waterTargetVal
        } else if type == "gym" {
            return (routineId != "" && routineId != "R")
        } else if type == "meals" {
            let calTargetVal = getDoubleValue(routineTargets?["calories"]) ?? 3000.0
            let fatTargetVal = getDoubleValue(routineTargets?["fat"]) ?? 80.0
            let prot1TargetVal = getDoubleValue(routineTargets?["tier1Protein"]) ?? 100.0
            let prot2TargetVal = getDoubleValue(routineTargets?["tier2Protein"]) ?? 30.0
            
            let mealsArray = getArrayValues(log["meals"])
            var totalCalories = 0.0
            var totalFat = 0.0
            var totalTier1 = 0.0
            var totalTier2 = 0.0
            
            for mealVal in mealsArray {
                if let mealFields = getMapFields(mealVal) {
                    totalCalories += getDoubleValue(mealFields["calories"]) ?? 0.0
                    totalFat += getDoubleValue(mealFields["fat"]) ?? 0.0
                    totalTier1 += getDoubleValue(mealFields["tier1Protein"]) ?? 0.0
                    totalTier2 += getDoubleValue(mealFields["tier2Protein"]) ?? 0.0
                }
            }
            
            return (totalCalories >= calTargetVal * 0.95 &&
                    totalFat >= fatTargetVal * 0.9 &&
                    totalTier1 >= prot1TargetVal * 0.95 &&
                    totalTier2 >= prot2TargetVal * 0.9)
        }
        
        return false
    }
}
