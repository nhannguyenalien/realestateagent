import type { Metadata } from "next";
import { PrivacyPolicyPage } from "@/components/legal-pages";

export const metadata: Metadata = { title: "Privacy Policy — Estatein" };
export default function Page() { return <PrivacyPolicyPage/>; }
