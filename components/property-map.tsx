"use client";

import { divIcon, icon } from "leaflet";
import { useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import type { Property } from "@/types/property";
import { useLanguage } from "./language-provider";

const propertyMarkerIcon = icon({
  iconUrl: "/assets/brand/map-marker.png",
  iconSize: [38, 38],
  iconAnchor: [19, 36],
  popupAnchor: [0, -34],
  className: "propertyMarkerIcon",
});

export default function PropertyMap({ properties, onSelect }: { properties: Property[]; onSelect?: (property: Property) => void }) {
  const located = properties.filter(property => property.latitude != null && property.longitude != null && Number.isFinite(property.latitude) && Number.isFinite(property.longitude) && Math.abs(property.latitude)<=90 && Math.abs(property.longitude)<=180).map(property => ({
    property, coordinates: [property.latitude!, property.longitude!] as [number,number],
  }));
  const center: [number, number] = located.length ? located[0].coordinates : [16.05, 108.2];
  return <MapContainer className="propertyMap" center={center} zoom={6} scrollWheelZoom>
    <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <ClusteredPropertyMarkers located={located} onSelect={onSelect}/>
  </MapContainer>;
}

type LocatedProperty = {property: Property; coordinates: [number, number]};

function ClusteredPropertyMarkers({located, onSelect}: {located: LocatedProperty[]; onSelect?: (property: Property) => void}) {
  const [zoom, setZoom] = useState(6);
  const map = useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });
  const groups = useMemo(() => {
    if (zoom >= 15) return located.map(item => ({items: [item], coordinates: item.coordinates}));
    const cellSize = 360 / (2 ** zoom) * .24;
    const cells = new Map<string, LocatedProperty[]>();
    for (const item of located) {
      const key = `${Math.floor(item.coordinates[0] / cellSize)}:${Math.floor(item.coordinates[1] / cellSize)}`;
      cells.set(key, [...(cells.get(key) || []), item]);
    }
    return [...cells.values()].map(items => ({
      items,
      coordinates: [
        items.reduce((sum, item) => sum + item.coordinates[0], 0) / items.length,
        items.reduce((sum, item) => sum + item.coordinates[1], 0) / items.length,
      ] as [number, number],
    }));
  }, [located, zoom]);

  return groups.map(({items, coordinates}) => items.length === 1
    ? <Marker key={items[0].property.id} position={coordinates} icon={propertyMarkerIcon}>
        <Popup maxWidth={270} minWidth={230} autoPan><MapPopupCard property={items[0].property} onSelect={onSelect}/></Popup>
      </Marker>
    : <Marker
        key={items.map(item => item.property.id).join(":")}
        position={coordinates}
        icon={divIcon({className: "propertyClusterIcon", html: `<span>${items.length}</span>`, iconSize: [42, 42], iconAnchor: [21, 21]})}
        eventHandlers={{click: () => map.setView(coordinates, Math.min(zoom + 2, 18))}}
      />
  );
}

function MapPopupCard({property:p,onSelect}:{property:Property;onSelect?: (property:Property)=>void}){
  const {language}=useLanguage();
  const labels={en:["Quick view","View details","beds"],ja:["クイックビュー","詳細を見る","寝室"],fr:["Aperçu","Voir le détail","chambres"],es:["Vista rápida","Ver detalles","habitaciones"],vi:["Xem nhanh","Xem chi tiết","phòng ngủ"]}[language];
  const [index,setIndex]=useState(0); const images=[p.imageUrl,...(p.images||[]).filter(image=>image!==p.imageUrl)]; const media=[...(p.videoUrl?[{kind:"video" as const,src:p.videoUrl}]:[]),...images.map(src=>({kind:"image" as const,src}))]; const current=media[index%media.length];
  function move(direction:number){setIndex(value=>(value+direction+media.length)%media.length)}
  const youtube=current.kind==="video"&&(current.src.includes("youtube.com")||current.src.includes("youtu.be")); const youtubeId=youtube?(current.src.match(/(?:v=|youtu\.be\/|embed\/)([^?&/]+)/)?.[1]||""):"";
  return <div className="mapPopup"><div className="mapPopupMedia">{current.kind==="image"?<img src={current.src} alt={`${p.title} ${index+1}`}/>:youtube?<iframe src={`https://www.youtube.com/embed/${youtubeId}`} title={`${p.title} video`} allowFullScreen/>:<video src={current.src} controls playsInline preload="metadata"/>}{media.length>1&&<><button type="button" className="mapSlide prev" onClick={()=>move(-1)} aria-label="Previous media">‹</button><button type="button" className="mapSlide next" onClick={()=>move(1)} aria-label="Next media">›</button><span>{index+1}/{media.length}</span></>}</div><strong>{p.title}</strong><small>{p.city} · {p.bedrooms} {labels[2]} · {p.areaSqm||120} m²</small>{onSelect?<button type="button" className="mapQuickView" onClick={()=>onSelect(p)}>{labels[0]} →</button>:<a href={`/properties/${p.slug}/`}>{labels[1]} →</a>}</div>
}
