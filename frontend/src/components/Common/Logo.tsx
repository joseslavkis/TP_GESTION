import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({
  variant = "full",
  className,
  asLink = true,
}: LogoProps) {
  const content =
    variant === "responsive" ? (
      <>
        <span
          className={cn(
            "font-semibold tracking-tight group-data-[collapsible=icon]:hidden",
            className,
          )}
        >
          Gastos Grupales
        </span>
        <span
          className={cn(
            "hidden text-base font-semibold group-data-[collapsible=icon]:block",
            className,
          )}
        >
          GG
        </span>
      </>
    ) : (
      <span
        className={cn(
          variant === "full"
            ? "text-2xl font-semibold tracking-tight"
            : "text-sm font-semibold",
          className,
        )}
      >
        {variant === "full" ? "Gastos Grupales" : "GG"}
      </span>
    )

  if (!asLink) {
    return content
  }

  return <Link to="/">{content}</Link>
}
