import { useState, useEffect, useRef } from "react";

// ─── Telegram WebApp + API ───────────────────────────────────
const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;
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
  { id: "s3",   icon: "🔥", title: "Начало пути",           desc: "Серия 3 дня подряд",       cond: (c) => c.streak >= 3 },
  { id: "s7",   icon: "⚙️", title: "Железная дисциплина",   desc: "Серия 7 дней подряд",      cond: (c) => c.streak >= 7 },
  { id: "s14",  icon: "🐅", title: "Тигр ковра",            desc: "Серия 14 дней подряд",     cond: (c) => c.streak >= 14 },
  { id: "s30",  icon: "👑", title: "Легенда зала",          desc: "Серия 30 дней подряд",     cond: (c) => c.streak >= 30 },
  { id: "l2",   icon: "🟡", title: "Жёлтый пояс",           desc: "Достигнут уровень «Боец»", cond: (c) => c.levelIdx >= 1 },
  { id: "l3",   icon: "🟠", title: "Оранжевый пояс",        desc: "Достигнут уровень «Воин»", cond: (c) => c.levelIdx >= 2 },
  { id: "l4",   icon: "🟢", title: "Зелёный пояс",          desc: "Уровень «Чемпион»",        cond: (c) => c.levelIdx >= 3 },
  { id: "l5",   icon: "🔵", title: "Синий пояс",            desc: "Уровень «Мастер»",         cond: (c) => c.levelIdx >= 4 },
  { id: "c1",   icon: "🥇", title: "Первый бой",            desc: "Первое соревнование",      cond: (c) => c.comps >= 1 },
  { id: "c5",   icon: "🏟️", title: "Турнирный боец",        desc: "5 соревнований",           cond: (c) => c.comps >= 5 },
];
const XP_COMPETITION = 100;
const XP_DAILY = 15;
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
function getStreak(trainings) {
  const set = new Set(trainings);
  let streak = 0;
  const d = new Date();
  if (!set.has(dateToStr(d))) d.setDate(d.getDate() - 1);
  while (set.has(dateToStr(d))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}
function getBestStreak(trainings) {
  const sorted = [...trainings].sort();
  let best = 0, cur = 0, prev = null;
  for (const s of sorted) {
    const d = new Date(s + "T00:00:00");
    cur = prev && d - prev === 86400000 ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = d;
  }
  return best;
}
function checkNewAchievements(ctx, unlocked) {
  return ACHIEVEMENTS.filter((a) => !unlocked.includes(a.id) && a.cond(ctx));
}
function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

// ─── SVG-персонаж (пояс + экипировка растут с прогрессом) ────
function SamboCharacter({ beltColor, size = 150, glow = false, gear = {} }) {
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 160 200" style={glow ? { filter: "drop-shadow(0 0 18px rgba(250,204,21,.45))" } : undefined}>
      {/* золотая аура Мастера */}
      {gear.aura && (
        <ellipse cx="80" cy="105" rx="72" ry="92" fill="none" stroke="#facc15" strokeWidth="3" opacity=".5" strokeDasharray="6 8" />
      )}
      {/* тень */}
      <ellipse cx="80" cy="192" rx="44" ry="7" fill="rgba(0,0,0,.35)" />
      {/* ноги */}
      <rect x="58" y="148" width="16" height="38" rx="7" fill="#1e3a8a" />
      <rect x="86" y="148" width="16" height="38" rx="7" fill="#1e3a8a" />
      {/* ступни: борцовки за 25 тренировок */}
      <ellipse cx="66" cy="188" rx="12" ry="6" fill={gear.boots ? "#dc2626" : "#0f172a"} />
      <ellipse cx="94" cy="188" rx="12" ry="6" fill={gear.boots ? "#dc2626" : "#0f172a"} />
      {gear.boots && (
        <>
          <path d="M58 186 l16 0 M86 186 l16 0" stroke="#fff" strokeWidth="1.5" opacity=".8" />
          <path d="M62 183 l8 0 M90 183 l8 0" stroke="#fff" strokeWidth="1.2" opacity=".6" />
        </>
      )}
      {/* шорты */}
      <path d="M54 128 h52 v18 q0 6 -6 6 h-40 q-6 0 -6 -6 z" fill="#2563eb" />
      {/* куртка (самбовка) */}
      <path d="M52 70 q28 -14 56 0 l6 52 q-34 12 -68 0 z" fill="#dc2626" />
      {/* V-ворот */}
      <path d="M80 68 l-12 26 12 14 12 -14 z" fill="#fff" opacity=".92" />
      <path d="M80 68 l-12 26 12 14 12 -14 z" fill="none" stroke="#b91c1c" strokeWidth="2.5" />
      {/* нашивка-звезда за первое соревнование */}
      {gear.patch && (
        <path d="M62 84 l1.8 3.6 4 .6 -2.9 2.8 .7 4 -3.6 -1.9 -3.6 1.9 .7 -4 -2.9 -2.8 4 -.6 z" fill="#facc15" stroke="#b45309" strokeWidth=".8" />
      )}
      {/* руки на поясе */}
      <path d="M52 76 q-18 14 -10 36 q4 8 14 4 l8 -10" fill="#dc2626" />
      <path d="M108 76 q18 14 10 36 q-4 8 -14 4 l-8 -10" fill="#dc2626" />
      {/* кисти: перчатки за серию 14 */}
      <circle cx="62" cy="112" r={gear.gloves ? 8.5 : 7.5} fill={gear.gloves ? "#1d4ed8" : "#f1c197"} stroke={gear.gloves ? "#0b1d3a" : "none"} strokeWidth={gear.gloves ? 1.5 : 0} />
      <circle cx="98" cy="112" r={gear.gloves ? 8.5 : 7.5} fill={gear.gloves ? "#1d4ed8" : "#f1c197"} stroke={gear.gloves ? "#0b1d3a" : "none"} strokeWidth={gear.gloves ? 1.5 : 0} />
      {/* пояс — цвет уровня */}
      <rect x="50" y="114" width="60" height="11" rx="5" fill={beltColor} stroke="rgba(0,0,0,.25)" strokeWidth="1.5" />
      <rect x="74" y="113" width="12" height="13" rx="3" fill={beltColor} stroke="rgba(0,0,0,.35)" strokeWidth="1.5" />
      <path d="M76 126 l-7 16 M84 126 l7 16" stroke={beltColor} strokeWidth="6" strokeLinecap="round" />
      {/* шея и голова */}
      <rect x="73" y="56" width="14" height="14" rx="6" fill="#f1c197" />
      <circle cx="80" cy="40" r="24" fill="#f6cda4" />
      {/* волосы */}
      <path d="M56 38 q2 -26 24 -26 q22 0 24 26 q-6 -12 -24 -12 q-18 0 -24 12z" fill="#5b3a1e" />
      <path d="M58 30 q8 -10 22 -10 q14 0 22 10 q-4 -4 -22 -4 q-18 0 -22 4z" fill="#6f4a26" />
      {/* лицо */}
      <circle cx="71" cy="40" r="3" fill="#1f2937" />
      <circle cx="89" cy="40" r="3" fill="#1f2937" />
      <path d="M70 33 q1.5 -3 6 -2 M84 31 q4.5 -1 6 2" stroke="#3f2a14" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M72 51 q8 6 16 0" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="64" cy="47" r="3.5" fill="#f9a8a8" opacity=".55" />
      <circle cx="96" cy="47" r="3.5" fill="#f9a8a8" opacity=".55" />
    </svg>
  );
}

