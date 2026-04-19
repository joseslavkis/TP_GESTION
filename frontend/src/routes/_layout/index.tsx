import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Users,
  Activity,
  User,
  Plane,
  UtensilsCrossed,
  Home as HomeIcon,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

import useAuth from "@/hooks/useAuth";

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({
    meta: [
      {
        title: "Inicio - Gastos Grupales",
      },
      {
        name: "description",
        content: "Llevá el control de tus gastos compartidos con amigos.",
      },
    ],
  }),
});

type Group = {
  id: string;
  name: string;
  icon: React.ReactNode;
  members: number;
  total: number;
  balance: number;
};

const groups: Group[] = [
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

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function Dashboard() {
  const { user: currentUser } = useAuth();

  const teDeben = groups
    .filter((g) => g.balance > 0)
    .reduce((s, g) => s + g.balance, 0);
  const debes = groups
    .filter((g) => g.balance < 0)
    .reduce((s, g) => s + Math.abs(g.balance), 0);
  const saldo = teDeben - debes;

  return (
    <div className="min-h-screen bg-background">
      <div>
        <h1 className="text-2xl truncate max-w-sm">
          Hola, {currentUser?.full_name || currentUser?.email}
        </h1>
        <p className="text-muted-foreground">
          Esta base queda lista para evolucionar hacia grupos, gastos y balances
          compartidos.
        </p>
      </div>
      <div className="mx-auto max-w-[440px] pb-28">
        {/* Header */}
        <header className="flex items-center justify-between px-5 pt-8 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
              JL
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hola,</p>
              <h1 className="text-base font-semibold text-foreground">Juli</h1>
            </div>
          </div>
        </header>

        {/* Balance card */}
        <section className="px-5">
          <div className="rounded-3xl bg-balance-card text-balance-card-foreground p-6 shadow-lg">
            <p className="text-sm/none text-balance-card-foreground/60">
              Saldo total
            </p>
            <p
              className={`mt-2 text-4xl font-bold tracking-tight ${
                saldo >= 0 ? "text-primary" : "text-danger"
              }`}
            >
              {saldo >= 0 ? "+" : "-"}
              {formatARS(Math.abs(saldo))}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-xs text-balance-card-foreground/60">
                  Te deben
                </p>
                <p className="mt-1 text-lg font-semibold text-primary">
                  {formatARS(teDeben)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-xs text-balance-card-foreground/60">Debés</p>
                <p className="mt-1 text-lg font-semibold text-danger">
                  {formatARS(debes)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Groups */}
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
                <Link
                  to={`/groups/${g.id}`}
                  className="w-full text-left rounded-2xl bg-card border border-border p-4 flex items-center gap-4 transition-colors hover:bg-accent/40 active:scale-[0.99]"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    {g.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">
                      {g.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {g.members} miembros · {formatARS(g.total)} en total
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {g.balance === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        saldado
                      </span>
                    ) : g.balance > 0 ? (
                      <>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          te deben
                        </p>
                        <p className="text-sm font-semibold text-primary">
                          {formatARS(g.balance)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          debés
                        </p>
                        <p className="text-sm font-semibold text-danger">
                          {formatARS(Math.abs(g.balance))}
                        </p>
                      </>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* FAB */}
      <button
        aria-label="Agregar gasto"
        className="fixed bottom-24 left-1/2 -translate-x-1/2 ml-[140px] size-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        style={{ marginLeft: "min(140px, calc(220px - 28px))" }}
      >
        <Plus className="size-6" />
      </button>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-card border-t border-border">
        <div className="mx-auto max-w-[440px] grid grid-cols-3">
          {[
            { label: "Grupos", icon: Users, active: true },
            { label: "Actividad", icon: Activity, active: false },
            { label: "Perfil", icon: User, active: false },
          ].map((t) => (
            <button
              key={t.label}
              className={`flex flex-col items-center gap-1 py-3 text-xs ${
                t.active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <t.icon className={`size-5 ${t.active ? "text-primary" : ""}`} />
              <span className="font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
