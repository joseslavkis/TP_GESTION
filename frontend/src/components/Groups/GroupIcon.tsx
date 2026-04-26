interface GroupIconProps {
  name: string
}

export const GroupIcon = ({ name }: GroupIconProps) => {
  const hue =
    Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360
  const bgLight = `hsl(${hue}, 70%, 78%)`
  const bgDark = `hsl(${hue}, 60%, 68%)`
  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase())
      .join("") || "?"

  return (
    <div
      className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-(--group-icon-bg-light) text-slate-900 ring-1 ring-black/10 dark:bg-(--group-icon-bg-dark) dark:text-slate-900 dark:ring-white/10"
      style={
        {
          "--group-icon-bg-light": bgLight,
          "--group-icon-bg-dark": bgDark,
        } as React.CSSProperties
      }
    >
      {initials}
    </div>
  )
}
