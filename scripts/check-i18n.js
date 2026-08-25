// Static checks for the translation layer.
//
//   1. every t()/client.t() key referenced in the source exists in the locales
//   2. locales define the same key set, with the same {placeholders}
//   3. the identifiers each t() call depends on are actually in scope
//
// (3) matters because commands expose two entry points with different variables
// in scope — slashExecute has `interaction`, execute has `message` — and a
// helper function may have neither. Those mistakes only surface at runtime.
const fs = require("fs"), path = require("path");
const acorn = require("acorn"), walk = require("acorn-walk");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const en = require(path.join(SRC, "locales/en.json"));
const tr = require(path.join(SRC, "locales/tr.json"));

let problems = 0;
const report = (m) => { console.log("  ✗ " + m); problems++; };

const flatten = (o, p = "") => Object.entries(o).flatMap(([k, v]) =>
  v && typeof v === "object" ? flatten(v, `${p}${k}.`) : [`${p}${k}`]);
const get = (o, k) => k.split(".").reduce((a, c) => (a == null ? a : a[c]), o);

const enKeys = new Set(flatten(en)), trKeys = new Set(flatten(tr));

console.log("\n[1] Diller arası anahtar eşleşmesi");
for (const k of enKeys) if (!trKeys.has(k)) report(`tr.json eksik: ${k}`);
for (const k of trKeys) if (!enKeys.has(k)) report(`en.json eksik: ${k}`);
if (!problems) console.log(`  ✓ ${enKeys.size} anahtar iki dilde de tanımlı`);

console.log("\n[2] Değişken tutarlılığı");
const before = problems;
const vars = (s) => new Set([...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
for (const k of enKeys) {
  if (!trKeys.has(k)) continue;
  const a = vars(get(en, k)), b = vars(get(tr, k));
  for (const v of a) if (!b.has(v)) report(`${k}: tr.json içinde {${v}} yok`);
  for (const v of b) if (!a.has(v)) report(`${k}: en.json içinde {${v}} yok`);
}
if (problems === before) console.log("  ✓ tüm anahtarlarda değişkenler örtüşüyor");

console.log("\n[3] Anahtar ve kapsam denetimi");
const scoped = problems;
const files = [];
(function collect(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    fs.statSync(p).isDirectory() ? collect(p) : f.endsWith(".js") && files.push(p);
  }
})(SRC);

let calls = 0;
for (const file of files) {
  const code = fs.readFileSync(file, "utf8");
  let ast;
  try { ast = acorn.parse(code, { ecmaVersion: "latest", sourceType: "script", locations: true }); }
  catch (e) { report(`${path.relative(ROOT, file)}: ayrıştırılamadı — ${e.message}`); continue; }

  // Collect every binding introduced anywhere, with the node range it covers.
  const scopes = [];
  const addScope = (node, names) => scopes.push({ start: node.start, end: node.end, names: new Set(names) });
  const paramNames = (params) => params.flatMap(function names(p) {
    if (p.type === "Identifier") return [p.name];
    if (p.type === "AssignmentPattern") return names(p.left);
    if (p.type === "RestElement") return names(p.argument);
    if (p.type === "ObjectPattern") return p.properties.flatMap((x) => names(x.value || x.argument));
    if (p.type === "ArrayPattern") return p.elements.filter(Boolean).flatMap(names);
    return [];
  });

  walk.full(ast, (node) => {
    if (/Function(Declaration|Expression)|ArrowFunctionExpression/.test(node.type))
      addScope(node, paramNames(node.params));
    if (node.type === "VariableDeclarator" && node.id.type === "Identifier")
      addScope(ast, [node.id.name]);          // approximate: treat as file-wide
    if (node.type === "FunctionDeclaration" && node.id)
      addScope(ast, [node.id.name]);
  });

  walk.full(ast, (node) => {
    if (node.type !== "CallExpression") return;
    const c = node.callee;
    const isT = (c.type === "MemberExpression" && c.property.name === "t") ||
                (c.type === "Identifier" && c.name === "t");
    if (!isT || !node.arguments.length) return;
    calls++;

    const rel = `${path.relative(ROOT, file)}:${node.loc.start.line}`;

    // key argument (second for client.t(guildId, key), first for t(lang, key))
    const keyArg = node.arguments[1];
    if (keyArg && keyArg.type === "Literal" && typeof keyArg.value === "string") {
      if (!enKeys.has(keyArg.value)) report(`${rel}: locale'de olmayan anahtar "${keyArg.value}"`);
    }

    // scope check on the guild-id argument
    const g = node.arguments[0];
    const root = g && (g.type === "Identifier" ? g.name
      : g.type === "MemberExpression" ? (function base(m) {
          return m.object.type === "MemberExpression" ? base(m.object) : m.object.name;
        })(g) : null);
    if (!root) return;
    const visible = scopes.some((s) => node.start >= s.start && node.end <= s.end && s.names.has(root));
    if (!visible) report(`${rel}: "${root}" bu kapsamda tanımlı değil`);
  });
}
if (problems === scoped) console.log(`  ✓ ${calls} çeviri çağrısının anahtarı ve kapsamı geçerli`);

console.log("\n" + (problems ? `${problems} sorun bulundu` : "Tüm çeviri denetimleri geçti"));
process.exit(problems ? 1 : 0);
