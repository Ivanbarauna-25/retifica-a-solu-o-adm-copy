import React from "react"

const PopoverContext = React.createContext()

const Popover = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <PopoverContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block">
        {children}
      </div>
    </PopoverContext.Provider>
  )
}

const PopoverTrigger = React.forwardRef(({ className, children, asChild, ...props }, ref) => {
  const { setIsOpen } = React.useContext(PopoverContext)

  const handleClick = () => {
    setIsOpen(prev => !prev)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref,
      onClick: handleClick,
      ...props
    })
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      className={className}
      {...props}
    >
      {children}
    </button>
  )
})
PopoverTrigger.displayName = "PopoverTrigger"

const PopoverContent = React.forwardRef(({ className, align = "center", sideOffset = 4, children, ...props }, ref) => {
  const { isOpen, setIsOpen } = React.useContext(PopoverContext)
  const contentRef = React.useRef(null)

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (contentRef.current && !contentRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, setIsOpen])

  if (!isOpen) return null

  const alignmentClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0'
  }

  return (
    <div
      ref={contentRef}
      className={`absolute z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none ${alignmentClasses[align]} ${className || ''}`}
      style={{ top: '100%', marginTop: `${sideOffset}px` }}
      {...props}
    >
      {children}
    </div>
  )
})
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverContent }