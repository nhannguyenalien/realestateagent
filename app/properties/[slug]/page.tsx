import type { Metadata } from "next";
import { PropertyDetailClient } from "@/components/property-detail-client";
import { featuredProperties } from "@/lib/seed-data";
import { SITE_NAME, propertyDescription, propertyTitle } from "@/lib/property-seo";
export function generateStaticParams(){return [...featuredProperties.filter(p=>p.slug!=="seaside-serenity-villa").map(p=>({slug:p.slug})), ...["demo-nearby-hcm-1","demo-nearby-hcm-2","demo-nearby-hcm-3","demo-nearby-hcm-far","demo-nearby-hanoi","demo-nearby-danang"].map(slug=>({slug}))]}
// Listings created after the build are served through the shared shell of one pre-rendered page, so only seed slugs get specific metadata here; the client component sets the real title for every other listing.
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params,p=featuredProperties.find(x=>x.slug===slug);
  if(!p)return {title:`Property details — ${SITE_NAME}`,description:"Browse verified property listings across Vietnam."};
  return {title:propertyTitle(p),description:propertyDescription(p),openGraph:{title:propertyTitle(p),description:propertyDescription(p),images:p.imageUrl?[p.imageUrl]:undefined}};
}
export default async function PropertyPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <PropertyDetailClient slug={slug}/>}
