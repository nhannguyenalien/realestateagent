import type { Metadata } from "next";
import { PropertyDetailClient } from "@/components/property-detail-client";
import { featuredProperties } from "@/lib/seed-data";
import { propertyDescription, propertyTitle } from "@/lib/property-seo";
const seed=featuredProperties.find(p=>p.slug==="seaside-serenity-villa")!;
export const metadata:Metadata={title:propertyTitle(seed),description:propertyDescription(seed),openGraph:{title:propertyTitle(seed),description:propertyDescription(seed),images:seed.imageUrl?[seed.imageUrl]:undefined}};
export default function Property(){return <PropertyDetailClient slug="seaside-serenity-villa"/>}
