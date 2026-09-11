interface QuotaClient {
  rpc(name: "rate_limit_check", args: { _bucket: string; _limit: number; _window_seconds: number }): PromiseLike<{ data: unknown; error: unknown }>;
}

export async function paidQuota(client: QuotaClient, bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const { data, error } = await client.rpc("rate_limit_check", {
      _bucket: bucket, _limit: limit, _window_seconds: windowSeconds,
    });
    return !error && typeof data === "object" && data !== null && "allowed" in data && data.allowed === true;
  } catch (error) {
    console.error("paid_quota_unavailable", { kind: error instanceof Error ? error.name : "unknown" });
    return false;
  }
}
