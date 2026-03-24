#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "scripts") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

function removeWaybackToolbarMarkup(html) {
  let next = html;

  // Remove Wayback toolbar static assets and init snippets.
  next = next.replace(
    /<script[^>]*web-static\.archive\.org\/_static\/js\/bundle-playback[^>]*><\/script>\s*/gi,
    "",
  );
  next = next.replace(
    /<script[^>]*web-static\.archive\.org\/_static\/js\/wombat[^>]*><\/script>\s*/gi,
    "",
  );
  next = next.replace(
    /<script[^>]*web-static\.archive\.org\/_static\/js\/ruffle\/ruffle\.js[^>]*><\/script>\s*/gi,
    "",
  );
  next = next.replace(
    /<link[^>]*web-static\.archive\.org\/_static\/css\/banner-styles[^>]*>\s*/gi,
    "",
  );
  next = next.replace(
    /<link[^>]*web-static\.archive\.org\/_static\/css\/iconochive[^>]*>\s*/gi,
    "",
  );

  next = next.replace(
    /<script[^>]*>\s*window\.RufflePlayer\s*=\s*window\.RufflePlayer[\s\S]*?<\/script>\s*/gi,
    "",
  );
  next = next.replace(/<script[^>]*>\s*__wm\.init\([\s\S]*?<\/script>\s*/gi, "");
  next = next.replace(/<!--\s*BEGIN WAYBACK TOOLBAR INSERT[\s\S]*?END WAYBACK TOOLBAR INSERT\s*-->/gi, "");

  return next;
}

function unwrapWaybackUrls(html) {
  let next = html;

  // Unwrap absolute and protocol-relative Wayback wrappers.
  next = next.replace(
    /https?:\/\/web\.archive\.org\/web\/\d{6,14}(?:[a-z_]+)?\/(https?:\/\/[^\s"'<>]+)/gi,
    "$1",
  );
  next = next.replace(
    /\/\/web\.archive\.org\/web\/\d{6,14}(?:[a-z_]+)?\/(https?:\/\/[^\s"'<>]+)/gi,
    "$1",
  );

  // Unwrap root-relative Wayback wrappers (caused by archived rewrites).
  next = next.replace(
    /\/web\/\d{6,14}(?:[a-z_]+)?\/(https?:\/\/[^\s"'<>]+)/gi,
    "$1",
  );

  // Unwrap escaped variants embedded in inline JS JSON strings.
  next = next.replace(
    /https?:\\\/\\\/web\.archive\.org\\\/web\\\/\d{6,14}(?:[a-z_]+)?\\\/(https?:\\\/\\\/[^"'<>\\\s]+)/gi,
    "$1",
  );
  next = next.replace(
    /\\\/web\\\/\d{6,14}(?:[a-z_]+)?\\\/(https?:\\\/\\\/[^"'<>\\\s]+)/gi,
    "$1",
  );

  return next;
}

function normalizeAksskaInternalUrls(html) {
  let next = html;

  // Convert absolute aksska URLs to root-relative URLs for robust internal navigation.
  next = next.replace(
    /https?:\/\/(?:www\.)?aksska\.net(?=\/|["'\s<>?#])/gi,
    "",
  );
  next = next.replace(/href=""/gi, 'href="/"');
  next = next.replace(/src=""/gi, 'src="/"');

  // Fix archived mailto wrappers.
  next = next.replace(
    /https?:\/\/web\.archive\.org\/web\/\d{6,14}(?:[a-z_]+)?\/(mailto:[^"'\s<>]+)/gi,
    "$1",
  );
  next = next.replace(
    /https?:\\\/\\\/web\.archive\.org\\\/web\\\/\d{6,14}(?:[a-z_]+)?\\\/(mailto:[^"'\\\s<>]+)/gi,
    "$1",
  );

  return next;
}

function injectStabilizer(html) {
  const marker = '<script src="/site-stabilizer.js"></script>';
  if (html.includes(marker)) return html;

  if (html.includes("</body>")) {
    return html.replace(/<\/body>/i, `${marker}</body>`);
  }

  return `${html}\n${marker}\n`;
}

async function main() {
  const files = await walk(ROOT);
  let changed = 0;

  for (const file of files) {
    const original = await fs.readFile(file, "utf8");
    let next = original;
    next = removeWaybackToolbarMarkup(next);
    next = unwrapWaybackUrls(next);
    next = normalizeAksskaInternalUrls(next);
    next = injectStabilizer(next);

    if (next !== original) {
      await fs.writeFile(file, next, "utf8");
      changed += 1;
    }
  }

  console.log(`Processed ${files.length} HTML files, updated ${changed}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
