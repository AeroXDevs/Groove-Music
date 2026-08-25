// Loads the whole bot the way the real client does, minus the Discord gateway.
// Catches broken requires, bad exports, and i18n keys that only fail at runtime.
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const { t, isSupported, languages, localizations, DEFAULT_LANG } = require(`${ROOT}/src/utils/i18n`);

let fail = 0;
const bad = (m) => { console.log("  ✗ " + m); fail++; };
const ok = (m) => console.log("  ✓ " + m);

console.log("\n[1] Diller");
ok(`yüklü: ${languages().join(", ")} (varsayılan: ${DEFAULT_LANG})`);

console.log("\n[2] Veritabanı");
const db = require(`${ROOT}/src/structures/Database`);
["guildlang", "prefixes", "profiles", "automod", "giveaways"].forEach((tb) =>
  db[tb] ? ok(`${tb} yöneticisi hazır`) : bad(`${tb} yöneticisi YOK`));

console.log("\n[3] Komutlar");
const commandsPath = path.join(ROOT, "src/commands");
const commands = new Map(), aliases = new Map();
let total = 0, slash = 0;
for (const dir of fs.readdirSync(commandsPath)) {
  for (const file of fs.readdirSync(path.join(commandsPath, dir)).filter((f) => f.endsWith(".js"))) {
    const rel = `src/commands/${dir}/${file}`;
    let cmd;
    try { cmd = require(path.join(commandsPath, dir, file)); }
    catch (e) { bad(`${rel} yüklenemedi: ${e.message}`); continue; }

    if (!cmd.name) { bad(`${rel}: name yok`); continue; }
    if (commands.has(cmd.name)) bad(`${rel}: "${cmd.name}" adı çakışıyor`);
    if (!cmd.execute && !cmd.slashExecute && !cmd.run) bad(`${rel}: çalıştırılabilir fonksiyon yok`);

    for (const a of [].concat(cmd.aliases || [])) {
      if (aliases.has(a)) bad(`${rel}: "${a}" takma adı ${aliases.get(a)} ile çakışıyor`);
      aliases.set(a, cmd.name);
    }
    commands.set(cmd.name, cmd);
    total++;
    if (cmd.slashExecute || cmd.slashOptions) slash++;
  }
}
ok(`${total} komut, ${aliases.size} takma ad, ${slash} slash komutu yüklendi`);

console.log("\n[4] Slash komut yerelleştirmeleri");
let loc = 0;
for (const [name] of commands) if (localizations(`commands.${name}.description`)) loc++;
ok(`${loc}/${total} komutun açıklaması çevrilmiş`);

console.log("\n[5] Olaylar ve yükleyiciler");
for (const sub of ["events/Client", "events/Node", "events/Players", "loaders", "utils", "custom", "structures"]) {
  const dir = path.join(ROOT, "src", sub);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".js"))) {
    try { require(path.join(dir, f)); }
    catch (e) { bad(`src/${sub}/${f}: ${e.message}`); }
  }
}
ok("tüm olay/yükleyici/yardımcı modüller yüklendi");

console.log("\n[6] Locale bütünlüğü");
const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) =>
  v && typeof v === "object" ? flat(v, `${p}${k}.`) : [`${p}${k}`]);
const en = flat(require(`${ROOT}/src/locales/en.json`));
for (const lang of languages()) {
  let miss = 0;
  for (const k of en) if (t(lang, k) === k) miss++;
  miss ? bad(`${lang}: ${miss} anahtar çözülemedi`) : ok(`${lang}: ${en.length} anahtarın hepsi çözülüyor`);
}

console.log("\n" + (fail ? `SONUÇ: ${fail} sorun` : "SONUÇ: tüm kontroller geçti"));
process.exit(fail ? 1 : 0);
