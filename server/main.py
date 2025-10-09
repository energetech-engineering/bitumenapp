from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List
import math
import copy

app = FastAPI(title="Trade Calculator API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"]
)

# ------------ Models ------------
class ScenarioIn(BaseModel):
    destination: str           # "LUB" | "KIN" | "KOL"
    incoterm: str = "CFR"      # "CFR" | "FOB" (per ora informativo)
    volume_mt: float
    buy_price_per_mt: float
    sell_price_per_mt: float | None = None
    shrinkage_pct: float = 0.0
    storage_months: float = 0.0
    dpo_buy_days: int = 0
    dso_sell_days: int = 0
    annual_finance_rate_pct: float = 0.0
    partner_profit_pct: float = 5.0
    mt_per_container: float = 40
    mt_per_truck: float = 58

class CostItem(BaseModel):
    code: str
    name: str
    behavior: str                  # "per_ton"|"per_container"|"per_truck"|"per_month"|"fixed_per_shipment"|"percent_of_value"|"percent_of_cogs"
    unit_amount_usd: float
    unit: str
    qty_source: str                # "Volume_MT"|"Containers"|"Trucks"|"Storage_Months"|"1"|"Value_USD"|"COGS_USD"
    dest_scope: str                # "LUB*"|"KIN*"|"KOL*"
    category: str                  # "product"|"logistics"|"insurance"|"finance"

# ------------ Helpers ------------
def containers_needed(volume_mt: float, mt_per_container: float) -> int:
    return int(math.ceil(volume_mt / max(mt_per_container, 0.0001)))

def trucks_needed(volume_mt: float, mt_per_truck: float) -> int:
    return int(math.ceil(volume_mt / max(mt_per_truck, 0.0001)))

def value_usd(volume_mt: float, unit_price: float) -> float:
    return volume_mt * unit_price

def matches_scope(item: CostItem, dest: str) -> bool:
    return item.dest_scope.startswith(dest)

