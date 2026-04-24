import type { CancelablePromise } from "./core/CancelablePromise"
import { OpenAPI } from "./core/OpenAPI"
import { request as __request } from "./core/request"
import type { Message } from "./types.gen"

export type GroupPublic = {
  id: string
  name: string
  description?: string | null
  created_at: string
  current_user_balance: number
}

export type GroupsPublic = {
  data: GroupPublic[]
  count: number
}

export type GroupCreate = {
  name: string
  description?: string | null
}

export type GroupUpdate = {
  name?: string | null
  description?: string | null
}

export type GroupMemberCreate = {
  email: string
  is_admin?: boolean
}

export type GroupMemberPublic = {
  user_id: string
  email: string
  full_name?: string | null
  is_admin: boolean
  balance: number
  joined_at: string
}

export type GroupDetailPublic = GroupPublic & {
  members: GroupMemberPublic[]
}

export type ExpenseParticipantIn = {
  user_id: string
  amount?: number | null
}

export type ExpenseCreate = {
  description: string
  amount: number
  payer_id: string
  division_mode: "equitable" | "custom"
  participants: ExpenseParticipantIn[]
}

export type ExpenseParticipantPublic = {
  user_id: string
  amount_owed: number
}

export type ExpensePublic = {
  id: string
  description: string
  amount: number
  group_id: string
  payer_id: string
  created_at: string
  participants: ExpenseParticipantPublic[]
}

export type ExpensesPublic = {
  data: ExpensePublic[]
  count: number
}

export type UserExpensePublic = {
  expense_id: string
  group_id: string
  group_name: string
  description: string
  amount: number
  payer_id: string
  created_at: string
  current_user_amount_owed: number
}

export type UserExpensesPublic = {
  data: UserExpensePublic[]
  count: number
}

type PaginationData = {
  skip?: number
  limit?: number
}

export class GroupsService {
  public static listUserGroups(
    data: PaginationData = {},
  ): CancelablePromise<GroupsPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/groups/",
      query: {
        skip: data.skip,
        limit: data.limit,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  public static createGroup(data: {
    requestBody: GroupCreate
  }): CancelablePromise<GroupPublic> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/groups/",
      body: data.requestBody,
      mediaType: "application/json",
      errors: {
        422: "Validation Error",
      },
    })
  }

  public static readGroup(data: {
    groupId: string
  }): CancelablePromise<GroupDetailPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/groups/{group_id}",
      path: {
        group_id: data.groupId,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  public static updateGroup(data: {
    groupId: string
    requestBody: GroupUpdate
  }): CancelablePromise<GroupDetailPublic> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/api/v1/groups/{group_id}",
      path: {
        group_id: data.groupId,
      },
      body: data.requestBody,
      mediaType: "application/json",
      errors: {
        422: "Validation Error",
      },
    })
  }

  public static deleteGroup(data: {
    groupId: string
  }): CancelablePromise<Message> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/api/v1/groups/{group_id}",
      path: {
        group_id: data.groupId,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  public static addGroupMember(data: {
    groupId: string
    requestBody: GroupMemberCreate
  }): CancelablePromise<GroupMemberPublic> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/groups/{group_id}/members",
      path: {
        group_id: data.groupId,
      },
      body: data.requestBody,
      mediaType: "application/json",
      errors: {
        422: "Validation Error",
      },
    })
  }

  public static removeGroupMember(data: {
    groupId: string
    userId: string
  }): CancelablePromise<Message> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/api/v1/groups/{group_id}/members/{user_id}",
      path: {
        group_id: data.groupId,
        user_id: data.userId,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  public static listCurrentUserGroupExpenses(
    data: PaginationData = {},
  ): CancelablePromise<UserExpensesPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/groups/me/expenses",
      query: {
        skip: data.skip,
        limit: data.limit,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  public static listGroupExpenses(data: {
    groupId: string
    skip?: number
    limit?: number
  }): CancelablePromise<ExpensesPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/groups/{group_id}/expenses",
      path: {
        group_id: data.groupId,
      },
      query: {
        skip: data.skip,
        limit: data.limit,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  public static createExpense(data: {
    groupId: string
    requestBody: ExpenseCreate
  }): CancelablePromise<ExpensePublic> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/groups/{group_id}/expenses",
      path: {
        group_id: data.groupId,
      },
      body: data.requestBody,
      mediaType: "application/json",
      errors: {
        422: "Validation Error",
      },
    })
  }
}
