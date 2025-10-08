import React,{useEffect,useMemo,useState} from "react";
import { ScenarioIn, computeScenario, listSellPrices } from "../lib/api";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import MapRoutes from "./MapRoutes";
import CostsAdmin from "./CostsAdmin";

const CURRENCY=(n:number)=>n.toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:0});
const DEC2=(n:number)=>n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const COLORS=["#1e40af","#0ea5e9","#22c55e","#f59e0b","#ef4444"];

const DEFAULTS_BY_DEST:Record<string,{buy:number,sell:number}>={ LUB:{buy:530,sell:530}, KIN:{buy:600,sell:600}, KOL:{buy:530,sell:530} };

const defaultScenario:ScenarioIn={
  destination:"LUB", incoterm:"CFR",
  volume_mt:700, buy_price_per_mt:DEFAULTS_BY_DEST["LUB"].buy, sell_price_per_mt:DEFAULTS_BY_DEST["LUB"].sell,
  shrinkage_pct:0.3, storage_months:1, dpo_buy_days:7, dso_sell_days:10, annual_finance_rate_pct:12,
  mt_per_container:40, mt_per_truck:58, insurance_rate_pct:0.45
};

function useAutoRecompute(s:ScenarioIn){
  const [result,setResult]=useState<any>(null);
  const compute=async()=>{ setResult(await computeScenario(s)); };
  useEffect(()=>{ compute(); },[JSON.stringify(s)]);
  useEffect(()=>{ const h=()=>compute(); window.addEventListener("costs-updated",h as any); return ()=>window.removeEventListener("costs-updated",h as any);},[s]);
  return {result,recompute:compute};
}

