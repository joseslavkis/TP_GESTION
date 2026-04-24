import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Receipt } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import {
  type ExpenseCreate,
  type GroupMemberPublic,
  GroupsService,
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
import useCustomToast from "@/hooks/useCustomToast"
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
  const [isOpen, setIsOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [payerId, setPayerId] = useState("")
  const [divisionMode, setDivisionMode] =
    useState<ExpenseCreate["division_mode"]>("equitable")
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({})
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

  const numericAmount = Number(amount)
  const customTotal = members.reduce((total, member) => {
    const memberAmount = Number(customAmounts[member.user_id] || 0)
    return total + (Number.isFinite(memberAmount) ? memberAmount : 0)
  }, 0)
  const customDifference =
    Number.isFinite(numericAmount) && numericAmount > 0
      ? numericAmount - customTotal
      : 0

  const resetForm = () => {
    setDescription("")
    setAmount("")
    setPayerId(defaultPayerId)
    setDivisionMode("equitable")
    setCustomAmounts({})
  }

  const mutation = useMutation({
    mutationFn: (data: ExpenseCreate) =>
      GroupsService.createExpense({ groupId, requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Gasto registrado")
      resetForm()
      setIsOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] })
      queryClient.invalidateQueries({ queryKey: ["group-expenses", groupId] })
      queryClient.invalidateQueries({ queryKey: ["groups"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-expenses"] })
    },
  })

  const onSubmit = () => {
    if (!description.trim()) {
      showErrorToast("La descripcion es obligatoria")
      return
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
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
      if (Math.abs(total - numericAmount) >= 0.01) {
        showErrorToast("La division personalizada debe sumar el total")
        return
      }
    }

    mutation.mutate({
      description: description.trim(),
      amount: numericAmount,
      payer_id: payerId,
      division_mode: divisionMode,
      participants,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button disabled={members.length === 0}>
          <Receipt />
          Registrar gasto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar gasto</DialogTitle>
          <DialogDescription>
            Carga el pago y como se reparte entre integrantes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
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
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
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
                variant={divisionMode === "equitable" ? "default" : "outline"}
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
                <span>Total asignado: {currencyFormatter.format(customTotal)}</span>
                <span>Diferencia: {currencyFormatter.format(customDifference)}</span>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={mutation.isPending}>
              Cancelar
            </Button>
          </DialogClose>
          <LoadingButton
            type="button"
            loading={mutation.isPending}
            onClick={onSubmit}
          >
            Guardar
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
