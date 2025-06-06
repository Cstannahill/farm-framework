/**
 * FARM UI Components
 *
 * A collection of reusable React components for FARM applications
 */

import type { ReactNode } from "react";

// Export types
export type { FarmConfig } from "@farm/types";

// Component exports (placeholder - will be implemented)
export interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  onClick?: () => void;
}

// Placeholder button component
export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  onClick,
}: ButtonProps) {
  return (
    <button
      className={`farm-button farm-button--${variant} farm-button--${size}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// Version info
export const VERSION = "0.1.0";
