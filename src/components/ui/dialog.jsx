import * as React from "react";

const DialogContext = React.createContext();

const Dialog = ({ open, onOpenChange, children }) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {open &&
      <>
          <div className="bg-background/80 text-slate-950 fixed inset-0 z-50 backdrop-blur-sm"

        onClick={() => onOpenChange?.(false)} />

          {children}
        </>
      }
    </DialogContext.Provider>);

};

const DialogContent = React.forwardRef(({ className, children, onPointerDownOutside, onEscapeKeyDown, ...props }, ref) => {
  const { onOpenChange } = React.useContext(DialogContext);

  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (onEscapeKeyDown) {
          onEscapeKeyDown(e);
        }
        if (!e.defaultPrevented) {
          onOpenChange?.(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onOpenChange, onEscapeKeyDown]);

  const handlePointerDown = (e) => {
    if (e.target === e.currentTarget) {
      if (onPointerDownOutside) {
        onPointerDownOutside(e);
      }
      if (!e.defaultPrevented) {
        onOpenChange?.(false);
      }
    }
  };

  return (
    <div
      className={`fixed left-[50%] top-[50%] z-50 w-full translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 sm:rounded-lg ${className || ''}`}
      ref={ref}
      onPointerDown={handlePointerDown}
      {...props}>

      {children}
      <button
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-50"
        onClick={() => onOpenChange?.(false)}>

        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">

          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        <span className="sr-only">Close</span>
      </button>
    </div>);

});
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, ...props }) =>
<div
  className={`flex flex-col space-y-1.5 text-center sm:text-left ${className || ''}`}
  {...props} />;


DialogHeader.displayName = "DialogHeader";

const DialogTitle = React.forwardRef(({ className, ...props }, ref) =>
<h2
  ref={ref}
  className={`text-lg font-semibold leading-none tracking-tight ${className || ''}`}
  {...props} />

);
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef(({ className, ...props }, ref) =>
<p
  ref={ref}
  className={`text-sm text-muted-foreground ${className || ''}`}
  {...props} />

);
DialogDescription.displayName = "DialogDescription";

const DialogFooter = ({ className, ...props }) =>
<div
  className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className || ''}`}
  {...props} />;


DialogFooter.displayName = "DialogFooter";

const DialogClose = React.forwardRef(({ className, children, ...props }, ref) => {
  const { onOpenChange } = React.useContext(DialogContext);

  return (
    <button
      ref={ref}
      type="button"
      className={className}
      onClick={() => onOpenChange?.(false)}
      {...props}>

      {children}
    </button>);

});
DialogClose.displayName = "DialogClose";

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose };