(() => {
  const DOMAIN_HOST_RE = /^https?:\/\/(?:www\.)?aksska\.net/i;
  const WAYBACK_WRAP_RE = /^https?:\/\/web\.archive\.org\/web\/\d{6,14}(?:[a-z_]+)?\/(https?:\/\/.+)$/i;
  const WAYBACK_WRAP_REL_RE = /^\/web\/\d{6,14}(?:[a-z_]+)?\/(https?:\/\/.+)$/i;

  function decodeHref(href) {
    if (!href) return href;
    let out = href.trim();

    const wbAbs = out.match(WAYBACK_WRAP_RE);
    if (wbAbs) out = wbAbs[1];

    const wbRel = out.match(WAYBACK_WRAP_REL_RE);
    if (wbRel) out = wbRel[1];

    const wbMailto = out.match(/^https?:\/\/web\.archive\.org\/web\/\d{6,14}(?:[a-z_]+)?\/(mailto:.+)$/i);
    if (wbMailto) out = wbMailto[1];

    if (DOMAIN_HOST_RE.test(out)) {
      try {
        const u = new URL(out);
        out = u.pathname + u.search + u.hash;
      } catch {
        // no-op
      }
    }

    return out;
  }

  function normalizeAnchors() {
    const anchors = document.querySelectorAll("a[href]");
    for (const a of anchors) {
      const href = a.getAttribute("href");
      const normalized = decodeHref(href || "");
      if (normalized && normalized !== href) {
        a.setAttribute("href", normalized);
      }
    }
  }

  function normalizeAssets() {
    const elements = document.querySelectorAll("[src], [href]");
    for (const el of elements) {
      if (el.hasAttribute("src")) {
        const src = el.getAttribute("src");
        const normalized = decodeHref(src || "");
        if (normalized && normalized !== src) {
          el.setAttribute("src", normalized);
        }
      }

      if (el.hasAttribute("href")) {
        const href = el.getAttribute("href");
        const normalized = decodeHref(href || "");
        if (normalized && normalized !== href) {
          el.setAttribute("href", normalized);
        }
      }
    }
  }

  function improveForms() {
    const forms = document.querySelectorAll("form");
    for (const form of forms) {
      const action = (form.getAttribute("action") || "").trim();
      const hasAction = action.length > 0 && action !== "#";
      if (hasAction) continue;

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        window.alert("Form submission is not available in this restored archive site yet.");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    normalizeAssets();
    normalizeAnchors();
    improveForms();
  });
})();
