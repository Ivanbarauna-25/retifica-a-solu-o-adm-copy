import * as React from "react"

const ScrollArea = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={`relative overflow-hidden ${className || ''}`}
    {...props}
  >
    <div className="h-full w-full rounded-[inherit] overflow-auto">
      {children}
    </div>
  </div>
))
ScrollArea.displayName = "ScrollArea"

export { ScrollArea }