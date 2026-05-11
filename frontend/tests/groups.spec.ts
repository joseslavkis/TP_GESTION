import { expect, test } from "@playwright/test"
import { randomEmail, randomPassword } from "./utils/random"
import { createUser, logInUser } from "./utils/user"

async function createGroupWithMember(
  page: any,
  email: string,
  password: string,
  groupName: string,
) {
  await logInUser(page, email, password)
  await page.goto("/groups")
  await page.getByRole("button", { name: "Crear grupo" }).click()
  await page.getByPlaceholder("Nombre del grupo").fill(groupName)
  await page.getByPlaceholder("Descripcion").fill("Grupo de prueba")
  await page.getByRole("button", { name: "Crear" }).click()
  await expect(page.getByText(groupName)).toBeVisible()
}

async function createExpense(
  page: any,
  description: string,
  amount: string,
  category: string,
) {
  await page.getByRole("button", { name: "Registrar movimiento" }).click()
  await page.getByPlaceholder("Supermercado").fill(description)
  await page.getByLabel("Categoria").click()
  await page.getByRole("option", { name: category }).click()
  await page.getByPlaceholder("0").fill(amount)
  await page.getByRole("button", { name: "Guardar" }).click()
  await expect(page.getByText(description)).toBeVisible()
}

test.describe("CA 1 - Búsqueda por texto", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("escribe texto en el buscador y la lista se actualiza", async ({
    page,
  }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password, fullName: "Test User" })
    await createGroupWithMember(page, email, password, "Viaje grupal")

    await createExpense(page, "Supermercado", "100", "Comida")
    await createExpense(page, "Nafta", "50", "Transporte")

    const searchInput = page.getByPlaceholder("Buscar gasto")
    await searchInput.fill("super")

    await expect(page.getByText("Supermercado")).toBeVisible()
    await expect(page.getByText("Nafta")).not.toBeVisible()
  })

  test("la búsqueda es case-insensitive", async ({ page }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password, fullName: "Test User" })
    await createGroupWithMember(page, email, password, "Viaje grupal")

    await createExpense(page, "SUPERMERCADO", "100", "Comida")

    const searchInput = page.getByPlaceholder("Buscar gasto")
    await searchInput.fill("super")

    await expect(page.getByText("SUPERMERCADO")).toBeVisible()
  })

  test("búsqueda sin resultados muestra mensaje vacío", async ({ page }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password, fullName: "Test User" })
    await createGroupWithMember(page, email, password, "Viaje grupal")

    await createExpense(page, "Cerveza", "30", "Comida")

    const searchInput = page.getByPlaceholder("Buscar gasto")
    await searchInput.fill("vino")

    await expect(
      page.getByText("No hay gastos para los filtros seleccionados."),
    ).toBeVisible()
  })
})

test.describe("CA 2 - Filtrado por categoría", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("selecciona categoría y solo muestra gastos de esa categoría", async ({
    page,
  }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password, fullName: "Test User" })
    await createGroupWithMember(page, email, password, "Viaje grupal")

    await createExpense(page, "Cena", "120", "Comida")
    await createExpense(page, "Billetera", "10", "Compras")
    await createExpense(page, "Nafta", "50", "Transporte")

    await page.getByLabel("Categoria").click()
    await page.getByRole("option", { name: "Comida" }).click()

    await expect(page.getByText("Cena")).toBeVisible()
    await expect(page.getByText("Billetera")).not.toBeVisible()
    await expect(page.getByText("Nafta")).not.toBeVisible()
  })

  test("selecciona categoria 'Todas' y muestra todos los gastos", async ({
    page,
  }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password, fullName: "Test User" })
    await createGroupWithMember(page, email, password, "Viaje grupal")

    await createExpense(page, "Cena", "120", "Comida")
    await createExpense(page, "Nafta", "50", "Transporte")

    await page.getByLabel("Categoria").click()
    await page.getByRole("option", { name: "Comida" }).click()
    await expect(page.getByText("Cena")).toBeVisible()

    await page.getByLabel("Categoria").click()
    await page.getByRole("option", { name: "Todas" }).click()
    await expect(page.getByText("Cena")).toBeVisible()
    await expect(page.getByText("Nafta")).toBeVisible()
  })
})

test.describe("CA 3 - Combinación de búsqueda y filtro", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("filtra por categoría y busca por texto simultáneamente", async ({
    page,
  }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password, fullName: "Test User" })
    await createGroupWithMember(page, email, password, "Viaje grupal")

    await createExpense(page, "Pizzeria Don Julio", "150", "Comida")
    await createExpense(page, "Panchos", "25", "Comida")
    await createExpense(page, "Cine", "80", "Entretenimiento")

    await page.getByLabel("Categoria").click()
    await page.getByRole("option", { name: "Comida" }).click()

    const searchInput = page.getByPlaceholder("Buscar gasto")
    await searchInput.fill("pizz")

    await expect(page.getByText("Pizzeria Don Julio")).toBeVisible()
    await expect(page.getByText("Panchos")).not.toBeVisible()
    await expect(page.getByText("Cine")).not.toBeVisible()
  })

  test("al cambiar categoria, la busqueda sigue activa", async ({ page }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password, fullName: "Test User" })
    await createGroupWithMember(page, email, password, "Viaje grupal")

    await createExpense(page, "Pizzeria", "150", "Comida")
    await createExpense(page, "Cine", "80", "Entretenimiento")

    const searchInput = page.getByPlaceholder("Buscar gasto")
    await searchInput.fill("pizz")

    await page.getByLabel("Categoria").click()
    await page.getByRole("option", { name: "Entretenimiento" }).click()

    await expect(
      page.getByText("No hay gastos para los filtros seleccionados."),
    ).toBeVisible()
    await expect(page.getByText("Pizzeria")).not.toBeVisible()
  })
})

test.describe("CA 4 - Sin resultados", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("sin resultados muestra mensaje y opción de limpiar filtros", async ({
    page,
  }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password, fullName: "Test User" })
    await createGroupWithMember(page, email, password, "Viaje grupal")

    await createExpense(page, "Cerveza", "30", "Comida")

    await page.getByLabel("Categoria").click()
    await page.getByRole("option", { name: "Transporte" }).click()

    await expect(
      page.getByText("No hay gastos para los filtros seleccionados."),
    ).toBeVisible()
    const limpiarBtn = page.getByRole("button", { name: "Limpiar filtros" })
    await expect(limpiarBtn).toBeVisible()
  })

  test("clic en limpiar filtros restaura la lista completa", async ({
    page,
  }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password, fullName: "Test User" })
    await createGroupWithMember(page, email, password, "Viaje grupal")

    await createExpense(page, "Cerveza", "30", "Comida")
    await createExpense(page, "Empanadas", "40", "Comida")

    await page.getByLabel("Categoria").click()
    await page.getByRole("option", { name: "Transporte" }).click()
    await expect(
      page.getByText("No hay gastos para los filtros seleccionados."),
    ).toBeVisible()

    await page.getByRole("button", { name: "Limpiar filtros" }).click()

    await expect(page.getByText("Cerveza")).toBeVisible()
    await expect(page.getByText("Empanadas")).toBeVisible()
    await expect(page.getByLabel("Categoria").getByText("Todas")).toBeVisible()
  })

  test("busqueda sin resultados con botón limpiar visible", async ({
    page,
  }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password, fullName: "Test User" })
    await createGroupWithMember(page, email, password, "Viaje grupal")

    await createExpense(page, "Cerveza", "30", "Comida")

    const searchInput = page.getByPlaceholder("Buscar gasto")
    await searchInput.fill("vino")

    await expect(
      page.getByText("No hay gastos para los filtros seleccionados."),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Limpiar filtros" }),
    ).toBeVisible()
  })
})

test.describe("Crear gasto con categoría", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("al crear gasto, la categoría se guarda y muestra en la lista", async ({
    page,
  }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password, fullName: "Test User" })
    await createGroupWithMember(page, email, password, "Viaje grupal")

    await page.getByRole("button", { name: "Registrar movimiento" }).click()
    await page.getByPlaceholder("Supermercado").fill("Cena restaurant")
    await page.getByLabel("Categoria").click()
    await page.getByRole("option", { name: "Comida" }).click()
    await page.getByPlaceholder("0").fill("150")
    await page.getByRole("button", { name: "Guardar" }).click()

    await expect(page.getByText("Cena restaurant")).toBeVisible()
  })

  test("todas las categorías están disponibles al crear gasto", async ({
    page,
  }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password, fullName: "Test User" })
    await createGroupWithMember(page, email, password, "Viaje grupal")

    await page.getByRole("button", { name: "Registrar movimiento" }).click()
    await page.getByLabel("Categoria").click()

    const categories = [
      "Comida",
      "Transporte",
      "Entretenimiento",
      "Compras",
      "Servicios",
      "Salud",
      "Otros",
    ]
    for (const cat of categories) {
      await expect(page.getByRole("option", { name: cat })).toBeVisible()
    }
  })
})

test.describe("Editar gasto con categoría", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("puede cambiar la categoría de un gasto existente", async ({ page }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password, fullName: "Test User" })
    await createGroupWithMember(page, email, password, "Viaje grupal")

    await createExpense(page, "Cine", "80", "Entretenimiento")

    await page.getByRole("button", { name: "Modificar gasto" }).last().click()
    await page.getByLabel("Categoria").click()
    await page.getByRole("option", { name: "Comida" }).click()
    await page.getByRole("button", { name: "Guardar" }).click()

    await expect(page.getByText("Cine")).toBeVisible()
  })
})
