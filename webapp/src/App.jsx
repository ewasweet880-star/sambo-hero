import { useState, useEffect, useRef, useId } from "react";
import confetti from "canvas-confetti";

// ─── Telegram WebApp + API ───────────────────────────────────
const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;
// вне Telegram (обычный браузер) показываем демо-режим с примером прогресса
const isDemo = !tg;
async function apiState(method, state) {
  const res = await fetch("/api/state", {
    method,
    headers: { "Content-Type": "application/json", "X-Init-Data": tg?.initData || "" },
    body: state !== undefined ? JSON.stringify({ state }) : undefined,
  });
  if (!res.ok) throw new Error("api " + res.status);
  return res.json();
}

// ─── Константы игры ──────────────────────────────────────────
const XP_PER_TRAINING = 50;
const LEVELS = [
  { name: "Ученик", xp: 0, color: "#4ade80", belt: "Белый", beltColor: "#f8fafc" },
  { name: "Боец", xp: 300, color: "#facc15", belt: "Жёлтый", beltColor: "#facc15" },
  { name: "Воин", xp: 900, color: "#fb923c", belt: "Оранжевый", beltColor: "#fb923c" },
  { name: "Чемпион", xp: 1800, color: "#4ade80", belt: "Зелёный", beltColor: "#4ade80" },
  { name: "Мастер", xp: 3000, color: "#60a5fa", belt: "Синий", beltColor: "#60a5fa" },
];
const DEFAULT_MISSIONS = [
  { id: "m1", icon: "🥋", text: "Сходить на 2 тренировки", xp: 30, stats: { tech: 2 } },
  { id: "m2", icon: "💪", text: "Сделать зарядку 3 раза", xp: 20, stats: { str: 3 } },
  { id: "m3", icon: "🧘", text: "Не сдаваться на тренировке", xp: 20, stats: { end: 2 } },
  { id: "m4", icon: "🏅", text: "Получить похвалу тренера", xp: 30, stats: { tech: 2 } },
];
const TITLES = ["Гроза татами", "Молния ковра", "Железный хват", "Тигр самбо", "Непобедимый дух", "Мастер броска"];
const STICKERS = [
  { emoji: "🦁", name: "Лев" }, { emoji: "🐯", name: "Тигр" }, { emoji: "🐻", name: "Медведь" },
  { emoji: "⚡", name: "Молния" }, { emoji: "🔥", name: "Огонь" }, { emoji: "🛡️", name: "Щит" },
  { emoji: "🚀", name: "Ракета" }, { emoji: "⭐", name: "Звезда" }, { emoji: "🏆", name: "Кубок" },
  { emoji: "🥇", name: "Золото" }, { emoji: "💎", name: "Алмаз" }, { emoji: "👑", name: "Корона" },
];
const TECHNIQUES = [
  { id: "k1",  icon: "🦵", name: "Задняя подножка" },
  { id: "k2",  icon: "🦶", name: "Передняя подножка" },
  { id: "k3",  icon: "🌀", name: "Бросок через бедро" },
  { id: "k4",  icon: "💨", name: "Подсечка" },
  { id: "k5",  icon: "🪝", name: "Зацеп изнутри" },
  { id: "k6",  icon: "🔄", name: "Бросок через спину" },
  { id: "k7",  icon: "🌊", name: "Подхват" },
  { id: "k8",  icon: "💪", name: "Рычаг локтя" },
  { id: "k9",  icon: "🤝", name: "Удержание сбоку" },
  { id: "k10", icon: "🔃", name: "Переворот в партере" },
  { id: "k11", icon: "🌪️", name: "Мельница" },
  { id: "k12", icon: "🎯", name: "Бросок захватом ног" },
];
const XP_TECHNIQUE = 10;
// Достижения: cond(ctx) → bool
const ACHIEVEMENTS = [
  { id: "t1",   icon: "🥇", title: "Первый шаг",            desc: "Первая тренировка",        cond: (c) => c.total >= 1 },
  { id: "t10",  icon: "💪", title: "Десятка",               desc: "10 тренировок",            cond: (c) => c.total >= 10 },
  { id: "t25",  icon: "🥊", title: "Боевой настрой",        desc: "25 тренировок",            cond: (c) => c.total >= 25 },
  { id: "t50",  icon: "🏆", title: "Полсотни",              desc: "50 тренировок",            cond: (c) => c.total >= 50 },
  { id: "t100", icon: "🐯", title: "Настоящий самбист",     desc: "100 тренировок",           cond: (c) => c.total >= 100 },
  { id: "s3",   icon: "🔥", title: "Начало пути",           desc: "3 тренировки подряд",      cond: (c) => c.streak >= 3 },
  { id: "s7",   icon: "⚙️", title: "Железная дисциплина",   desc: "7 тренировок подряд",      cond: (c) => c.streak >= 7 },
  { id: "s14",  icon: "🐅", title: "Тигр ковра",            desc: "14 тренировок подряд",     cond: (c) => c.streak >= 14 },
  { id: "s30",  icon: "👑", title: "Легенда зала",          desc: "30 тренировок подряд",     cond: (c) => c.streak >= 30 },
  { id: "l2",   icon: "🟡", title: "Жёлтый пояс",           desc: "Достигнут уровень «Боец»", cond: (c) => c.levelIdx >= 1 },
  { id: "l3",   icon: "🟠", title: "Оранжевый пояс",        desc: "Достигнут уровень «Воин»", cond: (c) => c.levelIdx >= 2 },
  { id: "l4",   icon: "🟢", title: "Зелёный пояс",          desc: "Уровень «Чемпион»",        cond: (c) => c.levelIdx >= 3 },
  { id: "l5",   icon: "🔵", title: "Синий пояс",            desc: "Уровень «Мастер»",         cond: (c) => c.levelIdx >= 4 },
  { id: "c1",   icon: "🥇", title: "Первый бой",            desc: "Первое соревнование",      cond: (c) => c.comps >= 1 },
  { id: "c5",   icon: "🏟️", title: "Турнирный боец",        desc: "5 соревнований",           cond: (c) => c.comps >= 5 },
  { id: "bar1", icon: "🤸", title: "Первый вис",            desc: "Первое утреннее",          cond: (c) => (c.mornings||0) >= 1 },
  { id: "bar10",icon: "💪", title: "10 утренних",           desc: "10 утренних тренировок",   cond: (c) => (c.mornings||0) >= 10 },
  { id: "bar30",icon: "🦾", title: "Месяц на турнике",      desc: "30 утренних тренировок",   cond: (c) => (c.mornings||0) >= 30 },
  { id: "pull", icon: "🏅", title: "Первое подтягивание",   desc: "Дошел до этапа p9",        cond: (c) => (c.pullStage||0) >= 8 },
  { id: "bur1", icon: "🌪️", title: "Первый бёрпи",         desc: "Первый бёрпи Рояла",       cond: (c) => (c.burpees||0) >= 1 },
  { id: "bur10",icon: "🔥", title: "10 бёрпи-недель",      desc: "10 недель бёрпи",          cond: (c) => (c.burpees||0) >= 10 },
];
const XP_COMPETITION = 100;
const XP_DAILY = 15;
const XP_MORNING = 20;
const XP_BURPEE = 25;
const BURPEE_START = 3;
const BURPEE_STEP = 1;
const PULLUP_PROGRAM = [
  {id:"p1", label:"Вис 30 сек", sessions:5, desc:"Просто висим!"},
  {id:"p2", label:"Вис 45 сек", sessions:5, desc:"Держись дольше!"},
  {id:"p3", label:"Вис 60 сек", sessions:5, desc:"Минута — ты герой!"},
  {id:"p4", label:"Вис 60 сек x2", sessions:5, desc:"Два подхода"},
  {id:"p5", label:"Подбородок над турником", sessions:7, desc:"Подпрыгни!"},
  {id:"p6", label:"Негативные подтягивания", sessions:7, desc:"Медленно вниз"},
  {id:"p7", label:"Полуподтягивание", sessions:7, desc:"До середины"},
  {id:"p8", label:"С помощью папы", sessions:7, desc:"Assisted"},
  {id:"p9", label:"1 подтягивание", sessions:10, desc:"Первое настоящее!"},
  {id:"p10",label:"2 подтягивания", sessions:10, desc:"Двойной чемпион!"},
  {id:"p11",label:"3 подтягивания", sessions:10, desc:"Тройная сила!"},
  {id:"p12",label:"5 подтягиваний", sessions:14, desc:"Настоящий турникмен!"},
];
const DAILY_CHALLENGES = [
  { icon: "💪", text: "Сделай 10 отжиманий" },
  { icon: "🤸", text: "Сделай 15 приседаний" },
  { icon: "🏃", text: "Побегай или попрыгай 5 минут" },
  { icon: "🧘", text: "Растяжка 5 минут" },
  { icon: "🥋", text: "Повтори один приём дома" },
  { icon: "🦵", text: "20 прыжков на месте или на скакалке" },
  { icon: "🛌", text: "Ляг спать вовремя — сила растёт во сне" },
];

// ─── Звук (Web Audio, без файлов) ────────────────────────────
let audioCtx = null;
function tone(freq, t0, dur, type = "sine", gain = 0.12) {
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(gain, audioCtx.currentTime + t0);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + t0 + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(audioCtx.currentTime + t0); o.stop(audioCtx.currentTime + t0 + dur);
}
function playSound(kind) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    if (kind === "xp") { tone(880, 0, 0.12, "square", 0.07); tone(1318, 0.1, 0.18, "square", 0.07); }
    else if (kind === "levelup") { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.28, "triangle", 0.12)); }
    else if (kind === "achievement") { tone(660, 0, 0.15, "triangle", 0.1); tone(990, 0.13, 0.3, "triangle", 0.1); }
  } catch (e) {}
}

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const WEEKDAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

const dateToStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayStr = () => dateToStr(new Date());

const DEFAULT_STATE = {
  onboarded: false,
  name: "Даня",
  pin: "",
  xp: 0,
  trainings: [],
  missionsDone: [],
  achievements: [],
  competitions: [],
  dailyDone: [],
  stats: { str: 0, end: 0, tech: 0 },
  stickers: [],
  titleDay: null,
  techniques: [],
  morningDone: [],
  pullStageIdx: 0,
  pullStageSessions: 0,
  burpeeDone: [],
  reward: { title: "Поход в кино", cost: 10, claimed: 0 },
};

// ─── Расчёты ─────────────────────────────────────────────────
function getLevel(xp) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].xp) idx = i;
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1] || null;
  return { idx, cur, next, progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1 };
}
// ─── Расписание тренировок ───────────────────────────────────
// Единый источник — сервер (/api/config). Значения ниже — только запасные
// до загрузки конфига; при загрузке переменная перезаписывается.
let scheduleDays = [1, 3, 5]; // 1=пн, 3=ср, 5=пт

