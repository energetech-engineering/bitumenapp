from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from enum import Enum
from sqlalchemy import create_engine, Column, Integer, Float, String, Text
from sqlalchemy.orm import declarative_base, sessionmaker
import json

# ---------------------- DB Setup ----------------------
engine = create_engine("sqlite:///./data.db", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

class CostBehavior(str, Enum):
    per_ton = "per_ton"
    per_container = "per_container"
    per_truck = "per_truck"
    per_month = "per_month"
    fixed_per_shipment = "fixed_per_shipment"
    percent_of_value = "percent_of_value"

class CostItem(Base):
    __tablename__ = "cost_items"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)
    name = Column(String)
    behavior = Column(String)  # CostBehavior
    unit_amount_usd = Column(Float)  # 0 if percent_of_value (rate on input)
    unit = Column(String) # MT/container/truck/month/percent
    qty_source = Column(String) # "Volume_MT"/"Containers"/"Trucks"/"Storage_Months"/"1" or "-"/"shipment"
    dest_scope = Column(String, default="*")
    notes = Column(Text, default="")

class SellPrice(Base):
    __tablename__ = "sell_prices"
    id = Column(Integer, primary_key=True)
    destination = Column(String, index=True)
    usd_per_mt = Column(Float)

class AppParam(Base):
    __tablename__ = "app_params"
    id = Column(Integer, primary_key=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)  # JSON-encoded

Base.metadata.create_all(bind=engine)

# ---------------------- Schemas ----------------------
class CostItemIn(BaseModel):
    code: str
    name: str
    behavior: CostBehavior
    unit_amount_usd: float = 0.0
    unit: str
    qty_source: str
    dest_scope: str = "*"
    notes: str = ""

class CostItemOut(CostItemIn):
    id: int

class SellPriceIn(BaseModel):
    destination: str
    usd_per_mt: float

class SellPriceOut(SellPriceIn):
    id: int

class ScenarioIn(BaseModel):
    destination: str = Field(..., pattern=r"^[A-Z]{3}$")
    volume_mt: float = Field(gt=0)
    buy_price_per_mt: float = Field(gt=0)
    shrinkage_pct: float = Field(ge=0)
    storage_months: float = Field(ge=0)
    dpo_buy_days: float = Field(ge=0)
    dso_sell_days: float = Field(ge=0)
    annual_finance_rate_pct: float = Field(ge=0)
    mt_per_container: float = Field(gt=0)
    mt_per_truck: float = Field(gt=0)
    insurance_rate_pct: float = Field(ge=0)
    sell_price_per_mt: Optional[float] = None  # override (if None, use SellPrice table)

    @field_validator("destination")
    @classmethod
    def dest_upper(cls, v:str)->str:
        return v.upper()

class CompareDestIn(BaseModel):
    destination: str
    sell_usd_per_mt: Optional[float] = None  # if None, use SellPrice table

class ComputeOut(BaseModel):
    kpis: dict
    breakdown: dict
    derived: dict

