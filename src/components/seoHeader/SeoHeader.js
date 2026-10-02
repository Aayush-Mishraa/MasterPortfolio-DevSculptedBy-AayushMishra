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

const SITE = "https://aayushmishra.engineer";

/*
  Title, description and canonical URL for the current route. A project page
  sets its own title (useDocumentTitle), so it gets no <title> here; an
  unknown path gets no canonical (the 404 page adds noindex itself).
*/
function routeMeta(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/" || path === "/home" || path === "/splash") {
    return { title: seo.title, description: seo.description, url: `${SITE}/` };
  }
  if (seo.pages[path]) return { ...seo.pages[path], url: `${SITE}${path}` };
  const project = path.match(/^\/projects\/([^/]+)$/);
  if (project) {
    const name = decodeURIComponent(project[1]);
    return {
      description: `${name}: a project by Aayush Mishra, with its README, commits and stats from GitHub.`,
      url: `${SITE}/projects/${project[1]}`,
    };
  }
  return { title: seo.title, description: seo.description };
}

function SeoHeader() {
  const meta = routeMeta(useLocation().pathname);
  let sameAs = [];
  socialMediaLinks
    .filter(
      (media) =>
        !(media.link.startsWith("tel") || media.link.startsWith("mailto"))
    )
    .forEach((media) => {
      sameAs.push(media.link);
    });

  // The contact address, not whatever the mail icon happens to link to
  let mail =
    (contactPageData.contactSection && contactPageData.contactSection.email) ||
    socialMediaLinks.find((media) => media.link.startsWith("mailto")).link.substring("mailto:".length);
  let job = experience.sections
    ?.find((section) => section.work)
    ?.experiences?.at(0);

  let credentials = [];
  certifications.certifications.forEach((certification) => {
    credentials.push({
      "@context": "https://schema.org",
      "@type": "EducationalOccupationalCredential",
      url: certification.certificate_link,
      name: certification.title,
      description: certification.subtitle,
    });
  });
  const data = {
    "@context": "https://schema.org/",
    "@type": "Person",
    name: greeting.title,
    url: seo?.og?.url,
    email: mail,
    telephone: contactPageData.phoneSection?.subtitle,
    sameAs: sameAs,
    jobTitle: job.title,
    worksFor: {
      "@type": "Organization",
      name: job.company,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: contactPageData.addressSection?.locality,
      addressRegion: contactPageData.addressSection?.region,
      addressCountry: contactPageData.addressSection?.country,
      postalCode: contactPageData.addressSection?.postalCode,
      streetAddress: contactPageData.addressSection?.streetAddress,
    },
    hasCredential: credentials,
  };
  return (
    <Helmet>
      {meta.title && <title>{meta.title}</title>}
      <meta name="description" content={meta.description} />
      <meta property="og:title" content={meta.title || seo?.og?.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:type" content={seo?.og?.type} />
      {meta.url && <meta property="og:url" content={meta.url} />}
      {meta.url && <link rel="canonical" href={meta.url} />}
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  );
}

export default SeoHeader;
