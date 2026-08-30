"use client";

import { divIcon } from "leaflet";
import { useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { Property } from "@/types/property";
import { useLanguage } from "./language-provider";

export default function PropertyMap({ properties, onSelect }: { properties: Property[]; onSelect?: (property: Property) => void }) {
  const located = properties.filter((p) => p.latitude && p.longitude);
  const center: [number, number] = located.length ? [located[0].latitude!, located[0].longitude!] : [16.05, 108.2];
  return <MapContainer className="propertyMap" center={center} zoom={6} scrollWheelZoom>
    <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    {located.map((p) => <Marker key={p.id} position={[p.latitude!, p.longitude!]} icon={divIcon({ className:"mapPriceMarker", html:`$${Math.round(p.price/1000)}k`, iconSize:[58,32], iconAnchor:[29,32] })}>
      <Popup maxWidth={270} minWidth={230} autoPan><MapPopupCard property={p} onSelect={onSelect}/></Popup>
    </Marker>)}
  </MapContainer>;
}

function MapPopupCard({property:p,onSelect}:{property:Property;onSelect?: (property:Property)=>void}){
  const {language}=useLanguage();
  const labels={en:["Quick view","View details","beds"],ja:["クイックビュー","詳細を見る","寝室"],fr:["Aperçu","Voir le détail","chambres"],es:["Vista rápida","Ver detalles","habitaciones"],vi:["Xem nhanh","Xem chi tiết","phòng ngủ"]}[language];
  const [index,setIndex]=useState(0); const images=[p.imageUrl,...(p.images||[]).filter(image=>image!==p.imageUrl)]; const media=[...(p.videoUrl?[{kind:"video" as const,src:p.videoUrl}]:[]),...images.map(src=>({kind:"image" as const,src}))]; const current=media[index%media.length];
  function move(direction:number){setIndex(value=>(value+direction+media.length)%media.length)}
  const youtube=current.kind==="video"&&(current.src.includes("youtube.com")||current.src.includes("youtu.be")); const youtubeId=youtube?(current.src.match(/(?:v=|youtu\.be\/|embed\/)([^?&/]+)/)?.[1]||""):"";
  return <div className="mapPopup"><div className="mapPopupMedia">{current.kind==="image"?<img src={current.src} alt={`${p.title} ${index+1}`}/>:youtube?<iframe src={`https://www.youtube.com/embed/${youtubeId}`} title={`${p.title} video`} allowFullScreen/>:<video src={current.src} controls playsInline preload="metadata"/>}{media.length>1&&<><button type="button" className="mapSlide prev" onClick={()=>move(-1)} aria-label="Previous media">‹</button><button type="button" className="mapSlide next" onClick={()=>move(1)} aria-label="Next media">›</button><span>{index+1}/{media.length}</span></>}</div><strong>{p.title}</strong><small>{p.city} · {p.bedrooms} {labels[2]} · {p.areaSqm||120} m²</small>{onSelect?<button type="button" className="mapQuickView" onClick={()=>onSelect(p)}>{labels[0]} →</button>:<a href={`/properties/${p.slug}/`}>{labels[1]} →</a>}</div>
}
