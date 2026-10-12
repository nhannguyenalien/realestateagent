"use client";

import { useEffect, useState } from "react";
import { featuredProperties } from "@/lib/seed-data";
import type { Property } from "@/types/property";
import { useLanguage, type Language } from "./language-provider";
import { SiteFooter, SiteHeader } from "./site-chrome";

const copy: Record<Language, Record<string, string>> = {
  en: { eyebrow:"THE BEST WAY TO",title:"Find a home that fits your life",intro:"Verified listings, trusted local expertise, and a simpler path from first search to moving day.",buy:"Buy",rent:"Rent",sold:"Sold",location:"Location",locationHint:"City or neighborhood",type:"Property type",all:"All homes",clients:"Happy clients",homes:"Verified homes",years:"Years of expertise",featured:"Latest verified properties",featuredText:"Fresh information from our property database, including exact area, location and price.",viewAll:"View all properties",live:"LIVE DATA",bed:"bedrooms",bath:"bathrooms",area:"Area",price:"Price",details:"View details",short1:"Find your dream home",short2:"Unlock property value",short3:"Effortless property management",short4:"Smart investment decisions",cta:"Start your real estate journey today",ctaText:"Your next home or investment is one search away. Our local advisors are ready to help.",explore:"Explore properties",showing:"Showing"},
  vi: { eyebrow:"CÁCH TỐT NHẤT ĐỂ",title:"Tìm ngôi nhà phù hợp với cuộc sống của bạn",intro:"Tin đăng được xác thực, am hiểu thị trường địa phương và hành trình mua nhà đơn giản hơn.",buy:"Mua",rent:"Thuê",sold:"Đã bán",location:"Khu vực",locationHint:"Thành phố hoặc khu phố",type:"Loại hình",all:"Tất cả nhà đất",clients:"Khách hàng hài lòng",homes:"BĐS đã xác thực",years:"Năm kinh nghiệm",featured:"Bất động sản mới nhất",featuredText:"Thông tin mới từ dữ liệu thực tế, gồm diện tích, địa chỉ và giá bán rõ ràng.",viewAll:"Xem tất cả bất động sản",live:"DỮ LIỆU TRỰC TIẾP",bed:"phòng ngủ",bath:"phòng tắm",area:"Diện tích",price:"Giá",details:"Xem chi tiết",short1:"Tìm ngôi nhà mơ ước",short2:"Khai mở giá trị bất động sản",short3:"Quản lý bất động sản dễ dàng",short4:"Đầu tư thông minh",cta:"Bắt đầu hành trình bất động sản hôm nay",ctaText:"Ngôi nhà hoặc khoản đầu tư tiếp theo chỉ cách bạn một lần tìm kiếm. Đội ngũ địa phương luôn sẵn sàng hỗ trợ.",explore:"Khám phá bất động sản",showing:"Đang hiển thị"},
  ja: { eyebrow:"理想の住まいへの近道",title:"暮らしに合う住まいを見つける",intro:"確認済みの物件情報、地域の専門知識、より簡単な住まい探しを提供します。",buy:"購入",rent:"賃貸",sold:"成約済み",location:"エリア",locationHint:"都市・地域",type:"物件タイプ",all:"すべて",clients:"満足したお客様",homes:"確認済み物件",years:"年の実績",featured:"最新の確認済み物件",featuredText:"面積、所在地、価格を含む最新の物件データです。",viewAll:"すべての物件",live:"ライブデータ",bed:"寝室",bath:"浴室",area:"面積",price:"価格",details:"詳細を見る",short1:"理想の家を探す",short2:"不動産価値を引き出す",short3:"簡単な物件管理",short4:"賢い投資判断",cta:"今日から住まい探しを始めましょう",ctaText:"次の住まいや投資先を、地域の専門家がお手伝いします。",explore:"物件を見る",showing:"表示中"},
  fr: { eyebrow:"LA MEILLEURE FAÇON DE",title:"Trouvez un logement adapté à votre vie",intro:"Des annonces vérifiées, une expertise locale et un parcours immobilier plus simple.",buy:"Acheter",rent:"Louer",sold:"Vendu",location:"Lieu",locationHint:"Ville ou quartier",type:"Type de bien",all:"Tous les biens",clients:"Clients satisfaits",homes:"Biens vérifiés",years:"Années d’expertise",featured:"Derniers biens vérifiés",featuredText:"Données récentes avec surface, adresse et prix clairement indiqués.",viewAll:"Voir tous les biens",live:"DONNÉES EN DIRECT",bed:"chambres",bath:"salles de bain",area:"Surface",price:"Prix",details:"Voir le détail",short1:"Trouvez la maison idéale",short2:"Valorisez votre bien",short3:"Gestion immobilière facile",short4:"Investissez intelligemment",cta:"Commencez votre projet immobilier",ctaText:"Votre prochain logement ou investissement est à portée de recherche. Nos experts locaux vous accompagnent.",explore:"Explorer les biens",showing:"Affichage"},
  es: { eyebrow:"LA MEJOR MANERA DE",title:"Encuentra un hogar para tu estilo de vida",intro:"Anuncios verificados, experiencia local y un camino más sencillo hasta tu nuevo hogar.",buy:"Comprar",rent:"Alquilar",sold:"Vendido",location:"Ubicación",locationHint:"Ciudad o barrio",type:"Tipo de propiedad",all:"Todas",clients:"Clientes felices",homes:"Propiedades verificadas",years:"Años de experiencia",featured:"Últimas propiedades verificadas",featuredText:"Información reciente con superficie, dirección y precio claramente indicados.",viewAll:"Ver todas",live:"DATOS EN VIVO",bed:"dormitorios",bath:"baños",area:"Superficie",price:"Precio",details:"Ver detalles",short1:"Encuentra la casa ideal",short2:"Potencia el valor",short3:"Gestión sin esfuerzo",short4:"Decisiones de inversión inteligentes",cta:"Comienza hoy tu viaje inmobiliario",ctaText:"Tu próximo hogar o inversión está a una búsqueda. Nuestros asesores locales están listos para ayudarte.",explore:"Explorar propiedades",showing:"Mostrando"},
};

