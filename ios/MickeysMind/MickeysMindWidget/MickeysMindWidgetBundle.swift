import WidgetKit
import SwiftUI

@main
struct MickeysMindWidgetBundle: WidgetBundle {
    var body: some Widget {
        WaterStatusWidget()
        HabitsStreakWidget()
        StreakCalendarWidget()
        MacrosRingsWidget()
        DetailedNutritionWidget()
        CalorieHistoryWidget()
        WeightTrackerWidget()
        WeightTrendWidget()
        CombinedDashboardWidget()
    }
}
