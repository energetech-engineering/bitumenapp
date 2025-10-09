import React, { useEffect, useState } from "react";
import { listCosts, saveCost } from "../lib/api";

type CostItem = {
  code:string; name:string;
  behavior:"per_ton"|"per_container"|"per_truck"|"per_month"|"fixed_per_shipment"|"percent_of_value";
  unit_amount_usd:number; unit:string;
  qty_source:"Volume_MT"|"Containers"|"Trucks"|"Storage_Months"|"1"|"Value_USD";
  dest_scope:"LUB*"|"KIN*"|"KOL*";
  category:"product"|"logistics"|"insurance"|"finance";
};

export default function CostsAdmin(){
  const [items,setItems]=useState<CostItem[]>([]);
  const [saving,setSaving]=useState<string | null>(null);

  async function load(){ try{ setItems(await listCosts()); } catch(e){ console.error(e); } }
  useEffect(()=>{ load(); },[]);

  async function save(it:CostItem){
    setSaving(it.code);
    try{ await saveCost(it); await load(); } finally{ setSaving(null); }
  }

  return (
    <div className="section">
      <h2 className="text-lg font-semibold mb-4">Costs — Admin</h2>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-3">Code</th>
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Behavior</th>
              <th className="py-2 pr-3">Unit $</th>
              <th className="py-2 pr-3">Unit</th>
              <th className="py-2 pr-3">Qty Source</th>
              <th className="py-2 pr-3">Dest scope</th>
              <th className="py-2 pr-3">Category</th>
              <th className="py-2 pr-3">Action</th>
            </tr>
          </thead>
          <tbody>
          {items.map((it,i)=>(
            <tr key={it.code} className="border-b">
              <td className="py-1 pr-3">{it.code}</td>
              <td className="py-1 pr-3">
                <input className="input" value={it.name} onChange={e=>setItems(items.map(x=>x.code===it.code?{...x,name:e.target.value}:x))}/>
              </td>
              <td className="py-1 pr-3">
                <select className="input" value={it.behavior}
                  onChange={e=>setItems(items.map(x=>x.code===it.code?{...x,behavior:e.target.value as any}:x))}>
                  <option>per_ton</option><option>per_container</option><option>per_truck</option>
                  <option>per_month</option><option>fixed_per_shipment</option><option>percent_of_value</option>
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
                <select className="input" value={it.qty_source}
                  onChange={e=>setItems(items.map(x=>x.code===it.code?{...x,qty_source:e.target.value as any}:x))}>
                  <option>Volume_MT</option><option>Containers</option><option>Trucks</option>
                  <option>Storage_Months</option><option>1</option><option>Value_USD</option>
                </select>
              </td>
              <td className="py-1 pr-3">
                <select className="input" value={it.dest_scope}
                  onChange={e=>setItems(items.map(x=>x.code===it.code?{...x,dest_scope:e.target.value as any}:x))}>
                  <option>LUB*</option><option>KIN*</option><option>KOL*</option>
                </select>
              </td>
              <td className="py-1 pr-3">
                <select className="input" value={it.category}
                  onChange={e=>setItems(items.map(x=>x.code===it.code?{...x,category:e.target.value as any}:x))}>
                  <option>product</option><option>logistics</option><option>insurance</option><option>finance</option>
                </select>
              </td>
              <td className="py-1 pr-3">
                <button className="px-3 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        disabled={saving===it.code} onClick={()=>save(it)}>
                  {saving===it.code? "Saving..." : "Save"}
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
