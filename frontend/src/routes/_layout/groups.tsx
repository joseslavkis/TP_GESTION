import { useQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router"
import { Search, Users } from "lucide-react"
import { useMemo, useState } from "react"

import { GroupsService } from "@/client"
import { AddGroupDialog } from "@/components/Groups/AddGroupDialog"
import { GroupCard } from "@/components/Groups/GroupCard"
import { Input } from "@/components/ui/input"

export const Route = createFileRoute("/_layout/groups")({
  component: GroupsPage,
  head: () => ({
    meta: [
      {
        title: "Grupos - Gastos Grupales",
      },
    ],
  }),
})

function GroupsPage() {
  const router = useRouterState()
  const currentPath = router.location.pathname.replace(/\/$/, "")

  if (currentPath !== "/groups") {
    return <Outlet />
  }

  return <GroupsListPage />
}

function GroupsListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: () => GroupsService.listUserGroups({ skip: 0, limit: 100 }),
  })
  const groups = groupsQuery.data?.data ?? []

  const filteredGroups = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) return groups
    return groups.filter((group) => {
      return [group.name, group.description || ""].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      )
    })
  }, [groups, search])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grupos</h1>
          <p className="text-muted-foreground">
            Espacios compartidos con saldos por integrante
          </p>
        </div>
        <AddGroupDialog
          onCreated={(group) =>
            navigate({
              to: "/groups/$groupId",
              params: { groupId: group.id },
            })
          }
        />
      </div>

      <div className="flex max-w-md items-center gap-2 rounded-lg border bg-card px-3">
        <Search className="size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar grupo"
          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        />
      </div>

      {groupsQuery.isLoading ? (
        <div className="rounded-lg border bg-card p-8 text-sm text-muted-foreground">
          Cargando grupos...
        </div>
      ) : null}

      {!groupsQuery.isLoading && filteredGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-10 text-center">
          <Users className="mb-3 size-8 text-muted-foreground" />
          <h2 className="font-semibold">No hay grupos para mostrar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea un grupo o ajusta la busqueda actual.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3">
        {filteredGroups.map((group) => (
          <GroupCard key={group.id} groupPublic={group} />
        ))}
      </div>
    </div>
  )
}
