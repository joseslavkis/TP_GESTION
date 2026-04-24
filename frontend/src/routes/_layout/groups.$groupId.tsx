import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link as RouterLink, useNavigate } from "@tanstack/react-router"
import {
  ArrowLeft,
  CircleDollarSign,
  Search,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react"
import { useMemo, useState } from "react"

import {
  type ExpensePublic,
  type GroupMemberPublic,
  GroupsService,
} from "@/client"
import { AddExpenseDialog } from "@/components/Groups/AddExpenseDialog"
import { AddMemberDialog } from "@/components/Groups/AddMemberDialog"
import { EditGroupDialog } from "@/components/Groups/EditGroupDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

export const Route = createFileRoute("/_layout/groups/$groupId")({
  component: GroupDetailPage,
  head: () => ({
    meta: [
      {
        title: "Detalle de grupo - Gastos Grupales",
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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function memberLabel(member?: GroupMemberPublic) {
  if (!member) return "Integrante"
  return member.full_name || member.email
}

function buildSettlement(members: GroupMemberPublic[]) {
  const creditors = members
    .filter((member) => member.balance > 0.01)
    .map((member) => ({ ...member, pending: member.balance }))
  const debtors = members
    .filter((member) => member.balance < -0.01)
    .map((member) => ({ ...member, pending: Math.abs(member.balance) }))
  const transfers: Array<{
    from: GroupMemberPublic
    to: GroupMemberPublic
    amount: number
  }> = []

  let creditorIndex = 0
  let debtorIndex = 0
  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex]
    const debtor = debtors[debtorIndex]
    const amount = Math.min(creditor.pending, debtor.pending)

    if (amount > 0.01) {
      transfers.push({ from: debtor, to: creditor, amount })
    }

    creditor.pending = Number((creditor.pending - amount).toFixed(2))
    debtor.pending = Number((debtor.pending - amount).toFixed(2))

    if (creditor.pending <= 0.01) creditorIndex += 1
    if (debtor.pending <= 0.01) debtorIndex += 1
  }

  return transfers
}

function GroupDetailPage() {
  const { groupId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [search, setSearch] = useState("")
  const [payerFilter, setPayerFilter] = useState("all")

  const groupQuery = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => GroupsService.readGroup({ groupId }),
  })
  const expensesQuery = useQuery({
    queryKey: ["group-expenses", groupId],
    queryFn: () =>
      GroupsService.listGroupExpenses({ groupId, skip: 0, limit: 100 }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => GroupsService.deleteGroup({ groupId }),
    onSuccess: () => {
      showSuccessToast("Grupo eliminado")
      navigate({ to: "/groups" })
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-expenses"] })
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      GroupsService.removeGroupMember({ groupId, userId }),
    onSuccess: () => {
      showSuccessToast("Participante quitado")
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] })
      queryClient.invalidateQueries({ queryKey: ["groups"] })
    },
  })

  const group = groupQuery.data
  const expenses = expensesQuery.data?.data ?? []
  const isAdmin =
    group?.members.some(
      (member) => member.user_id === currentUser?.id && member.is_admin,
    ) ?? false
  const settlement = useMemo(
    () => buildSettlement(group?.members ?? []),
    [group?.members],
  )

  const filteredExpenses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return expenses.filter((expense) => {
      const matchesSearch =
        !normalizedSearch ||
        expense.description.toLowerCase().includes(normalizedSearch)
      const matchesPayer =
        payerFilter === "all" || expense.payer_id === payerFilter
      return matchesSearch && matchesPayer
    })
  }, [expenses, payerFilter, search])

  const membersById = useMemo(() => {
    return new Map(group?.members.map((member) => [member.user_id, member]))
  }, [group?.members])

  const onDeleteGroup = () => {
    if (window.confirm("Eliminar este grupo y todos sus gastos?")) {
      deleteMutation.mutate()
    }
  }

  const onRemoveMember = (member: GroupMemberPublic) => {
    if (window.confirm(`Quitar a ${memberLabel(member)} del grupo?`)) {
      removeMemberMutation.mutate(member.user_id)
    }
  }

  if (groupQuery.isLoading) {
    return (
      <div className="rounded-lg border bg-card p-8 text-sm text-muted-foreground">
        Cargando grupo...
      </div>
    )
  }

  if (!group) {
    return (
      <div className="rounded-lg border bg-card p-8">
        <h1 className="font-semibold">No se encontro el grupo</h1>
        <Button asChild className="mt-4" variant="outline">
          <RouterLink to="/groups">Volver a grupos</RouterLink>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Button asChild variant="ghost" className="w-fit px-0">
          <RouterLink to="/groups">
            <ArrowLeft />
            Grupos
          </RouterLink>
        </Button>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {group.name}
              </h1>
              <Badge
                variant={
                  group.current_user_balance < 0 ? "destructive" : "secondary"
                }
              >
                {formatCurrency(group.current_user_balance)}
              </Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              {group.description || "Sin descripcion"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AddExpenseDialog
              groupId={group.id}
              members={group.members}
              currentUserId={currentUser?.id}
            />
            {isAdmin ? (
              <>
                <AddMemberDialog groupId={group.id} />
                <EditGroupDialog group={group} />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDeleteGroup}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 />
                  Eliminar
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-lg border bg-card">
          <div className="flex items-center justify-between gap-4 border-b p-4">
            <div>
              <h2 className="font-semibold">Integrantes</h2>
              <p className="text-sm text-muted-foreground">
                {group.members.length} personas
              </p>
            </div>
            <Users className="size-5 text-muted-foreground" />
          </div>
          <div className="divide-y">
            {group.members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{memberLabel(member)}</p>
                    {member.is_admin ? (
                      <Badge variant="outline">Admin</Badge>
                    ) : null}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {member.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={member.balance < 0 ? "destructive" : "secondary"}
                  >
                    {formatCurrency(member.balance)}
                  </Badge>
                  {isAdmin && member.user_id !== currentUser?.id ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onRemoveMember(member)}
                      disabled={removeMemberMutation.isPending}
                    >
                      <UserMinus />
                      <span className="sr-only">Quitar participante</span>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border bg-card">
          <div className="flex items-center justify-between gap-4 border-b p-4">
            <div>
              <h2 className="font-semibold">Liquidacion sugerida</h2>
              <p className="text-sm text-muted-foreground">
                Movimientos para llevar saldos a cero
              </p>
            </div>
            <CircleDollarSign className="size-5 text-muted-foreground" />
          </div>
          <div className="divide-y">
            {settlement.map((transfer) => (
              <div
                key={`${transfer.from.user_id}-${transfer.to.user_id}`}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {memberLabel(transfer.from)} paga a {memberLabel(transfer.to)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(transfer.amount)}
                  </p>
                </div>
              </div>
            ))}
            {settlement.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                No hay deudas pendientes entre integrantes.
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-lg border bg-card">
        <div className="flex flex-col gap-4 border-b p-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="font-semibold">Gastos</h2>
            <p className="text-sm text-muted-foreground">
              {filteredExpenses.length} movimientos visibles
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,18rem)_13rem]">
            <div className="flex items-center gap-2 rounded-md border px-3">
              <Search className="size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar gasto"
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <Select value={payerFilter} onValueChange={setPayerFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pagador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {group.members.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {memberLabel(member)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="divide-y">
          {filteredExpenses.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              membersById={membersById}
            />
          ))}
          {!expensesQuery.isLoading && filteredExpenses.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground">
              No hay gastos para mostrar.
            </div>
          ) : null}
          {expensesQuery.isLoading ? (
            <div className="p-8 text-sm text-muted-foreground">
              Cargando gastos...
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function ExpenseRow({
  expense,
  membersById,
}: {
  expense: ExpensePublic
  membersById: Map<string, GroupMemberPublic>
}) {
  const payer = membersById.get(expense.payer_id)

  return (
    <div className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{expense.description}</p>
          <Badge variant="outline">{expense.participants.length} partes</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Pago {memberLabel(payer)} el {formatDate(expense.created_at)}
        </p>
      </div>
      <div className="text-left md:text-right">
        <p className="font-semibold">{formatCurrency(expense.amount)}</p>
        <p className="text-sm text-muted-foreground">
          Total del comprobante
        </p>
      </div>
    </div>
  )
}
