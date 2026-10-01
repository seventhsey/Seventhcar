export type QuoteExtraInput = {
  extra_id: number;
  qty: number;
};

export type QuoteRequest = {
  plate_number: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  extras: QuoteExtraInput[];
};

export type QuoteExtraLine = {
  extra_id: number;
  name: string;
  quantity: number;
  max_quantity: number;
  unit_price: number;
  charge_type: "daily" | "once";
  charged_days: number;
  total: number;
};

export type ReservationQuote = {
  currency: "EUR";
  day_count: number;
  vehicle: {
    plate_number: string;
    name?: string;
    daily_rate: number;
    multiplier: number;
    total: number;
  };
  extras: QuoteExtraLine[];
  extras_total: number;
  total: number;
};

export async function requestReservationQuote(
  input: QuoteRequest,
  signal?: AbortSignal
): Promise<ReservationQuote> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("The booking API is not configured.");
  }

  const response = await fetch(`${apiUrl}/quotes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    signal,
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success || !result.quote) {
    throw new Error(result.error || "Could not calculate the booking total.");
  }

  return result.quote as ReservationQuote;
}
