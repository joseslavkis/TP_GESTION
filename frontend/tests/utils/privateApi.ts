// Note: the `PrivateService` is only available when generating the client
// for local environments
import { OpenAPI, PrivateService } from "../../src/client"

const apiBaseUrl = process.env.VITE_API_BASE_URL ?? process.env.VITE_API_URL

if (!apiBaseUrl) {
  throw new Error(
    "Missing API base URL. Set VITE_API_BASE_URL (preferred) or VITE_API_URL.",
  )
}

OpenAPI.BASE = apiBaseUrl.replace(/\/$/, "")

export const createUser = async ({
  email,
  password,
}: {
  email: string
  password: string
}) => {
  return await PrivateService.createUser({
    requestBody: {
      email,
      password,
      is_verified: true,
      full_name: "Test User",
    },
  })
}
