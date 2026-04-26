import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Receipt } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import {
  type ExpenseCreate,
  type GroupMemberPublic,
  GroupsService,
  type SettlementPaymentCreate,
} from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingButton } from "@/components/ui/loading-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import useCustomToast from "@/hooks/useCustomToast"
import { cn } from "@/lib/utils"
import { handleError } from "@/utils"

interface AddExpenseDialogProps {
  groupId: string
  members: GroupMemberPublic[]
  currentUserId?: string
}

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
})

function memberLabel(member: GroupMemberPublic) {
  return member.full_name || member.email
}

export function AddExpenseDialog({
  groupId,
  members,
  currentUserId,
}: AddExpenseDialogProps) {
  const [mode, setMode] = useState<"expense" | "transfer">("expense")
  const [isOpen, setIsOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [expenseAmount, setExpenseAmount] = useState("")
  const [transferAmount, setTransferAmount] = useState("")
  const [payerId, setPayerId] = useState("")
  const [divisionMode, setDivisionMode] =
    useState<ExpenseCreate["division_mode"]>("equitable")
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({})
  const [transferToUserId, setTransferToUserId] = useState("")
  const [transferPaymentDate, setTransferPaymentDate] = useState("")
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const defaultPayerId = useMemo(() => {
    return (
      members.find((member) => member.user_id === currentUserId)?.user_id ||
      members[0]?.user_id ||
      ""
    )
  }, [currentUserId, members])

  useEffect(() => {
    if (!payerId && defaultPayerId) {
      setPayerId(defaultPayerId)
    }
  }, [defaultPayerId, payerId])

  const currentMember = useMemo(
    () => members.find((member) => member.user_id === currentUserId),
    [currentUserId, members],
  )

  const transferEligibleMembers = useMemo(
    () =>
      members.filter(
        (member) => member.user_id !== currentUserId && member.balance > 0.01,
      ),
    [currentUserId, members],
  )

  const currentDebt =
    currentMember && currentMember.balance < -0.01
      ? Math.abs(currentMember.balance)
      : 0
  const transferEnabled =
    currentDebt > 0.01 && transferEligibleMembers.length > 0

  useEffect(() => {
    if (
      !transferEligibleMembers.some(
        (member) => member.user_id === transferToUserId,
      )
    ) {
      setTransferToUserId(transferEligibleMembers[0]?.user_id || "")
    }
  }, [transferEligibleMembers, transferToUserId])

  useEffect(() => {
    if (!transferEnabled && mode === "transfer") {
      setMode("expense")
    }
  }, [mode, transferEnabled])

  const numericExpenseAmount = Number(expenseAmount)
  const numericTransferAmount = Number(transferAmount)
  const customTotal = members.reduce((total, member) => {
    const memberAmount = Number(customAmounts[member.user_id] || 0)
    return total + (Number.isFinite(memberAmount) ? memberAmount : 0)
  }, 0)
  const customDifference =
    Number.isFinite(numericExpenseAmount) && numericExpenseAmount > 0
      ? numericExpenseAmount - customTotal
      : 0

  const selectedCreditor = transferEligibleMembers.find(
    (member) => member.user_id === transferToUserId,
  )
  const transferMaxAmount = selectedCreditor
    ? Math.min(currentDebt, selectedCreditor.balance)
    : 0

  const resetExpenseForm = () => {
    setDescription("")
    setExpenseAmount("")
    setPayerId(defaultPayerId)
    setDivisionMode("equitable")
    setCustomAmounts({})
  }

  const resetTransferForm = () => {
    setTransferAmount("")
    setTransferToUserId(transferEligibleMembers[0]?.user_id || "")
    setTransferPaymentDate("")
  }

  const resetForm = () => {
    setMode("expense")
    resetExpenseForm()
    resetTransferForm()
  }

  const invalidateGroupQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["group", groupId] })
    queryClient.invalidateQueries({ queryKey: ["group-expenses", groupId] })
    queryClient.invalidateQueries({ queryKey: ["groups"] })
    queryClient.invalidateQueries({ queryKey: ["dashboard-expenses"] })
  }

  const createExpenseMutation = useMutation({
    mutationFn: (data: ExpenseCreate) =>
      GroupsService.createExpense({ groupId, requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Gasto registrado")
      resetExpenseForm()
      setIsOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: invalidateGroupQueries,
  })

  const createTransferMutation = useMutation({
    mutationFn: (paymentData: SettlementPaymentCreate) =>
      GroupsService.createSettlementPayment({
        groupId,
        requestBody: paymentData,
      }),
    onSuccess: () => {
      showSuccessToast("Transferencia registrada")
      resetTransferForm()
      setIsOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: invalidateGroupQueries,
  })

  const onSubmitExpense = () => {
    if (!description.trim()) {
      showErrorToast("La descripcion es obligatoria")
      return
    }
    if (!Number.isFinite(numericExpenseAmount) || numericExpenseAmount <= 0) {
      showErrorToast("El monto debe ser mayor a cero")
      return
    }
    if (!payerId) {
      showErrorToast("Selecciona quien pago")
      return
    }

    const participants =
      divisionMode === "custom"
        ? members
            .map((member) => ({
              user_id: member.user_id,
              amount: Number(customAmounts[member.user_id] || 0),
            }))
            .filter((participant) => participant.amount > 0)
        : []

    if (divisionMode === "custom") {
      if (participants.length === 0) {
        showErrorToast("Carga al menos un participante")
        return
      }
      const total = participants.reduce(
        (sum, participant) => sum + participant.amount,
        0,
      )
      if (Math.abs(total - numericExpenseAmount) >= 0.01) {
        showErrorToast("La division personalizada debe sumar el total")
        return
      }
    }

    createExpenseMutation.mutate({
      description: description.trim(),
      amount: numericExpenseAmount,
      payer_id: payerId,
      division_mode: divisionMode,
      participants,
    })
  }

  const onSubmitTransfer = () => {
    if (!currentUserId) {
      showErrorToast("No pudimos identificar al usuario actual")
      return
    }
    if (!transferEnabled) {
      showErrorToast(
        "No tenes deuda pendiente para registrar una transferencia",
      )
      return
    }
    if (!transferToUserId || !selectedCreditor) {
      showErrorToast("Selecciona a quien transferir")
      return
    }
    if (!Number.isFinite(numericTransferAmount) || numericTransferAmount <= 0) {
      showErrorToast("El monto debe ser mayor a cero")
      return
    }
    if (numericTransferAmount > transferMaxAmount + 0.009) {
      showErrorToast(
        "El monto no puede superar la deuda pendiente con ese acreedor",
      )
      return
    }

    createTransferMutation.mutate({
      from_user_id: currentUserId,
      to_user_id: transferToUserId,
      amount: Number(numericTransferAmount.toFixed(2)),
      payment_date: transferPaymentDate || undefined,
    })
  }

  const activeMutation =
    mode === "expense" ? createExpenseMutation : createTransferMutation

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        setIsOpen(nextOpen)
        if (!nextOpen) {
          resetForm()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={members.length === 0}>
          <Receipt />
          Registrar movimiento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "expense" ? "Registrar gasto" : "Registrar transferencia"}
          </DialogTitle>
          <DialogDescription>
            {mode === "expense"
              ? "Carga el pago y como se reparte entre integrantes."
              : "Registra un pago de deuda a otro integrante del grupo."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <Tabs
            value={mode}
            onValueChange={(value) => setMode(value as typeof mode)}
          >
            <TabsList className="grid w-full grid-cols-2 rounded-xl border border-emerald-200/80 bg-emerald-50 p-1 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <TabsTrigger
                value="expense"
                className={cn(
                  "rounded-lg font-semibold transition-all",
                  "data-[state=active]:border-emerald-600/30 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md",
                  "dark:data-[state=active]:border-emerald-500/30 dark:data-[state=active]:bg-emerald-500 dark:data-[state=active]:text-emerald-950",
                )}
              >
                Gasto
              </TabsTrigger>
              <TabsTrigger
                value="transfer"
                disabled={!transferEnabled}
                className={cn(
                  "rounded-lg font-semibold transition-all",
                  "data-[state=active]:border-emerald-600/30 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md",
                  "dark:data-[state=active]:border-emerald-500/30 dark:data-[state=active]:bg-emerald-500 dark:data-[state=active]:text-emerald-950",
                )}
              >
                Transferencia
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {!transferEnabled ? (
            <p className="text-sm text-muted-foreground">
              No podes registrar transferencias si no tenes deuda pendiente en
              este grupo.
            </p>
          ) : null}

          {mode === "expense" ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="expense-description">Descripcion</Label>
                <Input
                  id="expense-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Supermercado"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="expense-amount">Monto</Label>
                  <Input
                    id="expense-amount"
                    value={expenseAmount}
                    onChange={(event) => setExpenseAmount(event.target.value)}
                    placeholder="0"
                    inputMode="decimal"
                    type="number"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Pago</Label>
                  <Select value={payerId} onValueChange={setPayerId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar integrante" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {memberLabel(member)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Division</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={
                      divisionMode === "equitable" ? "default" : "outline"
                    }
                    onClick={() => setDivisionMode("equitable")}
                  >
                    Equitativa
                  </Button>
                  <Button
                    type="button"
                    variant={divisionMode === "custom" ? "default" : "outline"}
                    onClick={() => setDivisionMode("custom")}
                  >
                    Personalizada
                  </Button>
                </div>
              </div>

              {divisionMode === "custom" ? (
                <div className="grid gap-3 rounded-md border p-3">
                  {members.map((member) => (
                    <div
                      key={member.user_id}
                      className="grid gap-2 sm:grid-cols-[1fr_10rem] sm:items-center"
                    >
                      <Label htmlFor={`amount-${member.user_id}`}>
                        {memberLabel(member)}
                      </Label>
                      <Input
                        id={`amount-${member.user_id}`}
                        value={customAmounts[member.user_id] || ""}
                        onChange={(event) =>
                          setCustomAmounts((current) => ({
                            ...current,
                            [member.user_id]: event.target.value,
                          }))
                        }
                        inputMode="decimal"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                      />
                    </div>
                  ))}
                  <div className="flex flex-col gap-1 border-t pt-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Total asignado: {currencyFormatter.format(customTotal)}
                    </span>
                    <span>
                      Diferencia: {currencyFormatter.format(customDifference)}
                    </span>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="transfer-amount">Cantidad</Label>
                  <Input
                    id="transfer-amount"
                    value={transferAmount}
                    onChange={(event) => setTransferAmount(event.target.value)}
                    placeholder="0"
                    inputMode="decimal"
                    type="number"
                    min="0"
                    max={transferMaxAmount || undefined}
                    step="0.01"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>A quien</Label>
                  <Select
                    value={transferToUserId}
                    onValueChange={setTransferToUserId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar integrante" />
                    </SelectTrigger>
                    <SelectContent>
                      {transferEligibleMembers.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {memberLabel(member)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="transfer-payment-date">Fecha de pago</Label>
                <Input
                  id="transfer-payment-date"
                  value={transferPaymentDate}
                  onChange={(event) =>
                    setTransferPaymentDate(event.target.value)
                  }
                  type="date"
                />
                <p className="text-xs text-muted-foreground">
                  Opcional. Si no la elegis, se usa la fecha actual.
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                Tu deuda actual es {currencyFormatter.format(currentDebt)}.
                {selectedCreditor
                  ? ` Con ${memberLabel(selectedCreditor)} podes registrar hasta ${currencyFormatter.format(transferMaxAmount)}.`
                  : ""}
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={activeMutation.isPending}>
              Cancelar
            </Button>
          </DialogClose>
          <LoadingButton
            type="button"
            loading={activeMutation.isPending}
            onClick={mode === "expense" ? onSubmitExpense : onSubmitTransfer}
          >
            {mode === "expense" ? "Guardar" : "Registrar transferencia"}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
