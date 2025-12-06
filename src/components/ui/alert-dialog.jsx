import * as React from "react"

const AlertDialogContext = React.createContext()

const AlertDialog = ({ open, onOpenChange, children }) => {
  return (
    <AlertDialogContext.Provider value={{ open, onOpenChange }}>
      {open && (
        <>
          <div 
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={() => onOpenChange?.(false)}
          />
          {children}
        </>
      )}
    </AlertDialogContext.Provider>
  )
}

const AlertDialogContent = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg ${className || ''}`}
      {...props}
    />
  )
})
AlertDialogContent.displayName = "AlertDialogContent"

const AlertDialogHeader = ({ className, ...props }) => (
  <div
    className={`flex flex-col space-y-2 text-center sm:text-left ${className || ''}`}
    {...props}
  />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({ className, ...props }) => (
  <div
    className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className || ''}`}
    {...props}
  />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={`text-lg font-semibold ${className || ''}`}
    {...props}
  />
))
AlertDialogTitle.displayName = "AlertDialogTitle"

const AlertDialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm text-muted-foreground ${className || ''}`}
    {...props}
  />
))
AlertDialogDescription.displayName = "AlertDialogDescription"

const AlertDialogAction = React.forwardRef(({ className, onClick, ...props }, ref) => {
  const { onOpenChange } = React.useContext(AlertDialogContext)
  
  const handleClick = (e) => {
    onClick?.(e)
    onOpenChange?.(false)
  }

  return (
    <button
      ref={ref}
      className={`inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${className || ''}`}
      onClick={handleClick}
      {...props}
    />
  )
})
AlertDialogAction.displayName = "AlertDialogAction"

const AlertDialogCancel = React.forwardRef(({ className, onClick, ...props }, ref) => {
  const { onOpenChange } = React.useContext(AlertDialogContext)
  
  const handleClick = (e) => {
    onClick?.(e)
    onOpenChange?.(false)
  }

  return (
    <button
      ref={ref}
      className={`inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-semibold ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${className || ''}`}
      onClick={handleClick}
      {...props}
    />
  )
})
AlertDialogCancel.displayName = "AlertDialogCancel"

export {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}