// ─── Приложение ──────────────────────────────────────────────
export default function SamboHero() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("home");
  const [fxQueue, setFxQueue] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [compOpen, setCompOpen] = useState(false);
  const [welcomeBack, setWelcomeBack] = useState(false);
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
    (async () => {
      try {
        const data = await apiState("GET");
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
      } catch (e) { /* оффлайн или первый запуск */ }
      setLoaded(true);
    })();
  }, []);

  // сохранение на сервер (с дебаунсом)
  useEffect(() => {
    if (!loaded) return;
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
      if (fxQueue[0].type === "xp") tg?.HapticFeedback?.impactOccurred("medium");
      else tg?.HapticFeedback?.notificationOccurred("success");
    } catch (e) {}
    const dur = { xp: 1700, levelup: 2800, achievement: 2500, chest: 2800 }[fxQueue[0].type] || 2000;
    const t = setTimeout(() => setFxQueue((q) => q.slice(1)), dur);
    return () => clearTimeout(t);
  }, [fxQueue]);

  const level = getLevel(state.xp);
  const streak = getStreak(state.trainings);
  const bestStreak = getBestStreak(state.trainings);
  const trainedToday = state.trainings.includes(todayStr());
  const rewardProgress = Math.min(state.trainings.length - state.reward.claimed, state.reward.cost);
  const rewardReady = rewardProgress >= state.reward.cost;
  const dayIdx = Math.floor(new Date().setHours(0, 0, 0, 0) / 86400000) % DAILY_CHALLENGES.length;
  const daily = DAILY_CHALLENGES[dayIdx];
  const dailyDoneToday = state.dailyDone.includes(todayStr());
  const gear = {
    boots: state.trainings.length >= 25,
    gloves: getBestStreak(state.trainings) >= 14,
    patch: state.competitions.length >= 1,
    aura: level.idx >= 4,
  };
  const titleToday = state.titleDay && state.titleDay.date === todayStr() ? state.titleDay.text : null;

  const applyXp = (s, amount, extraCtx = {}) => {
    const newXp = s.xp + amount;
    const before = getLevel(s.xp).idx;
    const after = getLevel(newXp).idx;
    const ctx = { total: s.trainings.length, streak: getStreak(s.trainings), levelIdx: after, comps: s.competitions.length, ...extraCtx };
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
    const { newXp, newAchs, queue } = applyXp(state, XP_PER_TRAINING + bonus, { total: newTrainings.length, streak: getStreak(newTrainings) });
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
      const ctx = { total: s.trainings.length, streak: getStreak(s.trainings), levelIdx: after, comps: s.competitions.length };
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

  const claimReward = () =>
    setState((s) => ({ ...s, reward: { ...s.reward, claimed: s.reward.claimed + s.reward.cost } }));

  if (!loaded)
    return (
      <div style={{ ...st.app, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ color: "#facc15", fontSize: 18, fontWeight: 700 }}>🥋 Загрузка…</div>
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

      {/* ── Эффекты ── */}
      {fx && (
        <div style={st.fxOverlay}>
          {fx.type === "levelup" ? (
            <div className="sh-pop" style={st.fxCard}>
              <SamboCharacter beltColor={fx.level.beltColor} size={100} glow />
              <div style={{ fontSize: 24, fontWeight: 900, color: "#facc15", letterSpacing: 1 }}>НОВЫЙ УРОВЕНЬ!</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: "#fff" }}>{fx.level.name}</div>
              <div style={{ color: "#cbd5e1", fontSize: 13 }}>Новый пояс: {fx.level.belt}</div>
            </div>
          ) : fx.type === "chest" ? (
            <div className="sh-pop" style={st.fxCard}>
              <div style={{ fontSize: 50 }}>🎁</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fb923c", letterSpacing: 2 }}>СУНДУК-СЮРПРИЗ!</div>
              <div style={{ fontSize: 40 }}>{fx.chest.icon}</div>
              <div style={{ fontSize: 17, fontWeight: 900, color: "#facc15", textAlign: "center" }}>{fx.chest.text}</div>
            </div>
          ) : fx.type === "achievement" ? (
            <div className="sh-pop" style={st.fxCard}>
              <div style={{ fontSize: 54 }}>{fx.ach.icon}</div>
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
      <div style={st.scroll}>
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
                  {level.next ? `${state.xp} / ${level.next.xp} XP до уровня «${level.next.name}»` : `${state.xp} XP — максимум!`}
                </div>
              </div>
              <div style={st.streakBox}>
                <div style={{ fontSize: 22 }}>🔥</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{streak}</div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>серия</div>
              </div>
            </div>

            {/* Герой */}
            <div style={st.heroCard}>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                <div style={st.heroChip}>
                  <div style={{ fontSize: 20 }}>⭐</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#facc15" }}>+{XP_PER_TRAINING} XP</div>
                  <div style={{ fontSize: 10, color: "#cbd5e1" }}>за тренировку</div>
                </div>
                <div style={st.heroChip}>
                  <div style={{ width: 34, height: 10, borderRadius: 5, background: level.cur.beltColor, margin: "5px 0" }} />
                  <div style={{ fontSize: 10, color: "#cbd5e1" }}>Твой пояс</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: level.cur.beltColor }}>{level.cur.belt}</div>
                </div>
              </div>
              <SamboCharacter beltColor={level.cur.beltColor} size={140} gear={gear} />
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", textAlign: "center", marginTop: 4 }}>
                {state.trainings.length === 0
                  ? "Твой путь начинается сегодня!"
                  : <>Ты стал сильнее на <span style={{ color: "#ef4444" }}>{state.trainings.length}</span> {plural(state.trainings.length, "тренировку", "тренировки", "тренировок")}!</>}
              </div>
            </div>

            <button
              className={trainedToday ? "" : "sh-btn-pulse"}
              onClick={() => setConfirmOpen(true)}
              disabled={trainedToday}
              style={{ ...st.bigBtn, ...(trainedToday ? st.bigBtnDone : {}) }}
            >
              {trainedToday ? "✅ Тренировка засчитана!" : "✔  Я БЫЛ НА ТРЕНИРОВКЕ"}
            </button>

            <button style={st.compBtn} onClick={() => setCompOpen(true)}>
              🏆 Я участвовал в соревновании <span style={{ color: "#facc15" }}>+{XP_COMPETITION} XP</span>
            </button>

            {/* Испытание дня */}
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
                      <div style={{ fontSize: 10, color: done ? "#4ade80" : "#facc15", fontWeight: 800 }}>{done ? "✅ +" + m.xp + " XP" : "+" + m.xp + " XP"}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {tab === "calendar" && (
          <Calendar trainings={state.trainings} competitions={state.competitions} bestStreak={bestStreak} streak={streak} calMonth={calMonth} setCalMonth={setCalMonth} />
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
            <div style={{ fontSize: 20 }}>{t.icon}</div>
            <div style={{ fontSize: 10, fontWeight: 700 }}>{t.label}</div>
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
function Calendar({ trainings, competitions = [], bestStreak, streak, calMonth, setCalMonth }) {
  const set = new Set(trainings);
  const compSet = new Set(competitions.map((c) => c.date));
  const { y, m } = calMonth;
  const offset = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = todayStr();
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
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ textAlign: "center", fontSize: 11, color: "#64748b", fontWeight: 700 }}>{w}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const trained = set.has(ds);
          const comp = compSet.has(ds);
          const isToday = ds === today;
          return (
            <div key={i} style={{
              aspectRatio: "1", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12.5, fontWeight: 700,
              background: comp ? "#facc15" : trained ? "#22c55e" : "rgba(255,255,255,.06)",
              color: comp ? "#422006" : trained ? "#052e16" : "#cbd5e1",
              border: isToday ? "2px solid #facc15" : "2px solid transparent",
            }}>{d}</div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 14, fontSize: 12.5, color: "#cbd5e1", fontWeight: 700, flexWrap: "wrap" }}>
        <div>🟢 тренировка</div>
        <div>🟡 соревнование</div>
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
    { key: "gloves", icon: "🧤", name: "Перчатки", how: "серия 14 дней" },
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
                <div style={{ fontSize: 9.5, color: "#64748b" }}>{got ? "Надето на героя!" : "🔒 " + g.how}</div>
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
                <div style={{ fontSize: 10, fontWeight: 800, color: got ? "#60a5fa" : "#94a3b8", lineHeight: 1.2 }}>{t.name}</div>
                <div style={{ fontSize: 9 }}>{got ? "✅" : "➕ изучить"}</div>
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
                <div style={{ fontSize: 10.5, fontWeight: 800, color: got ? "#facc15" : "#94a3b8", lineHeight: 1.2 }}>{a.title}</div>
                <div style={{ fontSize: 9, color: "#64748b", lineHeight: 1.2 }}>{got ? a.desc : "🔒 " + a.desc}</div>
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
    background: "linear-gradient(165deg,#0b1d3a 0%,#0e2a5c 45%,#091428 100%)",
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
  xpBarInner: { height: "100%", borderRadius: 5, background: "linear-gradient(90deg,#facc15,#fb923c)", transition: "width .6s ease" },
  streakBox: {
    background: "rgba(255,255,255,.06)", borderRadius: 14, padding: "8px 12px", textAlign: "center",
    border: "1px solid rgba(250,204,21,.25)", flexShrink: 0,
  },
  heroCard: {
    background: "linear-gradient(180deg,rgba(30,58,110,.65),rgba(11,29,58,.85))",
    border: "1px solid rgba(250,204,21,.18)", borderRadius: 22, padding: 16,
    display: "flex", flexDirection: "column", alignItems: "center",
    boxShadow: "0 12px 32px rgba(0,0,0,.35)",
  },
  heroChip: {
    background: "rgba(0,0,0,.3)", borderRadius: 14, padding: "8px 12px",
    display: "flex", flexDirection: "column", alignItems: "center", minWidth: 86,
  },
  bigBtn: {
    background: "linear-gradient(180deg,#fde047,#facc15)", color: "#1c1400",
    fontSize: 17, fontWeight: 900, letterSpacing: 0.5, border: "none", borderRadius: 18,
    padding: "18px 12px", cursor: "pointer", boxShadow: "0 10px 24px rgba(250,204,21,.35)",
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
    background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: 800, color: "#facc15", letterSpacing: 0.4, textTransform: "uppercase" },
  claimBtn: {
    background: "linear-gradient(180deg,#4ade80,#22c55e)", color: "#052e16", fontWeight: 900, fontSize: 15,
    border: "none", borderRadius: 14, padding: "12px", cursor: "pointer", fontFamily: "inherit",
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
    position: "absolute", bottom: 0, left: 0, right: 0, display: "flex",
    background: "rgba(7,16,33,.95)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(255,255,255,.08)",
    padding: "8px 6px calc(8px + env(safe-area-inset-bottom))",
  },
  navBtn: {
    flex: 1, background: "none", border: "none", color: "#64748b", cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 0",
    borderRadius: 12, fontFamily: "inherit",
  },
  navBtnActive: { color: "#facc15", background: "rgba(250,204,21,.1)" },
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
@media (prefers-reduced-motion: reduce) { .sh-pop,.sh-xp,.sh-btn-pulse,.sh-shake { animation: none; } }
`;
