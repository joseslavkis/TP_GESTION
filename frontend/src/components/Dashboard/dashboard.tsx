import { Plane, HomeIcon, UtensilsCrossed } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import AddMemberFab from "../Common/AddMemberFab";
import { GroupCardInfo } from "@/types/groups";
import { BalanceCard } from "./balance_card";
import { GroupCard } from "./group_card";

export function Dashboard() {
  const { user: currentUser } = useAuth();

  const groups: GroupCardInfo[] = [
    {
      id: "1",
      name: "Viaje a Bariloche",
      icon: <Plane className="size-5" />,
      members: 5,
      total: 245800,
      balance: 18500,
    },
    {
      id: "2",
      name: "Depto compartido",
      icon: <HomeIcon className="size-5" />,
      members: 3,
      total: 128400,
      balance: -7200,
    },
    {
      id: "3",
      name: "Asado del sábado",
      icon: <UtensilsCrossed className="size-5" />,
      members: 8,
      total: 42600,
      balance: 3400,
    },
    {
      id: "4",
      name: "Cumpleaños Mati",
      icon: <UtensilsCrossed className="size-5" />,
      members: 6,
      total: 18900,
      balance: 0,
    },
  ];

  const toReceive = groups
    .filter((g) => g.balance > 0)
    .reduce((s, g) => s + g.balance, 0);
  const toPay = groups
    .filter((g) => g.balance < 0)
    .reduce((s, g) => s + Math.abs(g.balance), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[440px] pb-28">
        {/* Header */}
        <header className="flex items-center justify-between px-5 pt-8 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
              {currentUser?.full_name?.[0] ?? currentUser?.email?.[0] ?? "?"}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hola,</p>
              <h1 className="text-base font-semibold text-foreground">
                {currentUser?.full_name || currentUser?.email}
              </h1>
            </div>
          </div>
        </header>

        <BalanceCard toReceive={toReceive} toPay={toPay} />

        {/* Groups list */}
        <section className="px-5 mt-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">
              Mis Grupos
            </h2>
            <span className="text-xs text-muted-foreground">
              {groups.length} grupos
            </span>
          </div>

          <ul className="space-y-3">
            {groups.map((g) => (
              <li key={g.id}>
                <GroupCard groupCardInfo={g} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <AddMemberFab
        label="Crear nuevo grupo"
        onAddMember={() => alert("Agregar gasto")}
      />
    </div>
  );
}
