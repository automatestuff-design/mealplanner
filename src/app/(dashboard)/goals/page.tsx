import { Header } from '@/components/layout/Header'
import { MacroGoalsForm } from '@/components/goals/MacroGoalsForm'

export default function GoalsPage() {
  return (
    <div>
      <Header title="Macro Goals" />
      <div className="p-6">
        <p className="text-sm text-muted-foreground mb-6 max-w-xl">
          Set your daily macro targets. The app will score recipes by how well they
          fill your remaining goals for the day, and show your progress in the planner.
        </p>
        <MacroGoalsForm />
      </div>
    </div>
  )
}