# ---------------------- Seed (idempotent) ----------------------
def seed_if_needed():
    db = SessionLocal()
    try:
        if db.query(CostItem).count() == 0:
            seed_items = [
                ("COGS_BITUMEN","Bitumen purchase (COGS)","per_ton",380,"MT","Volume_MT","*","From input Buy price"),
                ("TRK_TZ_DRC_LINEHAUL","Transport Dar→Lubumbashi / Truck","per_truck",9200,"truck","Trucks","LUB*","Invoice example"),
                ("CLR_TZ_CNTR","Clearance TZ / Container","per_container",716,"container","Containers","*","Invoice example"),
                ("HND_TZ_CNTR","Handling TZ / Container","per_container",200,"container","Containers","*","Invoice example"),
                ("WH_LUB_MONTH","Lubumbashi warehouse (400m2/month)","per_month",8000,"month","Storage_Months","LUB*","Invoice example"),
                ("HND_LUB_TON","Lubumbashi Handling In/Out / ton","per_ton",75,"MT","Volume_MT","LUB*","Invoice example"),
                ("INSP_BIVAC","Intervention Inspection BIVAC/Zambie/BL","fixed_per_shipment",2500,"shipment","1","*","Invoice example"),
                ("DRC_SEGUCE_TRK","DRC Import SEGUCE / Truck","per_truck",120,"truck","Trucks","*","Invoice example"),
                ("DRC_DGDA_SEAL_TRK","DRC Import DGDA Seals / Truck","per_truck",35,"truck","Trucks","*","Invoice example"),
                ("DRC_OPS_TRK","DRC Import Operational charges / Truck","per_truck",232,"truck","Trucks","*","Invoice example"),
                ("DRC_DOSSIER_TRK","DRC Import Dossiers opening / Truck","per_truck",50,"truck","Trucks","*","Invoice example"),
                ("DRC_AGENCY_TRK","DRC Import Agency fees / Truck","per_truck",81.2,"truck","Trucks","*","Invoice example"),
                ("DRC_FERI_CNTR","DRC Import FERI / Container","per_container",101.46,"container","Containers","*","Invoice example"),
                ("DRC_OGEFREM_TRK","DRC OGEFREM attestation / Truck","per_truck",182,"truck","Trucks","*","Invoice example"),
                ("TRN_MAT_KIN_CNTR","Matadi→Kinshasa Transport / Container","per_container",2150,"container","Containers","KIN*","Invoice example"),
                ("HND_KIN_TCK_CNTR","Kinshasa handling TCK / Container","per_container",356,"container","Containers","KIN*","Invoice example"),
                ("SHIP_LINE_CNTR","Shipping line fees / Container","per_container",630,"container","Containers","*","Invoice example"),
                ("TRK_KIN_LUB_TRK","Kinshasa→Lubumbashi / Truck","per_truck",2900,"truck","Trucks","LUB*","Route leg KIN→LUB"),
                ("INS_CARGO","Cargo Insurance","percent_of_value",0,"percent","-","*","Insurance on value"),
            ]
            for x in seed_items:
                db.add(CostItem(code=x[0], name=x[1], behavior=x[2], unit_amount_usd=x[3],
                                unit=x[4], qty_source=x[5], dest_scope=x[6], notes=x[7]))
        if db.query(SellPrice).count() == 0:
            for d, p in [("LUB", 520), ("KIN", 500), ("KOL", 515)]:
                db.add(SellPrice(destination=d, usd_per_mt=p))
        if db.query(AppParam).count() == 0:
            base_params = {
                "defaults": {
                    "mt_per_container": 40.0,
                    "mt_per_truck": 58.0,
                    "insurance_rate_pct": 0.45,
                    "shrinkage_pct": 0.3,
                    "storage_months": 1.0,
                    "dpo_buy_days": 7,
                    "dso_sell_days": 10,
                    "annual_finance_rate_pct": 12.0,
                }
            }
            db.add(AppParam(key="app_config", value=json.dumps(base_params)))
        db.commit()
    finally:
        db.close()

seed_if_needed()

# ---------------------- Compute Engine ----------------------
def resolve_qty(qty_source: str, derived: dict) -> float:
    m = {
        "Volume_MT": derived["volume_mt"],
        "Containers": derived["containers"],
        "Trucks": derived["trucks"],
        "Storage_Months": derived["storage_months"],
        "1": 1.0,
        "-": 1.0,
        "shipment": 1.0,
    }
    return float(m.get(qty_source, 1.0))

def matches_dest(scope: str, dest: str) -> bool:
    if scope is None or scope.strip() == "*" or scope.strip() == "":
        return True
    return dest in scope  # simple wildcard semantics like 'LUB*'

