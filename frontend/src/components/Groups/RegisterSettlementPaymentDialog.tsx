import { useMutation, useQueryClient } from "@tanstack/react-query"
import { HandCoins } from "lucide-react"
import { useState } from "react"

import { GroupsService } from "@/client"
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
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

interface RegisterSettlementPaymentDialogProps {
  groupId: string
  fromUserId: string
  toUserId: string
  fromLabel: string
  toLabel: string
  maxAmount: number
}

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
})

export function RegisterSettlementPaymentDialog({
  groupId,
  fromUserId,
  toUserId,
  fromLabel,
  toLabel,
  maxAmount,
}: RegisterSettlementPaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [amount, setAmount] = useState(maxAmount.toFixed(2))
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const resetForm = () => {
    setAmount(maxAmount.toFixed(2))
  }

  const mutation = useMutation({
    mutationFn: (paymentAmount: number) =>
      GroupsService.createSettlementPayment({
        groupId,
        requestBody: {
          from_user_id: fromUserId,
          to_user_id: toUserId,
          amount: paymentAmount,
        },
      }),
    onSuccess: () => {
      showSuccessToast("Pago registrado")
      resetForm()
      setIsOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] })
      queryClient.invalidateQueries({ queryKey: ["groups"] })
    },
  })

  const submitPayment = (paymentAmount: number) => {
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      showErrorToast("El monto debe ser mayor a cero")
      return
    }
    if (paymentAmount > maxAmount + 0.009) {
      showErrorToast("El monto no puede superar la deuda pendiente")
      return
    }
    mutation.mutate(Number(paymentAmount.toFixed(2)))
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        onClick={() => submitPayment(maxAmount)}
        disabled={mutation.isPending}
      >
        <HandCoins />
        Pagar todo
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={(nextOpen) => {
          setIsOpen(nextOpen)
          if (nextOpen) resetForm()
        }}
      >
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            Registrar pago
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
            <DialogDescription>
              {fromLabel} paga a {toLabel}. Pendiente actual:{" "}
              {currencyFormatter.format(maxAmount)}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-2">
            <Label htmlFor="settlement-payment-amount">Monto</Label>
            <Input
              id="settlement-payment-amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              type="number"
              min="0"
              max={maxAmount}
              step="0.01"
            />
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
              onClick={() => submitPayment(Number(amount))}
            >
              Guardar pago
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
