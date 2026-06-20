// Append-only audit logging for Otto write actions. Best-effort: never throws,
// so a missing table or transient error can't break a tool that already
// performed its mutation.
import type { ToolContext, ToolResult } from "./types.ts";

export async function logAction(
  ctx: ToolContext,
  tool: string,
  args: Record<string, any>,
  result: ToolResult,
): Promise<void> {
  try {
    // Strip internal _instruction noise from the stored args/result.
    const cleanArgs = { ...args };
    delete (cleanArgs as any)._attachment_paths;
    await ctx.supabaseAdmin.from("otto_action_log").insert({
      organization_id: ctx.orgId,
      user_id: ctx.userId,
      tool,
      args: cleanArgs,
      result: { success: result.success ?? !result.error, ...(result.error ? { error: result.error } : {}) },
      success: !result.error,
    });
  } catch (e) {
    console.error("otto audit log failed (non-fatal):", e);
  }
}
