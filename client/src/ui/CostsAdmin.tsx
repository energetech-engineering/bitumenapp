import React,{useEffect,useState} from "react";
import { listCosts, updateCost, resetCosts } from "../lib/api";

type CostItem = {
  id?:number; code:string; name:string;
  behavior:string; unit_amount_usd:number; unit:string;
  qty_source:string; dest_scope:string; category:string; notes?:string;
};

const CATEGORY_OPTIONS = [
  "product","ocean_freight","port_clearance","port_handling","shipping_line",
  "storage","handling","inland_trucking","customs","feri","agency","admin",
  "bank","insurance","finance","shrinkage"
];

export default function CostsAdmin(){
  const [items,setItems]=useState<CostItem[]>([]);
  const [saving,setSaving]=useState<string|null>(null);

  async function load(){ setItems(await listCosts()); }
  useEffect(()=>{ load(); },[]);

  async function onSave(row:CostItem){
    setSaving(row.code);
    try{
      await updateCost(row.code,row);
      await load();
      window.dispatchEvent(new CustomEvent("costs-updated"));
    } finally { setSaving(null); }
  }

  async function onReset(){
    if(!confirm("Reset all costs to defaults (seed_costs.json)?")) return;
    await resetCosts(); await load();
    window.dispatchEvent(new CustomEvent("costs-updated"));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Costs — Admin</h3>
        <button className="px-3 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700" onClick={onReset}>
          Reset to defaults
        </button>
      </div>

      <div className="section overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-3">Code</th>
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Behavior</th>
              <th className="py-2 pr-3">Unit $</th>
              <th className="py-2 pr-3">Unit</th>
              <th className="py-2 pr-3">Qty Source</th>
              <th className="py-2 pr-3">Dest Scope</th>
              <th className="py-2 pr-3">Category</th>
              <th className="py-2 pr-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it)=>(
              <tr key={it.code} className="border-b">
                <td className="py-1 pr-3">{it.code}</td>
                <td className="py-1 pr-3">
                  <input className="input" value={it.name}
                    onChange={e=>setItems(items.map(x=>x.code===it.code?{...x,name:e.target.value}:x))}/>
                </td>
                <td className="py-1 pr-3">
                  <select className="input" value={it.behavior}
                    onChange={e=>setItems(items.map(x=>x.code===it.code?{...x,behavior:e.target.value}:x))}>
                    <option>per_ton</option>
                    <option>per_container</option>
                    <option>per_truck</option>
                    <option>per_month</option>
                    <option>fixed_per_shipment</option>
                    <option>percent_of_value</option>
                  </select>
                </td>
                <td className="py-1 pr-3">
                  <input className="input" type="number" step="0.01" value={it.unit_amount_usd}
                    onChange={e=>setItems(items.map(x=>x.code===it.code?{...x,unit_amount_usd:Number(e.target.value)}:x))}/>
                </td>
                <td className="py-1 pr-3">
                  <input className="input" value={it.unit}
                    onChange={e=>setItems(items.map(x=>x.code===it.code?{...x,unit:e.target.value}:x))}/>
                </td>
                <td className="py-1 pr-3">
                  <input className="input" value={it.qty_source}
                    onChange={e=>setItems(items.map(x=>x.code===it.code?{...x,qty_source:e.target.value}:x))}/>
                </td>
                <td className="py-1 pr-3">
                  <input className="input" value={it.dest_scope}
                    onChange={e=>setItems(items.map(x=>x.code===it.code?{...x,dest_scope:e.target.value}:x))}/>
                </td>
                <td className="py-1 pr-3">
                  <select className="input" value={it.category}
                    onChange={e=>setItems(items.map(x=>x.code===it.code?{...x,category:e.target.value}:x))}>
                    {CATEGORY_OPTIONS.map(c=> <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td className="py-1 pr-3">
                  <button className="px-3 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                          disabled={saving===it.code} onClick={()=>onSave(it)}>
                    {saving===it.code?"Saving…":"Save"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
