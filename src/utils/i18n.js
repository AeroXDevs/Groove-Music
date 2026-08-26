const { readdirSync } = require("fs");
const path = require("path");

const LOCALES_PATH = path.join(__dirname, "..", "locales");
const DEFAULT_LANG = "en";

// Maps our locale codes to Discord's, where they differ.
const DISCORD_LOCALE = { tr: "tr" };

const locales = new Map();

for (const file of readdirSync(LOCALES_PATH).filter((f) => f.endsWith(".json"))) {
  const lang = file.slice(0, -5);
  try {
    locales.set(lang, require(path.join(LOCALES_PATH, file)));
  } catch (err) {
    console.error(`[i18n] Failed to load locale "${lang}": ${err.message}`);
  }
}

const resolve = (tree, key) => {
  let node = tree;
  for (const part of key.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
};

const interpolate = (str, vars) =>
  str.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
  );

/**
 * Look up a translation key.
 * Falls back to the default language, then to the key itself, so a missing
 * string can never crash a command — it just shows up as the raw key.
 */
const t = (lang, key, vars = {}) => {
  const primary = locales.get(lang);
  let str = primary && resolve(primary, key);

  if (str === undefined && lang !== DEFAULT_LANG) {
    const fallback = locales.get(DEFAULT_LANG);
    str = fallback && resolve(fallback, key);
  }

  if (str === undefined) {
    console.warn(`[i18n] Missing key "${key}" (lang: ${lang})`);
    return key;
  }

  return interpolate(str, vars);
};

/**
 * Build a Discord `*_localizations` map for a key: every non-default language
 * that actually defines the key. Discord falls back to the base string itself
 * for any locale left out, so absent keys are safe to omit.
 */
const localizations = (key) => {
  const map = {};
  for (const [lang, tree] of locales) {
    if (lang === DEFAULT_LANG) continue;
    const str = resolve(tree, key);
    if (str !== undefined) map[DISCORD_LOCALE[lang] || lang] = str;
  }
  return Object.keys(map).length ? map : undefined;
};

const isSupported = (lang) => locales.has(lang);
const languages = () => [...locales.keys()];

module.exports = { t, isSupported, languages, localizations, DEFAULT_LANG };
