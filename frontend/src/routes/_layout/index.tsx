import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/Dashboard/dashboard";

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Inicio - Gastos Grupales" },
      {
        name: "description",
        content: "Llevá el control de tus gastos compartidos con amigos.",
      },
    ],
  }),
});