# ------------ Seed costs (KIN, LUB, KOL) ------------
def seed_costs() -> List[CostItem]:
    costs: List[CostItem] = []

    # COGS placeholder (calcolato da buy_price_per_mt)
    for d in ("LUB*","KIN*","KOL*"):
        costs.append(CostItem(
            code=f"COGS_BITUMEN_{d[:3]}", name="Bitumen purchase (CFR/FOB as selected)",
            behavior="per_ton", unit_amount_usd=0, unit="MT",
            qty_source="Volume_MT", dest_scope=d, category="product"
        ))

    # -------- LUB (da fattura Lubumbashi) --------
    LUB = [
        ("TRK_TZ_DRC_LINEHAUL","Transport Dar→Lubumbashi / truck","per_truck",9200,"truck","Trucks","logistics"),
        ("CLR_TZ_CNTR","Clearance TZ / container","per_container",716,"container","Containers","logistics"),
        ("HND_TZ_CNTR","Handling TZ / container","per_container",200,"container","Containers","logistics"),
        ("WH_LUB_MONTH","Lubumbashi warehousing / month","per_month",8000,"month","Storage_Months","logistics"),
        ("HND_LUB_TON","Lubumbashi handling in/out / ton","per_ton",75,"MT","Volume_MT","logistics"),
        ("INSP_BIVAC","Intervention inspection BIVAC/Zam/BL (fixed)","fixed_per_shipment",2500,"shipment","1","logistics"),
        ("DRC_SEGQUE_TRK","DRC Import SEGQUE / truck","per_truck",120,"truck","Trucks","logistics"),
        ("DRC_DGDA_SEAL_TRK","DRC Import DGDA seals / truck","per_truck",35,"truck","Trucks","logistics"),
        ("DRC_OPS_TRK","DRC Import operational charges / truck","per_truck",232,"truck","Trucks","logistics"),
        ("DRC_DOSSIER_TRK","DRC Import dossier opening / truck","per_truck",50,"truck","Trucks","logistics"),
        ("DRC_AGENCY_TRK","DRC Agency fees / truck","per_truck",81.2,"truck","Trucks","logistics"),
        ("DRC_FERI_CNTR","DRC Import FERI / container","per_container",101.46,"container","Containers","logistics"),
        ("DRC_OGEFREM_TRK","DRC OGEFREM attestation / truck","per_truck",182,"truck","Trucks","logistics"),
        ("BIVAC_FEE_PCT_LUB","Bivac fee — 2% of purchase value","percent_of_cogs",0.02,"fraction_of_value","COGS_USD","logistics"),
        ("ADMIN_SURCHARGE_PCT_LUB","Administrative surcharge — 2% of purchase value","percent_of_cogs",0.02,"fraction_of_value","COGS_USD","logistics"),
        ("BANK_FEE_PCT_LUB","Bank collection fee — 5% of purchase value","percent_of_cogs",0.05,"fraction_of_value","COGS_USD","logistics"),
    ]
    for code,name,beh,amt,unit,qty_src,cat in LUB:
        costs.append(CostItem(code=code,name=name,behavior=beh,unit_amount_usd=amt,unit=unit,qty_source=qty_src,dest_scope="LUB*",category=cat))

    # -------- KIN (da fattura Matadi→Kinshasa) --------
    KIN = [
        ("TRN_MAT_KIN_CNTR","Transport Matadi→Kinshasa / container","per_container",2150,"container","Containers","logistics"),
        ("HND_KIN_TCK_CNTR","Kinshasa handling TCK / container","per_container",356,"container","Containers","logistics"),
        ("BOND_KIN_DAY_CNTR","Bonded warehouse VAT incl./day TCPK / container","per_container",22.04,"container","Containers","logistics"),
        ("SHIP_LINE_CNTR","Shipping line fees / container","per_container",630,"container","Containers","logistics"),
        ("MAIRF_CNTR","Mairf / container","per_container",10,"container","Containers","logistics"),
        ("AQUAI_CNTR","AQUAI / container","per_container",100,"container","Containers","logistics"),
        ("FUMIG_CNTR","Fumigation / container","per_container",50,"container","Containers","logistics"),
        ("FERI_CNTR","FERI / container","per_container",71.46,"container","Containers","logistics"),
        ("ADM_FERI_CNTR","FERI administrative fees / container","per_container",30,"container","Containers","logistics"),
        ("AD_CERT_CNTR","AD certificate / container","per_container",38.7,"container","Containers","logistics"),
        ("AD_ADMIN_CNTR","AD administrative fees / container","per_container",30,"container","Containers","logistics"),
        ("LIQ_ESEAL_CNTR","Liquidation electronic seal + RLT / container","per_container",255,"container","Containers","logistics"),
        ("TECH_FEES_CNTR","Technical fees / container","per_container",200,"container","Containers","logistics"),
        ("OPS_ADMIN_CNTR","Operational & administrative fees / container","per_container",200,"container","Containers","logistics"),
        ("FILE_OPEN_CNTR","File opening / container","per_container",50,"container","Containers","logistics"),
        ("BANK_FEES_CNTR","Bank fees / container","per_container",50,"container","Containers","logistics"),
        ("SEGQUE_CNTR","Segque / container","per_container",105,"container","Containers","logistics"),
        ("AGENCY_CNTR","Agency fees / container","per_container",350,"container","Containers","logistics"),
    ]
    for code,name,beh,amt,unit,qty_src,cat in KIN:
        costs.append(CostItem(code=code,name=name,behavior=beh,unit_amount_usd=amt,unit=unit,qty_source=qty_src,dest_scope="KIN*",category=cat))

    # -------- KOL (replica LUB + add-on inland/storage, excluding Lubumbashi warehousing) --------
    for code,name,beh,amt,unit,qty_src,cat in LUB:
        if code != "WH_LUB_MONTH":  # Exclude Lubumbashi warehousing for KOL
            costs.append(CostItem(code=f"KOL_{code}",name=name,behavior=beh,unit_amount_usd=amt,unit=unit,qty_source=qty_src,dest_scope="KOL*",category=cat))
    costs.append(CostItem(code="KOL_INLAND_PER_MT", name="Additional inland transport Kolwezi / MT",
                          behavior="per_ton", unit_amount_usd=60, unit="MT", qty_source="Volume_MT", dest_scope="KOL*", category="logistics"))
    costs.append(CostItem(code="KOL_STORE_PER_MT_MONTH", name="Kolwezi storage / MT / month",
                          behavior="per_month", unit_amount_usd=79, unit="month", qty_source="Storage_Months", dest_scope="KOL*", category="logistics"))

    # -------- Insurance (percent value-based) --------
    costs.append(CostItem(code="INS_KIN_VALUE_PCT", name="Insurance (value-based) Kinshasa",
                          behavior="percent_of_value", unit_amount_usd=0.00325, unit="percent", qty_source="Value_USD", dest_scope="KIN*", category="insurance"))
    costs.append(CostItem(code="INS_LUB_VALUE_PCT", name="Insurance (value-based) Lubumbashi",
                          behavior="percent_of_value", unit_amount_usd=0.00425, unit="percent", qty_source="Value_USD", dest_scope="LUB*", category="insurance"))
    costs.append(CostItem(code="INS_KOL_VALUE_PCT", name="Insurance (value-based) Kolwezi (=Lubumbashi)",
                          behavior="percent_of_value", unit_amount_usd=0.00425, unit="percent", qty_source="Value_USD", dest_scope="KOL*", category="insurance"))

    return costs

DEFAULT_COSTS: List[CostItem] = seed_costs()

# Mappe per disegno rotta
ROUTE_LEGS = {
    "LUB": [("Dar es Salaam","Lubumbashi")],
    "KIN": [("Matadi","Kinshasa")],
    "KOL": [("Dar es Salaam","Kolwezi")]
}

