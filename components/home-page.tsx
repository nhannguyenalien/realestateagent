"use client";

import { FormEvent, useEffect, useState } from "react";
import { Logo } from "./logo";
import { featuredProperties } from "@/lib/seed-data";
import type { Property } from "@/types/property";

const shortcuts = [
  ["Find Your Dream Home", "shortcut-1.svg"],
  ["Unlock Property Value", "shortcut-2.svg"],
  ["Effortless Property Management", "shortcut-3.svg"],
  ["Smart Investments, Informed Decisions", "shortcut-4.svg"],
];

const testimonials = [
  ["Exceptional Service!", "Our experience with Estatein was outstanding. Their team's dedication and professionalism made finding our dream home a breeze. Highly recommended!", "Wade Warren", "USA, California", "avatar-1.png"],
  ["Efficient and Reliable", "Estatein provided us with top-notch service. They helped us sell our property quickly and at a great price. We couldn't be happier with the results.", "Emelie Thomson", "USA, Florida", "avatar-2.png"],
  ["Trusted Advisors", "The Estatein team guided us through the entire buying process. Their knowledge and commitment to our needs were impressive.", "John Mans", "USA, Nevada", "avatar-3.png"],
];

const faqs = [
  ["How do I search for properties on Estatein?", "Use our curated property collection or contact our team with your location, budget, and lifestyle needs."],
  ["What documents do I need to sell my property?", "Requirements vary by market. Our advisors will provide a clear checklist for ownership, identity, and disclosure documents."],
  ["How can I contact an Estatein agent?", "Send an enquiry from any property or use the contact button. A specialist will get back to you promptly."],
];

function SectionHeading({ title, children, action }: { title: string; children: React.ReactNode; action?: string }) {
  return (
    <div className="sectionHeading">
      <div>
        <div className="sparkles" aria-hidden="true"><i /><i /><i /></div>
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
      {action && <a className="button secondary" href="/properties/">{action}</a>}
    </div>
  );
}

function PropertyCard({ property }: { property: Property }) {
  const price = new Intl.NumberFormat("en-US", { style: "currency", currency: property.currency, maximumFractionDigits: 0 }).format(property.price);
  return (
    <article className="card propertyCard">
      <img className="propertyImage" src={property.imageUrl} alt={property.title} />
      <div>
        <h3>{property.title}</h3>
        <p className="clamp">{property.description} <a href="#contact">Read More</a></p>
      </div>
      <div className="propertyMeta">
        <span><img src="/assets/figma/bed.svg" alt="" />{property.bedrooms}-Bedroom</span>
        <span><img src="/assets/figma/bath.svg" alt="" />{property.bathrooms}-Bathroom</span>
        <span><img src="/assets/figma/building.svg" alt="" />{property.propertyType}</span>
      </div>
      <div className="priceRow"><div><small>Price</small><strong>{price}</strong></div><a className="button primary" href="#contact">View Property Details</a></div>
    </article>
  );
}

export function HomePage() {
  const [properties, setProperties] = useState(featuredProperties);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/properties/").then((response) => response.ok ? response.json() as Promise<{ properties?: Property[] }> : Promise.reject()).then((data) => {
      if (Array.isArray(data.properties) && data.properties.length) setProperties(data.properties);
    }).catch(() => undefined);
  }, []);

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = new FormData(form).get("email");
    const response = await fetch("/api/newsletter/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    setNotice(response.ok ? "You're on the list — welcome to Estatein." : "Please enter a valid email address.");
    if (response.ok) form.reset();
  }

  return (
    <main id="top">
      <header className="nav"><Logo /><nav><a className="active" href="/">Home</a><a href="/about-us/">About Us</a><a href="/properties/">Properties</a><a href="/services/">Services</a></nav><a className="button secondary contactNav" href="/contact/">Contact Us</a></header>

      <section className="hero" id="about">
        <div className="heroCopy">
          <div><span className="eyebrow">THE BEST WAY TO</span><h1>Find a home that fits your life</h1><p>Thoughtfully selected homes, trusted local expertise, and a simpler path from first search to moving day.</p></div>
          <form className="heroSearch" action="/properties/">
            <div className="searchTabs"><button type="button" className="active">Buy</button><button type="button">Rent</button><button type="button">Sold</button></div>
            <div className="searchFields"><label><small>Location</small><span>⌖</span><input name="location" placeholder="City or neighborhood" /></label><label><small>Property type</small><select name="type"><option>All homes</option><option>Villa</option><option>Apartment</option></select></label><button className="searchSubmit" aria-label="Search properties">⌕</button></div>
          </form>
          <div className="stats"><div><strong>200+</strong><span>Happy clients</span></div><div><strong>10k+</strong><span>Curated homes</span></div><div><strong>16+</strong><span>Years of expertise</span></div></div>
        </div>
        <div className="heroVisual"><img src="/assets/figma/detail/1.png" alt="Contemporary luxury home" /><div className="heroOverlay" /></div>
      </section>

      <section className="shortcuts" id="services">{shortcuts.map(([label, icon]) => <a href="#properties" key={label}><b>↗</b><img src={`/assets/figma/${icon}`} alt="" /><span>{label}</span></a>)}</section>

      <section className="contentSection" id="properties">
        <SectionHeading title="Featured Properties" action="View All Properties">Explore our handpicked selection of featured properties. Each listing offers a glimpse into exceptional homes and investments available through Estatein.</SectionHeading>
        <div className="cardGrid">{properties.slice(0, 3).map((property) => <PropertyCard key={property.id} property={property} />)}</div>
        <div className="pager"><span><b>01</b> of 60</span><div><button aria-label="Previous">←</button><button aria-label="Next">→</button></div></div>
      </section>

      <section className="contentSection">
        <SectionHeading title="What Our Clients Say" action="View All Testimonials">Read the success stories and heartfelt testimonials from our valued clients. Discover why they chose Estatein for their real estate needs.</SectionHeading>
        <div className="cardGrid">{testimonials.map(([title, quote, name, place, avatar]) => <article className="card testimonial" key={name}><div className="stars" aria-label="5 out of 5 stars">★★★★★</div><div><h3>{title}</h3><p>{quote}</p></div><div className="person"><img src={`/assets/figma/${avatar}`} alt="" /><div><strong>{name}</strong><span>{place}</span></div></div></article>)}</div>
        <div className="pager"><span><b>01</b> of 10</span><div><button aria-label="Previous">←</button><button aria-label="Next">→</button></div></div>
      </section>

      <section className="contentSection">
        <SectionHeading title="Frequently Asked Questions" action="View All FAQ’s">Find answers to common questions about Estatein’s services, property listings, and the real estate process.</SectionHeading>
        <div className="cardGrid faqGrid">{faqs.map(([question, answer]) => <article className="card faq" key={question}><h3>{question}</h3><p>{answer}</p><a className="button secondary" href="#contact">Read More</a></article>)}</div>
        <div className="pager"><span><b>01</b> of 10</span><div><button aria-label="Previous">←</button><button aria-label="Next">→</button></div></div>
      </section>

      <section className="cta" id="contact"><div><h2>Start Your Real Estate Journey Today</h2><p>Your dream property is just a click away. Whether you're looking for a new home, a strategic investment, or expert advice, Estatein is here to assist you every step of the way.</p></div><a className="button primary" href="#properties">Explore Properties</a></section>

      <footer>
        <div className="footerMain"><div className="footerBrand"><Logo /><form className="subscribe" onSubmit={subscribe}><span>✉</span><input name="email" type="email" placeholder="Enter Your Email" aria-label="Email address" required /><button aria-label="Subscribe">➤</button></form><p className="formNotice" aria-live="polite">{notice}</p></div><div className="footerLinks">{[["Home", "Hero Section", "Features", "Properties", "Testimonials", "FAQ’s"], ["About Us", "Our Story", "Our Works", "How It Works", "Our Team"], ["Properties", "Portfolio", "Categories"], ["Services", "Valuation Mastery", "Strategic Marketing", "Property Management"], ["Contact Us", "Contact Form", "Our Offices"]].map(([heading, ...links]) => <div key={heading}><h4>{heading}</h4>{links.map((link) => <a href="#top" key={link}>{link}</a>)}</div>)}</div></div>
        <div className="footerBottom"><span>©2026 Estatein. All Rights Reserved.</span><a href="#top">Terms &amp; Conditions</a><div className="socials"><a href="#top" aria-label="Facebook">f</a><a href="#top" aria-label="LinkedIn">in</a><a href="#top" aria-label="X">𝕏</a><a href="#top" aria-label="YouTube">▶</a></div></div>
      </footer>
    </main>
  );
}
