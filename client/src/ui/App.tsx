import React,{useEffect,useMemo,useState} from "react";
import { ScenarioIn, computeScenario, listCosts } from "../lib/api";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import MapRoutes from "./MapRoutes";
import CostsAdmin from "./CostsAdmin";

const CURRENCY=(n:number)=>n.toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:0});
const DEC2=(n:number)=>n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});

const defaultScenario:ScenarioIn={
  destination:"LUB", incoterm:"CFR",
  volume_mt:700, buy_price_per_mt:530, sell_price_per_mt:1700,
  shrinkage_pct:0.3, storage_months:1, dpo_buy_days:7, dso_sell_days:10,
  annual_finance_rate_pct:12, partner_profit_pct:5, mt_per_container:40, mt_per_truck:58
};

const COLORS=["#1e40af","#0ea5e9","#22c55e","#f59e0b","#ef4444"];

export default function App(){
  const [scenario,setScenario]=useState<ScenarioIn>(defaultScenario);
  const [result,setResult]=useState<any>(null);
  const [tab,setTab]=useState<"dashboard"|"admin">("dashboard");

  useEffect(()=>{
    computeScenario(scenario)
      .then(setResult)
      .catch(e=>{ console.error("compute error", e); setResult(null); });
  },[scenario]);

  const kpis=result?.kpis||{}; const breakdown=result?.breakdown||{};
  const costData=useMemo(()=>[
    {name:"COGS",value:breakdown.cogs||0},
    {name:"Logistics",value:breakdown.logistics_excl_cogs_ins||0},
    {name:"Insurance",value:breakdown.insurance||0},
    {name:"Shrinkage",value:breakdown.shrinkage||0},
    {name:"Finance",value:breakdown.finance||0},
    {name:"Partner Profit",value:breakdown.partner_profit||0}
  ].filter(item => item.value > 0),[breakdown]);

  const revCostMargin=useMemo(()=>[
    {name:"Revenue",value:kpis.gross_revenue||0},
    {name:"Total Cost",value:kpis.total_cost||0},
    {name:"Net Margin",value:kpis.net_margin||0}
  ],[kpis]);

  const lines:any[] = breakdown.lines||[];
  const logisticsLines = lines.filter((l:any)=>l.category==="logistics" || l.category==="insurance");

  return (
  <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trade Profitability — <span className="text-indigo-700">Bitumen</span></h1>
          <div className="text-sm text-slate-500">Interactive calculator & analytics</div>
        </div>
        <div className="flex items-center gap-2 bg-white shadow-sm border border-slate-200 rounded-xl p-1">
          <button onClick={()=>setTab("dashboard")} className={"px-3 py-1 rounded-lg text-sm "+(tab==='dashboard'?'bg-indigo-600 text-white':'text-slate-700 hover:bg-slate-100')}>Dashboard</button>
          <button onClick={()=>setTab("admin")} className={"px-3 py-1 rounded-lg text-sm "+(tab==='admin'?'bg-indigo-600 text-white':'text-slate-700 hover:bg-slate-100')}>Costs Admin</button>
        </div>
      </header>

      {tab==="dashboard" && (
      <>
        {/* Scenario Inputs */}
        <section className="section">
          <h2 className="text-lg font-semibold mb-4 text-slate-800">Scenario Inputs</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Destination</label>
              <select className="input" value={scenario.destination} onChange={e=>setScenario({...scenario,destination:e.target.value as any})}>
                <option value="LUB">LUB</option>
                <option value="KIN">KIN</option>
                <option value="KOL">KOL</option>
              </select>
            </div>
            <div>
              <label className="label">Incoterm</label>
              <select className="input" value={scenario.incoterm} onChange={e=>setScenario({...scenario,incoterm:e.target.value as any})}>
                <option value="CFR">CFR (BUY is CFR)</option>
                <option value="FOB">FOB (BUY is FOB)</option>
              </select>
            </div>
            <div><label className="label">Volume (MT)</label>
              <input className="input" type="number" value={scenario.volume_mt} onChange={e=>setScenario({...scenario,volume_mt:Number(e.target.value)})}/></div>
            <div><label className="label">Buy $/MT</label>
              <input className="input" type="number" value={scenario.buy_price_per_mt} onChange={e=>setScenario({...scenario,buy_price_per_mt:Number(e.target.value)})}/></div>
            <div><label className="label">Sell $/MT (override)</label>
              <input className="input" type="number" value={scenario.sell_price_per_mt||0} onChange={e=>setScenario({...scenario,sell_price_per_mt:Number(e.target.value)})}/></div>
            <div><label className="label">Shrinkage %</label>
              <input className="input" type="number" step="0.01" value={scenario.shrinkage_pct} onChange={e=>setScenario({...scenario,shrinkage_pct:Number(e.target.value)})}/></div>
            <div><label className="label">Storage Months</label>
              <input className="input" type="number" step="0.1" value={scenario.storage_months} onChange={e=>setScenario({...scenario,storage_months:Number(e.target.value)})}/></div>
            <div><label className="label">DPO (days)</label>
              <input className="input" type="number" value={scenario.dpo_buy_days} onChange={e=>setScenario({...scenario,dpo_buy_days:Number(e.target.value)})}/></div>
            <div><label className="label">DSO (days)</label>
              <input className="input" type="number" value={scenario.dso_sell_days} onChange={e=>setScenario({...scenario,dso_sell_days:Number(e.target.value)})}/></div>
            <div><label className="label">Annual Finance Rate %</label>
              <input className="input" type="number" step="0.01" value={scenario.annual_finance_rate_pct} onChange={e=>setScenario({...scenario,annual_finance_rate_pct:Number(e.target.value)})}/></div>
            <div><label className="label">Partner Profit %</label>
              <input className="input" type="number" step="0.01" value={scenario.partner_profit_pct} onChange={e=>setScenario({...scenario,partner_profit_pct:Number(e.target.value)})}/></div>
            <div><label className="label">MT per Container</label>
              <input className="input" type="number" step="0.1" value={scenario.mt_per_container} onChange={e=>setScenario({...scenario,mt_per_container:Number(e.target.value)})}/></div>
            <div><label className="label">MT per Truck</label>
              <input className="input" type="number" step="0.1" value={scenario.mt_per_truck} onChange={e=>setScenario({...scenario,mt_per_truck:Number(e.target.value)})}/></div>
          </div>
        </section>

        {/* KPI cards */}
        <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="kpi-card bg-indigo-50 border-indigo-100"><div className="kpi-title">Gross Revenue</div><div className="kpi-value text-indigo-900">{CURRENCY(kpis.gross_revenue||0)}</div></div>
          <div className="kpi-card bg-sky-50 border-sky-100"><div className="kpi-title">Total Cost</div><div className="kpi-value text-sky-900">{CURRENCY(kpis.total_cost||0)}</div></div>
          <div className="kpi-card bg-emerald-50 border-emerald-100"><div className="kpi-title">Net Margin</div><div className="kpi-value text-emerald-900">{CURRENCY(kpis.net_margin||0)}</div></div>
          <div className="kpi-card bg-amber-50 border-amber-100"><div className="kpi-title">Net Margin %</div><div className="kpi-value text-amber-900">{DEC2((kpis.net_margin_pct||0)*100)}%</div></div>
          <div className="kpi-card bg-purple-50 border-purple-100"><div className="kpi-title">Net Margin $/MT</div><div className="kpi-value text-purple-900">{DEC2(kpis.net_margin_per_mt||0)}</div></div>
          <div className="kpi-card bg-rose-50 border-rose-100"><div className="kpi-title">Break-even $/MT</div><div className="kpi-value text-rose-900">{DEC2(kpis.break_even_sell_per_mt||0)}</div></div>
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="section">
            <h3 className="font-semibold mb-2">Revenue vs Cost vs Margin</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revCostMargin}><XAxis dataKey="name"/><YAxis/><Tooltip formatter={(v)=>CURRENCY(Number(v))}/><Bar dataKey="value" fill="#1e40af"/></BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="section">
            <h3 className="font-semibold mb-2">Cost Breakdown</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart labelLine={false} label={false}>
                  <Pie data={costData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} labelLine={false}
                       label={({name,percent})=>`${name}: ${(percent*100).toFixed(0)}%`}>
                    {costData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v)=>CURRENCY(Number(v))}/>
                  <Legend verticalAlign="bottom" height={24}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Map + Breakdown Table */}
        <section className="section">
          <h3 className="font-semibold mb-3">Routes & leg costs ({scenario.destination})</h3>
          <MapRoutes destination={scenario.destination} lines={lines}/>
          <div className="mt-5">
            <h4 className="font-semibold mb-2">Detailed breakdown</h4>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="text-left border-b">
                  <th className="py-2 pr-3">Item</th><th className="py-2 pr-3">Qty</th><th className="py-2 pr-3">Unit</th><th className="py-2 pr-3">Unit $</th><th className="py-2 pr-3">Cost</th>
                </tr></thead>
                <tbody>
                  <tr className="border-b font-medium bg-slate-50"><td>Sales Price</td><td colSpan={3}></td><td>{CURRENCY(kpis.gross_revenue||0)}</td></tr>
                  <tr className="border-b"><td>COGS (product)</td><td colSpan={3}></td><td>{CURRENCY(breakdown.cogs||0)}</td></tr>
                  <tr className="border-b font-medium"><td colSpan={5}>Logistics & Insurance</td></tr>
                  {logisticsLines.map((l:any,i:number)=>(
                    <tr key={i} className="border-b">
                      <td>{l.name}</td><td>{l.qty}</td><td>{l.unit}</td><td>{l.unit_amount_usd}</td><td>{CURRENCY(l.cost_usd||0)}</td>
                    </tr>
                  ))}
                  {(breakdown.shrinkage||0) > 0 && (
                    <>
                      <tr className="border-b font-medium bg-orange-50"><td colSpan={5}>Shrinkage</td></tr>
                      <tr className="border-b"><td>Product shrinkage ({scenario.shrinkage_pct}% of COGS)</td><td colSpan={3}></td><td>{CURRENCY(breakdown.shrinkage||0)}</td></tr>
                    </>
                  )}
                  {(breakdown.finance||0) > 0 && (
                    <>
                      <tr className="border-b font-medium bg-blue-50"><td colSpan={5}>Finance Cost</td></tr>
                      <tr className="border-b"><td>Working capital financing ({scenario.annual_finance_rate_pct}% annual rate)</td><td colSpan={3}></td><td>{CURRENCY(breakdown.finance||0)}</td></tr>
                    </>
                  )}
                  {(breakdown.partner_profit||0) > 0 && (
                    <>
                      <tr className="border-b font-medium bg-purple-50"><td colSpan={5}>Partner Profit Share</td></tr>
                      <tr className="border-b"><td>Partner profit ({scenario.partner_profit_pct}% of sell price)</td><td colSpan={3}></td><td>{CURRENCY(breakdown.partner_profit||0)}</td></tr>
                    </>
                  )}
                  <tr className="border-t font-semibold bg-slate-50"><td>Net Margin</td><td colSpan={3}></td><td>{CURRENCY(kpis.net_margin||0)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </>
      )}

      {tab==="admin" && (<CostsAdmin />)}
    </div>
  </div>);
}


