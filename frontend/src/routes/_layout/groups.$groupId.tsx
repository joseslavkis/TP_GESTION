import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link as RouterLink } from "@tanstack/react-router";
import { ArrowLeft, CircleDollarSign, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";

import {
  type ExpensePublic,
  type GroupMemberPublic,
  GroupsService,
  type SettlementPaymentPublic,
} from "@/client";
import { AddExpenseDialog } from "@/components/Groups/AddExpenseDialog";
import { AddMemberDialog } from "@/components/Groups/AddMemberDialog";
import { DeleteExpenseDialog } from "@/components/Groups/DeleteExpenseDialog";
import { DeleteGroupDialog } from "@/components/Groups/DeleteGroupDialog";
import { DeleteMemberDialog } from "@/components/Groups/DeleteMemberDialog";
import { EditGroupDialog } from "@/components/Groups/EditGroupDialog";
import { GroupIcon } from "@/components/Groups/GroupIcon";
import { ModifyExpenseDialog } from "@/components/Groups/ModifyExpenseDialog";
import { RegisterSettlementPaymentDialog } from "@/components/Groups/RegisterSettlementPaymentDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useAuth from "@/hooks/useAuth";

export const Route = createFileRoute("/_layout/groups/$groupId")({
  component: GroupDetailPage,
  head: () => ({
    meta: [
      {
        title: "Detalle de grupo - Gastos Grupales",
      },
    ],
  }),
});

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function memberLabel(member?: GroupMemberPublic) {
  if (!member) return "Integrante";
  return member.full_name || member.email;
}

function buildSettlement(members: GroupMemberPublic[]) {
  const creditors = members
    .filter((member) => member.balance > 0.01)
    .map((member) => ({ ...member, pending: member.balance }));
  const debtors = members
    .filter((member) => member.balance < -0.01)
    .map((member) => ({ ...member, pending: Math.abs(member.balance) }));
  const transfers: Array<{
    from: GroupMemberPublic;
    to: GroupMemberPublic;
    amount: number;
  }> = [];

  let creditorIndex = 0;
  let debtorIndex = 0;
  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amount = Math.min(creditor.pending, debtor.pending);

    if (amount > 0.01) {
      transfers.push({ from: debtor, to: creditor, amount });
    }

    creditor.pending = Number((creditor.pending - amount).toFixed(2));
    debtor.pending = Number((debtor.pending - amount).toFixed(2));

    if (creditor.pending <= 0.01) creditorIndex += 1;
    if (debtor.pending <= 0.01) debtorIndex += 1;
  }

  return transfers;
}

