import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link as RouterLink, useNavigate } from "@tanstack/react-router"
import { ArrowRight, CircleDollarSign, Receipt, Users, Wallet } from "lucide-react"

import { GroupsService } from "@/client"
import { AddGroupDialog } from "@/components/Groups/AddGroupDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({
    meta: [
      {
        title: "Inicio - Gastos Grupales",
      },
    ],
  }),
})

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
})

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

function Dashboard() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: () => GroupsService.listUserGroups({ skip: 0, limit: 100 }),
  })
  const expensesQuery = useQuery({
    queryKey: ["dashboard-expenses"],
    queryFn: () =>
      GroupsService.listCurrentUserGroupExpenses({ skip: 0, limit: 100 }),
  })

  const groups = groupsQuery.data?.data ?? []
  const expenses = expensesQuery.data?.data ?? []
  const balance = groups.reduce(
    (total, group) => total + group.current_user_balance,
    0,
  )
  const toReceive = groups.reduce(
    (total, group) =>
      total + Math.max(group.current_user_balance, 0),
    0,
  )
  const toPay = groups.reduce(
    (total, group) =>
      total + Math.abs(Math.min(group.current_user_balance, 0)),
    0,
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Hola, {currentUser?.full_name || currentUser?.email}
          </h1>
          <p className="text-muted-foreground">
            Resumen de grupos, saldos y gastos recientes
          </p>
        </div>
        <AddGroupDialog
          onCreated={(group) =>
            navigate({
              to: "/groups/$groupId",
              params: { groupId: group.id },
            })
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardDescription>Balance neto</CardDescription>
              <CardTitle className="text-2xl">
                {formatCurrency(balance)}
              </CardTitle>
            </div>
            <Wallet className="size-5 text-primary" />
          </CardHeader>
        </Card>
        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardDescription>A cobrar</CardDescription>
              <CardTitle className="text-2xl">
                {formatCurrency(toReceive)}
              </CardTitle>
            </div>
            <CircleDollarSign className="size-5 text-primary" />
          </CardHeader>
        </Card>
        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardDescription>A pagar</CardDescription>
              <CardTitle className="text-2xl">
                {formatCurrency(toPay)}
              </CardTitle>
            </div>
            <Receipt className="size-5 text-primary" />
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <section className="rounded-lg border bg-card">
          <div className="flex items-center justify-between gap-4 border-b p-4">
            <div>
              <h2 className="font-semibold">Grupos</h2>
              <p className="text-sm text-muted-foreground">
                {groups.length} activos
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <RouterLink to="/groups">
                Ver todos
                <ArrowRight />
              </RouterLink>
            </Button>
          </div>
          <div className="divide-y">
            {groups.slice(0, 5).map((group) => (
              <RouterLink
                key={group.id}
                to="/groups/$groupId"
                params={{ groupId: group.id }}
                className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{group.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {group.description || "Sin descripcion"}
                  </p>
                </div>
                <Badge
                  variant={
                    group.current_user_balance < 0 ? "destructive" : "secondary"
                  }
                >
                  {formatCurrency(group.current_user_balance)}
                </Badge>
              </RouterLink>
            ))}
            {groups.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                Todavia no tenes grupos cargados.
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-lg border bg-card">
          <div className="flex items-center justify-between gap-4 border-b p-4">
            <div>
              <h2 className="font-semibold">Gastos recientes</h2>
              <p className="text-sm text-muted-foreground">
                Ultimos movimientos en tus grupos
              </p>
            </div>
            <Users className="size-5 text-muted-foreground" />
          </div>
          <div className="divide-y">
            {expenses.slice(0, 6).map((expense) => (
              <RouterLink
                key={expense.expense_id}
                to="/groups/$groupId"
                params={{ groupId: expense.group_id }}
                className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{expense.description}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {expense.group_name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(expense.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    Tu parte {formatCurrency(expense.current_user_amount_owed)}
                  </p>
                </div>
              </RouterLink>
            ))}
            {expenses.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                Todavia no hay gastos registrados.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
