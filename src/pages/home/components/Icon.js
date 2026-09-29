import React from "react";

/*
  Brand icons come from the global Iconify script, which swaps each
  <span class="iconify"> for an <svg>. Rendering that span through innerHTML
  keeps the swap out of React's hands, so re-renders never trip over it.
*/

const luminance = (hex) => {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!match) return 1;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(match[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export default function Icon({ name, color, label, className = "" }) {
  const safeName = String(name).replace(/[^a-z0-9:-]/gi, "");
  // Near-black brand colours (Cypress, Gradle) would vanish on dark themes.
  const tone = color && luminance(color) < 0.04 ? "is-ink" : "";
  return (
    <span
      className={`hm-ico ${tone} ${className}`}
      style={color && !tone ? { color } : undefined}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : "true"}
      dangerouslySetInnerHTML={{ __html: `<span class="iconify" data-icon="${safeName}" data-inline="false"></span>` }}
    />
  );
}
