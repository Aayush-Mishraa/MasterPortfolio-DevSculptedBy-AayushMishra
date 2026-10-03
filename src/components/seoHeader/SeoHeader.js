import React from "react";
import { Helmet } from "react-helmet";
import { useLocation } from "react-router-dom";
import {
  greeting,
  seo,
  socialMediaLinks,
  experience,
  contactPageData,
  certifications,
} from "../../portfolio.js";
import { prettyName } from "../../services/github/githubData";
import { MODULES } from "../../pages/universe/modules";

const SITE = "https://aayushmishra.engineer";

/**
 * The Open Graph image the prerender draws for a route (1200x630):
 * /og/home.jpg, /og/contact.jpg, /og/projects/<repo>.jpg, /og/universe/<id>.jpg.
 * Must match ogImageFile() in scripts/prerender/routes.mjs.
 */
export const ogImagePath = (path) => `/og/${path === "/" ? "home" : path.replace(/^\//, "")}.jpg`;

/*
  Title, description, canonical URL and share image for the current route.
  An unknown path gets no canonical (the 404 page adds noindex itself).
*/
export function routeMeta(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  const withImage = (meta, imagePath) => ({ ...meta, image: `${SITE}${ogImagePath(imagePath)}` });
  if (path === "/" || path === "/home" || path === "/splash") {
    return withImage({ title: seo.title, description: seo.description, url: `${SITE}/` }, "/");
  }
  if (seo.pages[path]) return withImage({ ...seo.pages[path], url: `${SITE}${path}` }, path);
  const project = path.match(/^\/projects\/([^/]+)$/);
  if (project) {
    const name = decodeURIComponent(project[1]);
    return withImage(
      {
        title: `${prettyName(name)} · Projects · Aayush Mishra`,
        description: `${prettyName(name)}: a project by Aayush Mishra, with its README, commits and stats from GitHub.`,
        url: `${SITE}/projects/${project[1]}`,
      },
      `/projects/${name}`
    );
  }
  const channel = path.match(/^\/universe\/([^/]+)$/);
  const module = channel && MODULES.find((item) => item.id === channel[1]);
  if (module) {
    return withImage(
      {
        title: `${module.title} · Tech Universe · Aayush Mishra`,
        description: `${module.tagline} A free Tech Universe channel by Aayush Mishra (${module.source}).`,
        url: `${SITE}/universe/${module.id}`,
      },
      `/universe/${module.id}`
    );
  }
  return withImage({ title: seo.title, description: seo.description }, "/");
}

const isWebUrl = (value) => /^https?:\/\/\S+$/i.test(String(value || "").trim());
const clean = (value) => String(value || "").trim();

// Drops keys whose value is empty, so the schema never says telephone: "".
const compact = (object) =>
  Object.keys(object).reduce((out, key) => {
    const value = object[key];
    if (value === undefined || value === null) return out;
    if (typeof value === "string" && !value.trim()) return out;
    if (Array.isArray(value) && !value.length) return out;
    out[key] = value;
    return out;
  }, {});

/*
  The Person schema. Only facts the page can back up: identity links that are
  marked as such (sameAs !== false), and a certificate URL only when it is a
  real link that no other certificate shares.
*/
export function personSchema() {
  const sameAs = socialMediaLinks
    .filter((media) => media.sameAs !== false && isWebUrl(media.link))
    .map((media) => media.link);

  // The contact address, not whatever the mail icon happens to link to
  const mail =
    clean(contactPageData.contactSection && contactPageData.contactSection.email) ||
    clean((socialMediaLinks.find((media) => media.link.startsWith("mailto")) || { link: "" }).link).replace(/^mailto:/, "");
  const job = (experience.sections.find((section) => section.work) || { experiences: [] }).experiences[0];

  const linkCount = certifications.certifications.reduce((counts, certification) => {
    const link = clean(certification.certificate_link);
    if (isWebUrl(link)) counts[link] = (counts[link] || 0) + 1;
    return counts;
  }, {});
  const credentials = certifications.certifications.map((certification) => {
    const link = clean(certification.certificate_link);
    const issuer = clean(certification.alt_name);
    return compact({
      "@type": "EducationalOccupationalCredential",
      name: clean(certification.title),
      credentialCategory: "certificate",
      url: isWebUrl(link) && linkCount[link] === 1 ? link : undefined,
      recognizedBy: issuer ? { "@type": "Organization", name: issuer } : undefined,
    });
  });

  const address = contactPageData.addressSection || {};
  const postalAddress = compact({
    "@type": "PostalAddress",
    addressLocality: clean(address.locality),
    addressRegion: clean(address.region),
    postalCode: clean(address.postalCode),
    streetAddress: clean(address.streetAddress),
    addressCountry: clean(address.country),
  });

  return compact({
    "@context": "https://schema.org/",
    "@type": "Person",
    name: greeting.title,
    url: seo.og && seo.og.url,
    email: mail,
    telephone: clean(contactPageData.phoneSection && contactPageData.phoneSection.subtitle),
    sameAs,
    jobTitle: greeting.jobTitle,
    worksFor: job ? { "@type": "Organization", name: job.company } : undefined,
    address: Object.keys(postalAddress).length > 1 ? postalAddress : undefined,
    hasCredential: credentials,
  });
}

const PERSON = JSON.stringify(personSchema());

function SeoHeader() {
  const meta = routeMeta(useLocation().pathname);
  return (
    <Helmet>
      {meta.title && <title>{meta.title}</title>}
      <meta name="description" content={meta.description} />
      <meta property="og:title" content={meta.title || seo.og.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:type" content={seo.og.type} />
      {meta.url && <meta property="og:url" content={meta.url} />}
      {meta.url && <link rel="canonical" href={meta.url} />}
      <meta property="og:image" content={meta.image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:image" content={meta.image} />
      <script type="application/ld+json">{PERSON}</script>
    </Helmet>
  );
}

export default SeoHeader;
