import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// --- BUTTON ---
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "accent";
  size?: "sm" | "default" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading, children, ...props }, ref) => {
    const variants = {
      default: "bg-gradient-to-b from-primary to-indigo-600 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 border border-primary/50",
      outline: "border-2 border-white/10 bg-transparent hover:bg-white/5 text-foreground",
      ghost: "bg-transparent hover:bg-white/5 text-foreground",
      destructive: "bg-gradient-to-b from-destructive to-red-700 text-destructive-foreground shadow-lg shadow-destructive/20 hover:shadow-destructive/40 border border-destructive/50 hover:-translate-y-0.5",
      accent: "bg-gradient-to-b from-accent to-amber-600 text-accent-foreground shadow-lg shadow-accent/20 hover:shadow-accent/40 border border-accent/50 font-semibold hover:-translate-y-0.5",
    };
    const sizes = {
      sm: "h-9 px-4 text-xs rounded-lg",
      default: "h-11 px-6 text-sm rounded-xl",
      lg: "h-14 px-8 text-base rounded-2xl",
      icon: "h-11 w-11 flex items-center justify-center rounded-xl",
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none active:translate-y-0",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

// --- INPUT ---
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <input
          className={cn(
            "flex h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-foreground shadow-inner transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <span className="text-xs text-destructive flex items-center gap-1 mt-1">
            <AlertCircle className="w-3 h-3" /> {error}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string }>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <select
          className={cn(
            "flex h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-foreground shadow-inner transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer",
            error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <span className="text-xs text-destructive flex items-center gap-1 mt-1">
            <AlertCircle className="w-3 h-3" /> {error}
          </span>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";


// --- MODAL ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}
export function Modal({ isOpen, onClose, title, description, children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl glass-panel p-6 shadow-2xl z-10"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-6">
              <h2 className="text-2xl font-display font-semibold text-foreground">{title}</h2>
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// --- BADGE ---
export function Badge({ children, className, variant = "default" }: { children: React.ReactNode; className?: string, variant?: "default"|"success"|"warning"|"danger"|"info" }) {
  const variants = {
    default: "bg-white/10 text-white",
    success: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    warning: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    danger: "bg-red-500/20 text-red-400 border border-red-500/30",
    info: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  };
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center", variants[variant], className)}>
      {children}
    </span>
  );
}
