import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import type { GroupPublic } from "@/client"
import { GroupIcon } from "@/components/Groups/GroupIcon"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/utils/currency"

interface GroupCardProps {
  key: string
  groupPublic: GroupPublic
}

export const GroupCard = ({ _key, groupPublic }: GroupCardProps) => {
  const { name, description, id, current_user_balance } = groupPublic
  const balanceStatus =
    current_user_balance === 0
      ? "¡Todo saldado!"
      : current_user_balance < 0
        ? "Debés"
        : "Te deben"

  return (
    <Link
      to="/groups/$groupId"
      params={{ groupId: id }}
      className="flex w-full flex-col gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent/40 active:scale-[0.99] md:flex-row md:items-center md:justify-between"
    >
      <div className="flex min-w-0 items-center gap-3">
        <GroupIcon name={name} />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{name}</h2>
            <Badge
              variant={current_user_balance < 0 ? "destructive" : "secondary"}
            >
              {current_user_balance === 0
                ? balanceStatus
                : `${balanceStatus} ${formatCurrency(Math.abs(current_user_balance))}`}
            </Badge>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {description || "Sin descripcion"}
          </p>
        </div>
      </div>

      <div className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
        <span>Abrir</span>
        <ArrowRight className="size-4" />
      </div>
    </Link>
  )
}