export default function App(){
  const [scenario,setScenario]=useState<ScenarioIn>(defaultScenario);
  const {result}=useAutoRecompute(scenario);
  const [tab,setTab]=useState<"dashboard"|"admin">("dashboard");
  useEffect(()=>{ listSellPrices().catch(()=>{}); },[]);

  function setDest(d:string){ const def=DEFAULTS_BY_DEST[d]; setScenario(s=>({...s,destination:d as any,buy_price_per_mt:def.buy,sell_price_per_mt:def.sell})); }

  const kpis=result?.kpis||{}; const breakdown=result?.breakdown||{};
  const costData=useMemo(()=>[
    {name:"COGS",value:breakdown.cogs||0},{name:"Logistics",value:breakdown.logistics_excl_cogs_ins||0},
    {name:"Insurance",value:breakdown.insurance||0},{name:"Shrinkage",value:breakdown.shrinkage||0},{name:"Finance",value:breakdown.finance||0}
  ],[breakdown]);
  const revCostMargin=useMemo(()=>[
    {name:"Revenue",value:kpis.gross_revenue||0},{name:"Total Cost",value:kpis.total_cost||0},{name:"Net Margin",value:kpis.net_margin||0}
  ],[kpis]);

  const renderLabel=(p:any)=>{const{cx,cy,midAngle,outerRadius,percent,name}=p; if(percent<0.08) return null; const RAD=Math.PI/180; const r=outerRadius+12; const x=cx+r*Math.cos(-midAngle*RAD); const y=cy+r*Math.sin(-midAngle*RAD); return <text x={x} y={y} textAnchor={x>cx?"start":"end"} dominantBaseline="central" className="text-xs fill-slate-700">{name} {(percent*100).toFixed(0)}%</text>;};

  return (<div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100"><div className="mx-auto max-w-7xl p-6 space-y-6">
    <header className="flex items-center justify-between">
      <div><h1 className="text-2xl font-bold text-slate-900">Trade Profitability — <span className="text-indigo-700">Bitumen</span></h1><div className="text-sm text-slate-500">Interactive calculator & analytics</div></div>
      <div className="flex items-center gap-2 bg-white shadow-sm border border-slate-200 rounded-xl p-1">
        <button onClick={()=>setTab("dashboard")} className={"px-3 py-1 rounded-lg text-sm "+(tab==='dashboard'?'bg-indigo-600 text-white':'text-slate-700 hover:bg-slate-100')}>Dashboard</button>
        <button onClick={()=>setTab("admin")} className={"px-3 py-1 rounded-lg text-sm "+(tab==='admin'?'bg-indigo-600 text-white':'text-slate-700 hover:bg-slate-100')}>Costs Admin</button>
      </div>
    </header>

    {tab==='dashboard' && (<>
      <section className="section"><h2 className="text-lg font-semibold mb-4 text-slate-800">Scenario Inputs</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><label className="label">Destination</label><select className="input" value={scenario.destination} onChange={e=>setDest(e.target.value)}><option value="LUB">LUB</option><option value="KIN">KIN</option><option value="KOL">KOL</option></select></div>
          <div><label className="label">Incoterm</label><select className="input" value={scenario.incoterm} onChange={e=>setScenario({...scenario,incoterm:e.target.value as any})}><option value="CFR">CFR (BUY is CFR)</option><option value="FOB">FOB (ocean freight added)</option></select></div>
          <div><label className="label">Volume (MT)</label><input className="input" type="number" value={scenario.volume_mt} onChange={e=>setScenario({...scenario,volume_mt:Number(e.target.value)})}/></div>
          <div><label className="label">Buy $/MT</label><input className="input" type="number" value={scenario.buy_price_per_mt} onChange={e=>setScenario({...scenario,buy_price_per_mt:Number(e.target.value)})}/></div>
          <div><label className="label">Sell $/MT (override)</label><input className="input" type="number" value={scenario.sell_price_per_mt||0} onChange={e=>setScenario({...scenario,sell_price_per_mt:Number(e.target.value)})}/></div>
          <div><label className="label">Shrinkage %</label><input className="input" type="number" step="0.01" value={scenario.shrinkage_pct} onChange={e=>setScenario({...scenario,shrinkage_pct:Number(e.target.value)})}/></div>
          <div><label className="label">Storage Months</label><input className="input" type="number" step="0.1" value={scenario.storage_months} onChange={e=>setScenario({...scenario,storage_months:Number(e.target.value)})}/></div>
          <div><label className="label">DPO (days)</label><input className="input" type="number" value={scenario.dpo_buy_days} onChange={e=>setScenario({...scenario,dpo_buy_days:Number(e.target.value)})}/></div>
          <div><label className="label">DSO (days)</label><input className="input" type="number" value={scenario.dso_sell_days} onChange={e=>setScenario({...scenario,dso_sell_days:Number(e.target.value)})}/></div>
          <div><label className="label">Annual Finance Rate %</label><input className="input" type="number" step="0.01" value={scenario.annual_finance_rate_pct} onChange={e=>setScenario({...scenario,annual_finance_rate_pct:Number(e.target.value)})}/></div>
          <div><label className="label">MT per Container</label><input className="input" type="number" step="0.1" value={scenario.mt_per_container} onChange={e=>setScenario({...scenario,mt_per_container:Number(e.target.value)})}/></div>
          <div><label className="label">MT per Truck</label><input className="input" type="number" step="0.1" value={scenario.mt_per_truck} onChange={e=>setScenario({...scenario,mt_per_truck:Number(e.target.value)})}/></div>
          <div><label className="label">Insurance %</label><input className="input" type="number" step="0.01" value={scenario.insurance_rate_pct} onChange={e=>setScenario({...scenario,insurance_rate_pct:Number(e.target.value)})}/></div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="kpi-card bg-indigo-50 border-indigo-100"><div className="kpi-title">Gross Revenue</div><div className="kpi-value text-indigo-900">{CURRENCY(kpis.gross_revenue||0)}</div></div>
        <div className="kpi-card bg-sky-50 border-sky-100"><div className="kpi-title">Total Cost</div><div className="kpi-value text-sky-900">{CURRENCY(kpis.total_cost||0)}</div></div>
        <div className="kpi-card bg-emerald-50 border-emerald-100"><div className="kpi-title">Net Margin</div><div className="kpi-value text-emerald-900">{CURRENCY(kpis.net_margin||0)}</div></div>
        <div className="kpi-card bg-amber-50 border-amber-100"><div className="kpi-title">Net Margin %</div><div className="kpi-value text-amber-900">{DEC2((kpis.net_margin_pct||0)*100)}%</div></div>
        <div className="kpi-card bg-purple-50 border-purple-100"><div className="kpi-title">Net Margin $/MT</div><div className="kpi-value text-purple-900">{DEC2(kpis.net_margin_per_mt||0)}</div></div>
        <div className="kpi-card bg-rose-50 border-rose-100"><div className="kpi-title">Break-even $/MT</div><div className="kpi-value text-rose-900">{DEC2(kpis.break_even_sell_per_mt||0)}</div></div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="section"><h3 className="font-semibold mb-2">Revenue vs Cost vs Margin</h3>
          <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={revCostMargin}><XAxis dataKey="name"/><YAxis/><Tooltip formatter={(v)=>CURRENCY(Number(v))}/><Bar dataKey="value" fill="#1e40af"/></BarChart></ResponsiveContainer></div>
        </div>
        <div className="section"><h3 className="font-semibold mb-2">Cost Breakdown</h3>
          <div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={costData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} labelLine={false} label={renderLabel}>{costData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}</Pie><Tooltip formatter={(v)=>CURRENCY(Number(v))}/><Legend verticalAlign="bottom" height={24}/></PieChart></ResponsiveContainer></div>
        </div>
      </section>

      <section className="section"><h3 className="font-semibold mb-3">Routes & leg costs ({scenario.destination})</h3><MapRoutes destination={scenario.destination} lines={result?.breakdown?.lines||[]}/></section>
    </>)}

    {tab==='admin' && (<CostsAdmin />)}
  </div></div>);
}
