// Runs every prefix command with no args against stubbed Discord objects and
// reports raw translation keys, English leftovers, and runtime errors.
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const { t, isSupported, DEFAULT_LANG } = require(`${ROOT}/src/utils/i18n`);
const db = require(`${ROOT}/src/structures/Database`);
const GUILD = "sim-guild";

const client = {
  emoji: require(`${ROOT}/src/emojis`), prefix: ".", color: "#00D4FF", db,
  config: require(`${ROOT}/src/config`), owners: ["u1"],
  user: { id: "bot", username: "Groove", displayAvatarURL: () => "", tag: "Groove#1" },
  users: { fetch: async () => ({ username: "x", id: "1", tag: "x#1" }) },
  guilds: { cache: new Map() },
  channels: { cache: new Map() },
  manager: { players: new Map(), search: async () => ({ tracks: [] }) },
  commands: new Map(), aliases: new Map(), slashCommands: new Map(),
  langCache: new Map(),
  getLang(g){ if(this.langCache.has(g)) return this.langCache.get(g);
    const s=this.db.guildlang.get(g); const l=(s&&isSupported(s))?s:DEFAULT_LANG;
    this.langCache.set(g,l); return l; },
  setLang(g,l){ this.db.guildlang.set(g,l); this.langCache.set(g,l); },
  t(g,k,v){ return t(this.getLang(g),k,v); }
};

const sent = () => ({ createMessageComponentCollector: () => ({ on(){}, stop(){} }),
                      edit: async()=>{}, delete: async()=>{}, reactions:{removeAll:async()=>{}} });

const render = (o) => {
  if (!o) return "";
  if (typeof o === "string") return o;
  if (o.content) return String(o.content);
  const out = [];
  const walk = (c) => { if(!c) return;
    if (c.data?.content) out.push(c.data.content);
    if (c.data?.label) out.push(c.data.label);
    if (c.data?.placeholder) out.push(c.data.placeholder);
    for (const k of ["components","options"]) (c[k]||c.data?.[k]||[]).forEach(walk); };
  (o.components||[]).forEach(walk);
  return out.join("\n");
};

const RAWKEY = /\b(music|mod|core|ui|owner|trk|gw|fav|info|am|amm|cfg|flt|vc|vcx|role|aud|nop|bl|srv|mut|brand|player|help|buttons|desc|evt|welcome|language|own|ign)\.[a-zA-Z0-9_.]+/;
const ENGLISH = /\b(Play a song|You need|I don't have|Please provide|Invalid|Successfully|Failed to|not found|already|Usage|Example|Current|Select|Cannot|Provide me)\b/;

(async () => {
  const base = path.join(ROOT, "src/commands");
  const results = { err: [], raw: [], eng: [] };
  for (const lang of ["tr"]) {
    client.setLang(GUILD, lang);
    for (const dir of fs.readdirSync(base)) {
      for (const file of fs.readdirSync(path.join(base, dir)).filter(f=>f.endsWith(".js"))) {
        const cmd = require(path.join(base, dir, file));
        if (typeof cmd.execute !== "function") continue;
        const replies = [];
        const msg = {
          guild: { id: GUILD, name: "S", members: { me: { permissions:{has:()=>true}, voice:{channel:null} }, cache:new Map() },
                   channels:{cache:new Map()}, roles:{cache:new Map()}, ownerId:"u1" },
          channel: { id:"c", type:0, send: async o => (replies.push(o), sent()),
                     permissionsFor: () => ({ has: () => true }) },
          author: { id:"u1", tag:"a#1", username:"a", displayName:"a", toString:()=>"@a" },
          member: { voice:{channel:null}, permissions:{has:()=>true} },
          mentions: { users:new Map(), members:new Map(), channels:new Map(), roles:new Map() },
          createdTimestamp: Date.now(),
          reply: async o => (replies.push(o), sent()),
        };
        try { await cmd.execute(msg, [], client, "."); }
        catch (e) { results.err.push(`${dir}/${file}: ${e.message}`); continue; }
        for (const r of replies) {
          const txt = render(r);
          if (RAWKEY.test(txt)) results.raw.push(`${dir}/${file}: ${txt.match(RAWKEY)[0]}`);
          else if (ENGLISH.test(txt)) results.eng.push(`${dir}/${file}: ${txt.match(ENGLISH)[0]} — ${txt.slice(0,70).replace(/\n/g," ")}`);
        }
      }
    }
  }
  console.log(`HAM ANAHTAR (${results.raw.length}):`); results.raw.slice(0,15).forEach(x=>console.log("  "+x));
  console.log(`\nİNGİLİZCE KAÇAK (${results.eng.length}):`); results.eng.slice(0,20).forEach(x=>console.log("  "+x));
  console.log(`\nÇALIŞMA HATASI (${results.err.length}) — çoğu sahte nesne eksikliği:`);
  results.err.slice(0,8).forEach(x=>console.log("  "+x));
})();
