import { useState, useEffect, useCallback, useRef } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const XP_PER_HABIT       = 40;
const XP_LOSS_PER_DAY    = 20;
const HP_LOSS_PER_DAY    = 15;
const HP_LOSS_UNCOMPLETED= 8;
const STREAK_BONUS_XP    = 15;
const MAX_STREAK_BONUS   = 5;
const HP_PER_HABIT       = 8;
const HP_PER_STREAK_DAY  = 3;
const MAX_STREAK_HP_BONUS= 10;
const HP_STREAK_MILESTONE= 15;

// Solo Leveling palette
const SL = {
  bg0:    "#050510",
  bg1:    "#0a0a1f",
  bg2:    "#0f0f2d",
  panel:  "rgba(10,10,40,0.85)",
  border: "rgba(100,120,255,0.18)",
  blue:   "#4f8eff",
  purple: "#9b6dff",
  cyan:   "#00e5ff",
  gold:   "#ffd700",
  red:    "#ff3c5a",
  green:  "#00ffaa",
  white:  "#e8eeff",
  dim:    "#3a3a6a",
  dimmer: "#1a1a3a",
};

// ─── INFINITE LEVEL SYSTEM ───────────────────────────────────────────────────
function xpForLevel(n) {
  if (n <= 1) return 0;
  return Math.floor(100 * Math.pow(n - 1, 1.6));
}
function getLevelFromXP(xp) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}
function getLevelInfo(xp) {
  const level = getLevelFromXP(xp);
  const cur = xpForLevel(level);
  const nxt = xpForLevel(level + 1);
  return {
    current: { level, xpNeeded: cur, title: getLevelTitle(level) },
    next:    { level: level + 1, xpNeeded: nxt },
    progress: Math.min(Math.max(((xp - cur) / (nxt - cur)) * 100, 0), 100),
  };
}
function getLevelTitle(l) {
  if (l < 5)   return "E-Rank";
  if (l < 10)  return "D-Rank";
  if (l < 20)  return "C-Rank";
  if (l < 30)  return "B-Rank";
  if (l < 40)  return "A-Rank";
  if (l < 50)  return "S-Rank";
  if (l < 60)  return "National Level";
  if (l < 75)  return "Shadow Monarch";
  if (l < 90)  return "Absolute Being";
  if (l < 100) return "True Monarch";
  if (l < 125) return "Ruler";
  if (l < 150) return "Transcendent";
  if (l < 200) return "Monarch of Monarchs";
  return "The Shadow God";
}

// ─── EVOLUTIONS ──────────────────────────────────────────────────────────────
const EVOLUTIONS = [
  { minLevel:1,   maxLevel:4,   name:"E-Rank Hunter",      emoji:"🪨", color:"#7a8a9a", aura:"rgba(122,138,154,0.25)", rank:"E", description:"Eres un cazador débil. El Sistema acaba de elegirte." },
  { minLevel:5,   maxLevel:9,   name:"D-Rank Hunter",      emoji:"🗡️",  color:"#4fc3f7", aura:"rgba(79,195,247,0.3)",  rank:"D", description:"Tu poder crece. Las mazmorras D te tiemblan." },
  { minLevel:10,  maxLevel:19,  name:"C-Rank Hunter",      emoji:"⚔️",  color:"#81c784", aura:"rgba(129,199,132,0.3)", rank:"C", description:"Los cazadores te respetan. Tu maná fluye con fuerza." },
  { minLevel:20,  maxLevel:29,  name:"B-Rank Hunter",      emoji:"🛡️",  color:"#ab47bc", aura:"rgba(171,71,188,0.35)", rank:"B", description:"Eres élite. Pocas mazmorras pueden contenerte." },
  { minLevel:30,  maxLevel:39,  name:"A-Rank Hunter",      emoji:"💎",  color:"#29b6f6", aura:"rgba(41,182,246,0.4)",  rank:"A", description:"Los reyes del gremio te conocen. Tu sombra asusta." },
  { minLevel:40,  maxLevel:49,  name:"S-Rank Hunter",      emoji:"👑",  color:"#ffd700", aura:"rgba(255,215,0,0.4)",   rank:"S", description:"El rango más alto. Solo los elegidos llegan aquí." },
  { minLevel:50,  maxLevel:59,  name:"National Level",     emoji:"🌩️", color:"#ff7043", aura:"rgba(255,112,67,0.45)", rank:"S+", description:"Una fuerza que puede cambiar el destino de naciones." },
  { minLevel:60,  maxLevel:74,  name:"Shadow Soldier",     emoji:"🌑",  color:"#9c27b0", aura:"rgba(156,39,176,0.5)",  rank:"SH", description:"Surgiste de las sombras. Eres el ejército de uno." },
  { minLevel:75,  maxLevel:89,  name:"Shadow Marshal",     emoji:"⚡",  color:"#00e5ff", aura:"rgba(0,229,255,0.5)",   rank:"SM", description:"Comandas legiones de sombras. El terror eres tú." },
  { minLevel:90,  maxLevel:99,  name:"Shadow Monarch",     emoji:"🦴",  color:"#7c4dff", aura:"rgba(124,77,255,0.55)", rank:"♛", description:"Arise. Eres el Monarca de las Sombras." },
  { minLevel:100, maxLevel:124, name:"Ruler",              emoji:"🌌",  color:"#e040fb", aura:"rgba(224,64,251,0.55)", rank:"R", description:"Los gobernantes del cielo te reconocen como igual." },
  { minLevel:125, maxLevel:149, name:"Absolute Being",     emoji:"🔮",  color:"#18ffff", aura:"rgba(24,255,255,0.6)",  rank:"AB", description:"Creaste el Sistema. Eres el origen del poder." },
  { minLevel:150, maxLevel:199, name:"Monarch of Monarchs",emoji:"🌠",  color:"#ff4081", aura:"rgba(255,64,129,0.6)",  rank:"MoM", description:"Todos los monarcas se inclinan ante ti." },
  { minLevel:200, maxLevel:Infinity, name:"Shadow God",    emoji:"✨",  color:"#ffffff", aura:"rgba(255,255,255,0.7)", rank:"∞", description:"Trasciende el Sistema. Eres el Dios de las Sombras." },
];
function getEvolution(level) {
  return EVOLUTIONS.find(e => level >= e.minLevel && level <= e.maxLevel) || EVOLUTIONS[0];
}
function crossedEvolution(oldLevel, newLevel) {
  const a = getEvolution(oldLevel), b = getEvolution(newLevel);
  return a.name !== b.name ? b : null;
}

