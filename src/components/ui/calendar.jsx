import * as React from "react"

const Calendar = React.forwardRef(({ className, mode = "single", selected, onSelect, ...props }, ref) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date())

  const daysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const firstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const handleDateSelect = (day) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    onSelect?.(selectedDate)
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const days = daysInMonth(currentMonth)
  const firstDay = firstDayOfMonth(currentMonth)

  return (
    <div ref={ref} className={`p-3 ${className || ''}`} {...props}>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 hover:bg-accent rounded"
        >
          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="font-semibold">
          {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 hover:bg-accent rounded"
        >
          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
          <div key={day} className="font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1
          const isSelected = selected && 
            selected.getDate() === day && 
            selected.getMonth() === currentMonth.getMonth() &&
            selected.getFullYear() === currentMonth.getFullYear()
          
          return (
            <button
              key={day}
              type="button"
              onClick={() => handleDateSelect(day)}
              className={`p-2 rounded hover:bg-accent ${
                isSelected ? 'bg-primary text-primary-foreground' : ''
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
})
Calendar.displayName = "Calendar"

export { Calendar }