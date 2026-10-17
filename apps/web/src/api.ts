export type CurrentUser = { id: string; displayName: string; email: string | null; accountType: "student" | "staff" | "system_admin" };
export const loginUrl = "/auth/login?returnTo=%2Flabs";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(path, { credentials: "same-origin", ...options, signal: controller.signal });
    if (!response.ok) throw new ApiError(response.status === 401 ? "Please sign in to continue." : "We couldn’t load your workspace. Please try again.", response.status);
    return (response.status === 204 ? undefined : await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error("We couldn’t connect to VInventory. Check your connection and try again.");
  } finally { window.clearTimeout(timeout); }
}