const shortcuts = ["shortcut-1.svg", "shortcut-2.svg", "shortcut-3.svg", "shortcut-4.svg"];

function PropertyCard({ property, c, language }: { property: Property; c: Record<string,string>; language: Language }) {
  const locale = { en:"en-US", vi:"vi-VN", ja:"ja-JP", fr:"fr-FR", es:"es-ES" }[language];
  const price = new Intl.NumberFormat(locale, { style:"currency", currency:property.currency, maximumFractionDigits:0 }).format(property.price);
  return <article className="card propertyCard realListingCard">
    <a href={`/properties/${property.slug}/`} className="propertyImageLink"><img className="propertyImage" src={property.imageUrl} alt={property.title}/><span>{c.live}</span></a>
    <div><p className="listingLocation">⌖ {[property.address, property.city].filter(Boolean).join(", ")}</p><h3>{property.title}</h3><p className="clamp">{property.description}</p></div>
    <div className="propertyMeta"><span>{property.bedrooms} {c.bed}</span><span>{property.bathrooms} {c.bath}</span><span>{c.area}: {property.areaSqm || "—"} m²</span></div>
    <div className="priceRow"><div><small>{c.price}</small><strong>{price}</strong></div><a className="button primary" href={`/properties/${property.slug}/`}>{c.details}</a></div>
  </article>;
}

export function HomePage() {
  const { language } = useLanguage();
  const c = copy[language];
  const [properties, setProperties] = useState(featuredProperties);

  useEffect(() => { fetch("/api/properties/").then(r => r.ok ? r.json() as Promise<{properties?:Property[]}> : Promise.reject()).then(data => { if (data.properties?.length) setProperties(data.properties); }).catch(() => undefined); }, []);

  return <main id="top">
    <SiteHeader active="home"/>
    <section className="hero">
      <div className="heroCopy"><div><span className="eyebrow">{c.eyebrow}</span><h1>{c.title}</h1><p>{c.intro}</p></div>
        <form className="heroSearch" action="/properties/"><div className="searchTabs"><button type="button" className="active">{c.buy}</button><button type="button">{c.rent}</button><button type="button">{c.sold}</button></div><div className="searchFields"><label><small>{c.location}</small><span>⌖</span><input name="location" placeholder={c.locationHint}/></label><label><small>{c.type}</small><select name="type"><option>{c.all}</option><option>Villa</option><option>Apartment</option></select></label><button className="searchSubmit" aria-label="Search">⌕</button></div></form>
        <div className="stats"><div><strong>200+</strong><span>{c.clients}</span></div><div><strong>{properties.length}+</strong><span>{c.homes}</span></div><div><strong>16+</strong><span>{c.years}</span></div></div>
      </div><div className="heroVisual"><img src="/assets/figma/detail/1.png" alt="Contemporary luxury home"/><div className="heroOverlay"/></div>
    </section>
    <section className="shortcuts">{shortcuts.map((icon,index)=><a href={index===2?"/services/":"/properties/"} key={icon}><b>↗</b><img src={`/assets/figma/${icon}`} alt=""/><span>{c[`short${index+1}`]}</span></a>)}</section>
    <section className="contentSection" id="properties"><div className="sectionHeading"><div><span className="liveDataLabel">● {c.live}</span><h2>{c.featured}</h2><p>{c.featuredText}</p></div><a className="button secondary" href="/properties/">{c.viewAll}</a></div>
      <div className="cardGrid homeListings">{properties.slice(0,6).map(p=><PropertyCard key={p.id} property={p} c={c} language={language}/>)}</div>
      <p className="listingCount">{c.showing} {Math.min(properties.length,6)} / {properties.length}</p>
    </section>
    <section className="cta"><div><h2>{c.cta}</h2><p>{c.ctaText}</p></div><a className="button primary" href="/properties/">{c.explore}</a></section>
    <SiteFooter/>
  </main>;
}
