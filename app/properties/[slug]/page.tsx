import { PropertyDetailClient } from "@/components/property-detail-client";
import { featuredProperties } from "@/lib/seed-data";
export function generateStaticParams(){return [...featuredProperties.filter(p=>p.slug!=="seaside-serenity-villa").map(p=>({slug:p.slug})), ...["demo-nearby-hcm-1","demo-nearby-hcm-2","demo-nearby-hcm-3","demo-nearby-hcm-far","demo-nearby-hanoi","demo-nearby-danang"].map(slug=>({slug}))]}
export default async function PropertyPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <PropertyDetailClient slug={slug}/>}
