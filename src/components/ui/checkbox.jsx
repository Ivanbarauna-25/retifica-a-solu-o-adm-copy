import * as React from "react"

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => {
  const [isChecked, setIsChecked] = React.useState(checked || false)

  React.useEffect(() => {
    if (checked !== undefined) {
      setIsChecked(checked)
    }
  }, [checked])

  const handleChange = () => {
    const newValue = !isChecked
    if (checked === undefined) {
      setIsChecked(newValue)
    }
    onCheckedChange?.(newValue)
  }

  return (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={isChecked}
      className={`peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        isChecked ? 'bg-primary text-primary-foreground' : 'bg-background'
      } ${className || ''}`}
      onClick={handleChange}
      {...props}
    >
      {isChecked && (
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  )
})
Checkbox.displayName = "Checkbox"

export { Checkbox }