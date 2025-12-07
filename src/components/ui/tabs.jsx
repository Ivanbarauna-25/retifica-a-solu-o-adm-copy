import React from "react"

const TabsContext = React.createContext()

const Tabs = ({ value, onValueChange, defaultValue, className, children, ...props }) => {
  const [activeTab, setActiveTab] = React.useState(value || defaultValue)

  React.useEffect(() => {
    if (value !== undefined) {
      setActiveTab(value)
    }
  }, [value])

  const handleTabChange = (newValue) => {
    if (value === undefined) {
      setActiveTab(newValue)
    }
    onValueChange?.(newValue)
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className || ''}`}
    {...props}
  />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef(({ className, value, ...props }, ref) => {
  const { activeTab, setActiveTab } = React.useContext(TabsContext)
  const isActive = activeTab === value

  return (
    <button
      ref={ref}
      type="button"
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isActive
          ? 'bg-background text-foreground shadow-sm'
          : 'hover:bg-background/50 hover:text-foreground'
      } ${className || ''}`}
      onClick={() => setActiveTab(value)}
      {...props}
    />
  )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef(({ className, value, ...props }, ref) => {
  const { activeTab } = React.useContext(TabsContext)
  
  if (activeTab !== value) return null

  return (
    <div
      ref={ref}
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className || ''}`}
      {...props}
    />
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }