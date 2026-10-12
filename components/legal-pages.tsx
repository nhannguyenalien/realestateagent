import type { ReactNode } from "react";
import { Page } from "@/components/site-chrome";

const updated = "October 12, 2026";
const contact = "hello@estatein.vn";

function Legal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Page active="" compact>
      <section className="contentSection" style={{ maxWidth: 820, margin: "0 auto", padding: "56px 20px", lineHeight: 1.7 }}>
        <h1>{title}</h1>
        <p><small>Last updated: {updated}</small></p>
        {children}
      </section>
    </Page>
  );
}

export function PrivacyPolicyPage() {
  return (
    <Legal title="Privacy Policy">
      <p>Estatein (&ldquo;we&rdquo;) operates this real estate website and mobile app. This policy explains what personal data we collect and how we use it.</p>
      <h2>Information we collect</h2>
      <ul>
        <li><b>Account data:</b> name, email address and, if you sign in with Google, your Google profile name, email address and profile picture. We never receive your Google password. Passwords for email sign-in are stored only as salted hashes.</li>
        <li><b>Enquiries and bookings:</b> name, email, phone number and message you send about a property or a viewing.</li>
        <li><b>Property alerts and newsletter:</b> your email address and the search criteria you save.</li>
        <li><b>AI advisor:</b> messages you send to the advisor. Signed-in users&rsquo; conversations are stored in their account; guests&rsquo; conversations stay in the browser. If you share your location, it is used only for the request and is not stored.</li>
        <li><b>Listings you publish (agents):</b> property details and uploaded images or videos.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To provide sign-in and your dashboard, answer enquiries, schedule viewings, send the alerts and newsletters you requested, operate the AI advisor, and keep the service secure. We do not sell your personal data.</p>
      <h2>Google user data</h2>
      <p>When you use Sign in with Google we request only the <code>openid</code>, <code>email</code> and <code>profile</code> scopes, and use them solely to create and authenticate your Estatein account. We do not share Google user data with third parties and do not use it for advertising.</p>
      <h2>Sharing</h2>
      <p>Enquiries are shared with the agent or agency responsible for the property. We use service providers for hosting and database (Cloudflare, Neon), file storage, email delivery and AI responses; they process data only to provide those services.</p>
      <h2>Retention and your choices</h2>
      <p>We keep data while your account is active or as needed to provide the service. You can unsubscribe from alerts with the link in each email, and you can ask us to access, correct or delete your data by emailing <a href={`mailto:${contact}`}>{contact}</a>.</p>
      <h2>Security</h2>
      <p>Data is transmitted over HTTPS and sessions use secure, HttpOnly cookies or tokens. No system is perfectly secure, so we cannot guarantee absolute security.</p>
      <h2>Contact</h2>
      <p>Questions about this policy: <a href={`mailto:${contact}`}>{contact}</a>.</p>
    </Legal>
  );
}

export function TermsPage() {
  return (
    <Legal title="Terms of Use">
      <p>By using the Estatein website or app you agree to these terms.</p>
      <h2>Using the service</h2>
      <p>Estatein lets you browse property listings, contact agents, book viewings, save searches and publish listings if you are a registered agent. You must provide accurate information and keep your account credentials secure.</p>
      <h2>Listings and information</h2>
      <p>Listings are provided by agents and agencies. We try to keep them accurate but do not guarantee the availability, price or details of any property, and nothing on the site is financial, legal or investment advice. The AI advisor may make mistakes; verify important details with the agent.</p>
      <h2>Acceptable use</h2>
      <p>Do not post unlawful, misleading or infringing content, attempt to access accounts or data that are not yours, or disrupt or scrape the service in a way that harms it.</p>
      <h2>Your content</h2>
      <p>You keep ownership of content you upload, and grant us a licence to display it on Estatein to operate the service. You are responsible for having the rights to what you publish.</p>
      <h2>Liability</h2>
      <p>The service is provided &ldquo;as is&rdquo;. To the extent permitted by law, Estatein is not liable for indirect or consequential losses arising from your use of the service.</p>
      <h2>Changes and contact</h2>
      <p>We may update these terms; continued use means you accept the changes. Contact: <a href={`mailto:${contact}`}>{contact}</a>.</p>
    </Legal>
  );
}
