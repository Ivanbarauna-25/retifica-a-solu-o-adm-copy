import * as React from "react"

const RadioGroupContext = React.createContext(null);

const RadioGroup = React.forwardRef(({ className, value, onValueChange, children, ...props }, ref) => {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div
        ref={ref}
        role="radiogroup"
        className={className}
        {...props}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
});
RadioGroup.displayName = "RadioGroup";

const RadioGroupItem = React.forwardRef(({ className, value, id, ...props }, ref) => {
  const context = React.useContext(RadioGroupContext);
  const isSelected = context?.value === value;

  const handleClick = () => {
    context?.onValueChange?.(value);
  };

  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={isSelected}
      id={id}
      className={`aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center ${
        isSelected ? 'bg-primary border-primary' : 'bg-background'
      } ${className || ''}`}
      onClick={handleClick}
      {...props}
    >
      {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
    </button>
  );
});
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };