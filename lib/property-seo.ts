import type { Property } from "@/types/property";

export const SITE_NAME = "Realestate Schoolsai";

const priceLabel = (p: Pick<Property, "price" | "currency">) => new Intl.NumberFormat("en-US", { style: "currency", currency: p.currency || "USD", maximumFractionDigits: 0 }).format(p.price);

export function propertyTitle(p: Pick<Property, "title">) {
  return `${p.title} — ${SITE_NAME}`;
}

export function propertyDescription(p: Property) {
  const place = [p.address, p.region, p.city].filter(Boolean).join(", ");
  const facts = `${p.bedrooms} bed, ${p.bathrooms} bath, ${p.areaSqm} m², ${priceLabel(p)}`;
  return `${p.title}${place ? ` in ${place}` : ""} — ${facts}. ${(p.description || "").slice(0, 120)}`.trim().slice(0, 300);
}
