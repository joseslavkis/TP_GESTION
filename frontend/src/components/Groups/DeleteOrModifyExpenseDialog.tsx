import { EllipsisVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { type ExpensePublic } from "@/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoadingButton } from "@/components/ui/loading-button";

interface DeleteOrModifyExpenseDialogProps {
  expense: ExpensePublic;
  onModify?: (expense: ExpensePublic) => void | Promise<void>;
  onDelete?: (expense: ExpensePublic) => void | Promise<void>;
  disableModify?: boolean;
  disableDelete?: boolean;
}

export function DeleteOrModifyExpenseDialog({
  expense,
  onModify,
  onDelete,
  disableModify = false,
  disableDelete = false,
}: DeleteOrModifyExpenseDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<"modify" | "delete" | null>(
    null,
  );

  const canModify = Boolean(onModify) && !disableModify;
  const canDelete = Boolean(onDelete) && !disableDelete;

  const runAction = async (
    action: "modify" | "delete",
    callback?: (expense: ExpensePublic) => void | Promise<void>,
  ) => {
    if (!callback) return;
    setActiveAction(action);
    try {
      await callback(expense);
      setIsOpen(false);
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <EllipsisVertical />
          <span className="sr-only">Acciones del gasto</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Acciones del gasto</DialogTitle>
          <DialogDescription>
            Selecciona si queres modificar o eliminar este gasto.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between">
          <DialogClose asChild>
            <Button variant="outline" disabled={Boolean(activeAction)}>
              Cerrar
            </Button>
          </DialogClose>
          <div className="flex items-center gap-2">
            <LoadingButton
              type="button"
              variant="outline"
              disabled={!canModify}
              loading={activeAction === "modify"}
              onClick={() => runAction("modify", onModify)}
            >
              <Pencil />
              Modificar
            </LoadingButton>
            <LoadingButton
              type="button"
              variant="destructive"
              disabled={!canDelete}
              loading={activeAction === "delete"}
              onClick={() => runAction("delete", onDelete)}
            >
              <Trash2 />
              Eliminar
            </LoadingButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
