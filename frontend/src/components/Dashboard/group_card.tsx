import { Link } from "@tanstack/react-router";
import { formatARS } from "@/lib/currency";
import { GroupCardInfo } from "@/types/groups";

interface GroupCardProps {
  groupCardInfo: GroupCardInfo;
}

export const GroupCard = ({ groupCardInfo }: GroupCardProps) => {
  const {
    id,
    name,
    members: memberCount,
    total: totalExpenses,
    balance: userBalance,
    icon: icon,
  } = groupCardInfo;
  return (
    <Link
      to="/groups/$groupId"
      params={{ groupId: id }}
      className="w-full text-left rounded-2xl bg-card border border-border p-4 flex items-center gap-4 transition-colors hover:bg-accent/40 active:scale-[0.99]"
    >
      {/* Icono */}
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        {icon}
      </div>

      {/* Información del Grupo */}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground truncate">{name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {memberCount} miembros · {formatARS(totalExpenses)} en total
        </p>
      </div>

      {/* Estado del Balance */}
      <div className="text-right shrink-0">
        {userBalance === 0 ? (
          <span className="text-xs text-muted-foreground">saldado</span>
        ) : (
          <>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {userBalance > 0 ? "te deben" : "debés"}
            </p>
            <p
              className={`text-sm font-semibold ${
                userBalance > 0 ? "text-primary" : "text-danger"
              }`}
            >
              {formatARS(Math.abs(userBalance))}
            </p>
          </>
        )}
      </div>
    </Link>
  );
};
