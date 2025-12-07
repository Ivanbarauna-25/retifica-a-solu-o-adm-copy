import React from "react"

const TooltipContext = React.createContext()

const TooltipProvider = ({ children, delayDuration = 200 }) => {
  return (
    <TooltipContext.Provider value={{ delayDuration }}>
      {children}
    </TooltipContext.Provider>
  )
}

const Tooltip = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  
  return (
    <div className="relative inline-block">
      {React.Children.map(children, (child) => {
        if (child.type === TooltipTrigger) {
          return React.cloneElement(child, { setIsOpen })
        }
        if (child.type === TooltipContent) {
          return React.cloneElement(child, { isOpen })
        }
        return child
      })}
    </div>
  )
}

const TooltipTrigger = React.forwardRef(({ className, children, setIsOpen, asChild, ...props }, ref) => {
  const handleMouseEnter = () => setIsOpen?.(true)
  const handleMouseLeave = () => setIsOpen?.(false)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      ...props
    })
  }

  return (
    <div
      ref={ref}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </div>
  )
})
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef(({ className, isOpen, sideOffset = 4, ...props }, ref) => {
  if (!isOpen) return null

  return (
    <div
      ref={ref}
      className={`absolute z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 ${className || ''}`}
      style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: `${sideOffset}px` }}
      {...props}
    />
  )
})
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }