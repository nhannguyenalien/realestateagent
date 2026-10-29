"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Logo } from "./logo";
import { LanguageSelect, useLanguage } from "./language-provider";

const links = [["home", "/"], ["properties", "/properties/"], ["agents", "/agents/"], ["about", "/about-us/"], ["services", "/services/"]];

export function SiteHeader({ active }: { active: string }) {
  const {t}=useLanguage();
  const [open,setOpen]=useState(false);
  const [me,setMe]=useState<{name?:string;role?:string}|null>(null);
  useEffect(()=>{fetch("/api/auth/me/").then(r=>r.ok?r.json() as Promise<{user?:{name?:string;role?:string}}>:null).then(d=>setMe(d?.user||null)).catch(()=>undefined)},[]);
  return <header className="nav homezNav"><Logo /><nav className={open?"open":""} aria-label="Primary navigation">{links.map(([key, href]) => <a className={active.toLowerCase().includes(key==="properties"?"propert":key==="agents"?"agent":key) ? "active" : ""} href={href} key={href} onClick={()=>setOpen(false)}>{t(key)}</a>)}<a href="/chat/" className={active==="chat"?"active":""}>AI Chat</a></nav><div className="navActions"><LanguageSelect compact/><a className="navLogin" href={me?(me.role==="admin"?"/dashboard/admin/":"/dashboard/agent/"):"/login/"}><span className="userIcon">♙</span><span>{me?(me.name||"Dashboard").split(" ").slice(-1)[0]:t("login")}</span></a><a className="navPost" href="/dashboard/agent/new/">{t("post")} <span>↗</span></a><button className="menuToggle" aria-label={open?"Close menu":"Open menu"} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?"×":"☰"}</button></div></header>;
}

export function SectionIntro({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="sectionHeading"><div><div className="sparkles" aria-hidden="true"><i/><i/><i/></div><h2>{title}</h2><p>{children}</p></div>{action}</div>;
}

export function JourneyCTA() { return <section className="cta"><div><h2>Start Your Real Estate Journey Today</h2><p>Your dream property is just a click away. Whether you&apos;re looking for a new home, a strategic investment, or expert advice, Realestate Schoolsai is here to assist you every step of the way.</p></div><a className="button primary" href="/properties/">Explore Properties</a></section>; }

export function SiteFooter() {
  const {t}=useLanguage();
  const [notice, setNotice] = useState("");
  async function subscribe(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const form=e.currentTarget; const email=new FormData(form).get("email"); const r=await fetch("/api/newsletter/",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email})}); setNotice(r.ok?"You're on the list — welcome to Realestate Schoolsai.":"Please enter a valid email address."); if(r.ok)form.reset(); }
  const groups = [{title:t("searches"),items:[["Apartments for sale","/properties/"],["Villas for rent","/properties/"],["New developments","/properties/"],["Luxury homes","/properties/"]]},{title:t("quick"),items:[["Terms of use","/terms/"],["Privacy policy","/privacy-policy/"],["Our services","/services/"],["Contact support","/contact/"]]},{title:t("discover"),items:[["Ho Chi Minh City","/properties/"],["Hanoi","/properties/"],["Da Nang","/properties/"],["Nha Trang","/properties/"]]}];
  return <footer className="homezFooter"><div className="footerSupport"><div><small>{t("care")}</small><a href="tel:+842873008866">+84 28 7300 8866</a></div><div><small>{t("support")}</small><a href="mailto:hello@estatein.vn">hello@estatein.vn</a></div><div className="footerApps"><small>{t("apps")}</small><span> App Store</span><span>▶ Google Play</span></div></div><div className="footerMain"><div className="footerBrand"><Logo/><p>{t("footerLine")}</p><h3>{t("updates")}</h3><form className="subscribe" onSubmit={subscribe}><input name="email" type="email" placeholder={t("email")} required/><button aria-label={t("subscribe")}>{t("subscribe")} ↗</button></form><p className="formNotice">{notice}</p></div><div className="footerLinks">{groups.map(group=><div key={group.title}><h4>{group.title}</h4>{group.items.map(([label,href])=><a href={href} key={label}>{label}</a>)}</div>)}</div></div><div className="footerBottom"><span>© 2026 Realestate Schoolsai. All rights reserved.</span><div><a href="/privacy-policy/">{t("privacy")}</a><a href="/terms/">{t("terms")}</a><a href="/sitemap.xml">{t("sitemap")}</a></div><div className="socials"><a href="#">f</a><a href="#">in</a><a href="#">𝕏</a><a href="#">◎</a></div></div></footer>;
}

export function Page({ active, children, compact=false }: { active: string; children: ReactNode; compact?:boolean }) { return <main><SiteHeader active={active}/>{children}{!compact&&<JourneyCTA/>}<SiteFooter/></main>; }
