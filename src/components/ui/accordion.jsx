import React from "react"

const AccordionContext = React.createContext()

const Accordion = ({ type, value, onValueChange, defaultValue, collapsible, className, children, ...props }) => {
  const [internalValue, setInternalValue] = React.useState(value || defaultValue || (type === "multiple" ? [] : ""))

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value)
    }
  }, [value])

  const handleValueChange = (itemValue) => {
    let newValue
    
    if (type === "multiple") {
      // Multiple mode: toggle items in array
      const currentArray = Array.isArray(internalValue) ? internalValue : []
      if (currentArray.includes(itemValue)) {
        newValue = currentArray.filter(v => v !== itemValue)
      } else {
        newValue = [...currentArray, itemValue]
      }
    } else {
      // Single mode: toggle or replace
      if (collapsible && internalValue === itemValue) {
        newValue = ""
      } else {
        newValue = itemValue
      }
    }

    if (value === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
  }

  const isItemOpen = (itemValue) => {
    if (type === "multiple") {
      return Array.isArray(internalValue) && internalValue.includes(itemValue)
    }
    return internalValue === itemValue
  }

  return (
    <AccordionContext.Provider value={{ isItemOpen, handleValueChange }}>
      <div className={className} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

const AccordionItem = React.forwardRef(({ className, value, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`border-b ${className || ''}`}
      data-state={value}
      {...props}
    />
  )
})
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef(({ className, children, value, ...props }, ref) => {
  const { isItemOpen, handleValueChange } = React.useContext(AccordionContext)
  const isOpen = isItemOpen(value)

  return (
    <button
      ref={ref}
      type="button"
      className={`flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180 ${className || ''}`}
      data-state={isOpen ? "open" : "closed"}
      onClick={() => handleValueChange(value)}
      {...props}
    >
      {children}
      <svg
        className="h-4 w-4 shrink-0 transition-transform duration-200"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  )
})
AccordionTrigger.displayName = "AccordionTrigger"

const AccordionContent = React.forwardRef(({ className, children, value, ...props }, ref) => {
  const { isItemOpen } = React.useContext(AccordionContext)
  const isOpen = isItemOpen(value)

  if (!isOpen) return null

  return (
    <div
      ref={ref}
      className={`overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down ${className || ''}`}
      data-state={isOpen ? "open" : "closed"}
      {...props}
    >
      <div className="pb-4 pt-0">
        {children}
      </div>
    </div>
  )
})
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }