import { toast } from "sonner"

const useCustomToast = () => {
  const showSuccessToast = (description: string) => {
    toast.success("Listo", {
      description,
    })
  }

  const showErrorToast = (description: string) => {
    toast.error("Ocurrio un problema", {
      description,
    })
  }

  return { showSuccessToast, showErrorToast }
}

export default useCustomToast