function GroupDetailPage() {
  const { groupId } = Route.useParams();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [payerFilter, setPayerFilter] = useState("all");

  const groupQuery = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => GroupsService.readGroup({ groupId }),
  });
  const expensesQuery = useQuery({
    queryKey: ["group-expenses", groupId],
    queryFn: () =>
      GroupsService.listGroupExpenses({ groupId, skip: 0, limit: 100 }),
  });

  const group = groupQuery.data;
  const expenses = expensesQuery.data?.data ?? [];
  const isAdmin =
    group?.members.some(
      (member) => member.user_id === currentUser?.id && member.is_admin,
    ) ?? false;
  const settlement = useMemo(
    () => buildSettlement(group?.members ?? []),
    [group?.members],
  );

  const filteredExpenses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return expenses.filter((expense) => {
      const matchesSearch =
        !normalizedSearch ||
        expense.description.toLowerCase().includes(normalizedSearch);
      const matchesPayer =
        payerFilter === "all" || expense.payer_id === payerFilter;
      return matchesSearch && matchesPayer;
    });
  }, [expenses, payerFilter, search]);

  const totalExpenses = useMemo(
    () => expenses.reduce((total, expense) => total + expense.amount, 0),
    [expenses],
  );

  const membersById = useMemo(() => {
    return new Map(group?.members.map((member) => [member.user_id, member]));
  }, [group?.members]);
  const settlementPayments = group?.settlement_payments ?? [];

  if (groupQuery.isLoading) {
    return (
      <div className="rounded-lg border bg-card p-8 text-sm text-muted-foreground">
        Cargando grupo...
      </div>
    );
  }

  if (!group) {
    return (
      <div className="rounded-lg border bg-card p-8">
        <h1 className="font-semibold">No se encontro el grupo</h1>
        <Button asChild className="mt-4" variant="outline">
          <RouterLink to="/groups">Volver a grupos</RouterLink>
        </Button>
      </div>
    );
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
          <div className="flex items-start gap-3">
            <GroupIcon name={group.name} />
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
              <p className="mt-1 text-sm text-muted-foreground">
                Total del grupo: {formatCurrency(totalExpenses)}
              </p>
            </div>
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
                <DeleteGroupDialog groupId={group.id} />
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
                    <p className="truncate font-medium">
                      {memberLabel(member)}
                    </p>
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
                    <DeleteMemberDialog groupId={group.id} member={member} />
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
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {memberLabel(transfer.from)} paga a{" "}
                    {memberLabel(transfer.to)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(transfer.amount)}
                  </p>
                </div>
                {currentUser?.id === transfer.from.user_id ? (
                  <RegisterSettlementPaymentDialog
                    groupId={group.id}
                    fromUserId={transfer.from.user_id}
                    toUserId={transfer.to.user_id}
                    fromLabel={memberLabel(transfer.from)}
                    toLabel={memberLabel(transfer.to)}
                    maxAmount={transfer.amount}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Solo {memberLabel(transfer.from)} puede registrar este pago.
                  </p>
                )}
              </div>
            ))}
            {settlement.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                No hay deudas pendientes entre integrantes.
              </div>
            ) : null}
          </div>
          <div className="border-t p-4">
            <div className="mb-3">
              <h3 className="font-medium">Historial de pagos</h3>
              <p className="text-sm text-muted-foreground">
                Registra quien pago, a quien, cuanto y cuando.
              </p>
            </div>
            <div className="divide-y rounded-md border">
              {settlementPayments.map((payment) => (
                <SettlementPaymentRow
                  key={payment.id}
                  payment={payment}
                  membersById={membersById}
                />
              ))}
              {settlementPayments.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Todavia no se registraron pagos de deuda.
                </div>
              ) : null}
            </div>
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
              groupId={groupId}
              canManage={isAdmin || expense.payer_id === currentUser?.id}
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
  );
}

function SettlementPaymentRow({
  payment,
  membersById,
}: {
  payment: SettlementPaymentPublic;
  membersById: Map<string, GroupMemberPublic>;
}) {
  const debtor = membersById.get(payment.from_user_id);
  const creditor = membersById.get(payment.to_user_id);

  return (
    <div className="grid gap-2 p-4 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0">
        <p className="truncate font-medium">
          {memberLabel(debtor)} pago a {memberLabel(creditor)}
        </p>
        <p className="text-sm text-muted-foreground">
          Registrado el {formatDate(payment.created_at)}
        </p>
      </div>
      <p className="font-semibold">{formatCurrency(payment.amount)}</p>
    </div>
  );
}

function ExpenseRow({
  expense,
  membersById,
  groupId,
  canManage,
}: {
  expense: ExpensePublic;
  membersById: Map<string, GroupMemberPublic>;
  groupId: string;
  canManage: boolean;
}) {
  const payer = membersById.get(expense.payer_id);

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
      <div className="flex items-center justify-between gap-2 text-left md:justify-end md:text-right">
        {canManage ? (
          <div className="flex items-center gap-1">
            <ModifyExpenseDialog
              groupId={groupId}
              expense={expense}
              members={Array.from(membersById.values())}
            />
            <DeleteExpenseDialog groupId={groupId} expense={expense} />
          </div>
        ) : null}
        <div>
          <p className="font-semibold">{formatCurrency(expense.amount)}</p>
          <p className="text-sm text-muted-foreground">Total del comprobante</p>
        </div>
      </div>
    </div>
  );
}
