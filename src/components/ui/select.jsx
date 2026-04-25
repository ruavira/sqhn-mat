"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

// Detect mobile once at module level (updated on resize via hook)
function useIsMobile() {
  const [mobile, setMobile] = React.useState(() => window.innerWidth < 768);
  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}

// ---------------------------------------------------------------------------
// Context to wire Select state into the mobile Drawer implementation
// ---------------------------------------------------------------------------
const SelectCtx = React.createContext(null);

// ---------------------------------------------------------------------------
// Mobile Drawer-based Select
// ---------------------------------------------------------------------------
function MobileSelect({ children, value, defaultValue, onValueChange, disabled, name, required }) {
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? '');
  const controlled = value !== undefined;
  const currentValue = controlled ? value : internalValue;

  const handleSelect = (val) => {
    if (!controlled) setInternalValue(val);
    onValueChange?.(val);
    setOpen(false);
  };

  return (
    <SelectCtx.Provider value={{ currentValue, handleSelect, open, setOpen, disabled }}>
      {/* Hidden native input for form support */}
      {name && <input type="hidden" name={name} value={currentValue} required={required} />}
      {children}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="pb-safe">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Select an option</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 max-h-[60vh] overflow-y-auto">
            <SelectCtx.Provider value={{ currentValue, handleSelect, open, setOpen, disabled, isDrawerContent: true }}>
              {children}
            </SelectCtx.Provider>
          </div>
        </DrawerContent>
      </Drawer>
    </SelectCtx.Provider>
  );
}

// ---------------------------------------------------------------------------
// Public API — same exports as before, but mobile-aware
// ---------------------------------------------------------------------------

const Select = (props) => {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileSelect {...props} />;
  return <SelectPrimitive.Root {...props} />;
};

const SelectGroup = SelectPrimitive.Group;

const SelectValue = React.forwardRef((props, ref) => {
  const ctx = React.useContext(SelectCtx);
  // In desktop mode ctx is null — fall through to Radix
  if (!ctx || ctx.isDrawerContent) return <SelectPrimitive.Value ref={ref} {...props} />;
  // Mobile trigger: show current value label or placeholder
  return (
    <span className={ctx.currentValue ? '' : 'text-muted-foreground'}>
      {ctx.currentValue || props.placeholder || ''}
    </span>
  );
});
SelectValue.displayName = 'SelectValue';

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(SelectCtx);

  // Mobile trigger — opens the Drawer
  if (ctx && !ctx.isDrawerContent) {
    return (
      <button
        ref={ref}
        type="button"
        disabled={ctx.disabled}
        onClick={() => ctx.setOpen(true)}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    );
  }

  // Desktop trigger (Radix)
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});
SelectTrigger.displayName = 'SelectTrigger';

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => {
  const ctx = React.useContext(SelectCtx);

  // Inside Drawer on mobile — render plain list, no portal/popover
  if (ctx?.isDrawerContent) {
    return <div className={cn("py-1", className)}>{children}</div>;
  }
  // Desktop — Radix portal popover
  if (!ctx) {
    return (
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          ref={ref}
          className={cn(
            "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            position === "popper" &&
              "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
            className
          )}
          position={position}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.Viewport
            className={cn("p-1", position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>
            {children}
          </SelectPrimitive.Viewport>
          <SelectScrollDownButton />
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    );
  }
  // Mobile but not yet inside drawer content — content is rendered inside the Drawer, not here
  return null;
});
SelectContent.displayName = 'SelectContent';

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => {
  const ctx = React.useContext(SelectCtx);
  if (ctx?.isDrawerContent) {
    return <div ref={ref} className={cn("px-3 py-2 text-xs font-semibold text-muted-foreground", className)} {...props} />;
  }
  return (
    <SelectPrimitive.Label
      ref={ref}
      className={cn("px-2 py-1.5 text-sm font-semibold", className)}
      {...props} />
  );
});
SelectLabel.displayName = 'SelectLabel';

const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => {
  const ctx = React.useContext(SelectCtx);

  if (ctx?.isDrawerContent) {
    const isSelected = ctx.currentValue === value;
    return (
      <button
        ref={ref}
        type="button"
        onClick={() => ctx.handleSelect(value)}
        className={cn(
          "relative flex w-full items-center rounded-md px-3 py-3 text-sm text-left transition-colors",
          isSelected ? "bg-accent text-accent-foreground font-medium" : "hover:bg-muted",
          props.disabled && "pointer-events-none opacity-50",
          className
        )}
      >
        {children}
        {isSelected && <Check className="ml-auto h-4 w-4 shrink-0" />}
      </button>
    );
  }

  return (
    <SelectPrimitive.Item
      ref={ref}
      value={value}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});
SelectItem.displayName = 'SelectItem';

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => {
  const ctx = React.useContext(SelectCtx);
  if (ctx?.isDrawerContent) {
    return <div ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />;
  }
  return (
    <SelectPrimitive.Separator
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      {...props} />
  );
});
SelectSeparator.displayName = 'SelectSeparator';

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}