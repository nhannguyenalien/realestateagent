import { PropertyDetailClient } from "@/components/property-detail-client";
import { featuredProperties } from "@/lib/seed-data";
export function generateStaticParams(){return featuredProperties.filter(p=>p.slug!=="seaside-serenity-villa").map(p=>({slug:p.slug}))}
export default async function PropertyPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <PropertyDetailClient slug={slug}/>}