def compute_scenario(scn: ScenarioIn, sell_per_mt: float, costs: List[CostItem]) -> dict:
    containers = -(-scn.volume_mt // scn.mt_per_container)  # ceiling
    trucks = -(-scn.volume_mt // scn.mt_per_truck)          # ceiling
    derived = {
        "product": "Bitumen",
        "destination": scn.destination,
        "volume_mt": float(scn.volume_mt),
        "containers": float(containers),
        "trucks": float(trucks),
        "storage_months": float(scn.storage_months),
        "mt_per_container": scn.mt_per_container,
        "mt_per_truck": scn.mt_per_truck,
    }

    totals = {
        "cogs": 0.0,
        "insurance": 0.0,
        "logistics_excl_cogs_ins": 0.0,
        "shrinkage": 0.0,
        "finance": 0.0,
    }
    lines = []

    for c in costs:
        if not matches_dest(c.dest_scope or "*", scn.destination):
            continue
        qty = resolve_qty(c.qty_source, derived)
        if c.code == "COGS_BITUMEN":
            cost = scn.buy_price_per_mt * scn.volume_mt
            totals["cogs"] += cost
        elif c.behavior == CostBehavior.percent_of_value.value:
            cost = (scn.insurance_rate_pct / 100.0) * (scn.buy_price_per_mt * scn.volume_mt)
            totals["insurance"] += cost
        else:
            cost = (c.unit_amount_usd or 0.0) * qty
            totals["logistics_excl_cogs_ins"] += cost
        lines.append({
            "code": c.code, "name": c.name, "behavior": c.behavior,
            "unit_amount_usd": c.unit_amount_usd, "qty": qty, "dest_scope": c.dest_scope, "cost_usd": cost
        })

    totals["shrinkage"] = (scn.shrinkage_pct / 100.0) * scn.buy_price_per_mt * scn.volume_mt
    exposure = totals["cogs"] + totals["insurance"] + totals["logistics_excl_cogs_ins"]
    days = (scn.dso_sell_days - scn.dpo_buy_days) + scn.storage_months * 30.0
    totals["finance"] = (days / 365.0) * (scn.annual_finance_rate_pct / 100.0) * exposure

    total_cost = sum(totals.values())
    revenue = sell_per_mt * scn.volume_mt
    margin = revenue - total_cost
    result = {
        "kpis": {
            "gross_revenue": revenue,
            "total_cost": total_cost,
            "net_margin": margin,
            "net_margin_pct": (margin / revenue) if revenue else 0.0,
            "net_margin_per_mt": (margin / scn.volume_mt) if scn.volume_mt else 0.0,
            "break_even_sell_per_mt": (total_cost / scn.volume_mt) if scn.volume_mt else 0.0
        },
        "breakdown": {
            "cogs": totals["cogs"],
            "insurance": totals["insurance"],
            "logistics_excl_cogs_ins": totals["logistics_excl_cogs_ins"],
            "shrinkage": totals["shrinkage"],
            "finance": totals["finance"],
            "lines": lines
        },
        "derived": derived
    }
    return result

# ---------------------- App ----------------------
app = FastAPI(title="Trade Deal Profitability API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/costs", response_model=List[CostItemOut])
def list_costs():
    db = SessionLocal()
    try:
        items = db.query(CostItem).all()
        return [CostItemOut(id=i.id, code=i.code, name=i.name, behavior=i.behavior,
                            unit_amount_usd=i.unit_amount_usd, unit=i.unit, qty_source=i.qty_source,
                            dest_scope=i.dest_scope, notes=i.notes) for i in items]
    finally:
        db.close()

@app.post("/api/costs", response_model=CostItemOut)
def add_cost(item: CostItemIn):
    db = SessionLocal()
    try:
        if db.query(CostItem).filter_by(code=item.code).first():
            raise HTTPException(400, "Cost code already exists")
        i = CostItem(**item.model_dump())
        db.add(i); db.commit(); db.refresh(i)
        return CostItemOut(id=i.id, **item.model_dump())
    finally:
        db.close()

@app.put("/api/costs/{code}", response_model=CostItemOut)
def update_cost(code: str, item: CostItemIn):
    db = SessionLocal()
    try:
        i = db.query(CostItem).filter_by(code=code).first()
        if not i:
            raise HTTPException(404, "Cost not found")
        for k,v in item.model_dump().items():
            setattr(i, k, v)
        db.commit(); db.refresh(i)
        return CostItemOut(id=i.id, **item.model_dump())
    finally:
        db.close()

@app.get("/api/sell-prices", response_model=List[SellPriceOut])
def list_sell_prices():
    db = SessionLocal()
    try:
        return [SellPriceOut(id=s.id, destination=s.destination, usd_per_mt=s.usd_per_mt) for s in db.query(SellPrice).all()]
    finally:
        db.close()

@app.post("/api/sell-prices", response_model=SellPriceOut)
def upsert_sell_price(sp: SellPriceIn):
    db = SessionLocal()
    try:
        s = db.query(SellPrice).filter_by(destination=sp.destination.upper()).first()
        if s: s.usd_per_mt = sp.usd_per_mt
        else:
            s = SellPrice(destination=sp.destination.upper(), usd_per_mt=sp.usd_per_mt)
            db.add(s)
        db.commit(); db.refresh(s)
        return SellPriceOut(id=s.id, destination=s.destination, usd_per_mt=s.usd_per_mt)
    finally:
        db.close()

@app.post("/api/compute", response_model=ComputeOut)
def compute(scn: ScenarioIn):
    db = SessionLocal()
    try:
        sp = db.query(SellPrice).filter_by(destination=scn.destination.upper()).first()
        sell_per_mt = scn.sell_price_per_mt if scn.sell_price_per_mt is not None else (sp.usd_per_mt if sp else scn.buy_price_per_mt * 1.2)
        costs = db.query(CostItem).all()
        result = compute_scenario(scn, sell_per_mt, costs)
        return ComputeOut(**result)
    finally:
        db.close()

@app.post("/api/compare", response_model=List[ComputeOut])
def compare(scn: ScenarioIn, dests: List[CompareDestIn]):
    db = SessionLocal()
    try:
        costs = db.query(CostItem).all()
        out = []
        for d in dests:
            sp_row = db.query(SellPrice).filter_by(destination=d.destination.upper()).first()
            sell_per_mt = d.sell_usd_per_mt if d.sell_usd_per_mt is not None else (sp_row.usd_per_mt if sp_row else scn.buy_price_per_mt*1.2)
            scn2 = scn.copy(update={"destination": d.destination.upper()})
            out.append(ComputeOut(**compute_scenario(scn2, sell_per_mt, costs)))
        return out
    finally:
        db.close()
