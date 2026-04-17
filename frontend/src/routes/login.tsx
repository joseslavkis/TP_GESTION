import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute, Link as RouterLink, redirect } from "@tanstack/react-router"
import { ArrowRight, Wallet } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import type { Body_login_login_access_token as AccessToken } from "@/client"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import { PasswordInput } from "@/components/ui/password-input"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"

const formSchema = z.object({
  username: z.email({ message: "Ingresa un email valido" }),
  password: z
    .string()
    .min(1, { message: "La contrasena es obligatoria" })
    .min(8, { message: "La contrasena debe tener al menos 8 caracteres" }),
}) satisfies z.ZodType<AccessToken>

type FormData = z.infer<typeof formSchema>

export const Route = createFileRoute("/login")({
  component: Login,
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
        title: "Ingresar - Gastos Grupales",
      },
    ],
  }),
})

function Login() {
  const { loginMutation } = useAuth()
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      username: "",
      password: "",
    },
  })

  const onSubmit = (data: FormData) => {
    if (loginMutation.isPending) return
    loginMutation.mutate(data)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute right-[-12rem] top-[-7rem] h-80 w-80 rounded-full bg-primary/12 blur-3xl" />
      <div className="absolute bottom-[-8rem] left-[-5rem] h-72 w-72 rounded-full bg-rose-400/12 blur-3xl" />

      <header className="fixed inset-x-0 top-0 z-10 flex h-16 items-center px-6 backdrop-blur-sm">
        <div className="flex size-10 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-border/70">
          <Wallet className="size-5 text-primary" />
        </div>
      </header>

      <main className="flex min-h-screen items-center justify-center px-6 pb-12 pt-24">
        <div className="w-full max-w-md">
          <div className="mb-10 space-y-2">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-primary/80">
              Gastos Grupales
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              Bienvenido otra vez
            </h1>
            <p className="max-w-sm text-base font-medium text-muted-foreground">
              Entrá para seguir organizando grupos, gastos compartidos y saldos
              pendientes.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-muted-foreground"
              >
                Email
              </label>
              <Input
                id="email"
                data-testid="email-input"
                placeholder="nombre@ejemplo.com"
                type="email"
                className="h-14 rounded-2xl border-0 bg-[color:var(--input)] px-4 text-base shadow-none focus-visible:ring-2 focus-visible:ring-ring"
                {...form.register("username")}
              />
              {form.formState.errors.username ? (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.username.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-muted-foreground"
                >
                  Contrasena
                </label>
                <RouterLink
                  to="/recover-password"
                  className="text-sm font-bold text-primary transition-opacity hover:opacity-80"
                >
                  Olvidaste tu contrasena?
                </RouterLink>
              </div>
              <PasswordInput
                id="password"
                data-testid="password-input"
                placeholder="••••••••"
                className="h-14 rounded-2xl border-0 bg-[color:var(--input)] px-4 text-base shadow-none focus-visible:ring-2 focus-visible:ring-ring"
                {...form.register("password")}
              />
              {form.formState.errors.password ? (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            <LoadingButton
              type="submit"
              loading={loginMutation.isPending}
              className="h-14 w-full rounded-2xl bg-gradient-to-br from-primary to-emerald-800 text-lg font-extrabold text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.98]"
            >
              <span>Ingresar</span>
              <ArrowRight className="size-5" />
            </LoadingButton>
          </form>

          <p className="mt-12 text-center text-sm font-medium text-muted-foreground">
            No tenes cuenta?
            <RouterLink
              to="/signup"
              className="ml-1 font-extrabold text-primary transition-all hover:underline"
            >
              Crear cuenta
            </RouterLink>
          </p>
        </div>
      </main>
    </div>
  )
}
