import React from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete (L as any).Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

const places: Record<string,[number,number]> = {
  "Dar es Salaam":[-6.8235,39.2695],
  "Kinshasa":[-4.4419,15.2663],
  "Matadi":[-5.8167,13.45],
  "Lubumbashi":[-11.687,27.5026],
  "Kolwezi":[-10.7167,25.4667]
};

const ROUTES: Record<string, Array<{from:string;to:string}>> = {
  LUB: [{from:"Dar es Salaam", to:"Lubumbashi"}],
  KIN: [{from:"Matadi", to:"Kinshasa"}],
  KOL: [{from:"Dar es Salaam", to:"Kolwezi"}],
};

const palette=["#1e40af","#0ea5e9","#22c55e","#f59e0b","#ef4444"];

export default function MapRoutes({destination,lines}:{destination:string;lines:any[]}) {
  const legs = (ROUTES[destination]||[]).map((leg,i)=>({
    ...leg,
    coords:[places[leg.from], places[leg.to]],
    cost:(lines||[]).filter((l:any)=>(l.name||"").toLowerCase().includes("transport")).reduce((a:number,b:any)=>a+(b.cost_usd||0),0)
  }));

  const center = legs.length? legs[0].coords[0] : places["Kinshasa"];

  return (
    <div className="h-96 rounded-2xl overflow-hidden border border-slate-200">
      <MapContainer center={center as any} zoom={5} style={{height:"100%",width:"100%"}}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        {Object.entries(places).map(([n,c])=>(<Marker key={n} position={c as any}><Popup>{n}</Popup></Marker>))}
        {legs.map((leg:any,i:number)=>(
          <Polyline key={i} positions={leg.coords as any} pathOptions={{color:palette[i%palette.length],weight:5}}/>
        ))}
      </MapContainer>
      <div className="p-3 bg-white/80 backdrop-blur border-t">
        <div className="text-sm font-semibold mb-1">Route legs & costs</div>
        <ul className="text-sm text-slate-700 grid grid-cols-1 md:grid-cols-2 gap-1">
          {legs.map((leg:any,i:number)=>(
            <li key={i}><span className="font-medium">{leg.from} → {leg.to}:</span> ${Math.round(leg.cost).toLocaleString()}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