// ─── DATE (reset at 00:00 local) ─────────────────────────────────────────────
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function msUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight - now;
}

// ─── STORAGE ─────────────────────────────────────────────────────────────────
function loadState() {
  try { const r = localStorage.getItem("habitrpg_sl1"); if (r) return JSON.parse(r); } catch(_){}
  return null;
}
function saveState(s) {
  try { localStorage.setItem("habitrpg_sl1", JSON.stringify(s)); } catch(_){}
}
const defaultState = () => ({
  xp:0, hp:100, maxHp:100, streak:0,
  lastDate: todayKey(), habits:[], completedToday:{},
  dead:false, log:[], totalDays:1,
});

function applyDayTransition(saved) {
  const today = todayKey();
  if (saved.lastDate === today || saved.dead) return saved;
  const daysPassed = Math.max(1, Math.round(
    (new Date(today) - new Date(saved.lastDate)) / 86400000
  ));
  let { xp, hp, streak, completedToday, habits, log, totalDays } = saved;
  const incompleteCount = habits.filter(h => !completedToday[h.id]).length;
  const allDone = habits.length > 0 && incompleteCount === 0;
  streak = allDone ? streak + 1 : 0;
  const streakHeal = allDone
    ? Math.min(streak, MAX_STREAK_HP_BONUS) * HP_PER_STREAK_DAY + HP_STREAK_MILESTONE : 0;
  const hpLoss = HP_LOSS_PER_DAY * daysPassed + HP_LOSS_UNCOMPLETED * incompleteCount;
  const xpLoss = XP_LOSS_PER_DAY * daysPassed;
  hp = Math.max(0, hp - hpLoss + streakHeal);
  xp = Math.max(0, xp - xpLoss);
  totalDays = (totalDays || 1) + daysPassed;
  const newLog = [
    `📅 Nuevo día (${today}). HP ${-hpLoss}${streakHeal>0?` +${streakHeal} racha`:""}  XP -${xpLoss}`,
    allDone && streak > 0 ? `🔥 ¡Racha ${streak} días! +${streakHeal} HP bonus` : null,
    !allDone && incompleteCount > 0 ? `⚠️ ${incompleteCount} hábitos sin completar ayer` : null,
  ].filter(Boolean);
  return { ...saved, xp, hp, streak, completedToday:{}, lastDate:today,
    dead: hp<=0, log:[...newLog,...(log||[])].slice(0,60), totalDays };
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  const bg = msg.type==="gain"  ? `linear-gradient(135deg,${SL.green},#00c880)`
           : msg.type==="loss"  ? `linear-gradient(135deg,${SL.red},#c0002a)`
           : msg.type==="level" ? `linear-gradient(135deg,${SL.gold},#e6a000)`
           : `linear-gradient(135deg,${SL.blue},${SL.purple})`;
  return (
    <div style={{
      position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)",
      background:bg, color:"#000", padding:"10px 22px", borderRadius:30,
      fontWeight:900, fontSize:13, zIndex:9999,
      boxShadow:`0 0 24px ${SL.blue}66`, whiteSpace:"nowrap",
      animation:"slUp 0.3s ease", fontFamily:"'Rajdhani',sans-serif", letterSpacing:1,
    }}>{msg.text}</div>
  );
}

// ─── RANK BADGE ──────────────────────────────────────────────────────────────
function RankBadge({ rank, color }) {
  return (
    <span style={{
      fontFamily:"'Rajdhani',sans-serif", fontWeight:900, fontSize:10,
      color:"#000", background:color, borderRadius:6,
      padding:"2px 6px", letterSpacing:1,
    }}>{rank}</span>
  );
}

// ─── COUNTDOWN ───────────────────────────────────────────────────────────────
function Countdown() {
  const [secs, setSecs] = useState(Math.floor(msUntilMidnight()/1000));
  useEffect(() => {
    const t = setInterval(() => setSecs(Math.floor(msUntilMidnight()/1000)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = String(Math.floor(secs/3600)).padStart(2,"0");
  const m = String(Math.floor((secs%3600)/60)).padStart(2,"0");
  const s = String(secs%60).padStart(2,"0");
  return <span style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, color:SL.cyan, letterSpacing:2 }}>{h}:{m}:{s}</span>;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function HabitRPG() {
  const [state, setState] = useState(() => {
    const s = loadState();
    return applyDayTransition(s || defaultState());
  });
  const [toast, setToast]           = useState(null);
  const [tab, setTab]               = useState("home");
  const [showAdd, setShowAdd]       = useState(false);
  const [newHabit, setNewHabit]     = useState({ name:"", xp:XP_PER_HABIT, emoji:"⚔️" });
  const [showDead, setShowDead]     = useState(state.dead);
  const [showEvo, setShowEvo]       = useState(null);
  const midnightRef = useRef(null);

  // Auto-reset at midnight
  useEffect(() => {
    const schedule = () => {
      const ms = msUntilMidnight();
      midnightRef.current = setTimeout(() => {
        setState(prev => {
          const next = applyDayTransition({ ...prev, lastDate: "force-reset" });
          saveState(next);
          if (next.dead) setShowDead(true);
          return next;
        });
        schedule();
      }, ms + 500);
    };
    schedule();
    return () => clearTimeout(midnightRef.current);
  }, []);

  const push = (text, type="info") => setToast({ text, type });

  const update = useCallback((fn) => {
    setState(prev => {
      const next = fn(prev);
      const oL = getLevelInfo(prev.xp).current.level;
      const nL = getLevelInfo(next.xp).current.level;
      if (nL > oL) {
        const evo = crossedEvolution(oL, nL);
        setTimeout(() => {
          if (evo) { setShowEvo({ level:nL, evo }); push(`✦ EVOLUCIÓN → ${evo.name}`, "level"); }
          else push(`⚡ LEVEL UP → ${nL}`, "level");
        }, 200);
      }
      saveState(next);
      return next;
    });
  }, []);

  const completeHabit = (habit) => {
    if (state.completedToday[habit.id] || state.dead) return;
    const bonusXp     = Math.min(state.streak, MAX_STREAK_BONUS) * STREAK_BONUS_XP;
    const earned      = habit.xp + bonusXp;
    const streakHp    = Math.min(state.streak, MAX_STREAK_HP_BONUS) * HP_PER_STREAK_DAY;
    update(prev => {
      const nc = { ...prev.completedToday, [habit.id]: true };
      const allDone = prev.habits.every(h => nc[h.id]);
      const mHp  = allDone ? HP_STREAK_MILESTONE : 0;
      const heal = HP_PER_HABIT + streakHp + mHp;
      return {
        ...prev, xp: prev.xp + earned,
        hp: Math.min(prev.maxHp, prev.hp + heal),
        completedToday: nc,
        log: [
          allDone ? `🏆 ¡MISIÓN COMPLETA! +${earned}XP +${heal}HP` : `✅ ${habit.emoji} ${habit.name} +${earned}XP +${heal}HP`,
          ...prev.log
        ].slice(0,60),
      };
    });
    const totalHeal = HP_PER_HABIT + streakHp;
    push(`+${earned} XP  +${totalHeal} HP`, "gain");
  };

  const addHabit = () => {
    if (!newHabit.name.trim()) return;
    const h = { id: Date.now().toString(), name: newHabit.name.trim(), xp: Number(newHabit.xp)||XP_PER_HABIT, emoji: newHabit.emoji||"⚔️" };
    update(prev => ({ ...prev, habits:[...prev.habits, h], log:[`➕ Misión: ${h.emoji} ${h.name}`,...prev.log].slice(0,60) }));
    setNewHabit({ name:"", xp:XP_PER_HABIT, emoji:"⚔️" });
    setShowAdd(false);
    push("Nueva misión registrada", "info");
  };

  const deleteHabit = (id) => update(prev => ({ ...prev, habits: prev.habits.filter(h=>h.id!==id) }));

  const revive = () => {
    update(prev => ({ ...prev, hp:30, xp:Math.max(0,prev.xp-200), streak:0, dead:false,
      log:["💀 Resurrección. -200 XP. El Sistema te da otra oportunidad.",...prev.log].slice(0,60) }));
    setShowDead(false);
    push("Resurrectas... -200 XP", "loss");
  };

  const { current:lvlInfo, next:lvlNext, progress:lvlProgress } = getLevelInfo(state.xp);
  const evo          = getEvolution(lvlInfo.level);
  const completedCnt = Object.keys(state.completedToday).length;
  const totalHabits  = state.habits.length;
  const hpPct        = (state.hp / state.maxHp) * 100;
  const xpToNext     = lvlNext ? lvlNext.xpNeeded - state.xp : 0;
  const streakHpShow = HP_PER_HABIT + Math.min(state.streak, MAX_STREAK_HP_BONUS) * HP_PER_STREAK_DAY;

  const emojis = ["⚔️","🗡️","🛡️","💎","👑","🔮","🌑","⚡","🏃","💪","📚","🧘","🥗","💧","😴","🎯","🧠","✍️","🎨","💻","🌿","🔥","🦴","🌌"];

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Cinzel:wght@700;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:${SL.bg0};}
    @keyframes slUp{from{transform:translateX(-50%) translateY(16px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
    @keyframes slpulse{0%,100%{opacity:.15}50%{opacity:.45}}
    @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
    @keyframes fadeIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
    @keyframes hbeat{0%,100%{transform:scale(1)}15%{transform:scale(1.22)}30%{transform:scale(1)}}
    @keyframes scanline{0%{top:-20%}100%{top:110%}}
    @keyframes borderGlow{0%,100%{box-shadow:0 0 8px ${SL.blue}44}50%{box-shadow:0 0 22px ${SL.blue}99,0 0 40px ${SL.purple}44}}
    @keyframes rankPop{0%{transform:scale(0.6);opacity:0}70%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
    .hab-btn:active{transform:scale(.96);}
    ::-webkit-scrollbar{width:3px;}
    ::-webkit-scrollbar-thumb{background:${SL.dim};border-radius:4px;}
    input::placeholder{color:${SL.dim};}
  `;

  const panelStyle = {
    background: SL.panel,
    border: `1px solid ${SL.border}`,
    borderRadius: 16,
    backdropFilter: "blur(12px)",
  };

  return (
    <>
      <style>{css}</style>
      {/* Scanline overlay */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden", background:`repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.07) 2px,rgba(0,0,0,0.07) 4px)` }}/>
      {/* Grid bg */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
        backgroundImage:`linear-gradient(${SL.border} 1px,transparent 1px),linear-gradient(90deg,${SL.border} 1px,transparent 1px)`,
        backgroundSize:"40px 40px", opacity:0.4 }}/>

      <div style={{ width:"100%", maxWidth:430, minHeight:"100vh", margin:"0 auto",
        background:`linear-gradient(180deg,${SL.bg0} 0%,${SL.bg1} 50%,${SL.bg0} 100%)`,
        fontFamily:"'Rajdhani',sans-serif", color:SL.white,
        position:"relative", zIndex:1, paddingBottom:70 }}>

        {/* ── DEAD SCREEN ── */}
        {showDead && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.97)", zIndex:999,
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            padding:32, animation:"fadeIn 0.5s ease" }}>
            <div style={{ fontSize:80, animation:"float 2s ease-in-out infinite", filter:`drop-shadow(0 0 30px ${SL.red})` }}>💀</div>
            <div style={{ fontFamily:"Cinzel", fontSize:28, color:SL.red, marginTop:16, letterSpacing:4, textAlign:"center" }}>
              GAME OVER
            </div>
            <div style={{ color:SL.dim, marginTop:10, fontSize:13, textAlign:"center", lineHeight:1.7, maxWidth:280 }}>
              Tu cazador ha caído. La negligencia tiene un precio.<br/>El Sistema no perdona la debilidad.
            </div>
            <div style={{ ...panelStyle, padding:"16px 28px", marginTop:24, textAlign:"center",
              border:`1px solid ${SL.red}44` }}>
              <div style={{ fontSize:12, color:SL.red, letterSpacing:2 }}>PENALIZACIÓN DE RESURRECCIÓN</div>
              <div style={{ fontSize:22, fontWeight:700, color:SL.red, marginTop:4 }}>−200 XP · RACHA PERDIDA</div>
            </div>
            <button onClick={revive} style={{
              marginTop:28, padding:"14px 48px",
              background:`linear-gradient(135deg,${SL.red},#800020)`,
              border:`1px solid ${SL.red}`, borderRadius:8, color:"#fff",
              fontFamily:"Cinzel", fontWeight:700, fontSize:15, cursor:"pointer",
              letterSpacing:2, boxShadow:`0 0 30px ${SL.red}66`,
            }}>ARISE</button>
          </div>
        )}

        {/* ── EVOLUTION MODAL ── */}
        {showEvo && (() => {
          const me = showEvo.evo;
          return (
            <div onClick={() => setShowEvo(null)} style={{
              position:"fixed", inset:0, background:"rgba(0,0,0,0.95)",
              zIndex:998, display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center", padding:32,
              animation:"fadeIn 0.4s ease" }}>
              <div style={{ fontFamily:"Cinzel", fontSize:10, color:me.color, letterSpacing:8, marginBottom:12 }}>
                ✦ RANK UP ✦
              </div>
              <div style={{ fontSize:90, animation:"float 1.5s ease-in-out infinite",
                filter:`drop-shadow(0 0 32px ${me.aura})` }}>{me.emoji}</div>
              <div style={{ animation:"rankPop 0.5s ease 0.2s both" }}>
                <RankBadge rank={me.rank} color={me.color} />
              </div>
              <div style={{ fontFamily:"Cinzel", fontSize:24, color:"#fff", marginTop:12, textAlign:"center" }}>
                {me.name}
              </div>
              <div style={{ fontSize:11, color:me.color, marginTop:4, letterSpacing:3 }}>
                LEVEL {showEvo.level} · {me.minLevel}–{me.maxLevel===Infinity?"∞":me.maxLevel}
              </div>
              <p style={{ color:SL.dim, marginTop:14, textAlign:"center", fontStyle:"italic",
                fontSize:13, maxWidth:260, lineHeight:1.7 }}>"{me.description}"</p>
              <p style={{ color:SL.dimmer, marginTop:24, fontSize:11, letterSpacing:2 }}>TAP TO CONTINUE</p>
            </div>
          );
        })()}

        {/* TOAST */}
        {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

        {/* ── HEADER / CHARACTER CARD ── */}
        <div style={{ padding:"18px 16px 0", position:"relative" }}>
          <div style={{ ...panelStyle, padding:18, animation:"borderGlow 4s ease-in-out infinite", position:"relative", overflow:"hidden" }}>
            {/* Scanline sweep */}
            <div style={{ position:"absolute", left:0, right:0, height:"40%",
              background:`linear-gradient(180deg,transparent,${SL.blue}08,transparent)`,
              animation:"scanline 3s linear infinite", pointerEvents:"none" }}/>

            {/* Top row */}
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              {/* Avatar */}
              <div style={{ position:"relative", flexShrink:0 }}>
                <div style={{
                  width:70, height:70, borderRadius:12,
                  background:`linear-gradient(135deg,${SL.bg2},${SL.dimmer})`,
                  border:`2px solid ${evo.color}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:36, animation:"float 3s ease-in-out infinite",
                  boxShadow:`0 0 20px ${evo.aura},inset 0 0 20px rgba(0,0,0,0.5)`,
                }}>{evo.emoji}</div>
                {state.streak > 0 && (
                  <div style={{ position:"absolute", top:-8, right:-8,
                    background:`linear-gradient(135deg,${SL.gold},#c8a000)`,
                    borderRadius:8, padding:"2px 7px", fontSize:10, fontWeight:700, color:"#000" }}>
                    🔥{state.streak}
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <RankBadge rank={evo.rank} color={evo.color} />
                  <span style={{ fontSize:11, color:SL.dim }}>Lv.{lvlInfo.level}</span>
                  <span style={{ fontSize:11, color:SL.dim }}>·</span>
                  <span style={{ fontSize:11, color:SL.dim }}>{lvlInfo.title}</span>
                </div>
                <div style={{ fontFamily:"Cinzel", fontSize:17, fontWeight:900, color:"#fff", lineHeight:1.2 }}>
                  {evo.name}
                </div>
                <div style={{ fontSize:11, color:SL.dim, marginTop:3 }}>
                  {state.totalDays||1} días · {state.xp.toLocaleString()} XP total
                </div>
              </div>

              {/* Reset countdown */}
              <div style={{ flexShrink:0, textAlign:"right" }}>
                <div style={{ fontSize:9, color:SL.dim, letterSpacing:2, marginBottom:2 }}>RESET</div>
                <Countdown />
              </div>
            </div>

            {/* HP */}
            <div style={{ marginTop:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:11, fontWeight:700, color:SL.red }}>
                  ❤ HP  {state.hp} / {state.maxHp}
                </span>
                <span style={{ fontSize:10, color: hpPct<30 ? SL.red : hpPct<60 ? SL.gold : SL.green }}>
                  {hpPct<30 ? "⚠ CRITICAL" : hpPct<60 ? "▲ CAUTION" : "● STABLE"}
                </span>
              </div>
              <div style={{ height:8, background:SL.dimmer, borderRadius:4, overflow:"hidden",
                boxShadow:`0 0 6px ${SL.red}44` }}>
                <div style={{
                  height:"100%", width:`${hpPct}%`,
                  background: hpPct<30 ? `linear-gradient(90deg,#8b0000,${SL.red})` :
                               hpPct<60 ? `linear-gradient(90deg,#7a5000,${SL.gold})` :
                               `linear-gradient(90deg,#004d2e,${SL.green})`,
                  borderRadius:4, transition:"width 0.5s ease",
                  animation: hpPct<30 ? "hbeat 1s ease-in-out infinite" : "none",
                  boxShadow: `0 0 8px ${hpPct<30?SL.red:hpPct<60?SL.gold:SL.green}88`,
                }}/>
              </div>
            </div>

            {/* XP */}
            <div style={{ marginTop:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:11, fontWeight:700, color:SL.blue }}>⚡ XP  {state.xp.toLocaleString()}</span>
                <span style={{ fontSize:10, color:SL.dim }}>{xpToNext.toLocaleString()} → Lv.{lvlNext?.level}</span>
              </div>
              <div style={{ height:6, background:SL.dimmer, borderRadius:4, overflow:"hidden" }}>
                <div style={{
                  height:"100%", width:`${lvlProgress}%`,
                  background:`linear-gradient(90deg,${SL.blue},${SL.purple},${SL.cyan})`,
                  backgroundSize:"200% auto", borderRadius:4,
                  animation:"shimmer 2.5s linear infinite",
                  boxShadow:`0 0 8px ${SL.blue}88`,
                  transition:"width 0.6s ease",
                }}/>
              </div>
            </div>

            {/* Daily dots */}
            {totalHabits > 0 && (
              <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8,
                background:"rgba(0,0,0,0.3)", borderRadius:10, padding:"7px 12px" }}>
                <span style={{ fontSize:10, color:SL.dim, flex:1, letterSpacing:1 }}>MISIONES HOY</span>
                <div style={{ display:"flex", gap:5 }}>
                  {state.habits.map(h => (
                    <div key={h.id} style={{
                      width:7, height:7, borderRadius:"50%",
                      background: state.completedToday[h.id] ? SL.green : SL.dimmer,
                      boxShadow: state.completedToday[h.id] ? `0 0 6px ${SL.green}` : "none",
                      transition:"all 0.3s",
                    }}/>
                  ))}
                </div>
                <span style={{ fontSize:11, fontWeight:700,
                  color: completedCnt===totalHabits ? SL.green : SL.dim }}>
                  {completedCnt}/{totalHabits}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── TAB CONTENT ── */}
        <div style={{ padding:"14px 16px" }}>

          {/* HOME */}
          {tab === "home" && (
            <div>
              {/* Stats row */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
                {[
                  { label:"RACHA",   val:`${state.streak}🔥`, color:SL.gold   },
                  { label:"NIVEL",   val:lvlInfo.level,        color:SL.blue   },
                  { label:"DÍAS",    val:state.totalDays||1,   color:SL.cyan   },
                ].map(s => (
                  <div key={s.label} style={{ ...panelStyle, padding:"10px 8px", textAlign:"center" }}>
                    <div style={{ fontSize:20, fontWeight:700, color:s.color, fontFamily:"Cinzel" }}>{s.val}</div>
                    <div style={{ fontSize:9, color:SL.dim, marginTop:2, letterSpacing:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Habits header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <span style={{ fontFamily:"Cinzel", fontSize:11, color:SL.dim, letterSpacing:3 }}>MISIONES DIARIAS</span>
                <button onClick={() => setTab("habits")} style={{
                  background:"transparent", border:`1px solid ${SL.blue}66`,
                  borderRadius:6, padding:"4px 12px", color:SL.blue,
                  fontSize:11, cursor:"pointer", fontFamily:"Rajdhani", fontWeight:700, letterSpacing:1,
                }}>+ GESTIONAR</button>
              </div>

              {state.habits.length === 0 ? (
                <div style={{ ...panelStyle, padding:28, textAlign:"center",
                  border:`1px dashed ${SL.dim}` }}>
                  <div style={{ fontSize:36 }}>⚔️</div>
                  <p style={{ color:SL.dim, fontSize:13, marginTop:10, letterSpacing:1 }}>
                    EL SISTEMA AGUARDA TUS MISIONES
                  </p>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {state.habits.map(habit => {
                    const done = !!state.completedToday[habit.id];
                    const hpGain = HP_PER_HABIT + Math.min(state.streak, MAX_STREAK_HP_BONUS)*HP_PER_STREAK_DAY;
                    return (
                      <button key={habit.id} className="hab-btn" onClick={() => completeHabit(habit)}
                        disabled={done||state.dead}
                        style={{
                          display:"flex", alignItems:"center", gap:12, padding:"13px 14px",
                          background: done
                            ? `linear-gradient(135deg,rgba(0,255,170,0.08),rgba(0,200,130,0.04))`
                            : "rgba(10,10,30,0.6)",
                          border: done ? `1px solid ${SL.green}55` : `1px solid ${SL.border}`,
                          borderRadius:12, cursor: done?"default":"pointer",
                          transition:"all 0.2s", textAlign:"left", width:"100%",
                          boxShadow: done ? `0 0 12px ${SL.green}22` : "none",
                        }}>
                        <div style={{
                          width:42, height:42, borderRadius:10,
                          background: done
                            ? `linear-gradient(135deg,${SL.green}33,${SL.green}11)`
                            : `linear-gradient(135deg,${SL.blue}22,${SL.purple}11)`,
                          border: done ? `1px solid ${SL.green}66` : `1px solid ${SL.border}`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:20, flexShrink:0,
                          boxShadow: done ? `0 0 10px ${SL.green}44` : "none",
                        }}>
                          {done ? "✓" : habit.emoji}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:14, fontWeight:700,
                            color: done ? SL.green : SL.white,
                            textDecoration: done ? "line-through" : "none",
                            letterSpacing:0.5 }}>
                            {habit.name}
                          </div>
                          <div style={{ fontSize:10, color:SL.dim, marginTop:2, letterSpacing:1 }}>
                            {done ? "COMPLETADO" : `+${habit.xp} XP · +${hpGain} HP${state.streak>0?` (racha activa)`:""}`}
                          </div>
                        </div>
                        {!done && (
                          <div style={{
                            background:`linear-gradient(135deg,${SL.blue}33,${SL.purple}22)`,
                            border:`1px solid ${SL.blue}55`,
                            borderRadius:8, padding:"4px 10px",
                            fontSize:11, fontWeight:700, color:SL.blue, flexShrink:0,
                          }}>+{habit.xp}⚡</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Streak card */}
              {state.streak > 0 && (
                <div style={{ ...panelStyle, padding:"12px 16px", marginTop:12,
                  border:`1px solid ${SL.gold}44`,
                  background:`linear-gradient(135deg,rgba(255,215,0,0.06),rgba(200,160,0,0.03))` }}>
                  <div style={{ fontSize:12, color:SL.gold, fontWeight:700, letterSpacing:2, marginBottom:6 }}>
                    🔥 RACHA ACTIVA · {state.streak} DÍAS
                  </div>
                  <div style={{ fontSize:11, color:SL.dim, display:"flex", flexDirection:"column", gap:3 }}>
                    <span>⚡ +{Math.min(state.streak,MAX_STREAK_BONUS)*STREAK_BONUS_XP} XP bonus por hábito</span>
                    <span>❤ +{streakHpShow} HP por hábito completado</span>
                    <span style={{ color:`${SL.gold}cc` }}>★ +{HP_STREAK_MILESTONE} HP al completar TODOS los hábitos</span>
                  </div>
                </div>
              )}
              {state.streak===0 && state.habits.length>0 && (
                <div style={{ ...panelStyle, padding:"12px 16px", marginTop:12 }}>
                  <div style={{ fontSize:11, color:SL.dim, lineHeight:1.8 }}>
                    <span style={{ color:SL.blue }}>[ Sistema ]</span> Completa todos tus hábitos hoy para iniciar una racha.
                    Cada día de racha aumenta el HP que recuperas por hábito.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HABITS TAB */}
          {tab === "habits" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <span style={{ fontFamily:"Cinzel", fontSize:11, color:SL.dim, letterSpacing:3 }}>MIS MISIONES</span>
                <button onClick={() => setShowAdd(true)} style={{
                  background:`linear-gradient(135deg,${SL.blue},${SL.purple})`,
                  border:"none", borderRadius:8, padding:"8px 16px",
                  color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer",
                  letterSpacing:1, fontFamily:"Rajdhani",
                }}>+ NUEVA MISIÓN</button>
              </div>

              {showAdd && (
                <div style={{ ...panelStyle, padding:18, marginBottom:14, animation:"fadeIn 0.3s ease",
                  border:`1px solid ${SL.blue}44` }}>
                  <div style={{ fontSize:12, color:SL.blue, letterSpacing:2, marginBottom:14 }}>
                    [ REGISTRAR NUEVA MISIÓN ]
                  </div>
                  {/* Emoji */}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:10, color:SL.dim, letterSpacing:2, marginBottom:6 }}>ÍCONO</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {emojis.map(e => (
                        <button key={e} onClick={() => setNewHabit(h=>({...h,emoji:e}))} style={{
                          width:34, height:34, borderRadius:8, fontSize:16,
                          background: newHabit.emoji===e ? `${SL.blue}44` : "rgba(0,0,0,0.4)",
                          border: newHabit.emoji===e ? `1px solid ${SL.blue}` : `1px solid ${SL.border}`,
                          cursor:"pointer", transition:"all 0.15s",
                        }}>{e}</button>
                      ))}
                    </div>
                  </div>
                  <input
                    placeholder="Nombre de la misión..."
                    value={newHabit.name}
                    onChange={e => setNewHabit(h=>({...h,name:e.target.value}))}
                    style={{
                      width:"100%", padding:"11px 14px",
                      background:"rgba(0,0,0,0.5)", border:`1px solid ${SL.border}`,
                      borderRadius:10, color:SL.white, fontSize:14,
                      outline:"none", fontFamily:"Rajdhani", fontWeight:600,
                      marginBottom:10, letterSpacing:0.5,
                    }}
                  />
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:10, color:SL.dim, letterSpacing:2, marginBottom:6 }}>
                      DIFICULTAD: {newHabit.xp} XP
                    </div>
                    <input type="range" min={10} max={100} step={5}
                      value={newHabit.xp}
                      onChange={e => setNewHabit(h=>({...h,xp:Number(e.target.value)}))}
                      style={{ width:"100%", accentColor:SL.blue }} />
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:SL.dimmer }}>
                      <span>E-Rank (10)</span><span>S-Rank (100)</span>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={addHabit} style={{
                      flex:1, padding:"11px",
                      background:`linear-gradient(135deg,${SL.blue},${SL.purple})`,
                      border:"none", borderRadius:10, color:"#fff",
                      fontWeight:700, fontSize:13, cursor:"pointer",
                      fontFamily:"Rajdhani", letterSpacing:1,
                    }}>CONFIRMAR</button>
                    <button onClick={() => setShowAdd(false)} style={{
                      flex:1, padding:"11px", background:"rgba(0,0,0,0.4)",
                      border:`1px solid ${SL.border}`, borderRadius:10, color:SL.dim,
                      fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"Rajdhani",
                    }}>CANCELAR</button>
                  </div>
                </div>
              )}

              {state.habits.length===0 ? (
                <div style={{ ...panelStyle, padding:32, textAlign:"center", border:`1px dashed ${SL.dim}` }}>
                  <div style={{ fontSize:36 }}>📋</div>
                  <p style={{ color:SL.dim, marginTop:10, fontSize:12, letterSpacing:1 }}>
                    EL SISTEMA ESPERA TUS MISIONES
                  </p>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {state.habits.map(habit => (
                    <div key={habit.id} style={{ ...panelStyle, display:"flex", alignItems:"center",
                      gap:12, padding:"12px 14px" }}>
                      <div style={{ fontSize:22 }}>{habit.emoji}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:700, letterSpacing:0.5 }}>{habit.name}</div>
                        <div style={{ fontSize:10, color:SL.dim, marginTop:2, letterSpacing:1 }}>
                          +{habit.xp} XP · MISIÓN DIARIA · RESET 00:00
                        </div>
                      </div>
                      <button onClick={() => deleteHabit(habit.id)} style={{
                        background:`rgba(255,60,90,0.1)`, border:`1px solid ${SL.red}44`,
                        borderRadius:8, width:32, height:32, cursor:"pointer",
                        color:SL.red, fontSize:16, fontFamily:"Rajdhani",
                      }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LOG TAB */}
          {tab === "log" && (
            <div>
              <div style={{ fontFamily:"Cinzel", fontSize:11, color:SL.dim, letterSpacing:3, marginBottom:14 }}>
                REGISTRO DEL SISTEMA
              </div>
              {state.log.length===0 ? (
                <div style={{ textAlign:"center", color:SL.dimmer, padding:32, fontSize:12, letterSpacing:2 }}>
                  [ SIN REGISTROS ]
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {state.log.map((entry,i) => (
                    <div key={i} style={{
                      background:"rgba(0,0,0,0.4)", border:`1px solid ${SL.border}`,
                      borderRadius:10, padding:"9px 14px",
                      fontSize:11, color:SL.dim, fontFamily:"Rajdhani", letterSpacing:0.5,
                    }}>{entry}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LEVELS TAB */}
          {tab === "levels" && (
            <div>
              <div style={{ fontFamily:"Cinzel", fontSize:11, color:SL.dim, letterSpacing:3, marginBottom:4 }}>
                ÁRBOL DE EVOLUCIONES
              </div>
              <div style={{ fontSize:11, color:SL.dimmer, marginBottom:14 }}>
                Nivel actual: {lvlInfo.level} · {state.xp.toLocaleString()} XP
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {EVOLUTIONS.map((e,i) => {
                  const unlocked = lvlInfo.level >= e.minLevel;
                  const current  = lvlInfo.level >= e.minLevel && lvlInfo.level <= e.maxLevel;
                  const range    = e.maxLevel===Infinity ? `Nv. ${e.minLevel}+` : `Nv. ${e.minLevel}–${e.maxLevel}`;
                  return (
                    <div key={i} style={{
                      display:"flex", alignItems:"center", gap:12,
                      background: current
                        ? `linear-gradient(135deg,${e.color}12,${e.color}05)`
                        : unlocked ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.15)",
                      border: current ? `1px solid ${e.color}55`
                            : unlocked ? `1px solid ${SL.border}` : `1px solid ${SL.dimmer}44`,
                      borderRadius:14, padding:"12px 14px", position:"relative",
                    }}>
                      {current && (
                        <div style={{ position:"absolute", top:6, right:10,
                          fontSize:8, color:e.color, letterSpacing:3, fontWeight:700 }}>ACTUAL</div>
                      )}
                      <div style={{ fontSize:28, opacity:unlocked?1:0.18,
                        filter:current?`drop-shadow(0 0 10px ${e.aura})`:"none",
                        animation:current?"float 3s ease-in-out infinite":"none", flexShrink:0 }}>
                        {unlocked ? e.emoji : "🔒"}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                          {unlocked && <RankBadge rank={e.rank} color={e.color} />}
                          <span style={{ fontSize:13, fontWeight:700,
                            color:current?e.color:unlocked?"#8a9abb":SL.dimmer }}>
                            {e.name}
                          </span>
                        </div>
                        <div style={{ fontSize:10, color:SL.dimmer, letterSpacing:1 }}>{range}</div>
                        {current && (
                          <div style={{ fontSize:10, color:SL.dim, marginTop:4, fontStyle:"italic" }}>
                            "{e.description}"
                          </div>
                        )}
                      </div>
                      {!unlocked && (
                        <div style={{ fontSize:10, color:SL.dimmer, fontWeight:700, flexShrink:0 }}>
                          {xpForLevel(e.minLevel).toLocaleString()} XP
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ ...panelStyle, marginTop:12, padding:"12px 16px",
                border:`1px solid ${SL.blue}33` }}>
                <div style={{ fontSize:11, color:SL.blue, letterSpacing:2, fontWeight:700 }}>
                  ∞ NIVELES INFINITOS
                </div>
                <div style={{ fontSize:10, color:SL.dimmer, marginTop:4, lineHeight:1.7 }}>
                  El Sistema no tiene techo. La última evolución se mantiene a partir del Nv. 200.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── BOTTOM NAV ── */}
        <div style={{
          position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
          width:"100%", maxWidth:430,
          background:"rgba(5,5,16,0.97)",
          borderTop:`1px solid ${SL.border}`,
          backdropFilter:"blur(20px)",
          display:"grid", gridTemplateColumns:"repeat(4,1fr)", zIndex:100,
        }}>
          {[
            { id:"home",   icon:"🏠", label:"INICIO"   },
            { id:"habits", icon:"⚔️",  label:"MISIONES" },
            { id:"levels", icon:"👑",  label:"RANGOS"   },
            { id:"log",    icon:"📜",  label:"LOG"      },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display:"flex", flexDirection:"column", alignItems:"center",
              justifyContent:"center", padding:"10px 4px",
              background:"none", border:"none", cursor:"pointer",
              borderTop: tab===t.id ? `2px solid ${SL.blue}` : "2px solid transparent",
              transition:"all 0.2s",
            }}>
              <span style={{ fontSize:18 }}>{t.icon}</span>
              <span style={{ fontSize:9, marginTop:3, fontFamily:"Rajdhani", fontWeight:700,
                letterSpacing:2, color: tab===t.id ? SL.blue : SL.dimmer }}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
