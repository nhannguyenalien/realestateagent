"use client";
import { useEffect,useState } from "react";
import { featuredProperties } from "@/lib/seed-data";
import type { Property } from "@/types/property";
import { Page } from "./site-chrome";
export function CompareProperties(){
 const [items,setItems]=useState<Property[]>([]);
 useEffect(()=>{const fromQuery=new URLSearchParams(location.search).get("ids")?.split(",");const ids:string[]=fromQuery||JSON.parse(localStorage.getItem("estatein:compare")||"[]");setItems(ids.map(id=>featuredProperties.find(p=>p.id===id)).filter(Boolean) as Property[])},[]);
 const rows:[string,(p:Property)=>string][]=[["Price",p=>`$${p.price.toLocaleString()}`],["Location",p=>`${p.region}, ${p.city}`],["Type",p=>p.propertyType],["Bedrooms",p=>String(p.bedrooms)],["Bathrooms",p=>String(p.bathrooms)],["Area",p=>`${p.areaSqm} m²`]];
 return <Page active="Properties"><section className="listingHero"><span className="eyebrow">SIDE BY SIDE</span><h1>Compare properties</h1><p>Evaluate the details that matter before booking a viewing.</p></section><section className="contentSection compareWrap">{items.length?<div className="compareTable"><div className="compareLabel"/>{items.map(p=><a href={`/properties/${p.slug}/`} className="compareTop" key={p.id}><img src={p.imageUrl} alt=""/><h3>{p.title}</h3></a>)}{rows.flatMap(([label,get])=>[<strong className="compareLabel" key={label}>{label}</strong>,...items.map(p=><span key={`${label}-${p.id}`}>{get(p)}</span>)])}</div>:<div className="emptyState"><h2>No properties selected</h2><a className="button primary" href="/properties/">Explore listings</a></div>}</section></Page>
}
