// src/components/common/loading-spinner.tsx
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  text?: string;
}

export function LoadingSpinner({ size = 24, className, text }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center space-y-2", className)}>
      <Loader2 style={{ width: size, height: size }} className="animate-spin text-primary" />
      {text && <p className="text-sm text-muted-foreground font-body">{text}</p>}
    </div>
  );
}
