import { createFileRoute } from "@tanstack/react-router"

import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({
    meta: [
      {
        title: "Inicio - Gastos Grupales",
      },
    ],
  }),
})

function Dashboard() {
  const { user: currentUser } = useAuth()

  return (
    <div>
      <div>
        <h1 className="text-2xl truncate max-w-sm">
          Hola, {currentUser?.full_name || currentUser?.email}
        </h1>
        <p className="text-muted-foreground">
          Esta base queda lista para evolucionar hacia grupos, gastos y
          balances compartidos.
        </p>
      </div>
    </div>
  )
}
