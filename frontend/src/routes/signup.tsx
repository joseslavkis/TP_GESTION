import { zodResolver } from "@hookform/resolvers/zod"
import {
  createFileRoute,
  Link as RouterLink,
  redirect,
  useNavigate,
} from "@tanstack/react-router"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import { PasswordInput } from "@/components/ui/password-input"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"

const formSchema = z
  .object({
    email: z.email({ message: "Ingresa un email valido" }),
    full_name: z.string().min(1, { message: "El nombre es obligatorio" }),
    password: z
      .string()
      .min(1, { message: "La contrasena es obligatoria" })
      .min(8, { message: "La contrasena debe tener al menos 8 caracteres" }),
    confirm_password: z.string().min(1, { message: "Confirma tu contrasena" }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Las contrasenas no coinciden",
    path: ["confirm_password"],
  })

type FormData = z.infer<typeof formSchema>

export const Route = createFileRoute("/signup")({
  component: SignUp,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
  head: () => ({
    meta: [
      {
        title: "Registro - Gastos Grupales",
      },
    ],
  }),
})

function SignUp() {
  const navigate = useNavigate()
  const { signUpMutation } = useAuth()
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      confirm_password: "",
    },
  })

  const onSubmit = (data: FormData) => {
    if (signUpMutation.isPending) return

    const { confirm_password: _confirmPassword, ...submitData } = data
    signUpMutation.mutate(submitData)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute right-[-10rem] top-8 h-[26rem] w-[26rem] rounded-full bg-primary/6 blur-[110px]" />

      <header className="flex h-16 items-center px-6">
        <div className="flex w-full items-center">
          <button
            type="button"
            onClick={() => navigate({ to: "/login" })}
            className="flex size-10 items-center justify-center rounded-full text-primary transition hover:bg-primary/8"
            aria-label="Volver al login"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="ml-auto">
            <span className="text-xl font-extrabold tracking-tight">
              Gastos Grupales
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col px-8 pb-24 pt-12">
        <div className="mb-12">
          <h1 className="mb-4 text-[2.5rem] leading-tight font-extrabold tracking-tight">
            Sumate y empeza a organizar gastos
          </h1>
          <p className="max-w-[22rem] text-base leading-relaxed font-medium text-muted-foreground">
            Crea tu cuenta para registrar gastos compartidos y guardar todo en
            la base del proyecto.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="full_name"
              className="ml-1 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground"
            >
              Nombre completo
            </label>
            <Input
              id="full_name"
              data-testid="full-name-input"
              placeholder="Ingresa tu nombre"
              type="text"
              className="h-14 rounded-2xl border-0 bg-[color:var(--input)] px-5 text-base shadow-none focus-visible:ring-2 focus-visible:ring-ring"
              {...form.register("full_name")}
            />
            {form.formState.errors.full_name ? (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.full_name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="ml-1 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground"
            >
              Email
            </label>
            <Input
              id="email"
              data-testid="email-input"
              placeholder="nombre@ejemplo.com"
              type="email"
              className="h-14 rounded-2xl border-0 bg-[color:var(--input)] px-5 text-base shadow-none focus-visible:ring-2 focus-visible:ring-ring"
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="ml-1 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground"
            >
              Contrasena
            </label>
            <PasswordInput
              id="password"
              data-testid="password-input"
              placeholder="Minimo 8 caracteres"
              className="h-14 rounded-2xl border-0 bg-[color:var(--input)] px-5 text-base shadow-none focus-visible:ring-2 focus-visible:ring-ring"
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirm_password"
              className="ml-1 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground"
            >
              Repetir contrasena
            </label>
            <PasswordInput
              id="confirm_password"
              data-testid="confirm-password-input"
              placeholder="Repite la contrasena"
              className="h-14 rounded-2xl border-0 bg-[color:var(--input)] px-5 text-base shadow-none focus-visible:ring-2 focus-visible:ring-ring"
              {...form.register("confirm_password")}
            />
            {form.formState.errors.confirm_password ? (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.confirm_password.message}
              </p>
            ) : null}
          </div>

          <div className="pt-4">
            <LoadingButton
              type="submit"
              className="h-14 w-full rounded-2xl bg-primary text-base font-extrabold text-primary-foreground shadow-lg shadow-primary/15 transition-transform active:scale-[0.98]"
              loading={signUpMutation.isPending}
            >
              <span>Crear cuenta</span>
              <ArrowRight className="size-5" />
            </LoadingButton>
          </div>
        </form>
      </main>

      <div className="fixed inset-x-0 bottom-0 flex justify-center bg-background/85 p-8 backdrop-blur-md">
        <p className="text-sm font-medium text-muted-foreground">
          Ya tenes una cuenta?
          <RouterLink
            to="/login"
            className="ml-1 font-extrabold text-primary hover:underline"
          >
            Ingresar
          </RouterLink>
        </p>
      </div>
    </div>
  )
}
