import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Search,
  Plus,
  Plane,
  UtensilsCrossed,
  Home as HomeIcon,
  ShoppingCart,
  Car,
  Ticket,
  Receipt,
  Users,
  Activity,
  User,
} from "lucide-react";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/groups/$groupId")({
  component: GroupDetail,
  head: ({ params }) => ({
    meta: [
      { title: "Grupo — Gastos Grupales" },
      { name: "description", content: `Detalle del grupo ${params.groupId}` },
    ],
  }),
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Category =
  | "todos"
  | "vuelos"
  | "comida"
  | "super"
  | "transporte"
  | "alojamiento"
  | "salidas";

type Expense = {
  id: string;
  description: string;
  amount: number;
  currency: "ARS" | "USD";
  category: Exclude<Category, "todos">;
  paidBy: string;
  paidByInitials: string;
  paidByColor: string;
  date: string; // ISO
  yourShare: number; // positive = te deben, negative = debés
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const groupInfo = {
  name: "Viaje a Bariloche",
  icon: <Plane className="size-5" />,
  members: 5,
  total: 245800,
  yourBalance: 18500,
};

const expenses: Expense[] = [
  {
    id: "e1",
    description: "Pasajes aéreos",
    amount: 120000,
    currency: "ARS",
    category: "vuelos",
    paidBy: "Mati",
    paidByInitials: "MA",
    paidByColor: "bg-[oklch(0.75_0.15_50)]",
    date: "2025-04-12",
    yourShare: -24000,
  },
  {
    id: "e2",
    description: "Cabaña 3 noches",
    amount: 75000,
    currency: "ARS",
    category: "alojamiento",
    paidBy: "Vos",
    paidByInitials: "JL",
    paidByColor: "bg-primary",
    date: "2025-04-13",
    yourShare: 60000,
  },
  {
    id: "e3",
    description: "Súper para la semana",
    amount: 18400,
    currency: "ARS",
    category: "super",
    paidBy: "Sofi",
    paidByInitials: "SO",
    paidByColor: "bg-[oklch(0.7_0.18_320)]",
    date: "2025-04-14",
    yourShare: -3680,
  },
  {
    id: "e4",
    description: "Cena en El Boliche",
    amount: 22500,
    currency: "ARS",
    category: "comida",
    paidBy: "Vos",
    paidByInitials: "JL",
    paidByColor: "bg-primary",
    date: "2025-04-15",
    yourShare: 18000,
  },
  {
    id: "e5",
    description: "Alquiler de auto",
    amount: 9800,
    currency: "ARS",
    category: "transporte",
    paidBy: "Tomi",
    paidByInitials: "TO",
    paidByColor: "bg-[oklch(0.65_0.15_240)]",
    date: "2025-04-15",
    yourShare: -1960,
  },
  {
    id: "e6",
    description: "Entradas Cerro Catedral",
    amount: 14500,
    currency: "ARS",
    category: "salidas",
    paidBy: "Vos",
    paidByInitials: "JL",
    paidByColor: "bg-primary",
    date: "2025-04-16",
    yourShare: 11600,
  },
  {
    id: "e7",
    description: "Desayuno panadería",
    amount: 4200,
    currency: "ARS",
    category: "comida",
    paidBy: "Cami",
    paidByInitials: "CA",
    paidByColor: "bg-[oklch(0.7_0.16_30)]",
    date: "2025-04-17",
    yourShare: -840,
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const categoryMeta: Record<
  Exclude<Category, "todos">,
  { label: string; icon: React.ReactNode }
> = {
  vuelos: { label: "Vuelos", icon: <Plane className="size-4" /> },
  comida: { label: "Comida", icon: <UtensilsCrossed className="size-4" /> },
  super: { label: "Súper", icon: <ShoppingCart className="size-4" /> },
  transporte: { label: "Transporte", icon: <Car className="size-4" /> },
  alojamiento: { label: "Alojamiento", icon: <HomeIcon className="size-4" /> },
  salidas: { label: "Salidas", icon: <Ticket className="size-4" /> },
};

const filterChips: { id: Category; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "vuelos", label: "Vuelos" },
  { id: "comida", label: "Comida" },
  { id: "super", label: "Súper" },
  { id: "transporte", label: "Transporte" },
  { id: "alojamiento", label: "Alojamiento" },
  { id: "salidas", label: "Salidas" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

function GroupDetail() {
  const [category, setCategory] = useState<Category>("todos");
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      expenses.filter((e) => {
        const matchCat = category === "todos" || e.category === category;
        const matchQ = e.description
          .toLowerCase()
          .includes(query.toLowerCase().trim());
        return matchCat && matchQ;
      }),
    [category, query]
  );

  const balancePositive = groupInfo.yourBalance >= 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[440px] pb-28">
        {/* Header */}
        <header className="flex items-center gap-3 px-5 pt-8 pb-5">
          <Link
            to="/"
            aria-label="Volver"
            className="flex size-10 items-center justify-center rounded-full bg-card border border-border text-foreground hover:bg-accent/40 transition-colors"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-foreground truncate">
              {groupInfo.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              {groupInfo.members} miembros
            </p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            {groupInfo.icon}
          </div>
        </header>

        {/* Summary card */}
        <section className="px-5">
          <div className="rounded-3xl bg-balance-card text-balance-card-foreground p-6 shadow-lg">
            <p className="text-sm/none text-balance-card-foreground/60">
              Total gastado
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight">
              {formatARS(groupInfo.total)}
            </p>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                  balancePositive
                    ? "bg-primary/15 text-primary"
                    : "bg-danger/15 text-danger"
                }`}
              >
                <span className="size-1.5 rounded-full bg-current" />
                {balancePositive ? "Te deben " : "Debés "}
                {formatARS(Math.abs(groupInfo.yourBalance))}
              </div>
              <button className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold shadow hover:opacity-90 transition">
                Liquidar deudas
              </button>
            </div>
          </div>
        </section>

        {/* Search */}
        <section className="px-5 mt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar gasto..."
              className="w-full rounded-2xl border border-border bg-card pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </section>

        {/* Category chips */}
        <section className="mt-4">
          <div className="flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none">
            {filterChips.map((c) => {
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium border transition-colors ${
                    active
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card text-muted-foreground border-border hover:bg-accent/40"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Expense list */}
        <section className="px-5 mt-6">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">
              Historial de gastos
            </h2>
            <span className="text-xs text-muted-foreground">
              {filtered.length} resultados
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <Receipt className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">
                Sin gastos
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Probá cambiar el filtro o la búsqueda.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((e) => {
                const meta = categoryMeta[e.category];
                const owed = e.yourShare > 0;
                const settled = e.yourShare === 0;
                return (
                  <li key={e.id}>
                    <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-4">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                        {meta.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">
                          {e.description}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span
                            className={`inline-flex items-center justify-center size-5 rounded-full text-[10px] font-semibold text-white ${e.paidByColor}`}
                          >
                            {e.paidByInitials}
                          </span>
                          <span className="truncate">
                            {e.paidBy === "Vos"
                              ? "Pagaste vos"
                              : `Pagó ${e.paidBy}`}
                          </span>
                          <span>·</span>
                          <span>{formatDate(e.date)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-foreground">
                          {formatARS(e.amount)}
                        </p>
                        {settled ? (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            saldado
                          </p>
                        ) : (
                          <p
                            className={`text-[11px] font-medium mt-0.5 ${
                              owed ? "text-primary" : "text-danger"
                            }`}
                          >
                            {owed ? "+" : "-"}
                            {formatARS(Math.abs(e.yourShare))}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* FAB */}
      <div className="fixed bottom-0 inset-x-0 pointer-events-none">
        <div className="mx-auto max-w-[440px] relative h-0">
          <button
            aria-label="Agregar gasto"
            className="pointer-events-auto absolute right-5 -top-24 size-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="size-6" />
          </button>
        </div>
      </div>

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
