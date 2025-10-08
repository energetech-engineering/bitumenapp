export type ScenarioIn = {
  destination: "LUB" | "KIN" | "KOL";
  incoterm: "CFR" | "FOB";
  volume_mt: number; buy_price_per_mt: number; sell_price_per_mt?: number | null;
  shrinkage_pct: number; storage_months: number;
  dpo_buy_days: number; dso_sell_days: number; annual_finance_rate_pct: number;
  mt_per_container: number; mt_per_truck: number; insurance_rate_pct: number;
};

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function computeScenario(s: ScenarioIn){
  const r = await fetch(`${API}/api/compute`, {
    method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(s)
  });
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function listCosts(){ const r=await fetch(`${API}/api/costs`); if(!r.ok) throw new Error(await r.text()); return r.json(); }
export async function updateCost(code:string, body:any){
  const r=await fetch(`${API}/api/costs/${encodeURIComponent(code)}`,{
    method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)
  });
  if(!r.ok) throw new Error(await r.text()); return r.json();
}
export async function resetCosts(){ const r=await fetch(`${API}/api/costs/reset`,{method:"POST"}); if(!r.ok) throw new Error(await r.text()); return r.json(); }
export async function listSellPrices(){ const r=await fetch(`${API}/api/sell-prices`); if(!r.ok) throw new Error(await r.text()); return r.json(); }
