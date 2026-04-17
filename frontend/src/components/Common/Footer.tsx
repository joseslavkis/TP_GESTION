export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t py-4 px-6">
      <div className="flex flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
        <p className="text-muted-foreground text-sm">
          GDSI - Trabajo Practico 3 - Gastos Grupales
        </p>
        <p className="text-muted-foreground text-sm">{currentYear}</p>
      </div>
    </footer>
  )
}
