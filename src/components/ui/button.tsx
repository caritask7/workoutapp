import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
export type ButtonSize = "lg" | "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 select-none text-center font-display [&_svg]:shrink-0 font-bold uppercase tracking-[0.04em] transition-[background-color,border-color,color,transform,box-shadow] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-lime text-on-lime hover:bg-lime-press active:bg-lime-press glow-lime-strong",
  secondary:
    "border border-line-strong bg-transparent text-ink-strong hover:border-lime hover:bg-lime/8",
  ghost: "bg-transparent text-ink hover:bg-surface-3",
  subtle: "bg-surface-3 text-ink-strong hover:bg-surface-4",
  danger: "bg-surface-3 text-danger-soft hover:bg-danger/15",
};

const sizes: Record<ButtonSize, string> = {
  lg: "min-h-[52px] rounded-[14px] px-5 py-2 text-[14px] leading-tight sm:text-[15px]",
  md: "h-11 whitespace-nowrap rounded-xl px-4 text-[13px]",
  sm: "h-9 whitespace-nowrap rounded-full px-3.5 text-[11px] tracking-[0.06em]",
};

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function buttonClass({ variant = "primary", size = "md", block }: Omit<StyleProps, "icon" | "trailingIcon">) {
  return cn(base, variants[variant], sizes[size], block && "w-full");
}

export interface ButtonProps extends ComponentProps<"button">, StyleProps {
  loading?: boolean;
}

export function Button({
  variant,
  size,
  block,
  icon,
  trailingIcon,
  loading,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClass({ variant, size, block }), className)}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-[1.15em] animate-spin" aria-hidden /> : icon}
      {children}
      {trailingIcon}
    </button>
  );
}

export interface ButtonLinkProps extends ComponentProps<typeof Link>, StyleProps {}

export function ButtonLink({ variant, size, block, icon, trailingIcon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={cn(buttonClass({ variant, size, block }), className)} {...rest}>
      {icon}
      {children}
      {trailingIcon}
    </Link>
  );
}

export interface IconButtonProps extends ComponentProps<"button"> {
  label: string;
  variant?: "subtle" | "ghost" | "lime" | "outline";
  size?: "sm" | "md" | "lg";
}

const iconVariants = {
  subtle: "bg-surface-3 text-ink-strong hover:bg-surface-4",
  ghost: "text-ink hover:bg-surface-3",
  lime: "bg-lime/15 text-lime hover:bg-lime/25",
  outline: "border border-line-strong text-ink-strong hover:border-lime",
};
const iconSizes = { sm: "size-8 rounded-lg", md: "size-10 rounded-xl", lg: "size-12 rounded-[14px]" };

export function IconButton({ label, variant = "subtle", size = "md", className, type = "button", children, ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center transition-colors active:scale-95 disabled:pointer-events-none disabled:opacity-40",
        iconVariants[variant],
        iconSizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
