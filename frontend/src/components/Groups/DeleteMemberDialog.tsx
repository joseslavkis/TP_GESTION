import { useMutation, useQueryClient } from "@tanstack/react-query"
import { UserMinus } from "lucide-react"
import { useState } from "react"

import { type GroupMemberPublic, GroupsService } from "@/client"
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
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

interface DeleteMemberDialogProps {
  groupId: string
  member: GroupMemberPublic
}

function memberLabel(member: GroupMemberPublic) {
  return member.full_name || member.email
}

export function DeleteMemberDialog({
  groupId,
  member,
}: DeleteMemberDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: () =>
      GroupsService.removeGroupMember({
        groupId,
        userId: member.user_id,
      }),
    onSuccess: () => {
      showSuccessToast("Participante quitado")
      setIsOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] })
      queryClient.invalidateQueries({ queryKey: ["groups"] })
    },
  })

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <UserMinus />
          <span className="sr-only">Quitar participante</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quitar participante</DialogTitle>
          <DialogDescription>
            Vas a quitar a {memberLabel(member)} del grupo.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={mutation.isPending}>
              Cancelar
            </Button>
          </DialogClose>
          <LoadingButton
            variant="destructive"
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Quitar
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
