import * as React from "react"

const SidebarContext = React.createContext()

const SidebarProvider = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false)

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

const useSidebar = () => {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider")
  }
  return context
}

const Sidebar = React.forwardRef(({ className, ...props }, ref) => (
  <aside
    ref={ref}
    className={`flex flex-col ${className || ''}`}
    {...props}
  />
))
Sidebar.displayName = "Sidebar"

const SidebarHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex items-center justify-between p-4 ${className || ''}`}
    {...props}
  />
))
SidebarHeader.displayName = "SidebarHeader"

const SidebarContent = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex-1 overflow-auto ${className || ''}`}
    {...props}
  />
))
SidebarContent.displayName = "SidebarContent"

const SidebarFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`p-4 ${className || ''}`}
    {...props}
  />
))
SidebarFooter.displayName = "SidebarFooter"

const SidebarMenu = React.forwardRef(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    className={`space-y-1 ${className || ''}`}
    {...props}
  />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={className}
    {...props}
  />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

const SidebarMenuButton = React.forwardRef(({ className, asChild, ...props }, ref) => {
  if (asChild && React.isValidElement(props.children)) {
    return React.cloneElement(props.children, {
      ref,
      className: `${className || ''} ${props.children.props.className || ''}`,
      ...props
    })
  }

  return (
    <button
      ref={ref}
      type="button"
      className={className}
      {...props}
    />
  )
})
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarTrigger = React.forwardRef(({ className, ...props }, ref) => {
  const { isCollapsed, setIsCollapsed } = useSidebar()

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => setIsCollapsed(!isCollapsed)}
      className={className}
      {...props}
    />
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

export {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar
}