interface TimeseriesRow {
  visitors?: number;
}

interface TimeseriesResponse {
  data?: TimeseriesRow[];
}

export async function getMonthlyVisitors(): Promise<number | null> {
  if (!process.env.DATAFAST_API_KEY) return null;

  const endAt = new Date();
  const startAt = new Date();
  startAt.setDate(startAt.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const res = await fetch(
      `https://datafa.st/api/v1/analytics/timeseries?fields=visitors&interval=day&startAt=${fmt(startAt)}&endAt=${fmt(endAt)}`,
      {
        headers: { Authorization: `Bearer ${process.env.DATAFAST_API_KEY}` },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as TimeseriesResponse;
    const total = json.data?.reduce((sum, row) => sum + (row.visitors ?? 0), 0);
    return typeof total === 'number' ? total : null;
  } catch {
    return null;
  }
}
