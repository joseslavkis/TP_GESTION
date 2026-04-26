interface GroupIconProps {
  name: string;
}

export const GroupIcon = ({ name }: GroupIconProps) => {
  const hue =
    Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
  const bgColor = `hsl(${hue}, 65%, 78%)`;
  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase())
      .join("") || "?";

  return (
    <div
      className="flex size-12 shrink-0 items-center justify-center rounded-xl text-accent-foreground"
      style={{ backgroundColor: bgColor }}
    >
      {initials}
    </div>
  );
};