# ------------ API ------------
@app.get("/api/health")
@app.get("/health")
def health():
    return {"status":"ok"}

@app.get("/api/costs")
@app.get("/costs")
def list_costs():
    # sort per coerenza
    return [c.model_dump() for c in sorted(DEFAULT_COSTS, key=lambda x: x.code)]

@app.post("/api/costs")
@app.post("/costs")
def add_cost(item: CostItem):
    DEFAULT_COSTS.append(item)
    return {"ok": True}

@app.put("/api/costs/{code}")
@app.put("/costs/{code}")
def update_cost(code: str, item: CostItem):
    for i, c in enumerate(DEFAULT_COSTS):
        if c.code == code:
            DEFAULT_COSTS[i] = item
            return {"ok": True}
    raise HTTPException(404, "Cost not found")

class ComputeOut(BaseModel):
    kpis: Dict[str, float]
    breakdown: Dict[str, Any]

def _compute_internal(s: ScenarioIn) -> ComputeOut:
    sell_unit = s.sell_price_per_mt if s.sell_price_per_mt not in (None, 0) else s.buy_price_per_mt
    buy_unit  = s.buy_price_per_mt

    n_cntr = containers_needed(s.volume_mt, s.mt_per_container)
    n_trk  = trucks_needed(s.volume_mt, s.mt_per_truck)
    revenue = value_usd(s.volume_mt, sell_unit)
    cogs_total = value_usd(s.volume_mt, buy_unit)

    lines: list[dict] = []
    total_log = 0.0
    total_ins = 0.0

    for item in DEFAULT_COSTS:
        if not matches_scope(item, s.destination): 
            continue
        if item.category == "product" and item.code.startswith("COGS_"):
            continue

        if item.behavior == "per_ton":
            qty = s.volume_mt
            cost = qty * item.unit_amount_usd
        elif item.behavior == "per_container":
            qty = n_cntr
            cost = qty * item.unit_amount_usd
        elif item.behavior == "per_truck":
            qty = n_trk
            cost = qty * item.unit_amount_usd
        elif item.behavior == "per_month":
            qty = s.storage_months
            cost = qty * item.unit_amount_usd
        elif item.behavior == "fixed_per_shipment":
            qty = 1
            cost = item.unit_amount_usd
        elif item.behavior == "percent_of_value":
            qty = 1
            cost = revenue * item.unit_amount_usd
        elif item.behavior == "percent_of_cogs":
            qty = 1
            cost = cogs_total * item.unit_amount_usd
        else:
            qty = 0
            cost = 0

        lines.append({
            "code": item.code, "name": item.name, "category": item.category,
            "qty": qty, "unit": item.unit, "unit_amount_usd": item.unit_amount_usd,
            "cost_usd": cost
        })
        if item.category == "logistics":
            total_log += cost
        elif item.category == "insurance":
            total_ins += cost

    shrink_loss  = (s.shrinkage_pct/100.0) * cogs_total
    
    # --- Partner Profit ---
    partner_profit = (s.partner_profit_pct / 100.0) * sell_unit * s.volume_mt

    # --- Finance cost (NWC model) ---
    try:
        rate = s.annual_finance_rate_pct / 100.0
        dso  = s.dso_sell_days
        dpo  = s.dpo_buy_days
        inv_days = max(0.0, s.storage_months * 30.0)
        AR  = revenue * (dso / 365.0)
        INV = cogs_total * (inv_days / 365.0)
        AP  = cogs_total * (dpo / 365.0)
        _nwc = max(0.0, AR + INV - AP)
        finance_cost = rate * _nwc
    except Exception:
        finance_cost = 0.0
    # --- end finance cost ---

    total_cost = cogs_total + total_log + total_ins + shrink_loss + finance_cost + partner_profit
    net_margin = revenue - total_cost

    kpis = {
        "gross_revenue": revenue,
        "total_cost": total_cost,
        "net_margin": net_margin,
        "net_margin_pct": (net_margin / revenue) if revenue else 0,
        "net_margin_per_mt": (net_margin / s.volume_mt) if s.volume_mt else 0,
        "break_even_sell_per_mt": (total_cost / s.volume_mt) if s.volume_mt else 0,
    }
    breakdown = {
        "cogs": cogs_total,
        "logistics_excl_cogs_ins": total_log,
        "insurance": total_ins,
        "shrinkage": shrink_loss,
        "finance": finance_cost,
        "partner_profit": partner_profit,
        "lines": lines,
        "route_legs": ROUTE_LEGS.get(s.destination, [])
    }
    return ComputeOut(kpis=kpis, breakdown=breakdown)

@app.post("/api/compute", response_model=ComputeOut)
@app.post("/compute",  response_model=ComputeOut)
def compute(s: ScenarioIn):
    return _compute_internal(s)


