import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";
import { AiAdvisor } from "@/components/ai-advisor";
import { LoadingScreen } from "@/components/loading-screen";

export const metadata: Metadata = {
  title: "Realestate Schoolsai — Find Your Dream Property",
  description: "Explore curated homes and investment properties with Realestate Schoolsai.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><LanguageProvider><LoadingScreen/>{children}<AiAdvisor/></LanguageProvider></body>
    </html>
  );
}
