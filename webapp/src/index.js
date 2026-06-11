import express from "express";
import crypto from "crypto";
import Database from "better-sqlite3";
import { Bot, InlineKeyboard } from "grammy";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL; // напр. https://sambo.procurarus.com
const SCHEDULE_DAYS = [1, 3, 5]; // 1=пн, 3=ср, 5=пт
const REMIND_TIME = process.env.REMIND_TIME || "17:00"; // за 30 мин до 17:30
const PORT = Number(process.env.PORT || 3000);

if (!BOT_TOKEN || !APP_URL) {
  console.error("Нужны переменные окружения BOT_TOKEN и APP_URL (см. .env.example)");
  process.exit(1);
}

// ─── База ────────────────────────────────────────────────────
fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });
const db = new Database(path.join(__dirname, "data", "sambo.db"));
db.pragma("journal_mode = WAL");
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  state TEXT NOT NULL DEFAULT '{}',
  remind INTEGER NOT NULL DEFAULT 1,
  first_name TEXT,
  updated_at TEXT
)`);
const getUser = db.prepare("SELECT * FROM users WHERE id = ?");
const upsertUser = db.prepare(`INSERT INTO users (id, first_name, updated_at) VALUES (?, ?, datetime('now'))
  ON CONFLICT(id) DO UPDATE SET first_name = excluded.first_name`);
const saveState = db.prepare("UPDATE users SET state = ?, updated_at = datetime('now') WHERE id = ?");
const setRemind = db.prepare("UPDATE users SET remind = ? WHERE id = ?");
const remindUsers = db.prepare("SELECT id, state FROM users WHERE remind = 1");

// ─── Валидация Telegram initData ─────────────────────────────
function validateInitData(initData) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    const secret = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
    const calc = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(calc, "hex"), Buffer.from(hash, "hex"))) return null;
    const authDate = Number(params.get("auth_date") || 0);
    if (Date.now() / 1000 - authDate > 86400) return null; // initData старше суток
    return JSON.parse(params.get("user") || "null");
  } catch {
    return null;
  }
}

function auth(req, res, next) {
  const user = validateInitData(req.get("X-Init-Data") || "");
  if (!user) return res.status(401).json({ error: "invalid initData" });
  req.tgUser = user;
  next();
}

// ─── API ─────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: "256kb" }));

app.get("/api/state", auth, (req, res) => {
  upsertUser.run(req.tgUser.id, req.tgUser.first_name || "");
  const row = getUser.get(req.tgUser.id);
  res.json({ state: JSON.parse(row?.state || "{}") });
});

app.post("/api/state", auth, (req, res) => {
  if (typeof req.body?.state !== "object") return res.status(400).json({ error: "bad state" });
  upsertUser.run(req.tgUser.id, req.tgUser.first_name || "");
  saveState.run(JSON.stringify(req.body.state), req.tgUser.id);
  res.json({ ok: true });
});

// статика собранного webapp
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (_, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`Sambo Hero API on :${PORT}`));

// ─── Бот ─────────────────────────────────────────────────────
const bot = new Bot(BOT_TOKEN);
const openKb = () => new InlineKeyboard().webApp("🥋 Открыть Sambo Hero", APP_URL);

bot.command("start", async (ctx) => {
  upsertUser.run(ctx.from.id, ctx.from.first_name || "");
  await ctx.reply(
    "Привет! 🥋 Это Sambo Hero — игра, где тренировки превращаются в уровни, пояса и награды.\n\n" +
    "Открой приложение, отметь тренировку и начни свою серию 🔥\n\n" +
    "Команды:\n/remind_on — напоминания о тренировке\n/remind_off — выключить напоминания",
    { reply_markup: openKb() }
  );
});

bot.command("remind_on", async (ctx) => {
  upsertUser.run(ctx.from.id, ctx.from.first_name || "");
  setRemind.run(1, ctx.from.id);
  await ctx.reply(`Напоминания включены ✅ Буду писать каждый день в ${REMIND_TIME}.`);
});

bot.command("remind_off", async (ctx) => {
  upsertUser.run(ctx.from.id, ctx.from.first_name || "");
  setRemind.run(0, ctx.from.id);
  await ctx.reply("Напоминания выключены. Включить снова: /remind_on");
});

// кнопка меню (слева от поля ввода) — открывает приложение
bot.api.setChatMenuButton({
  menu_button: { type: "web_app", text: "🥋 Sambo Hero", web_app: { url: APP_URL } },
}).catch((e) => console.error("setChatMenuButton:", e.message));

bot.start({ onStart: () => console.log("Bot polling started") });

// ─── Ежедневное напоминание ──────────────────────────────────
let lastRemindDay = "";
setInterval(async () => {
  const now = new Date();
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const day = now.toISOString().slice(0, 10);
  if (!SCHEDULE_DAYS.includes(dayOfWeek)) return; // не тренировочный день
  if (hhmm !== REMIND_TIME || lastRemindDay === day) return;
  lastRemindDay = day;
  for (const u of remindUsers.all()) {
    try {
      let streak = 0;
      try {
        const tr = JSON.parse(u.state || "{}").trainings || [];
        const set = new Set(tr);
        const d = new Date();
        const ds = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
        if (!set.has(ds(d))) d.setDate(d.getDate() - 1);
        while (set.has(ds(d))) { streak++; d.setDate(d.getDate() - 1); }
      } catch {}
      const msg = streak > 0
        ? `Сегодня тренировка в 17:30! 🥋 Серия — ${streak} 🔥 Не дай ей прерваться!`
        : "Сегодня тренировка в 17:30! 🥋 Отметь её в приложении после занятия 💪";
      await bot.api.sendMessage(u.id, msg, { reply_markup: openKb() });
    } catch (e) { /* пользователь заблокировал бота — пропускаем */ }
  }
}, 30 * 1000);
