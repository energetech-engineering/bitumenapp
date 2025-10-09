export type Incoterm = "CFR" | "FOB";
export type Destination = "LUB" | "KIN" | "KOL";

export type ScenarioIn = {
  destination: Destination;
  incoterm: Incoterm;
  volume_mt: number;
  buy_price_per_mt: number;
  sell_price_per_mt?: number | null;
  shrinkage_pct: number;
  storage_months: number;
  dpo_buy_days: number;
  dso_sell_days: number;
  annual_finance_rate_pct: number;
  partner_profit_pct: number;
  mt_per_container: number;
  mt_per_truck: number;
};

const API = (import.meta as any).env?.VITE_API_URL || (window as any).__API__ || "http://localhost:8000";

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function computeScenario(s: ScenarioIn) {
  const res = await fetch(`${API}/api/compute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(s)
  });
  return j<any>(res);
}

export async function listCosts() {
  const res = await fetch(`${API}/api/costs`);
  return j<any[]>(res);
}

export async function saveCost(item: any) {
  const res = await fetch(`${API}/api/costs/${encodeURIComponent(item.code)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item)
  });
  return j<any>(res);
}
