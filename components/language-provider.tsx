"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export type Language = "en" | "ja" | "fr" | "es" | "vi";

const labels: Record<Language, string> = { en: "English", ja: "日本語", fr: "Français", es: "Español", vi: "Tiếng Việt" };
const messages: Record<Language, Record<string, string>> = {
  en: {home:"Home",properties:"Properties",agents:"Agents",about:"About",services:"Services",login:"Log in",post:"List property",language:"Language",searches:"Popular searches",quick:"Quick links",discover:"Discover",care:"Free customer care",support:"Live support",apps:"Apps",footerLine:"Find a home that fits the way you want to live.",updates:"Keep yourself up to date",email:"Your email address",subscribe:"Subscribe",terms:"Terms",privacy:"Privacy",sitemap:"Sitemap"},
  ja: {home:"ホーム",properties:"物件",agents:"エージェント",about:"私たちについて",services:"サービス",login:"ログイン",post:"物件を掲載",language:"言語",searches:"人気の検索",quick:"クイックリンク",discover:"地域から探す",care:"無料カスタマーケア",support:"ライブサポート",apps:"アプリ",footerLine:"あなたの暮らしに合う住まいを見つけましょう。",updates:"最新情報を受け取る",email:"メールアドレス",subscribe:"登録",terms:"利用規約",privacy:"プライバシー",sitemap:"サイトマップ"},
  fr: {home:"Accueil",properties:"Biens",agents:"Agents",about:"À propos",services:"Services",login:"Connexion",post:"Publier un bien",language:"Langue",searches:"Recherches populaires",quick:"Liens rapides",discover:"Découvrir",care:"Service client gratuit",support:"Assistance en direct",apps:"Applications",footerLine:"Trouvez un logement adapté à votre façon de vivre.",updates:"Restez informé",email:"Votre adresse e-mail",subscribe:"S’inscrire",terms:"Conditions",privacy:"Confidentialité",sitemap:"Plan du site"},
  es: {home:"Inicio",properties:"Propiedades",agents:"Agentes",about:"Nosotros",services:"Servicios",login:"Iniciar sesión",post:"Publicar propiedad",language:"Idioma",searches:"Búsquedas populares",quick:"Enlaces rápidos",discover:"Descubrir",care:"Atención al cliente gratuita",support:"Soporte en vivo",apps:"Aplicaciones",footerLine:"Encuentra un hogar que se adapte a tu forma de vivir.",updates:"Mantente al día",email:"Tu correo electrónico",subscribe:"Suscribirse",terms:"Términos",privacy:"Privacidad",sitemap:"Mapa del sitio"},
  vi: {home:"Trang chủ",properties:"Bất động sản",agents:"Môi giới",about:"Giới thiệu",services:"Dịch vụ",login:"Đăng nhập",post:"Đăng tin",language:"Ngôn ngữ",searches:"Tìm kiếm phổ biến",quick:"Liên kết nhanh",discover:"Khám phá",care:"Chăm sóc khách hàng miễn phí",support:"Hỗ trợ trực tuyến",apps:"Ứng dụng",footerLine:"Tìm ngôi nhà phù hợp với phong cách sống của bạn.",updates:"Nhận thông tin mới nhất",email:"Địa chỉ email",subscribe:"Đăng ký",terms:"Điều khoản",privacy:"Quyền riêng tư",sitemap:"Sơ đồ trang"}
};

const LanguageContext=createContext({language:"en" as Language,setLanguage:(_:Language)=>{},t:(key:string)=>messages.en[key]||key});

export function LanguageProvider({children}:{children:ReactNode}){
  const [language,setLanguageState]=useState<Language>("en");
  useEffect(()=>{const saved=localStorage.getItem("estatein:language") as Language|null;if(saved&&saved in labels)setLanguageState(saved)},[]);
  function setLanguage(next:Language){setLanguageState(next);localStorage.setItem("estatein:language",next);document.documentElement.lang=next}
  useEffect(()=>{document.documentElement.lang=language},[language]);
  return <LanguageContext.Provider value={{language,setLanguage,t:key=>messages[language][key]||messages.en[key]||key}}>{children}</LanguageContext.Provider>
}

export function useLanguage(){return useContext(LanguageContext)}
export function LanguageSelect({compact=false}:{compact?:boolean}){const {language,setLanguage,t}=useLanguage();return <label className={compact?"languageSelect compact":"languageSelect"}><span>{compact?"◎":t("language")}</span><select value={language} onChange={event=>setLanguage(event.target.value as Language)} aria-label={t("language")}>{Object.entries(labels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>}
