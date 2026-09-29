// Height of the fixed header plus breathing room
export const HEADER_OFFSET = 96;

/** Smooth-scrolls to an element, through Lenis when it's running. */
export const scrollToElement = (target) => {
  if (!target) return;
  if (window.__lenis) {
    window.__lenis.scrollTo(target, { offset: -HEADER_OFFSET });
  } else {
    const top = target.getBoundingClientRect().top + window.pageYOffset - HEADER_OFFSET;
    window.scrollTo({ top, behavior: "smooth" });
  }
};

/** onClick handler for in-page links: scrolls to #id and moves focus there. */
export const scrollToId = (id) => (event) => {
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  scrollToElement(target);
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
};