function isTrainingDay(date = new Date(), days = scheduleDays) {
  return days.includes(date.getDay() === 0 ? 7 : date.getDay());
}

// Получить все тренировочные дни в диапазоне дат (для календаря)
function getScheduledDays(year, month, days = scheduleDays) {
  const result = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    if (isTrainingDay(d, days)) result.push(d.getDate());
    d.setDate(d.getDate() + 1);
  }
  return new Set(result);
}

// Неделя для «Бёрпи недели»: начинается с понедельника.
// Ключ — дата понедельника текущей недели (однозначно и без сдвигов по TZ).
function mondayOfWeek(d = new Date()) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return dt;
}
function useCountUp(target) {
  const [val, setVal] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    var from = prev.current; prev.current = target;
    if (from === target) return;
    var start = null; var raf;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / 600);
      var eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return function() { cancelAnimationFrame(raf); };
  }, [target]);
  return val;
}
function getStreak(trainings, days = scheduleDays) {
  const set = new Set(trainings);
  // строим список всех прошедших тренировочных дней в обратном порядке
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  const d = new Date(today);
  // начинаем со вчера если сегодня тренировки ещё не было
  // (серия не обнуляется в день тренировки до её начала)
  let started = false;
  for (let i = 0; i < 365; i++) {
    if (isTrainingDay(d, days)) {
      const ds = dateToStr(d);
      if (set.has(ds)) {
        streak++;
        started = true;
      } else if (started) {
        // пропустил тренировочный день — серия оборвалась
        break;
      } else if (d < today) {
        // прошлый тренировочный день без отметки — серия не началась
        break;
      }
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
// Лучшая серия = максимум тренировок подряд по тренировочным дням
// (не по календарным — между пн и ср всегда 2 дня).
function getBestStreak(trainings, days = scheduleDays) {
  const set = new Set(trainings);
  const all = [...set].sort();
  let best = 0, cur = 0;
  let prev = null; // предыдущая дата в серии (Date)
  for (const s of all) {
    const d = new Date(s + "T00:00:00");
    if (prev) {
      // следующий тренировочный день после prev
      const nd = new Date(prev);
      nd.setDate(nd.getDate() + 1);
      while (!isTrainingDay(nd, days)) nd.setDate(nd.getDate() + 1);
      cur = dateToStr(d) === dateToStr(nd) ? cur + 1 : 1;
    } else {
      cur = 1;
    }
    best = Math.max(best, cur);
    prev = d;
  }
  return best;
}
function checkNewAchievements(ctx, unlocked) {
  return ACHIEVEMENTS.filter((a) => !unlocked.includes(a.id) && a.cond(ctx));
}
// Демо-состояние для просмотра вне Telegram (прогресс не сохраняется)
function demoState() {
  const trainings = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 1); // начинаем со вчера, чтобы серия не зависела от отметки «сегодня»
  while (trainings.length < 8) {
    if (isTrainingDay(d)) trainings.push(dateToStr(d));
    d.setDate(d.getDate() - 1);
  }
  return {
    onboarded: true,
    name: "Даня",
    xp: 1450,
    trainings,
    missionsDone: ["m1", "m3"],
    achievements: ["t1", "t10", "s3", "l2", "l3"],
    competitions: [{ date: "2026-08-29", place: 2 }],
    dailyDone: [],
    stats: { str: 24, end: 18, tech: 16 },
    stickers: ["🦁", "⚡", "🔥"],
    techniques: ["k1", "k2", "k3", "k4"],
    morningDone: [],
    pullStageIdx: 2,
    pullStageSessions: 3,
    burpeeDone: [],
    reward: { title: "Поход в кино", cost: 10, claimed: 0 },
  };
}
function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

// ─── SVG-персонаж (пояс + экипировка растут с прогрессом) ────
// Утилита: осветлить/затемнить hex-цвет (p от -1 до 1)
function shade(hex, p) {
  const n = String(hex).replace("#", "");
  const full = n.length === 3 ? n.split("").map((c) => c + c).join("") : n;
  const num = parseInt(full, 16);
  let r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  const t = p < 0 ? 0 : 255, amt = Math.abs(p);
  r = Math.round(r + (t - r) * amt);
  g = Math.round(g + (t - g) * amt);
  b = Math.round(b + (t - b) * amt);
  return `rgb(${r},${g},${b})`;
}

function SamboCharacter({ beltColor = "#f8fafc", size = 150, glow = false, gear = {}, mood, onTap }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const beltDark = shade(beltColor, -0.28);
  const beltLight = shade(beltColor, 0.18);
  const bodyCls = "sh-body" + (mood === "celebrate" ? " sh-hero-jump" : "") + (mood === "levelup" ? " sh-hero-spin" : "") + (mood === "tap" ? " sh-hero-flex" : "");
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 160 200" onClick={onTap} style={{ cursor: onTap ? "pointer" : "default", filter: glow ? "drop-shadow(0 0 18px rgba(250,204,21,.5))" : "none" }}>
      <defs>
        <linearGradient id={`skin${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7cda0" />
          <stop offset="1" stopColor="#e5ad7f" />
        </linearGradient>
        <linearGradient id={`gi${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f05353" />
          <stop offset="1" stopColor="#b91c1c" />
        </linearGradient>
        <linearGradient id={`giIn${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e4ebf4" />
        </linearGradient>
        <linearGradient id={`shorts${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4d8bf8" />
          <stop offset="1" stopColor="#1e4fd8" />
        </linearGradient>
        <linearGradient id={`hair${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6a4322" />
          <stop offset="1" stopColor="#2e1a08" />
        </linearGradient>
        <linearGradient id={`boot${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ef4444" />
          <stop offset="1" stopColor="#8f1414" />
        </linearGradient>
        <linearGradient id={`shoe${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c2740" />
          <stop offset="1" stopColor="#0b1120" />
        </linearGradient>
        <linearGradient id={`belt${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={beltLight} />
          <stop offset="0.5" stopColor={beltColor} />
          <stop offset="1" stopColor={beltDark} />
        </linearGradient>
      </defs>

      {/* золотая аура Мастера */}
      {gear.aura && (
        <g>
          <ellipse cx="80" cy="100" rx="74" ry="94" fill="none" stroke="#facc15" strokeWidth="3" opacity=".42" strokeDasharray="7 9" />
          <ellipse cx="80" cy="100" rx="66" ry="86" fill="none" stroke="#fde047" strokeWidth="1.4" opacity=".25" />
        </g>
      )}

      {/* тень на полу */}
      <ellipse cx="80" cy="192" rx="47" ry="7" fill="rgba(0,0,0,.32)" />

      <g className={bodyCls}>
        {/* ноги */}
        <rect x="59" y="146" width="17" height="40" rx="8" fill={`url(#skin${uid})`} stroke="rgba(0,0,0,.10)" />
        <rect x="84" y="146" width="17" height="40" rx="8" fill={`url(#skin${uid})`} stroke="rgba(0,0,0,.10)" />

        {/* ступни / борцовки */}
        <ellipse cx="66" cy="188" rx="13" ry="6.5" fill={gear.boots ? `url(#boot${uid})` : `url(#shoe${uid})`} stroke="rgba(0,0,0,.28)" />
        <ellipse cx="94" cy="188" rx="13" ry="6.5" fill={gear.boots ? `url(#boot${uid})` : `url(#shoe${uid})`} stroke="rgba(0,0,0,.28)" />
        {gear.boots && (
          <>
            <path d="M56 187 l20 0 M58 184 l14 0" stroke="#fecaca" strokeWidth="1.6" strokeLinecap="round" opacity=".85" />
            <path d="M84 187 l20 0 M88 184 l14 0" stroke="#fecaca" strokeWidth="1.6" strokeLinecap="round" opacity=".85" />
          </>
        )}

        {/* шорты */}
        <path d="M54 124 L106 124 L110 150 Q110 158 102 158 L58 158 Q50 158 50 150 Z" fill={`url(#shorts${uid})`} stroke="rgba(0,0,0,.16)" />
        <path d="M58 154 Q80 160 102 154" stroke="rgba(0,0,0,.12)" strokeWidth="2" fill="none" />

        {/* куртка (самбовка) */}
        <path d="M47 78 C50 62 60 54 80 54 C100 54 110 62 113 78 L117 122 C117 128 113 130 105 130 L55 130 C47 130 43 128 43 122 Z" fill={`url(#gi${uid})`} stroke="rgba(0,0,0,.16)" />

        {/* V-ворот (внутренняя часть) */}
        <path d="M80 56 L62 88 L98 88 Z" fill={`url(#giIn${uid})`} stroke="#b91c1c" strokeWidth="2" strokeLinejoin="round" />

        {/* складки куртки */}
        <path d="M64 96 Q66 108 62 120" stroke="rgba(0,0,0,.08)" strokeWidth="2" fill="none" />
        <path d="M96 96 Q94 108 98 120" stroke="rgba(0,0,0,.08)" strokeWidth="2" fill="none" />
        <path d="M50 82 Q47 102 50 120" stroke="rgba(255,255,255,.14)" strokeWidth="2" fill="none" />

        {/* нашивка-звезда за первое соревнование */}
        {gear.patch && (
          <path d="M61 82 l1.8 3.6 4 .6 -2.9 2.8 .7 4 -3.6 -1.9 -3.6 1.9 .7 -4 -2.9 -2.8 4 -.6 z" fill="#facc15" stroke="#b45309" strokeWidth=".8" />
        )}

        {/* руки (рукава) */}
        <path d="M47 80 Q32 104 60 112" stroke="rgba(0,0,0,.15)" strokeWidth="21" strokeLinecap="round" fill="none" />
        <path d="M47 80 Q32 104 60 112" stroke={`url(#gi${uid})`} strokeWidth="18" strokeLinecap="round" fill="none" />
        <path d="M113 80 Q128 104 100 112" stroke="rgba(0,0,0,.15)" strokeWidth="21" strokeLinecap="round" fill="none" />
        <path d="M113 80 Q128 104 100 112" stroke={`url(#gi${uid})`} strokeWidth="18" strokeLinecap="round" fill="none" />

        {/* манжеты перчаток */}
        {gear.gloves && (
          <>
            <rect x="52" y="119" width="16" height="6" rx="3" fill="#e2e8f0" stroke="rgba(0,0,0,.15)" />
            <rect x="92" y="119" width="16" height="6" rx="3" fill="#e2e8f0" stroke="rgba(0,0,0,.15)" />
          </>
        )}

        {/* кисти (кулаки) */}
        <circle cx="60" cy="114" r="8" fill={gear.gloves ? "#1d4ed8" : `url(#skin${uid})`} stroke={gear.gloves ? "#0b1d3a" : "rgba(0,0,0,.12)"} strokeWidth={gear.gloves ? 1.5 : 1} />
        <circle cx="100" cy="114" r="8" fill={gear.gloves ? "#1d4ed8" : `url(#skin${uid})`} stroke={gear.gloves ? "#0b1d3a" : "rgba(0,0,0,.12)"} strokeWidth={gear.gloves ? 1.5 : 1} />
        <path d="M56 112 q2 2 5 0 M95 112 q2 2 5 0" stroke="rgba(0,0,0,.18)" strokeWidth="1.4" fill="none" strokeLinecap="round" />

        {/* пояс — цвет уровня */}
        <rect x="49" y="117" width="62" height="12" rx="6" fill={`url(#belt${uid})`} stroke={beltDark} strokeWidth="1.5" />
        <rect x="53" y="120" width="54" height="3.5" rx="1.75" fill="rgba(255,255,255,.45)" />
        <rect x="72" y="116" width="16" height="14" rx="4" fill={`url(#belt${uid})`} stroke={beltDark} strokeWidth="1.5" />
        <rect x="71" y="130" width="8" height="17" rx="3.5" fill={shade(beltColor, -0.12)} stroke="rgba(0,0,0,.2)" strokeWidth="1" />
        <rect x="81" y="130" width="8" height="17" rx="3.5" fill={shade(beltColor, -0.12)} stroke="rgba(0,0,0,.2)" strokeWidth="1" />

        {/* шея */}
        <rect x="72" y="60" width="16" height="16" rx="6" fill={`url(#skin${uid})`} stroke="rgba(0,0,0,.10)" />

        {/* голова */}
        <circle cx="54.5" cy="45" r="5" fill={`url(#skin${uid})`} stroke="rgba(0,0,0,.08)" />
        <circle cx="105.5" cy="45" r="5" fill={`url(#skin${uid})`} stroke="rgba(0,0,0,.08)" />
        <circle cx="80" cy="43" r="25" fill={`url(#skin${uid})`} stroke="rgba(0,0,0,.10)" />

        {/* волосы */}
        <path d="M55 46 C50 22 62 11 80 11 C98 11 110 22 105 46 C103 33 93 29 80 29 C67 29 57 33 55 46 Z" fill={`url(#hair${uid})`} stroke="rgba(0,0,0,.18)" />
        <path d="M55 44 C60 34 70 32 80 32 C90 32 100 34 105 44 C97 40 90 38 80 38 C70 38 63 40 55 44 Z" fill="#3a240e" />
        <path d="M60 24 Q80 13 100 24" stroke="#8a5a2e" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".7" />

        {/* лицо */}
        <path d="M64 42 Q70 39 76 42" stroke="#3a240e" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <path d="M84 42 Q90 39 96 42" stroke="#3a240e" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <ellipse cx="70" cy="48" rx="3.4" ry="4.6" fill="#1e293b" />
        <ellipse cx="90" cy="48" rx="3.4" ry="4.6" fill="#1e293b" />
        <circle cx="71" cy="46.5" r="1.3" fill="#ffffff" />
        <circle cx="91" cy="46.5" r="1.3" fill="#ffffff" />
        <path d="M79 50 q1 4 2 0" stroke="#d99a6b" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <ellipse cx="63" cy="54" rx="4.2" ry="2.7" fill="#fb7185" opacity=".45" />
        <ellipse cx="97" cy="54" rx="4.2" ry="2.7" fill="#fb7185" opacity=".45" />
        <path d="M72 56 Q80 63 88 56 Z" fill="#8b1d1d" />
        <path d="M75 58 Q80 60.5 85 58 Z" fill="#fb7185" />
      </g>
    </svg>
  );
}

// ─── 3D-наклон за пальцем (parallax) ─────────────────────────
function Tilt3D({ children, max = 14, style }) {
  const ref = useRef(null);
  const reduced = useRef(false);
  useEffect(() => {
    try { reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  }, []);
  const apply = (e) => {
    if (reduced.current) return;
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${(px * max).toFixed(2)}deg) rotateX(${(-py * max).toFixed(2)}deg)`;
  };
  const reset = () => { const el = ref.current; if (el) el.style.transform = "rotateY(0deg) rotateX(0deg)"; };
  return (
    <div style={{ perspective: "640px" }}>
      <div
        ref={ref}
        className="sh-tilt"
        onPointerMove={apply}
        onPointerLeave={reset}
        onPointerUp={reset}
        onPointerCancel={reset}
        style={style}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Амбиентные золотые частицы (canvas, дёшево) ─────────────
function Particles({ count = 20 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    let reduced = false;
    try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    if (reduced) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf = 0, running = true, w = 0, h = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width || canvas.parentElement?.clientWidth || 0;
      h = r.height || canvas.parentElement?.clientHeight || 0;
      canvas.width = Math.max(1, Math.round(w * DPR));
      canvas.height = Math.max(1, Math.round(h * DPR));
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    const ps = Array.from({ length: count }, () => ({
      x: Math.random() * (w || 300),
      y: Math.random() * (h || 400),
      r: 0.6 + Math.random() * 1.7,
      vy: 0.15 + Math.random() * 0.35,
      vx: (Math.random() - 0.5) * 0.15,
      a: 0.12 + Math.random() * 0.35,
      tw: Math.random() * Math.PI * 2,
    }));
    const tick = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.y -= p.vy; p.x += p.vx; p.tw += 0.02;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        const alpha = p.a * (0.6 + 0.4 * Math.sin(p.tw));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(253,224,71,${alpha.toFixed(3)})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    const onVis = () => {
      running = document.visibilityState === "visible";
      if (running) raf = requestAnimationFrame(tick); else cancelAnimationFrame(raf);
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", resize);
    };
  }, [count]);
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />;
}

// ─── Приложение ──────────────────────────────────────────────
export default function SamboHero() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [schedule, setSchedule] = useState({ days: [1, 3, 5] });
  const [tab, setTab] = useState("home");
  const [fxQueue, setFxQueue] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [compOpen, setCompOpen] = useState(false);
  const [welcomeBack, setWelcomeBack] = useState(false);
  const [tapAnim, setTapAnim] = useState(false);
  const [parentUnlocked, setParentUnlocked] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const saveTimer = useRef(null);

  // загрузка
  useEffect(() => {
    tg?.ready();
    tg?.expand();
    try { tg?.setHeaderColor("#0b1d3a"); tg?.setBackgroundColor("#0b1d3a"); } catch (e) {}
    let cancelled = false;
    // демо-режим (вне Telegram): показываем интерфейс с примером, без сети
    if (isDemo) {
      setState((s) => ({ ...s, ...demoState() }));
      setLoaded(true);
      return;
    }
    (async () => {
      try {
        // публичный конфиг расписания (не критичен — при сбое остаёмся на дефолте)
        try {
          const cfg = await fetch("/api/config").then((r) => (r.ok ? r.json() : null));
          if (cfg?.scheduleDays?.length) {
            scheduleDays = cfg.scheduleDays;
            if (!cancelled) setSchedule({ days: cfg.scheduleDays });
          }
        } catch (e) { /* конфиг не загрузился — используем дефолт */ }

        const data = await apiState("GET");
        if (cancelled) return;
        setLoadError(false);
        if (data.state && Object.keys(data.state).length) {
          const parsed = data.state;
          if (parsed.onboarded === undefined && (parsed.trainings || []).length > 0) parsed.onboarded = true;
          setState({ ...DEFAULT_STATE, ...parsed });
          const tr = parsed.trainings || [];
          if (tr.length > 0) {
            const last = new Date([...tr].sort().pop() + "T00:00:00");
            const days = Math.floor((new Date() - last) / 86400000);
            if (days >= 3) setWelcomeBack(true);
          }
        } else {
          // первый запуск: подставим имя из Telegram-профиля
          const tgName = tg?.initDataUnsafe?.user?.first_name;
          if (tgName) setState((s) => ({ ...s, name: tgName }));
        }
        setLoaded(true);
      } catch (e) {
        // ошибка сети/авторизации: НЕ сохраняем дефолтное состояние, показываем ретрай
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  // сохранение на сервер (с дебаунсом)
  useEffect(() => {
    if (!loaded || isDemo) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await apiState("POST", state); } catch (e) {}
    }, 500);
  }, [state, loaded]);

  // очередь эффектов + звук + вибрация
  useEffect(() => {
    if (!fxQueue.length) return;
    playSound(fxQueue[0].type);
    try {
      var ft = fxQueue[0].type;
      if (ft === "achievement") confetti({ particleCount: 110, spread: 75, origin: { y: 0.65 } });
      else if (ft === "levelup" || ft === "levelup_bar") confetti({ particleCount: 160, spread: 95, origin: { y: 0.6 }, colors: ["#facc15","#fde047","#fb923c","#ffffff"] });
      else if (ft === "chest") confetti({ particleCount: 70, spread: 60, origin: { y: 0.55 }, colors: ["#facc15","#fb923c","#ef4444"] });
    } catch (e) {}
    try {
      if (fxQueue[0].type === "xp") tg?.HapticFeedback?.impactOccurred("medium");
      else tg?.HapticFeedback?.notificationOccurred("success");
    } catch (e) {}
    const dur = { xp: 1700, levelup: 2800, achievement: 2500, chest: 2800, levelup_bar: 2800 }[fxQueue[0].type] || 2000;
    const t = setTimeout(() => setFxQueue((q) => q.slice(1)), dur);
    return () => clearTimeout(t);
  }, [fxQueue]);

  const level = getLevel(state.xp);
  const dispXp = useCountUp(state.xp);
  const streak = getStreak(state.trainings, schedule.days);
  const bestStreak = getBestStreak(state.trainings, schedule.days);
  const todayIsTraining = isTrainingDay(new Date(), schedule.days);
  var pullStageIdx = Math.min(state.pullStageIdx||0, PULLUP_PROGRAM.length-1);
  var pullStage = PULLUP_PROGRAM[pullStageIdx];
  var pullStageSessions = state.pullStageSessions||0;
  var morningDoneToday = (state.morningDone||[]).includes(todayStr());
  var thisWeek = "W" + dateToStr(mondayOfWeek());
  var burpeeDoneThisWeek = (state.burpeeDone||[]).includes(thisWeek);
  var burpeeReps = BURPEE_START + Math.floor((state.burpeeDone||[]).length/4)*BURPEE_STEP;
  const trainedToday = state.trainings.includes(todayStr());
  var heroMood = fxQueue.length ? (fxQueue[0].type === "levelup" ? "levelup" : "celebrate") : (tapAnim ? "tap" : "idle");
  const tapHero = () => {
    if (tapAnim) return;
    setTapAnim(true);
    try { tg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred("light"); } catch (e) {}
    setTimeout(function() { setTapAnim(false); }, 750);
  };
  const rewardProgress = Math.min(state.trainings.length - state.reward.claimed, state.reward.cost);
  const rewardReady = rewardProgress >= state.reward.cost;
  const dayIdx = Math.floor(new Date().setHours(0, 0, 0, 0) / 86400000) % DAILY_CHALLENGES.length;
  const daily = DAILY_CHALLENGES[dayIdx];
  const dailyDoneToday = state.dailyDone.includes(todayStr());
  const gear = {
    boots: state.trainings.length >= 25,
    gloves: getBestStreak(state.trainings, schedule.days) >= 14,
    patch: state.competitions.length >= 1,
    aura: level.idx >= 4,
  };
  const titleToday = state.titleDay && state.titleDay.date === todayStr() ? state.titleDay.text : null;

  const applyXp = (s, amount, extraCtx = {}) => {
    const newXp = s.xp + amount;
    const before = getLevel(s.xp).idx;
    const after = getLevel(newXp).idx;
    const ctx = { total: s.trainings.length, streak: getStreak(s.trainings, schedule.days), levelIdx: after, comps: s.competitions.length, mornings:(s.morningDone||[]).length, pullStage:s.pullStageIdx||0, burpees:(s.burpeeDone||[]).length, ...extraCtx };
    const newAchs = checkNewAchievements(ctx, s.achievements);
    const queue = [{ type: "xp", amount }];
    if (after > before) queue.push({ type: "levelup", level: LEVELS[after] });
    newAchs.forEach((a) => queue.push({ type: "achievement", ach: a }));
    return { newXp, newAchs, queue };
  };

  const addStats = (s, delta) => ({
    str: (s.stats?.str || 0) + (delta.str || 0),
    end: (s.stats?.end || 0) + (delta.end || 0),
    tech: (s.stats?.tech || 0) + (delta.tech || 0),
  });

  const rollChest = () => {
    if (Math.random() >= 0.2) return null; // шанс 20%
    const owned = new Set(state.stickers || []);
    const availStickers = STICKERS.filter((s) => !owned.has(s.emoji));
    const kinds = ["xp2", "title", ...(availStickers.length ? ["sticker"] : [])];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    if (kind === "xp2") return { kind, icon: "⚡", text: `Двойной XP! Бонус +${XP_PER_TRAINING} XP` };
    if (kind === "title") {
      const t = TITLES[Math.floor(Math.random() * TITLES.length)];
      return { kind, icon: "👑", text: `Титул дня: «${t}»`, title: t };
    }
    const stk = availStickers[Math.floor(Math.random() * availStickers.length)];
    return { kind, icon: stk.emoji, text: `Наклейка в коллекцию: ${stk.name}!`, sticker: stk.emoji };
  };

  const confirmTraining = () => {
    setConfirmOpen(false);
    if (trainedToday) return;
    const chest = rollChest();
    const bonus = chest?.kind === "xp2" ? XP_PER_TRAINING : 0;
    const newTrainings = [...state.trainings, todayStr()];
    const { newXp, newAchs, queue } = applyXp(state, XP_PER_TRAINING + bonus, { total: newTrainings.length, streak: getStreak(newTrainings, schedule.days) });
    if (chest) queue.splice(1, 0, { type: "chest", chest });
    setState((s) => ({
      ...s,
      xp: newXp,
      trainings: newTrainings,
      achievements: [...s.achievements, ...newAchs.map((a) => a.id)],
      stats: addStats(s, { str: 2, end: 2, tech: 2 }),
      stickers: chest?.sticker ? [...(s.stickers || []), chest.sticker] : s.stickers,
      titleDay: chest?.title ? { text: chest.title, date: todayStr() } : s.titleDay,
    }));
    setFxQueue(queue);
  };

  const markCompetition = (place) => {
    setCompOpen(false);
    const newComps = [...state.competitions, { date: todayStr(), place }];
    const { newXp, newAchs, queue } = applyXp(state, XP_COMPETITION, { comps: newComps.length });
    setState((s) => ({
      ...s, xp: newXp, competitions: newComps,
      achievements: [...s.achievements, ...newAchs.map((a) => a.id)],
      stats: addStats(s, { str: 2, end: 2, tech: 5 }),
    }));
    setFxQueue(queue);
  };

  const completeDaily = () => {
    if (dailyDoneToday) return;
    const { newXp, newAchs, queue } = applyXp(state, XP_DAILY);
    setState((s) => ({
      ...s, xp: newXp, dailyDone: [...s.dailyDone, todayStr()],
      achievements: [...s.achievements, ...newAchs.map((a) => a.id)],
      stats: addStats(s, { end: 3 }),
    }));
    setFxQueue(queue);
  };

  const learnTechnique = (id) => {
    if ((state.techniques || []).includes(id)) return;
    const { newXp, newAchs, queue } = applyXp(state, XP_TECHNIQUE);
    setState((s) => ({
      ...s, xp: newXp, techniques: [...(s.techniques || []), id],
      achievements: [...s.achievements, ...newAchs.map((a) => a.id)],
      stats: addStats(s, { tech: 2 }),
    }));
    setFxQueue(queue);
  };

  const toggleMission = (id, xp) => {
    const mission = DEFAULT_MISSIONS.find((m) => m.id === id);
    setState((s) => {
      const done = s.missionsDone.includes(id);
      const newXp = done ? s.xp - xp : s.xp + xp;
      const before = getLevel(s.xp).idx;
      const after = getLevel(newXp).idx;
      const ctx = { total: s.trainings.length, streak: getStreak(s.trainings, schedule.days), levelIdx: after, comps: s.competitions.length };
      const newAchs = done ? [] : checkNewAchievements(ctx, s.achievements);
      if (!done) {
        const q = [{ type: "xp", amount: xp }];
        if (after > before) q.push({ type: "levelup", level: LEVELS[after] });
        newAchs.forEach((a) => q.push({ type: "achievement", ach: a }));
        setFxQueue(q);
      }
      const statDelta = mission?.stats || {};
      const sign = done ? -1 : 1;
      return {
        ...s,
        missionsDone: done ? s.missionsDone.filter((x) => x !== id) : [...s.missionsDone, id],
        xp: newXp,
        achievements: [...s.achievements, ...newAchs.map((a) => a.id)],
        stats: addStats(s, { str: sign * (statDelta.str || 0), end: sign * (statDelta.end || 0), tech: sign * (statDelta.tech || 0) }),
      };
    });
  };

  const completeMorning = () => {
    if (morningDoneToday) return;
    var ns = pullStageSessions + 1;
    var adv = ns >= pullStage.sessions;
    var ni = adv ? Math.min(pullStageIdx+1, PULLUP_PROGRAM.length-1) : pullStageIdx;
    var res = applyXp(state, XP_MORNING, {mornings:(state.morningDone||[]).length+1, pullStage:ni});
    if (adv && ni > pullStageIdx) res.queue.push({type:"levelup_bar", stage:PULLUP_PROGRAM[ni]});
    setState(s => ({...s, xp:res.newXp, morningDone:[...(s.morningDone||[]),todayStr()], pullStageIdx:ni, pullStageSessions:adv?0:ns, achievements:[...s.achievements,...res.newAchs.map(a=>a.id)], stats:addStats(s,{str:2,end:1})}));
    setFxQueue(res.queue);
  };
  const completeBurpee = () => {
    if (burpeeDoneThisWeek) return;
    var res = applyXp(state, XP_BURPEE, {burpees:(state.burpeeDone||[]).length+1});
    setState(s => ({...s, xp:res.newXp, burpeeDone:[...(s.burpeeDone||[]),thisWeek], achievements:[...s.achievements,...res.newAchs.map(a=>a.id)], stats:addStats(s,{str:2,end:3})}));
    setFxQueue(res.queue);
  };
  const claimReward = () =>
    setState((s) => ({ ...s, reward: { ...s.reward, claimed: s.reward.claimed + s.reward.cost } }));

  if (!loaded)
    return (
      <div style={{ ...st.app, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 14, padding: 24 }}>
        <style>{css}</style>
        {loadError ? (
          <>
            <div style={{ fontSize: 48 }}>📡</div>
            <div style={{ color: "#fff", fontSize: 17, fontWeight: 800, textAlign: "center" }}>Не удалось загрузить прогресс</div>
            <div style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", lineHeight: 1.5 }}>
              Проверь интернет и попробуй снова.<br />Открывай приложение через бота в Telegram.
            </div>
            <button style={st.claimBtn} onClick={() => { setLoadError(false); setReloadKey((k) => k + 1); }}>Повторить 🔄</button>
          </>
        ) : (
          <div style={{ color: "#facc15", fontSize: 18, fontWeight: 700 }}>🥋 Загрузка…</div>
        )}
      </div>
    );

  if (!state.onboarded)
    return (
      <div style={st.app}>
        <style>{css}</style>
        <Onboarding initial={state} onDone={(patch) => setState((s) => ({ ...s, ...patch, onboarded: true }))} />
      </div>
    );

  const fx = fxQueue[0];

  return (
    <div style={st.app}>
      <style>{css}</style>
      <Particles count={20} />

      {/* ── Эффекты ── */}
      {fx && (
        <div style={st.fxOverlay}>
          {fx.type === "levelup" ? (
            <div className="sh-fx3d" style={st.fxCard}>
              <div style={{ position: "relative", width: 112, height: 136, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="sh-ring" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px dashed rgba(250,204,21,.55)", boxShadow: "0 0 24px rgba(250,204,21,.25)" }} />
                <SamboCharacter beltColor={fx.level.beltColor} size={100} glow mood="levelup" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#facc15", letterSpacing: 1 }}>НОВЫЙ УРОВЕНЬ!</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: "#fff" }}>{fx.level.name}</div>
              <div style={{ color: "#cbd5e1", fontSize: 13 }}>Новый пояс: {fx.level.belt}</div>
            </div>
          ) : fx.type === "levelup_bar" ? (
            <div className="sh-fx3d" style={st.fxCard}>
              <div style={{fontSize:54}}>🤸</div>
              <div style={{fontSize:14,fontWeight:800,color:"#60a5fa"}}>НОВЫЙ ЭТАП!</div>
              <div style={{fontSize:20,fontWeight:900,color:"#facc15"}}>{fx.stage.label}</div>
              <div style={{fontSize:13,color:"#cbd5e1"}}>{fx.stage.desc}</div>
            </div>
          ) : fx.type === "chest" ? (
            <div className="sh-fx3d" style={st.fxCard}>
              <div className="sh-chest3d" style={{ fontSize: 50 }}>🎁</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fb923c", letterSpacing: 2 }}>СУНДУК-СЮРПРИЗ!</div>
              <div className="sh-prize3d" style={{ fontSize: 40 }}>{fx.chest.icon}</div>
              <div style={{ fontSize: 17, fontWeight: 900, color: "#facc15", textAlign: "center" }}>{fx.chest.text}</div>
            </div>
          ) : fx.type === "achievement" ? (
            <div className="sh-fx3d" style={st.fxCard}>
              <div className="sh-ach-badge" style={{ fontSize: 54 }}>{fx.ach.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#60a5fa", letterSpacing: 2 }}>ДОСТИЖЕНИЕ</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#facc15" }}>«{fx.ach.title}»</div>
              <div style={{ color: "#cbd5e1", fontSize: 13 }}>{fx.ach.desc}</div>
            </div>
          ) : (
            <div className="sh-xp" style={st.fxXp}>+{fx.amount} XP 💪</div>
          )}
        </div>
      )}

      {/* ── Возвращение после перерыва ── */}
      {welcomeBack && (
        <div style={{ ...st.fxOverlay, pointerEvents: "auto", zIndex: 60 }}>
          <div className="sh-pop" style={{ ...st.fxCard, gap: 12 }}>
            <div style={{ fontSize: 50 }}>🤗</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#facc15" }}>Ты вернулся!</div>
            <div style={{ fontSize: 14, color: "#cbd5e1", textAlign: "center", lineHeight: 1.5 }}>
              Серия прервалась — и это нормально.<br />
              Чемпионы отличаются тем, что <b style={{ color: "#fff" }}>возвращаются</b>.<br />
              Твой путь продолжается 💪
            </div>
            <button style={{ ...st.claimBtn, width: "100%" }} onClick={() => setWelcomeBack(false)}>Продолжить путь 🥋</button>
          </div>
        </div>
      )}

      {/* ── Соревнование: выбор результата ── */}
      {compOpen && (
        <div style={{ ...st.fxOverlay, pointerEvents: "auto" }}>
          <div className="sh-pop" style={{ ...st.fxCard, gap: 12 }}>
            <div style={{ fontSize: 46 }}>🏆</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", textAlign: "center" }}>Как выступил?</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" }}>
              {[["🥇", "1 место", 1], ["🥈", "2 место", 2], ["🥉", "3 место", 3], ["💪", "Участвовал", 0]].map(([ic, label, place]) => (
                <button key={label} style={{ ...st.ghostBtn, padding: "12px 8px", fontSize: 14 }} onClick={() => markCompetition(place)}>
                  {ic} {label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Любое участие = +{XP_COMPETITION} XP. Главное — выйти на ковёр!</div>
            <button style={{ ...st.ghostBtnSm, alignSelf: "center" }} onClick={() => setCompOpen(false)}>Отмена</button>
          </div>
        </div>
      )}

      {/* ── Подтверждение тренировки ── */}
      {confirmOpen && (
        <div style={{ ...st.fxOverlay, pointerEvents: "auto" }}>
          <div className="sh-pop" style={{ ...st.fxCard, gap: 14 }}>
            <div style={{ fontSize: 46 }}>🥋</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", textAlign: "center" }}>
              Ты точно был сегодня<br />на тренировке?
            </div>
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <button style={{ ...st.claimBtn, flex: 1 }} onClick={confirmTraining}>Да! 💪</button>
              <button style={{ ...st.ghostBtn, flex: 1 }} onClick={() => setConfirmOpen(false)}>Нет</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Контент ── */}
      {isDemo && (
        <div style={{
          position: "relative", zIndex: 1, flexShrink: 0,
          background: "linear-gradient(90deg,#fb923c,#f59e0b)", color: "#2a1205",
          fontSize: 12.5, fontWeight: 800, textAlign: "center", padding: "7px 10px",
        }}>
          👀 Демо-режим · прогресс не сохраняется
        </div>
      )}
      <div className="sh-stagger" style={{ ...st.scroll, position: "relative", zIndex: 1 }}>
        {tab === "home" && (
          <>
            <div style={st.header}>
              <div style={st.avatar}>
                <span style={{ fontSize: 30 }}>🥋</span>
                <div style={{ ...st.lvlBadge, background: level.cur.color }}>{level.idx + 1}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{state.name}</div>
                {titleToday && <div style={{ fontSize: 12, color: "#fb923c", fontWeight: 800 }}>👑 {titleToday}</div>}
                <div style={{ fontSize: 13, color: "#facc15", fontWeight: 700 }}>Уровень {level.idx + 1}: {level.cur.name}</div>
                <div style={st.xpBarOuter}><div style={{ ...st.xpBarInner, width: `${level.progress * 100}%` }} /></div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
                  {level.next ? `${dispXp} / ${level.next.xp} XP до уровня «${level.next.name}»` : `${dispXp} XP — максимум!`}
                </div>
              </div>
              <div style={st.streakBox}>
                <div style={{ fontSize: 22 }}>🔥</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{streak}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>серия</div>
              </div>
            </div>

            {/* Герой */}
            <div style={st.heroCard}>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                <div style={st.heroChip}>
                  <div style={{ fontSize: 20 }}>⭐</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#facc15" }}>+{XP_PER_TRAINING} XP</div>
                  <div style={{ fontSize: 11, color: "#cbd5e1" }}>за тренировку</div>
                </div>
                <div style={st.heroChip}>
                  <div style={{ width: 34, height: 10, borderRadius: 5, background: level.cur.beltColor, margin: "5px 0" }} />
                  <div style={{ fontSize: 11, color: "#cbd5e1" }}>Твой пояс</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: level.cur.beltColor }}>{level.cur.belt}</div>
                </div>
              </div>
              <Tilt3D max={16} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                <div className="sh-float" style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", transformStyle: "preserve-3d" }}>
                  {/* софит над героем (ближе к зрителю) */}
                  <div style={{
                    position: "absolute", top: -6, width: 190, height: 190, borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(250,204,21,.22), transparent 68%)",
                    pointerEvents: "none", transform: "translateZ(24px)",
                  }} />
                  {/* ковёр (татами) под героем (дальше от зрителя) */}
                  <div style={{
                    position: "absolute", bottom: 2, width: 150, height: 26, borderRadius: "50%",
                    background: "radial-gradient(ellipse at center, rgba(250,204,21,.22), transparent 72%)",
                    pointerEvents: "none", transform: "translateZ(-20px)",
                  }} />
                  <SamboCharacter beltColor={level.cur.beltColor} size={140} gear={gear} mood={heroMood} onTap={tapHero} />
                </div>
              </Tilt3D>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", textAlign: "center", marginTop: 4 }}>
                {state.trainings.length === 0
                  ? "Твой путь начинается сегодня!"
                  : <>Ты стал сильнее на <span style={{ color: "#ef4444" }}>{state.trainings.length}</span> {plural(state.trainings.length, "тренировку", "тренировки", "тренировок")}!</>}
              </div>
            </div>

            <button
              className={!trainedToday && todayIsTraining ? "sh-btn-pulse" : ""}
              onClick={() => todayIsTraining && setConfirmOpen(true)}
              disabled={trainedToday || !todayIsTraining}
              style={{ ...st.bigBtn, ...((trainedToday || !todayIsTraining) ? st.bigBtnDone : {}) }}
            >
              {trainedToday
                ? "✅ Тренировка засчитана!"
                : todayIsTraining
                  ? "✔  Я БЫЛ НА ТРЕНИРОВКЕ"
                  : "📅 Сегодня нет тренировки"}
            </button>

            <button style={st.compBtn} onClick={() => setCompOpen(true)}>
              🏆 Я участвовал в соревновании <span style={{ color: "#facc15" }}>+{XP_COMPETITION} XP</span>
            </button>

            {/* Испытание дня */}
            <div style={{...st.card, border:morningDoneToday?"1px solid rgba(74,222,128,.4)":"1px solid rgba(250,204,21,.3)"}}>
              <div style={{fontSize:12,fontWeight:800,color:"#facc15",textTransform:"uppercase"}}>🤸 Утренний турник</div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontSize:36}}>🏋</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:900,color:"#fff"}}>{pullStage.label}</div>
                  <div style={{fontSize:12,color:"#94a3b8"}}>{pullStage.desc}</div>
                  <div style={st.xpBarOuter}><div style={{...st.xpBarInner,background:"#facc15",width:String(Math.round(pullStageSessions/pullStage.sessions*100))+"%"}} /></div>
                  <div style={{fontSize:11,color:"#facc15",fontWeight:700}}>{pullStageSessions} / {pullStage.sessions} занятий{pullStageIdx<PULLUP_PROGRAM.length-1?" → "+PULLUP_PROGRAM[pullStageIdx+1].label:""}</div>
                </div>
                <button style={{...st.dailyBtn,background:morningDoneToday?"rgba(74,222,128,.18)":"linear-gradient(180deg,#fde047,#facc15)",color:morningDoneToday?"#4ade80":"#1c1400"}} onClick={completeMorning} disabled={morningDoneToday}>{morningDoneToday?"✅":"+"+XP_MORNING+" XP"}</button>
              </div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {PULLUP_PROGRAM.map((p,i)=><div key={p.id} style={{width:18,height:18,borderRadius:4,fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",background:i<pullStageIdx?"#22c55e":i===pullStageIdx?"#facc15":"rgba(255,255,255,.08)",color:i<=pullStageIdx?"#052e16":"#64748b"}}>{i+1}</div>)}
              </div>
            </div>
            <div style={{...st.card,border:burpeeDoneThisWeek?"1px solid rgba(74,222,128,.4)":"1px solid rgba(251,146,60,.35)"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontSize:34}}>🌪️</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:800,color:"#fb923c",textTransform:"uppercase"}}>Бёрпи недели</div>
                  <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>Бёрпи Рояла × {burpeeReps}</div>
                  <div style={{fontSize:11,color:"#94a3b8"}}>{burpeeDoneThisWeek?"Выполнено на этой неделе 🎉":"1 раз в неделю, в любой день"}</div>
                </div>
                <button style={{...st.dailyBtn,background:burpeeDoneThisWeek?"rgba(74,222,128,.18)":"linear-gradient(180deg,#fb923c,#ea580c)",color:burpeeDoneThisWeek?"#4ade80":"#fff"}} onClick={completeBurpee} disabled={burpeeDoneThisWeek}>{burpeeDoneThisWeek?"✅":"+"+XP_BURPEE+" XP"}</button>
              </div>
            </div>
            {/* Испытание дня — каждый день */}
            <div style={{ ...st.card, border: dailyDoneToday ? "1px solid rgba(74,222,128,.4)" : "1px solid rgba(96,165,250,.35)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 34 }}>{daily.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#60a5fa", letterSpacing: 0.5, textTransform: "uppercase" }}>⚡ Испытание дня</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1.3 }}>{daily.text}</div>
                </div>
                <button
                  style={{ ...st.dailyBtn, ...(dailyDoneToday ? { background: "rgba(74,222,128,.18)", color: "#4ade80", cursor: "default" } : {}) }}
                  onClick={completeDaily} disabled={dailyDoneToday}
                >
                  {dailyDoneToday ? "✅" : `+${XP_DAILY} XP`}
                </button>
              </div>
            </div>

            {/* Награда */}
            <div style={st.card}>
              <div style={st.cardTitle}>🎁 Следующая награда</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontSize: 42 }}>🍿</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{state.reward.title}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 6px" }}>
                    {rewardReady ? "Цель достигнута! 🎉" : `Осталось тренировок: ${state.reward.cost - rewardProgress} из ${state.reward.cost}`}
                  </div>
                  <div style={st.xpBarOuter}><div style={{ ...st.xpBarInner, width: `${(rewardProgress / state.reward.cost) * 100}%` }} /></div>
                  <div style={{ fontSize: 11, color: "#facc15", fontWeight: 700, marginTop: 3 }}>{rewardProgress} / {state.reward.cost}</div>
                </div>
              </div>
              {rewardReady && <button style={st.claimBtn} onClick={claimReward}>🎉 Получить награду!</button>}
            </div>

            {/* Миссии */}
            <div style={st.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={st.cardTitle}>🎯 Задания недели</div>
                <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: 700 }}>{state.missionsDone.length} из {DEFAULT_MISSIONS.length}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {DEFAULT_MISSIONS.map((m) => {
                  const done = state.missionsDone.includes(m.id);
                  return (
                    <button key={m.id} onClick={() => toggleMission(m.id, m.xp)} style={{ ...st.mission, ...(done ? st.missionDone : {}) }}>
                      <div style={{ fontSize: 26 }}>{m.icon}</div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: done ? "#4ade80" : "#e2e8f0", lineHeight: 1.3 }}>{m.text}</div>
                      <div style={{ fontSize: 11, color: done ? "#4ade80" : "#facc15", fontWeight: 800 }}>{done ? "✅ +" + m.xp + " XP" : "+" + m.xp + " XP"}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {tab === "calendar" && (
          <Calendar trainings={state.trainings} competitions={state.competitions} bestStreak={bestStreak} streak={streak} calMonth={calMonth} setCalMonth={setCalMonth} scheduleDays={schedule.days} />
        )}

        {tab === "hero" && <HeroTab state={state} level={level} bestStreak={bestStreak} streak={streak} gear={gear} onLearnTechnique={learnTechnique} />}

        {tab === "settings" && (
          parentUnlocked || !state.pin
            ? <Settings state={state} setState={setState} onLock={() => setParentUnlocked(false)} />
            : <PinGate pin={state.pin} onUnlock={() => setParentUnlocked(true)} />
        )}
      </div>

      {/* ── Меню ── */}
      <div style={st.nav}>
        {[
          { id: "home", icon: "🏠", label: "Главная" },
          { id: "calendar", icon: "📅", label: "Календарь" },
          { id: "hero", icon: "🥋", label: "Герой" },
          { id: "settings", icon: "🔒", label: "Родитель" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ ...st.navBtn, ...(tab === t.id ? st.navBtnActive : {}) }}>
            <div style={{ fontSize: 22, lineHeight: 1 }}>{t.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 800 }}>{t.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Онбординг (3 шага) ──────────────────────────────────────
function Onboarding({ initial, onDone }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initial.name || "");
  const [rTitle, setRTitle] = useState(initial.reward?.title || "Поход в кино");
  const [rCost, setRCost] = useState(initial.reward?.cost || 10);
  const [pin, setPin] = useState("");

  const finish = () =>
    onDone({
      name: name.trim() || "Самбист",
      reward: { title: rTitle.trim() || "Сюрприз", cost: Math.max(1, Number(rCost) || 10), claimed: 0 },
      pin: /^\d{4}$/.test(pin) ? pin : "",
    });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: 24, gap: 18 }}>
      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 28, height: 6, borderRadius: 3, background: i <= step ? "#facc15" : "rgba(255,255,255,.15)" }} />
        ))}
      </div>

      {step === 0 && (
        <div className="sh-pop" style={st.obCard}>
          <SamboCharacter beltColor="#f8fafc" size={120} />
          <div style={st.obTitle}>Кто наш герой? 🥋</div>
          <div style={st.obText}>Как зовут будущего чемпиона?</div>
          <input style={st.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя ребёнка" autoFocus />
          <button style={st.bigBtn} onClick={() => setStep(1)} disabled={!name.trim()}>Дальше →</button>
        </div>
      )}

      {step === 1 && (
        <div className="sh-pop" style={st.obCard}>
          <div style={{ fontSize: 56 }}>🎁</div>
          <div style={st.obTitle}>Первая награда</div>
          <div style={st.obText}>Реальная цель — главный мотиватор. Что получит {name.trim() || "ребёнок"} и за сколько тренировок?</div>
          <input style={st.input} value={rTitle} onChange={(e) => setRTitle(e.target.value)} placeholder="Например: Поход в кино" />
          <label style={st.label}>Сколько тренировок нужно</label>
          <input style={st.input} type="number" min="1" value={rCost} onChange={(e) => setRCost(e.target.value)} />
          <button style={st.bigBtn} onClick={() => setStep(2)}>Дальше →</button>
        </div>
      )}

      {step === 2 && (
        <div className="sh-pop" style={st.obCard}>
          <div style={{ fontSize: 56 }}>🔒</div>
          <div style={st.obTitle}>PIN для родителя</div>
          <div style={st.obText}>Защитит настройки наград от юного хитреца 😄 4 цифры. Можно пропустить.</div>
          <input style={{ ...st.input, textAlign: "center", letterSpacing: 8, fontSize: 22 }} value={pin} inputMode="numeric"
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" />
          <div style={{ ...st.obText, fontSize: 12, textAlign: "left" }}>
            Как это работает: ребёнок нажимает «Я был на тренировке» → получает XP → растёт уровень и пояс → достигает награды. Серии дней дают огонь 🔥 и титулы.
          </div>
          <button style={st.bigBtn} onClick={finish}>🥋 Начать путь!</button>
        </div>
      )}
    </div>
  );
}

// ─── PIN-экран ───────────────────────────────────────────────
function PinGate({ pin, onUnlock }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  const onChange = (v) => {
    const clean = v.replace(/\D/g, "").slice(0, 4);
    setVal(clean);
    setErr(false);
    if (clean.length === 4) {
      if (clean === pin) onUnlock();
      else { setErr(true); setTimeout(() => setVal(""), 350); }
    }
  };
  return (
    <div style={{ ...st.card, alignItems: "center", textAlign: "center", gap: 14, paddingTop: 30, paddingBottom: 30 }}>
      <div style={{ fontSize: 46 }}>🔒</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>Раздел для родителя</div>
      <div style={{ fontSize: 13, color: "#94a3b8" }}>Введите PIN-код</div>
      <input
        className={err ? "sh-shake" : ""}
        style={{ ...st.input, textAlign: "center", letterSpacing: 10, fontSize: 24, width: 160, borderColor: err ? "#ef4444" : undefined }}
        value={val} inputMode="numeric" autoFocus onChange={(e) => onChange(e.target.value)} placeholder="••••"
      />
      {err && <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 700 }}>Неверный PIN</div>}
    </div>
  );
}

// ─── Календарь ───────────────────────────────────────────────
function Calendar({ trainings, competitions = [], bestStreak, streak, calMonth, setCalMonth, scheduleDays = [1, 3, 5] }) {
  const set = new Set(trainings);
  const compSet = new Set(competitions.map((c) => c.date));
  const { y, m } = calMonth;
  const offset = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = todayStr();
  const todayDate = new Date(); todayDate.setHours(0,0,0,0);
  const scheduled = getScheduledDays(y, m, scheduleDays);
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  return (
    <div style={st.card}>
      <div style={st.cardTitle}>📅 Мой путь</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <button onClick={() => setCalMonth(m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 })} style={st.calNav}>‹</button>
        <div style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>{MONTHS[m]} {y}</div>
        <button onClick={() => setCalMonth(m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 })} style={st.calNav}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
        {WEEKDAYS.map((w, i) => (
          <div key={w} style={{ textAlign: "center", fontSize: 11, fontWeight: 700,
            color: scheduleDays.includes(i + 1) ? "#60a5fa" : "#64748b" }}>{w}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const cellDate = new Date(y, m, d);
          const trained = set.has(ds);
          const comp = compSet.has(ds);
          const isToday = ds === today;
          const isPast = cellDate < todayDate;
          const isScheduled = scheduled.has(d);
          const missed = isScheduled && isPast && !trained && !isToday;
          return (
            <div key={i} style={{
              aspectRatio: "1", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12.5, fontWeight: 700,
              background: comp ? "#facc15" : trained ? "#22c55e" : missed ? "rgba(239,68,68,.25)" : isScheduled ? "rgba(96,165,250,.12)" : "rgba(255,255,255,.04)",
              color: comp ? "#422006" : trained ? "#052e16" : missed ? "#fca5a5" : isScheduled ? "#93c5fd" : "#64748b",
              border: isToday ? "2px solid #facc15" : "2px solid transparent",
            }}>{d}</div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14, fontSize: 12, flexWrap: "wrap" }}>
        <span>🟢 был</span>
        <span style={{ color: "#fca5a5" }}>🔴 пропустил</span>
        <span style={{ color: "#93c5fd" }}>🔵 план</span>
        <span style={{ color: "#facc15" }}>🟡 соревнование</span>
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#cbd5e1", fontWeight: 700 }}>
        <div>🔥 серия: <span style={{ color: "#fb923c" }}>{streak}</span></div>
        <div>🏅 лучшая: <span style={{ color: "#facc15" }}>{bestStreak}</span></div>
      </div>
    </div>
  );
}

// ─── Герой: персонаж, статистика, достижения, путь ───────────
function HeroTab({ state, level, bestStreak, streak, gear = {}, onLearnTechnique }) {
  const unlockedCount = state.achievements.length;
  const stats = state.stats || { str: 0, end: 0, tech: 0 };
  const learned = new Set(state.techniques || []);
  const stickers = new Set(state.stickers || []);
  const GEAR_LIST = [
    { key: "boots", icon: "👟", name: "Борцовки", how: "25 тренировок" },
    { key: "gloves", icon: "🧤", name: "Перчатки", how: "14 тренировок подряд" },
    { key: "patch", icon: "⭐", name: "Нашивка", how: "первое соревнование" },
    { key: "aura", icon: "✨", name: "Аура Мастера", how: "уровень «Мастер»" },
  ];
  return (
    <>
      <div style={{ ...st.heroCard, paddingTop: 24 }}>
        <SamboCharacter beltColor={level.cur.beltColor} size={130} glow gear={gear} />
        <div style={{ fontSize: 24, fontWeight: 900, color: "#fff" }}>{state.name}</div>
        <div style={{ fontSize: 14, color: level.cur.color, fontWeight: 800 }}>{level.cur.name} · пояс: {level.cur.belt}</div>
      </div>

      {/* Характеристики */}
      <div style={st.card}>
        <div style={st.cardTitle}>⚔️ Характеристики</div>
        {[
          ["💪", "Сила", stats.str, "#ef4444"],
          ["🏃", "Выносливость", stats.end, "#4ade80"],
          ["🥋", "Техника", stats.tech, "#60a5fa"],
        ].map(([icon, name, v, color]) => (
          <div key={name}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800, color: "#e2e8f0", marginBottom: 4 }}>
              <span>{icon} {name}</span><span style={{ color }}>{v}</span>
            </div>
            <div style={st.xpBarOuter}>
              <div style={{ ...st.xpBarInner, background: color, width: `${Math.min(100, v)}%` }} />
            </div>
          </div>
        ))}
        <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>
          Тренировки качают всё · зарядка → сила · испытания дня → выносливость · приёмы и соревнования → техника
        </div>
      </div>

      {/* Экипировка */}
      <div style={st.card}>
        <div style={st.cardTitle}>🎽 Экипировка героя</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {GEAR_LIST.map((g) => {
            const got = gear[g.key];
            return (
              <div key={g.key} style={{ ...st.achBox, opacity: got ? 1 : 0.4, border: got ? "1px solid rgba(250,204,21,.45)" : "1px solid rgba(255,255,255,.08)" }}>
                <div style={{ fontSize: 24, filter: got ? "none" : "grayscale(1)" }}>{g.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: got ? "#facc15" : "#94a3b8" }}>{g.name}</div>
                <div style={{ fontSize: 10.5, color: "#64748b" }}>{got ? "Надето на героя!" : "🔒 " + g.how}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Приёмы */}
      <div style={st.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={st.cardTitle}>📖 Мои приёмы</div>
          <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: 700 }}>{learned.size} из {TECHNIQUES.length}</div>
        </div>
        <div style={{ fontSize: 11, color: "#64748b" }}>Тренер показал новый приём? Открой его карточку: +{XP_TECHNIQUE} XP и +2 к технике</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {TECHNIQUES.map((t) => {
            const got = learned.has(t.id);
            return (
              <button key={t.id} onClick={() => !got && onLearnTechnique(t.id)}
                style={{ ...st.achBox, cursor: got ? "default" : "pointer", fontFamily: "inherit",
                  opacity: got ? 1 : 0.5, border: got ? "1px solid rgba(96,165,250,.5)" : "1px dashed rgba(255,255,255,.2)",
                  background: got ? "rgba(96,165,250,.08)" : "rgba(0,0,0,.25)" }}>
                <div style={{ fontSize: 24, filter: got ? "none" : "grayscale(1)" }}>{t.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: got ? "#60a5fa" : "#94a3b8", lineHeight: 1.2 }}>{t.name}</div>
                <div style={{ fontSize: 10 }}>{got ? "✅" : "➕ изучить"}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Наклейки */}
      <div style={st.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={st.cardTitle}>🎟 Коллекция наклеек</div>
          <div style={{ fontSize: 12, color: "#fb923c", fontWeight: 700 }}>{stickers.size} из {STICKERS.length}</div>
        </div>
        <div style={{ fontSize: 11, color: "#64748b" }}>Выпадают из сундуков-сюрпризов после тренировок 🎁</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 6 }}>
          {STICKERS.map((s) => {
            const got = stickers.has(s.emoji);
            return (
              <div key={s.emoji} title={s.name} style={{
                aspectRatio: "1", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, background: got ? "rgba(250,204,21,.12)" : "rgba(0,0,0,.25)",
                border: got ? "1px solid rgba(250,204,21,.4)" : "1px solid rgba(255,255,255,.06)",
                filter: got ? "none" : "grayscale(1) opacity(.35)",
              }}>{got ? s.emoji : "?"}</div>
            );
          })}
        </div>
      </div>

      <div style={st.card}>
        <div style={st.cardTitle}>📈 Статистика</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            ["🥋", state.trainings.length, "тренировок всего"],
            ["⭐", state.xp, "опыта (XP)"],
            ["🔥", streak, "текущая серия"],
            ["🏅", bestStreak, "лучшая серия"],
            ["🏆", state.competitions.length, "соревнований"],
            ["🎖", state.achievements.length, "достижений"],
          ].map(([icon, v, label]) => (
            <div key={label} style={st.statBox}>
              <div style={{ fontSize: 22 }}>{icon}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#facc15" }}>{v}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={st.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={st.cardTitle}>🎖 Достижения</div>
          <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: 700 }}>{unlockedCount} из {ACHIEVEMENTS.length}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {ACHIEVEMENTS.map((a) => {
            const got = state.achievements.includes(a.id);
            return (
              <div key={a.id} style={{ ...st.achBox, opacity: got ? 1 : 0.35, border: got ? "1px solid rgba(250,204,21,.45)" : "1px solid rgba(255,255,255,.08)" }}>
                <div style={{ fontSize: 26, filter: got ? "none" : "grayscale(1)" }}>{a.icon}</div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: got ? "#facc15" : "#94a3b8", lineHeight: 1.2 }}>{a.title}</div>
                <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.2 }}>{got ? a.desc : "🔒 " + a.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={st.card}>
        <div style={st.cardTitle}>🏆 Путь мастера</div>
        {LEVELS.map((l) => {
          const reached = state.xp >= l.xp;
          return (
            <div key={l.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", opacity: reached ? 1 : 0.45 }}>
              <div style={{ width: 36, height: 12, borderRadius: 6, background: l.beltColor, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{l.name}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>от {l.xp} XP · пояс: {l.belt}</div>
              </div>
              <div style={{ fontSize: 18 }}>{reached ? "✅" : "🔒"}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Настройки родителя ──────────────────────────────────────
function Settings({ state, setState, onLock }) {
  const [name, setName] = useState(state.name);
  const [rTitle, setRTitle] = useState(state.reward.title);
  const [rCost, setRCost] = useState(state.reward.cost);
  const [pin, setPin] = useState(state.pin);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setState((s) => ({
      ...s,
      name: name.trim() || s.name,
      pin: /^\d{4}$/.test(pin) ? pin : pin === "" ? "" : s.pin,
      reward: { ...s.reward, title: rTitle.trim() || s.reward.title, cost: Math.max(1, Number(rCost) || s.reward.cost) },
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div style={st.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={st.cardTitle}>⚙️ Настройки родителя</div>
        {state.pin && <button style={st.ghostBtnSm} onClick={onLock}>🔒 Закрыть</button>}
      </div>
      <label style={st.label}>Имя ребёнка</label>
      <input style={st.input} value={name} onChange={(e) => setName(e.target.value)} />
      <label style={st.label}>Награда</label>
      <input style={st.input} value={rTitle} onChange={(e) => setRTitle(e.target.value)} placeholder="Например: Поход в кино" />
      <label style={st.label}>Сколько тренировок нужно</label>
      <input style={st.input} type="number" min="1" value={rCost} onChange={(e) => setRCost(e.target.value)} />
      <label style={st.label}>PIN-код (4 цифры, пусто = без PIN)</label>
      <input style={st.input} inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" />
      <button style={{ ...st.claimBtn, marginTop: 14 }} onClick={save}>{saved ? "✅ Сохранено" : "Сохранить"}</button>
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 12, lineHeight: 1.5 }}>
        Когда цель достигнута, на главном экране появится кнопка «Получить награду» — нажмите её вместе с ребёнком, и счётчик начнётся заново.
      </div>
    </div>
  );
}

// ─── Стили ───────────────────────────────────────────────────
const st = {
  app: {
    minHeight: "100vh", maxWidth: 480, margin: "0 auto", position: "relative",
    background: [
      "radial-gradient(110% 46% at 50% -8%, rgba(96,165,250,.20), transparent 60%)",
      "radial-gradient(60% 30% at 100% 18%, rgba(250,204,21,.10), transparent 60%)",
      "radial-gradient(70% 36% at -10% 62%, rgba(251,146,60,.10), transparent 60%)",
      "repeating-linear-gradient(45deg, rgba(255,255,255,.014) 0 2px, transparent 2px 7px)",
      "repeating-linear-gradient(-45deg, rgba(255,255,255,.014) 0 2px, transparent 2px 7px)",
      "linear-gradient(165deg,#0b1d3a 0%,#0e2a5c 45%,#091428 100%)",
    ].join(", "),
    fontFamily: "'Nunito','Segoe UI',system-ui,sans-serif",
    display: "flex", flexDirection: "column",
  },
  scroll: { flex: 1, overflowY: "auto", padding: "16px 14px 90px", display: "flex", flexDirection: "column", gap: 14 },
  header: { display: "flex", alignItems: "center", gap: 12 },
  avatar: {
    width: 62, height: 62, borderRadius: "50%", background: "radial-gradient(circle at 30% 30%,#1e3a6e,#0b1d3a)",
    border: "2.5px solid #facc15", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0,
  },
  lvlBadge: {
    position: "absolute", bottom: -4, right: -4, width: 22, height: 22, borderRadius: "50%",
    color: "#0b1d3a", fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center",
    border: "2px solid #0b1d3a",
  },
  xpBarOuter: { height: 9, borderRadius: 5, background: "rgba(255,255,255,.1)", marginTop: 6, overflow: "hidden" },
  xpBarInner: { height: "100%", borderRadius: 5, background: "linear-gradient(90deg,#facc15,#fb923c)", transition: "width .8s cubic-bezier(.34,1.56,.64,1)" },
  streakBox: {
    background: "rgba(255,255,255,.06)", borderRadius: 14, padding: "8px 12px", textAlign: "center",
    border: "1px solid rgba(250,204,21,.25)", flexShrink: 0,
  },
  heroCard: {
    background: [
      "radial-gradient(90% 70% at 50% 8%, rgba(250,204,21,.14), transparent 65%)",
      "linear-gradient(180deg,rgba(30,58,110,.65),rgba(11,29,58,.85))",
    ].join(", "),
    border: "1px solid rgba(250,204,21,.22)", borderRadius: 22, padding: 16,
    display: "flex", flexDirection: "column", alignItems: "center",
    boxShadow: "0 12px 32px rgba(0,0,0,.35)",
  },
  heroChip: {
    background: "rgba(0,0,0,.3)", borderRadius: 14, padding: "8px 12px",
    display: "flex", flexDirection: "column", alignItems: "center", minWidth: 86,
  },
  bigBtn: {
    background: "linear-gradient(180deg,#fde047,#fbbf24)", color: "#1c1400",
    fontSize: 17, fontWeight: 900, letterSpacing: 0.5, border: "1px solid rgba(255,255,255,.35)",
    borderRadius: 18, padding: "18px 12px", cursor: "pointer",
    boxShadow: "0 12px 28px rgba(250,204,21,.40), inset 0 1px 0 rgba(255,255,255,.6)",
    fontFamily: "inherit",
  },
  bigBtnDone: { background: "rgba(74,222,128,.18)", color: "#4ade80", boxShadow: "none", border: "1px solid rgba(74,222,128,.4)", cursor: "default" },
  compBtn: {
    background: "rgba(255,255,255,.06)", color: "#e2e8f0", fontWeight: 800, fontSize: 14,
    border: "1px solid rgba(250,204,21,.3)", borderRadius: 16, padding: "13px 12px", cursor: "pointer", fontFamily: "inherit",
  },
  dailyBtn: {
    background: "linear-gradient(180deg,#60a5fa,#3b82f6)", color: "#0b1d3a", fontWeight: 900, fontSize: 13,
    border: "none", borderRadius: 12, padding: "10px 12px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
  },
  card: {
    background: "linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.02))",
    border: "1px solid rgba(255,255,255,.10)",
    borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 10,
    boxShadow: "0 10px 28px rgba(0,0,0,.28)",
  },
  cardTitle: { fontSize: 14, fontWeight: 800, color: "#facc15", letterSpacing: 0.4, textTransform: "uppercase" },
  claimBtn: {
    background: "linear-gradient(180deg,#4ade80,#22c55e)", color: "#052e16", fontWeight: 900, fontSize: 15,
    border: "1px solid rgba(255,255,255,.25)", borderRadius: 14, padding: "12px", cursor: "pointer",
    boxShadow: "0 8px 20px rgba(34,197,94,.35), inset 0 1px 0 rgba(255,255,255,.5)",
    fontFamily: "inherit",
  },
  ghostBtn: {
    background: "rgba(255,255,255,.08)", color: "#e2e8f0", fontWeight: 800, fontSize: 15,
    border: "1px solid rgba(255,255,255,.15)", borderRadius: 14, padding: "12px", cursor: "pointer", fontFamily: "inherit",
  },
  ghostBtnSm: {
    background: "rgba(255,255,255,.08)", color: "#e2e8f0", fontWeight: 700, fontSize: 12,
    border: "1px solid rgba(255,255,255,.15)", borderRadius: 10, padding: "6px 10px", cursor: "pointer", fontFamily: "inherit",
  },
  mission: {
    background: "rgba(0,0,0,.25)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16,
    padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
    cursor: "pointer", fontFamily: "inherit", textAlign: "center",
  },
  missionDone: { border: "1px solid rgba(74,222,128,.5)", background: "rgba(74,222,128,.08)" },
  statBox: {
    background: "rgba(0,0,0,.25)", borderRadius: 16, padding: 12, textAlign: "center",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
  },
  achBox: {
    background: "rgba(0,0,0,.25)", borderRadius: 14, padding: "10px 6px", textAlign: "center",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
  },
  calNav: {
    background: "rgba(255,255,255,.08)", border: "none", color: "#fff", width: 32, height: 32,
    borderRadius: 10, fontSize: 18, cursor: "pointer", fontFamily: "inherit",
  },
  label: { fontSize: 12, color: "#94a3b8", fontWeight: 700, marginTop: 6 },
  input: {
    background: "rgba(0,0,0,.3)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12,
    color: "#fff", padding: "11px 12px", fontSize: 15, fontFamily: "inherit", outline: "none",
  },
  nav: {
    position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", zIndex: 2,
    background: "rgba(7,16,33,.95)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(255,255,255,.08)",
    padding: "8px 6px calc(8px + env(safe-area-inset-bottom))",
  },
  navBtn: {
    flex: 1, background: "none", border: "none", color: "#64748b", cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "7px 0",
    borderRadius: 14, fontFamily: "inherit",
  },
  navBtnActive: {
    color: "#facc15",
    background: "linear-gradient(180deg, rgba(250,204,21,.20), rgba(250,204,21,.07))",
    boxShadow: "inset 0 0 0 1px rgba(250,204,21,.30), 0 4px 12px rgba(0,0,0,.25)",
  },
  fxOverlay: {
    position: "absolute", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
    pointerEvents: "none", background: "rgba(5,10,22,.45)", padding: 24,
  },
  fxCard: {
    background: "linear-gradient(180deg,#13294f,#0b1d3a)", border: "2px solid #facc15", borderRadius: 24,
    padding: "26px 34px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    boxShadow: "0 20px 60px rgba(0,0,0,.6)", maxWidth: 320,
  },
  fxXp: { fontSize: 44, fontWeight: 900, color: "#facc15", textShadow: "0 6px 24px rgba(250,204,21,.6)" },
  obCard: {
    background: "rgba(255,255,255,.05)", border: "1px solid rgba(250,204,21,.2)", borderRadius: 24,
    padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center",
  },
  obTitle: { fontSize: 21, fontWeight: 900, color: "#fff" },
  obText: { fontSize: 13.5, color: "#94a3b8", lineHeight: 1.5 },
};

const css = `
@keyframes sh-pop { 0%{transform:scale(.6);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
.sh-pop { animation: sh-pop .5s cubic-bezier(.2,1.4,.4,1) both; }
@keyframes sh-xp { 0%{transform:translateY(30px) scale(.7);opacity:0} 25%{transform:translateY(0) scale(1.1);opacity:1} 70%{transform:translateY(-20px) scale(1);opacity:1} 100%{transform:translateY(-60px);opacity:0} }
.sh-xp { animation: sh-xp 1.7s ease both; }
@keyframes sh-pulse { 0%,100%{box-shadow:0 10px 24px rgba(250,204,21,.35)} 50%{box-shadow:0 10px 36px rgba(250,204,21,.65)} }
.sh-btn-pulse { animation: sh-pulse 2s ease-in-out infinite; }
@keyframes sh-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
.sh-shake { animation: sh-shake .3s ease 2; }
input:disabled, button:disabled { opacity: .5; }
.sh-body { transform-box: fill-box; transform-origin: 50% 95%; animation: sh-breathe 3.2s ease-in-out infinite; }
@keyframes sh-breathe { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.02) translateY(-1px)} }
.sh-hero-jump { animation: sh-hero-jump .65s cubic-bezier(.3,1.6,.4,1) infinite; }
@keyframes sh-hero-jump { 0%,100%{transform:translateY(0)} 40%{transform:translateY(-13px) scaleY(1.04)} 70%{transform:translateY(0) scaleY(.96)} }
.sh-hero-spin { animation: sh-hero-spin 1s ease-in-out infinite; }
@keyframes sh-hero-spin { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-7deg) translateY(-6px)} 75%{transform:rotate(7deg) translateY(-6px)} }
.sh-hero-flex { animation: sh-hero-flex .75s ease; }
@keyframes sh-hero-flex { 0%,100%{transform:scale(1) rotate(0)} 30%{transform:scale(1.08) rotate(-3deg)} 60%{transform:scale(1.05) rotate(3deg)} }
.sh-chest { animation: sh-chest .9s ease both; }
@keyframes sh-chest { 0%{transform:rotate(0)} 15%{transform:rotate(-9deg)} 30%{transform:rotate(9deg)} 45%{transform:rotate(-7deg)} 60%{transform:rotate(7deg) scale(1.06)} 80%{transform:rotate(0) scale(1.18)} 100%{transform:scale(1)} }
.sh-prize { animation: sh-prize 1.4s cubic-bezier(.3,1.5,.4,1) both; }
@keyframes sh-prize { 0%,50%{transform:scale(0) translateY(12px);opacity:0} 75%{transform:scale(1.35) translateY(-6px);opacity:1} 100%{transform:scale(1) translateY(0);opacity:1} }
/* 3D: вход fx-карточек с перспективой */
.sh-fx3d { animation: sh-fx3d .5s cubic-bezier(.2,1.1,.3,1) both; }
@keyframes sh-fx3d { 0%{transform:perspective(700px) rotateX(-22deg) scale(.86);opacity:0} 100%{transform:perspective(700px) rotateX(0) scale(1);opacity:1} }
/* лёгкое парение героя */
.sh-float { animation: sh-float 4.6s ease-in-out infinite; }
@keyframes sh-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
/* 3D: сундук — оборот вокруг оси Y */
.sh-chest3d { animation: sh-chest3d 1.15s cubic-bezier(.3,1.3,.4,1) both; }
@keyframes sh-chest3d { 0%{transform:perspective(600px) rotateY(0) scale(.4);opacity:0} 55%{transform:perspective(600px) rotateY(360deg) scale(1.12);opacity:1} 100%{transform:perspective(600px) rotateY(360deg) scale(1);opacity:1} }
/* 3D: приз — вылет с вращением */
.sh-prize3d { animation: sh-prize3d 1.35s cubic-bezier(.3,1.5,.4,1) both; }
@keyframes sh-prize3d { 0%,45%{transform:perspective(500px) rotateY(200deg) scale(0) translateY(14px);opacity:0} 75%{transform:perspective(500px) rotateY(360deg) scale(1.35) translateY(-6px);opacity:1} 100%{transform:perspective(500px) rotateY(360deg) scale(1) translateY(0);opacity:1} }
/* значок достижения — вылет с оборотом */
.sh-ach-badge { animation: sh-ach-badge .7s cubic-bezier(.3,1.5,.4,1) both; }
@keyframes sh-ach-badge { 0%{transform:perspective(500px) rotateY(180deg) scale(.4);opacity:0} 100%{transform:perspective(500px) rotateY(360deg) scale(1);opacity:1} }
/* вращающееся кольцо уровня */
.sh-ring { animation: sh-ring 3s linear infinite; }
@keyframes sh-ring { to { transform: rotate(360deg) } }
/* контейнер наклона (3D) */
.sh-tilt { transform-style: preserve-3d; transition: transform .25s cubic-bezier(.22,1,.36,1); }
.sh-stagger > * { animation: sh-slidein .45s ease both; }
.sh-stagger > *:nth-child(1){animation-delay:.02s}
.sh-stagger > *:nth-child(2){animation-delay:.07s}
.sh-stagger > *:nth-child(3){animation-delay:.12s}
.sh-stagger > *:nth-child(4){animation-delay:.17s}
.sh-stagger > *:nth-child(5){animation-delay:.22s}
.sh-stagger > *:nth-child(6){animation-delay:.27s}
.sh-stagger > *:nth-child(7){animation-delay:.32s}
.sh-stagger > *:nth-child(8){animation-delay:.37s}
.sh-stagger > *:nth-child(9){animation-delay:.42s}
.sh-stagger > *:nth-child(10){animation-delay:.47s}
@keyframes sh-slidein { 0%{opacity:0;transform:translateY(14px)} 100%{opacity:1;transform:translateY(0)} }
button { transition: transform .12s ease; }
button:active:not(:disabled) { transform: scale(.96); }
@media (prefers-reduced-motion: reduce) { .sh-pop,.sh-xp,.sh-btn-pulse,.sh-shake,.sh-body,.sh-hero-jump,.sh-hero-spin,.sh-hero-flex,.sh-chest,.sh-prize,.sh-fx3d,.sh-float,.sh-chest3d,.sh-prize3d,.sh-ach-badge,.sh-ring,.sh-stagger > * { animation: none; } }
`;
