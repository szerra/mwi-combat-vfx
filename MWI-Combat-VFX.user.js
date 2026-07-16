// ==UserScript==
// @name         MWI 戰鬥技能特效
// @namespace    codex.local.mwi.combat-vfx
// @version      0.1.4
// @description  讀條期間顯示法陣，命中後依遊戲持續時間把流血、燃燒等狀態附著在怪物身上；本版不含任何調整介面。
// @author       Local build for gzerr
// @license      MIT
// @icon         https://www.milkywayidle.com/favicon.svg
// @homepageURL  https://github.com/szerra/mwi-combat-vfx
// @updateURL    https://raw.githubusercontent.com/szerra/mwi-combat-vfx/refs/heads/main/MWI-Combat-VFX.user.js
// @downloadURL  https://raw.githubusercontent.com/szerra/mwi-combat-vfx/refs/heads/main/MWI-Combat-VFX.user.js
// @match        https://www.milkywayidle.com/*
// @match        https://test.milkywayidle.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const VERSION = "0.1.4";
  const CANVAS_ID = "mwiCombatVfxCanvas014";
  const WS_HOSTS = ["api.milkywayidle.com/ws", "api-test.milkywayidle.com/ws"];

  if (window.__mwiCombatVfx014Installed) return;
  window.__mwiCombatVfx014Installed = true;

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
  const easeInOut = t => 0.5 - Math.cos(Math.PI * clamp(t)) / 2;
  const smoothstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const fadeOut = (p, from = 0.76) => 1 - smoothstep(from, 1, p);
  const rgba = (color, alpha = 1) => `rgba(${color[0]},${color[1]},${color[2]},${clamp(alpha)})`;
  const rand = (seed, index = 0) => {
    const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
    return value - Math.floor(value);
  };
  const qBezier = (a, b, c, t) => {
    const u = 1 - t;
    return {
      x: u * u * a.x + 2 * u * t * b.x + t * t * c.x,
      y: u * u * a.y + 2 * u * t * b.y + t * t * c.y
    };
  };

  const COLORS = {
    white: [225, 244, 255],
    silver: [184, 216, 240],
    cyan: [52, 202, 255],
    water: [45, 168, 255],
    ice: [137, 229, 255],
    fire: [255, 91, 20],
    gold: [255, 190, 54],
    red: [255, 46, 62],
    purple: [177, 72, 255],
    violet: [115, 74, 255],
    green: [71, 222, 126],
    poison: [157, 226, 42],
    teal: [55, 225, 194],
    enemy: [255, 68, 80]
  };

  const PROFILES = {
    autoAttack: { style: "weapon", color: COLORS.white, duration: 720 },
    "/abilities/poke": { style: "poke", color: COLORS.silver, duration: 650 },
    "/abilities/impale": { style: "impale", color: COLORS.white, duration: 820 },
    "/abilities/puncture": { style: "puncture", color: COLORS.gold, duration: 850 },
    "/abilities/penetrating_strike": { style: "penetratingStrike", color: COLORS.red, duration: 850, chain: true },
    "/abilities/scratch": { style: "scratch", color: COLORS.red, duration: 700 },
    "/abilities/cleave": { style: "cleave", color: COLORS.cyan, duration: 900, area: true },
    "/abilities/maim": { style: "maim", color: COLORS.red, duration: 1000 },
    "/abilities/crippling_slash": { style: "cripplingSlash", color: COLORS.purple, duration: 1050, area: true },
    "/abilities/smack": { style: "smack", color: COLORS.gold, duration: 800 },
    "/abilities/sweep": { style: "sweep", color: COLORS.gold, duration: 950, area: true },
    "/abilities/stunning_blow": { style: "stunningBlow", color: COLORS.gold, duration: 1050 },
    "/abilities/fracturing_impact": { style: "fracturingImpact", color: [255, 93, 34], duration: 1100, area: true },
    "/abilities/shield_bash": { style: "shieldBash", color: [87, 180, 255], duration: 900 },

    "/abilities/quick_shot": { style: "quickShot", color: COLORS.white, duration: 620 },
    "/abilities/aqua_arrow": { style: "aquaArrow", color: COLORS.water, duration: 850 },
    "/abilities/flame_arrow": { style: "flameArrow", color: COLORS.fire, duration: 900 },
    "/abilities/rain_of_arrows": { style: "rainOfArrows", color: COLORS.silver, duration: 1200, area: true },
    "/abilities/silencing_shot": { style: "silencingShot", color: COLORS.purple, duration: 950 },
    "/abilities/steady_shot": { style: "steadyShot", color: COLORS.gold, duration: 850 },
    "/abilities/pestilent_shot": { style: "pestilentShot", color: COLORS.poison, duration: 1100 },
    "/abilities/penetrating_shot": { style: "penetratingShot", color: COLORS.cyan, duration: 850, chain: true },

    "/abilities/water_strike": { style: "waterStrike", color: COLORS.water, duration: 1000, magic: true },
    "/abilities/ice_spear": { style: "iceSpear", color: COLORS.ice, duration: 1050, magic: true },
    "/abilities/frost_surge": { style: "frostSurge", color: COLORS.ice, duration: 1250, magic: true, area: true },
    "/abilities/mana_spring": { style: "manaSpring", color: [75, 150, 255], duration: 1300, magic: true, area: true },
    "/abilities/entangle": { style: "entangle", color: COLORS.green, duration: 1150, magic: true },
    "/abilities/toxic_pollen": { style: "toxicPollen", color: COLORS.poison, duration: 1300, magic: true, area: true },
    "/abilities/natures_veil": { style: "naturesVeil", color: COLORS.teal, duration: 1300, magic: true, area: true },
    "/abilities/life_drain": { style: "lifeDrain", color: [208, 45, 123], duration: 1250, magic: true },
    "/abilities/fireball": { style: "fireball", color: COLORS.fire, duration: 1050, magic: true },
    "/abilities/flame_blast": { style: "flameBlast", color: COLORS.fire, duration: 1250, magic: true, area: true },
    "/abilities/firestorm": { style: "firestorm", color: COLORS.fire, duration: 1450, magic: true, area: true },
    "/abilities/smoke_burst": { style: "smokeBurst", color: [132, 78, 205], duration: 1200, magic: true }
  };

  const ATTACK_ABILITIES = new Set(Object.keys(PROFILES));
  const STYLE_ROUTES = Object.freeze({
    weapon: "weapon",
    poke: "thrust", impale: "thrust", puncture: "thrust", penetratingStrike: "thrust",
    scratch: "slash", cleave: "slash", maim: "slash", cripplingSlash: "slash", sweep: "slash",
    smack: "blunt", stunningBlow: "blunt", fracturingImpact: "blunt", shieldBash: "blunt",
    quickShot: "arrow", aquaArrow: "arrow", flameArrow: "arrow", rainOfArrows: "arrow",
    silencingShot: "arrow", steadyShot: "arrow", pestilentShot: "arrow", penetratingShot: "arrow",
    waterStrike: "magic", iceSpear: "magic", frostSurge: "magic", manaSpring: "magic",
    entangle: "magic", toxicPollen: "magic", naturesVeil: "magic", lifeDrain: "magic",
    fireball: "magic", flameBlast: "magic", firestorm: "magic", smokeBurst: "magic"
  });
  const MAGIC_STYLES = new Set([
    "waterStrike", "iceSpear", "frostSurge", "manaSpring", "entangle", "toxicPollen",
    "naturesVeil", "lifeDrain", "fireball", "flameBlast", "firestorm", "smokeBurst"
  ]);

  // Damage is already applied when battle_updated reaches the browser. Start travelling
  // effects near the end of their route so their visible impact follows the HP change closely.
  const TRAJECTORY_IMPACT_DELAY_MS = 80;
  const TRAJECTORY_IMPACT_PHASES = Object.freeze({
    weapon: 0.64,
    arrow: 0.59,
    rainOfArrows: 0.55,
    waterStrike: 0.64,
    iceSpear: 0.64,
    fireball: 0.64,
    smokeBurst: 0.64,
    entangle: 0.62,
    enemyAttack: 0.64
  });

  function trajectoryImpactPhase(profile) {
    if (!profile) return 0;
    if (TRAJECTORY_IMPACT_PHASES[profile.style]) return TRAJECTORY_IMPACT_PHASES[profile.style];
    const route = STYLE_ROUTES[profile.style];
    return TRAJECTORY_IMPACT_PHASES[route] || 0;
  }

  function syncedAttackStartedAt(profile) {
    const phase = trajectoryImpactPhase(profile);
    const duration = Number(profile?.duration) || 0;
    if (!phase || !duration) return performance.now();
    return performance.now() - Math.max(0, duration * phase - TRAJECTORY_IMPACT_DELAY_MS);
  }

  // battle_updated 的精簡封包目前不會附 combatBuffMap，因此命中時先依技能的
  // 固定狀態時間顯示；只要後續收到完整 combatBuffMap，就以伺服器的 startTime
  // 與 duration 為準校正或延長。duration 在遊戲封包中使用奈秒。
  const INFERRED_STATUS_SPECS = Object.freeze({
    "/abilities/maim": [
      { kind: "bleed", duration: 9000 },
      { kind: "vulnerable", duration: 12000 }
    ],
    "/abilities/firestorm": [{ kind: "burn", duration: 6000 }],
    "/abilities/puncture": [{ kind: "armorBreak", duration: 10000 }],
    "/abilities/crippling_slash": [{ kind: "weaken", duration: 12000 }],
    "/abilities/fracturing_impact": [{ kind: "vulnerable", duration: 12000 }],
    "/abilities/ice_spear": [{ kind: "frost", duration: 8000 }],
    "/abilities/frost_surge": [{ kind: "frost", duration: 9000 }],
    "/abilities/pestilent_shot": [{ kind: "corrosion", duration: 12000 }],
    "/abilities/toxic_pollen": [{ kind: "corrosion", duration: 10000 }],
    "/abilities/smoke_burst": [{ kind: "blind", duration: 8000 }]
  });

  for (const [abilityHrid, profile] of Object.entries(PROFILES)) {
    if (!STYLE_ROUTES[profile.style]) {
      console.error(`[MWI Combat VFX ${VERSION}] 技能沒有繪圖路由：${abilityHrid} -> ${profile.style}`);
    }
  }
  let canvas = null;
  let ctx = null;
  let dpr = 1;
  let animationFrame = 0;
  let effectSequence = 0;
  let battleGeneration = 0;
  let activeEffects = [];
  let attachedStatuses = new Map();
  let pageHidden = document.hidden;

  let monsterHp = [];
  let monsterMp = [];
  let monsterAtkCounter = [];
  let monsterDmgCounter = [];
  let monsterCritCounter = [];
  let playerHp = [];
  let playerMp = [];
  let playerAtkCounter = [];
  let playerDmgCounter = [];
  let playerCritCounter = [];
  let playerPreparingAbility = [];
  let pendingMonsterCasts = new Map();

  function ensureCanvas() {
    if (canvas && canvas.isConnected) return true;
    if (!document.body) return false;
    canvas = document.getElementById(CANVAS_ID);
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = CANVAS_ID;
      Object.assign(canvas.style, {
        position: "fixed",
        inset: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: "201"
      });
      document.body.appendChild(canvas);
    }
    ctx = canvas.getContext("2d");
    resizeCanvas();
    return true;
  }

  function resizeCanvas() {
    if (!canvas || !ctx) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(window.innerWidth * dpr));
    const height = Math.max(1, Math.round(window.innerHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function findCombatUnits() {
    const playersArea = document.querySelector('[class*="BattlePanel_playersArea"]');
    const monstersArea = document.querySelector('[class*="BattlePanel_monstersArea"]');
    const visibleUnits = root => root ? Array.from(root.querySelectorAll('[class*="CombatUnit_combatUnit"]')).filter(isVisible) : [];
    let players = visibleUnits(playersArea);
    let monsters = visibleUnits(monstersArea);
    if (!players.length || !monsters.length) {
      const grids = Array.from(document.querySelectorAll('[class*="BattlePanel_combatUnitGrid"]')).filter(isVisible);
      if (!players.length && grids[0]) players = visibleUnits(grids[0]);
      if (!monsters.length && grids[1]) monsters = visibleUnits(grids[1]);
    }
    return { players, monsters };
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function unitAnchor(unit, towardX = null) {
    if (!unit) return null;
    const model = unit.querySelector('[class*="CombatUnit_unitIconContainer"], [class*="CombatUnit_model"]') || unit;
    const modelRect = model.getBoundingClientRect();
    const unitRect = unit.getBoundingClientRect();
    let x = modelRect.left + modelRect.width / 2;
    const y = modelRect.top + modelRect.height * 0.52;
    if (Number.isFinite(towardX)) {
      x += Math.sign(towardX - x) * Math.min(28, modelRect.width * 0.28);
    }
    return {
      x,
      y,
      groundY: Math.min(unitRect.bottom - 12, modelRect.bottom - 4),
      width: modelRect.width,
      height: modelRect.height
    };
  }

  function pathGlow(points, color, alpha, width = 3, blur = 12) {
    if (!ctx || points.length < 2 || alpha <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.shadowColor = rgba(color, alpha);
    ctx.shadowBlur = blur;
    ctx.strokeStyle = rgba(color, alpha * 0.68);
    ctx.lineWidth = width * 2.8;
    ctx.stroke();
    ctx.shadowBlur = blur * 0.45;
    ctx.strokeStyle = rgba(color, alpha);
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = rgba([248, 253, 255], alpha * 0.9);
    ctx.lineWidth = Math.max(0.8, width * 0.28);
    ctx.stroke();
    ctx.restore();
  }

  function ellipseGlow(x, y, rx, ry, color, alpha, width = 2, rotation = 0) {
    if (!ctx || alpha <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rotation, 0, Math.PI * 2);
    ctx.shadowColor = rgba(color, alpha);
    ctx.shadowBlur = 11;
    ctx.strokeStyle = rgba(color, alpha);
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.restore();
  }

  function discGlow(x, y, radius, color, alpha) {
    if (!ctx || alpha <= 0 || radius <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.2);
    gradient.addColorStop(0, rgba([255, 255, 255], alpha));
    gradient.addColorStop(0.28, rgba(color, alpha * 0.85));
    gradient.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function magicCircle(anchor, color, alpha, spin, radius = 33) {
    if (!anchor || alpha <= 0) return;
    ellipseGlow(anchor.x, anchor.groundY, radius, radius * 0.26, color, alpha, 1.6);
    ellipseGlow(anchor.x, anchor.groundY, radius * 0.68, radius * 0.16, color, alpha * 0.75, 1);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = rgba(color, alpha * 0.8);
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const angle = spin + i * Math.PI / 4;
      const x1 = anchor.x + Math.cos(angle) * radius;
      const y1 = anchor.groundY + Math.sin(angle) * radius * 0.26;
      const x2 = anchor.x + Math.cos(angle) * (radius - 7);
      const y2 = anchor.groundY + Math.sin(angle) * (radius - 7) * 0.26;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function verticalRing(anchor, toward, color, alpha, radius = 22) {
    if (!anchor || !toward || alpha <= 0) return;
    const direction = Math.sign(toward.x - anchor.x) || 1;
    ellipseGlow(anchor.x + direction * 25, anchor.y, radius * 0.34, radius, color, alpha, 1.5);
  }

  function drawArrowGlyph(point, angle, color, alpha, scale = 1) {
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(angle);
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = rgba(color, alpha);
    ctx.shadowBlur = 8;
    ctx.strokeStyle = rgba(color, alpha);
    ctx.fillStyle = rgba([240, 252, 255], alpha);
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(-18 * scale, 0);
    ctx.lineTo(9 * scale, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(13 * scale, 0);
    ctx.lineTo(3 * scale, -5 * scale);
    ctx.lineTo(5 * scale, 0);
    ctx.lineTo(3 * scale, 5 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function sparkBurst(target, p, color, seed, count = 18, spread = 42) {
    const local = clamp((p - 0.54) / 0.34);
    const alpha = fadeOut(local, 0.42);
    if (local <= 0 || alpha <= 0) return;
    for (let i = 0; i < count; i++) {
      const angle = rand(seed, i) * Math.PI * 2;
      const distance = spread * easeOut(local) * (0.35 + rand(seed + 7, i) * 0.65);
      const end = { x: target.x + Math.cos(angle) * distance, y: target.y + Math.sin(angle) * distance };
      pathGlow([
        { x: target.x + Math.cos(angle) * distance * 0.45, y: target.y + Math.sin(angle) * distance * 0.45 },
        end
      ], color, alpha * (0.45 + rand(seed + 13, i) * 0.5), 0.8 + rand(seed + 19, i), 4);
    }
    discGlow(target.x, target.y, 7 + 13 * (1 - local), color, alpha);
  }

  function impactRing(target, p, color, seed, radius = 38) {
    const local = clamp((p - 0.52) / 0.4);
    const alpha = fadeOut(local, 0.45);
    if (local <= 0 || alpha <= 0) return;
    ellipseGlow(target.x, target.y, 6 + radius * easeOut(local), 6 + radius * easeOut(local), color, alpha, 1.7);
    sparkBurst(target, p, color, seed, 12, radius);
  }

  function drawDamage(effect, p) {
    if (p < 0.58) return;
    const local = clamp((p - 0.58) / 0.42);
    const alpha = 1 - smoothstep(0.62, 1, local);
    for (const target of effect.targets) {
      if (!(target.damage > 0) && !target.miss) continue;
      const label = target.miss ? "MISS" : String(Math.round(target.damage));
      const size = target.miss ? 17 : clamp(14 + Math.log10(target.damage + 1) * 3.2, 14, 27);
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.font = `800 ${size}px Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(3, size * 0.22);
      ctx.strokeStyle = target.miss ? rgba([53, 64, 82], alpha * 0.96) : rgba(effect.profile.color, alpha * 0.92);
      const y = target.point.y - 29 - easeOut(local) * 19;
      ctx.strokeText(label, target.point.x, y);
      ctx.fillStyle = target.miss
        ? rgba([207, 221, 239], alpha)
        : effect.isCrit ? rgba([255, 220, 86], alpha) : rgba([255, 255, 255], alpha);
      ctx.fillText(label, target.point.x, y);
      ctx.restore();
    }
  }

  function projectileCurve(effect, target, p, height = 28) {
    const travel = easeInOut(clamp((p - 0.16) / 0.48));
    const control = {
      x: (effect.start.x + target.point.x) / 2,
      y: Math.min(effect.start.y, target.point.y) - height
    };
    const points = [];
    const headT = travel;
    const tailT = Math.max(0, headT - 0.25);
    for (let i = 0; i <= 22; i++) points.push(qBezier(effect.start, control, target.point, lerp(tailT, headT, i / 22)));
    return { travel, control, points, head: qBezier(effect.start, control, target.point, headT) };
  }

  function drawWeapon(effect, p) {
    for (const target of effect.targets) {
      const curve = projectileCurve(effect, target, p, 8);
      const alpha = p < 0.67 ? 1 : fadeOut(p, 0.68);
      pathGlow(curve.points, COLORS.white, alpha, 2.4, 9);
      if (curve.travel > 0.04 && curve.travel < 0.98) {
        const angle = Math.atan2(target.point.y - effect.start.y, target.point.x - effect.start.x);
        drawArrowGlyph(curve.head, angle, COLORS.white, alpha, 0.85);
      }
      if (p > 0.52) {
        for (let i = -1; i <= 1; i++) {
          const a = -0.8 + i * 0.36;
          pathGlow([
            { x: target.point.x - Math.cos(a) * 23, y: target.point.y - Math.sin(a) * 23 },
            { x: target.point.x + Math.cos(a) * 23, y: target.point.y + Math.sin(a) * 23 }
          ], COLORS.white, fadeOut(p, 0.70), 2.1, 8);
        }
        impactRing(target.point, p, COLORS.white, effect.seed, 26);
      }
    }
  }

  function drawThrust(effect, p, mode) {
    const targets = mode === "penetratingStrike" ? effect.targets : effect.targets.slice(0, 1);
    const allPoints = [effect.start, ...targets.map(target => target.point)];
    const travel = easeInOut(clamp((p - 0.14) / 0.45));
    const endIndex = (allPoints.length - 1) * travel;
    const idx = Math.min(allPoints.length - 2, Math.floor(endIndex));
    const partial = endIndex - idx;
    const head = {
      x: lerp(allPoints[idx].x, allPoints[idx + 1].x, partial),
      y: lerp(allPoints[idx].y, allPoints[idx + 1].y, partial)
    };
    const width = mode === "poke" ? 1.8 : mode === "impale" ? 5.2 : 3.2;
    pathGlow([effect.start, head], effect.profile.color, fadeOut(p, 0.67), width, 11);
    if (mode === "impale") {
      for (let i = 0; i < 3; i++) ellipseGlow(head.x - i * 13, head.y, 5 + i * 5, 16 + i * 5, COLORS.white, fadeOut(p, 0.64) * 0.7, 1.2);
    }
    for (const target of targets) {
      if (p > 0.50) impactRing(target.point, p, effect.profile.color, effect.seed + target.index * 17, mode === "impale" ? 44 : 30);
      if (mode === "puncture" && p > 0.56) drawCrackedShield(target.point, p, effect.profile.color);
    }
  }

  function drawCrackedShield(point, p, color) {
    const alpha = fadeOut(p, 0.78);
    ctx.save();
    ctx.translate(point.x, point.y - 15);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = rgba(color, alpha);
    ctx.shadowColor = rgba(color, alpha);
    ctx.shadowBlur = 9;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -15); ctx.lineTo(12, -9); ctx.lineTo(9, 9); ctx.lineTo(0, 17); ctx.lineTo(-9, 9); ctx.lineTo(-12, -9); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3, -13); ctx.lineTo(-2, -1); ctx.lineTo(5, 3); ctx.lineTo(-4, 14); ctx.stroke();
    ctx.restore();
  }

  function drawSlash(effect, p, mode) {
    const targets = effect.targets;
    const alpha = fadeOut(p, 0.75);
    if (["cleave", "cripplingSlash", "sweep"].includes(mode)) {
      if (!targets.length) return;
      const sorted = targets.map(t => t.point).sort((a, b) => a.x - b.x);
      const left = sorted[0];
      const right = sorted[sorted.length - 1];
      const span = Math.max(80, right.x - left.x + 74);
      const center = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 + (mode === "cripplingSlash" ? 18 : 3) };
      const progress = easeOut(clamp((p - 0.25) / 0.35));
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = rgba(effect.profile.color, alpha);
      ctx.shadowColor = rgba(effect.profile.color, alpha);
      ctx.shadowBlur = 15;
      ctx.lineCap = "round";
      ctx.lineWidth = mode === "sweep" ? 7 : 5;
      ctx.beginPath();
      ctx.arc(center.x, center.y + 32, span * 0.52, Math.PI * 1.12, Math.PI * (1.12 + 0.76 * progress));
      ctx.stroke();
      ctx.restore();
      for (const target of targets) {
        if (p > 0.50) impactRing(target.point, p, effect.profile.color, effect.seed + target.index * 11, 30);
        if (mode === "cripplingSlash" && p > 0.58) drawDownGlyph(target.point, p, COLORS.purple);
      }
      return;
    }
    for (const target of targets.slice(0, 1)) {
      const travel = easeInOut(clamp((p - 0.12) / 0.38));
      const dash = { x: lerp(effect.start.x, target.point.x, travel), y: lerp(effect.start.y, target.point.y, travel) };
      pathGlow([effect.start, dash], effect.profile.color, alpha * 0.35, 1.4, 7);
      const count = mode === "scratch" ? 3 : 1;
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * 9;
        const angle = -0.76 + i * 0.12;
        pathGlow([
          { x: target.point.x - 31 * Math.cos(angle), y: target.point.y - 31 * Math.sin(angle) + offset },
          { x: target.point.x + 31 * Math.cos(angle), y: target.point.y + 31 * Math.sin(angle) + offset }
        ], effect.profile.color, p > 0.43 ? alpha : 0, mode === "maim" ? 5 : 3, 11);
      }
      if (p > 0.49) impactRing(target.point, p, effect.profile.color, effect.seed, 31);
      if (mode === "maim" && p > 0.56) drawBleed(target.point, p, effect.seed);
    }
  }

  function drawBleed(point, p, seed) {
    const local = clamp((p - 0.56) / 0.44);
    const alpha = fadeOut(local, 0.62);
    ctx.save();
    ctx.fillStyle = rgba(COLORS.red, alpha);
    ctx.shadowColor = rgba(COLORS.red, alpha);
    ctx.shadowBlur = 7;
    for (let i = 0; i < 5; i++) {
      const x = point.x + (rand(seed, i) - 0.5) * 35;
      const y = point.y + 7 + local * (18 + rand(seed + 3, i) * 22);
      ctx.beginPath();
      ctx.ellipse(x, y, 2 + rand(seed + 5, i) * 2, 4 + rand(seed + 7, i) * 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawDownGlyph(point, p, color) {
    const alpha = fadeOut(p, 0.82);
    pathGlow([{ x: point.x, y: point.y - 38 }, { x: point.x, y: point.y - 18 }], color, alpha, 2.5, 7);
    pathGlow([{ x: point.x - 6, y: point.y - 25 }, { x: point.x, y: point.y - 18 }, { x: point.x + 6, y: point.y - 25 }], color, alpha, 2.5, 7);
  }

  function drawBlunt(effect, p, mode) {
    if (mode === "fracturingImpact") return drawFracturing(effect, p);
    if (mode === "sweep") return drawSlash(effect, p, "sweep");
    for (const target of effect.targets.slice(0, 1)) {
      const travel = easeInOut(clamp((p - 0.12) / 0.42));
      const head = { x: lerp(effect.start.x, target.point.x, travel), y: lerp(effect.start.y, target.point.y, travel) };
      if (mode === "shieldBash") {
        drawShield(head, effect.profile.color, fadeOut(p, 0.68), 0.85 + travel * 0.3);
      } else {
        pathGlow([effect.start, head], effect.profile.color, fadeOut(p, 0.68) * 0.45, mode === "smack" ? 5 : 7, 12);
      }
      if (p > 0.50) {
        impactRing(target.point, p, effect.profile.color, effect.seed, mode === "stunningBlow" ? 49 : 38);
        if (mode === "stunningBlow") drawStunStars(target.point, p, effect.seed);
      }
    }
  }

  function drawShield(point, color, alpha, scale = 1) {
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.scale(scale, scale);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = rgba(color, alpha);
    ctx.fillStyle = rgba(color, alpha * 0.22);
    ctx.shadowColor = rgba(color, alpha);
    ctx.shadowBlur = 12;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -20); ctx.lineTo(16, -12); ctx.lineTo(13, 11); ctx.lineTo(0, 22); ctx.lineTo(-13, 11); ctx.lineTo(-16, -12); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawStunStars(point, p, seed) {
    const local = clamp((p - 0.54) / 0.46);
    const alpha = fadeOut(local, 0.68);
    ctx.save();
    ctx.fillStyle = rgba(COLORS.gold, alpha);
    ctx.shadowColor = rgba(COLORS.gold, alpha);
    ctx.shadowBlur = 8;
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2 + local * 2.8;
      const x = point.x + Math.cos(angle) * 26;
      const y = point.y - 28 + Math.sin(angle) * 8;
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const r = k % 2 ? 2.2 : 5.2;
        const a = k * Math.PI / 4;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawFracturing(effect, p) {
    const local = clamp((p - 0.34) / 0.5);
    const alpha = fadeOut(local, 0.7);
    for (const target of effect.targets) {
      const ground = { x: target.point.x, y: target.anchor.groundY };
      discGlow(ground.x, ground.y, 12 + 20 * local, effect.profile.color, alpha * 0.8);
      for (let i = 0; i < 8; i++) {
        const angle = rand(effect.seed + target.index, i) * Math.PI * 2;
        const distance = 20 + rand(effect.seed + 8, i) * 42;
        pathGlow([ground, { x: ground.x + Math.cos(angle) * distance * local, y: ground.y + Math.sin(angle) * distance * 0.35 * local }], effect.profile.color, alpha, 1.6, 5);
      }
      if (p > 0.52) impactRing(target.point, p, effect.profile.color, effect.seed + target.index, 38);
      if (p > 0.60) drawDownGlyph(target.point, p, COLORS.red);
    }
  }

  function drawArrow(effect, p, mode) {
    if (mode === "rainOfArrows") return drawArrowRain(effect, p);
    const targets = ["penetratingShot"].includes(mode) ? effect.targets : effect.targets.slice(0, 1);
    const ordered = targets.slice().sort((a, b) => a.point.x - b.point.x);
    const final = ordered[ordered.length - 1];
    if (!final) return;
    const travel = easeInOut(clamp((p - 0.12) / 0.47));
    const head = { x: lerp(effect.start.x, final.point.x, travel), y: lerp(effect.start.y, final.point.y, travel) };
    const tail = { x: lerp(effect.start.x, final.point.x, Math.max(0, travel - 0.28)), y: lerp(effect.start.y, final.point.y, Math.max(0, travel - 0.28)) };
    const color = effect.profile.color;
    pathGlow([tail, head], color, fadeOut(p, 0.67), mode === "quickShot" ? 1.6 : 2.6, mode === "quickShot" ? 7 : 11);
    const angle = Math.atan2(final.point.y - effect.start.y, final.point.x - effect.start.x);
    drawArrowGlyph(head, angle, color, fadeOut(p, 0.67), mode === "steadyShot" ? 1.15 : 0.9);
    if (mode === "flameArrow") drawEmberTrail(effect, tail, head, p);
    if (mode === "aquaArrow") drawWaterWake(effect, tail, head, p);
    if (mode === "steadyShot") {
      ellipseGlow(head.x, head.y, 13, 13, COLORS.gold, fadeOut(p, 0.69), 1.4);
      ellipseGlow(head.x, head.y, 24, 24, COLORS.gold, fadeOut(p, 0.69) * 0.75, 1);
    }
    for (const target of ordered) {
      if (p > 0.50) impactRing(target.point, p, color, effect.seed + target.index * 13, 31);
      if (mode === "silencingShot" && p > 0.57) drawMuteGlyph(target.point, p, color);
      if (mode === "pestilentShot" && p > 0.54) {
        drawPoisonCloud(target.point, p, effect.seed, COLORS.poison);
        drawCrackedShield(target.point, p, COLORS.poison);
      }
    }
  }

  function drawArrowRain(effect, p) {
    const local = clamp((p - 0.22) / 0.62);
    const alpha = fadeOut(p, 0.82);
    for (const target of effect.targets) {
      for (let i = 0; i < 8; i++) {
        const delay = i * 0.055;
        const fall = easeOut(clamp((local - delay) / 0.45));
        const x = target.point.x + (rand(effect.seed + target.index, i) - 0.5) * 72;
        const startY = target.point.y - 135 - rand(effect.seed + 4, i) * 45;
        const endY = target.anchor.groundY - rand(effect.seed + 8, i) * 10;
        const y = lerp(startY, endY, fall);
        drawArrowGlyph({ x, y }, Math.PI / 2, COLORS.silver, alpha, 0.7);
        if (fall > 0.92) discGlow(x, endY, 4, COLORS.cyan, alpha * 0.8);
      }
      if (p > 0.55) impactRing(target.point, p, COLORS.cyan, effect.seed + target.index, 28);
    }
  }

  function drawEmberTrail(effect, tail, head, p) {
    const alpha = fadeOut(p, 0.72);
    for (let i = 0; i < 11; i++) {
      const t = i / 10;
      const x = lerp(tail.x, head.x, t);
      const y = lerp(tail.y, head.y, t) + (rand(effect.seed, i) - 0.5) * 11;
      discGlow(x, y, 1.3 + rand(effect.seed + 3, i) * 2.2, COLORS.fire, alpha * (0.35 + t * 0.55));
    }
  }

  function drawWaterWake(effect, tail, head, p) {
    const alpha = fadeOut(p, 0.72);
    const dx = head.x - tail.x;
    const dy = head.y - tail.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    for (const sign of [-1, 1]) {
      const points = [];
      for (let i = 0; i <= 18; i++) {
        const t = i / 18;
        const wave = Math.sin(t * Math.PI * 5 + effect.seed) * 5 * sign;
        points.push({ x: lerp(tail.x, head.x, t) + nx * wave, y: lerp(tail.y, head.y, t) + ny * wave });
      }
      pathGlow(points, COLORS.water, alpha * 0.68, 1.1, 5);
    }
  }

  function drawMuteGlyph(point, p, color) {
    const alpha = fadeOut(p, 0.82);
    ellipseGlow(point.x, point.y - 21, 17, 17, color, alpha, 1.5);
    pathGlow([{ x: point.x - 10, y: point.y - 31 }, { x: point.x + 10, y: point.y - 11 }], color, alpha, 2.2, 7);
    pathGlow([{ x: point.x - 10, y: point.y - 11 }, { x: point.x + 10, y: point.y - 31 }], color, alpha, 2.2, 7);
  }

  function drawPoisonCloud(point, p, seed, color) {
    const local = clamp((p - 0.50) / 0.5);
    const alpha = fadeOut(local, 0.66);
    for (let i = 0; i < 13; i++) {
      const angle = rand(seed, i) * Math.PI * 2;
      const distance = easeOut(local) * (10 + rand(seed + 5, i) * 35);
      discGlow(point.x + Math.cos(angle) * distance, point.y + Math.sin(angle) * distance * 0.65, 3 + rand(seed + 9, i) * 8, color, alpha * 0.45);
    }
  }

  function drawMagicProjectile(effect, p, mode) {
    const castAlpha = clamp(p / 0.16) * (1 - smoothstep(0.48, 0.70, p));
    magicCircle(effect.sourceAnchor, effect.profile.color, castAlpha, p * 8 + effect.seed, 35);
    if (effect.targets[0]) verticalRing(effect.sourceAnchor, effect.targets[0].point, effect.profile.color, castAlpha, 23);

    if (["frostSurge", "manaSpring", "toxicPollen", "naturesVeil", "flameBlast", "firestorm"].includes(mode)) {
      return drawMagicArea(effect, p, mode);
    }
    if (mode === "entangle") return drawEntangle(effect, p);
    if (mode === "lifeDrain") return drawLifeDrain(effect, p);

    for (const target of effect.targets.slice(0, 1)) {
      if (mode === "iceSpear") {
        const curve = projectileCurve(effect, target, p, 14);
        pathGlow(curve.points, COLORS.ice, fadeOut(p, 0.70), 4.2, 13);
        const angle = Math.atan2(target.point.y - effect.start.y, target.point.x - effect.start.x);
        ctx.save(); ctx.translate(curve.head.x, curve.head.y); ctx.rotate(angle); ctx.fillStyle = rgba([230, 253, 255], fadeOut(p, 0.70));
        ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(-9, -6); ctx.lineTo(-3, 0); ctx.lineTo(-9, 6); ctx.closePath(); ctx.fill(); ctx.restore();
        if (p > 0.52) {
          impactRing(target.point, p, COLORS.ice, effect.seed, 41);
          drawSnowflake(target.point, p, COLORS.ice);
        }
      } else if (mode === "smokeBurst") {
        const curve = projectileCurve(effect, target, p, 18);
        pathGlow(curve.points, effect.profile.color, fadeOut(p, 0.67), 4, 14);
        for (let i = 0; i < 9; i++) discGlow(curve.head.x + (rand(effect.seed, i) - 0.5) * 22, curve.head.y + (rand(effect.seed + 4, i) - 0.5) * 22, 4 + rand(effect.seed + 8, i) * 8, [80, 54, 115], fadeOut(p, 0.70) * 0.52);
        if (p > 0.50) {
          drawPoisonCloud(target.point, p, effect.seed, [105, 76, 135]);
          drawMuteGlyph(target.point, p, effect.profile.color);
        }
      } else if (mode === "waterStrike") {
        const curve = projectileCurve(effect, target, p, 31);
        pathGlow(curve.points, COLORS.water, fadeOut(p, 0.70), 4, 14);
        drawWaterWake(effect, curve.points[0], curve.head, p);
        if (p > 0.52) {
          impactRing(target.point, p, COLORS.water, effect.seed, 44);
          drawWaterSplash(target.point, p, effect.seed);
        }
      } else if (mode === "fireball") {
        const curve = projectileCurve(effect, target, p, 26);
        pathGlow(curve.points, COLORS.fire, fadeOut(p, 0.70), 5.2, 16);
        discGlow(curve.head.x, curve.head.y, 9, COLORS.fire, fadeOut(p, 0.70));
        drawEmberTrail(effect, curve.points[0], curve.head, p);
        if (p > 0.52) {
          impactRing(target.point, p, COLORS.fire, effect.seed, 48);
          sparkBurst(target.point, p, COLORS.gold, effect.seed + 23, 22, 54);
        }
      } else {
        console.error(`[MWI Combat VFX ${VERSION}] 法術沒有繪圖函式：${mode}`);
      }
    }
  }

  function drawWaterSplash(point, p, seed) {
    const local = clamp((p - 0.50) / 0.45);
    const alpha = fadeOut(local, 0.60);
    for (let i = 0; i < 12; i++) {
      const angle = lerp(-Math.PI * 0.92, -Math.PI * 0.08, i / 11);
      const distance = easeOut(local) * (24 + rand(seed, i) * 32);
      const end = { x: point.x + Math.cos(angle) * distance, y: point.y + Math.sin(angle) * distance };
      pathGlow([point, end], COLORS.water, alpha, 1.3, 5);
      discGlow(end.x, end.y, 1.8, COLORS.ice, alpha);
    }
  }

  function drawSnowflake(point, p, color) {
    const alpha = fadeOut(p, 0.84);
    const center = { x: point.x, y: point.y - 30 };
    for (let i = 0; i < 3; i++) {
      const angle = i * Math.PI / 3;
      const dx = Math.cos(angle) * 12;
      const dy = Math.sin(angle) * 12;
      pathGlow([{ x: center.x - dx, y: center.y - dy }, { x: center.x + dx, y: center.y + dy }], color, alpha, 1.4, 5);
    }
  }

  function drawMagicArea(effect, p, mode) {
    const ready = clamp((p - 0.12) / 0.24) * (1 - smoothstep(0.82, 1, p));
    const erupt = easeOut(clamp((p - 0.34) / 0.34));
    const alpha = fadeOut(p, 0.82);
    for (const target of effect.targets) {
      magicCircle(target.anchor, effect.profile.color, ready, -p * 7 - target.index, 31);
      if (mode === "frostSurge") drawIceEruption(target, erupt, alpha, effect.seed);
      if (mode === "manaSpring") drawManaFountain(effect, target, erupt, alpha);
      if (mode === "toxicPollen") drawToxicDust(target, erupt, alpha, effect.seed);
      if (mode === "naturesVeil") drawSporeVeil(target, erupt, alpha, effect.seed);
      if (mode === "flameBlast") drawLavaEruption(target, erupt, alpha, effect.seed);
      if (mode === "firestorm") drawFirestorm(target, p, alpha, effect.seed);
      if (p > 0.52) impactRing(target.point, p, effect.profile.color, effect.seed + target.index * 9, mode === "firestorm" ? 46 : 35);
    }
  }

  function drawIceEruption(target, progress, alpha, seed) {
    for (let i = 0; i < 9; i++) {
      const x = target.point.x + (i - 4) * 7 + (rand(seed + target.index, i) - 0.5) * 4;
      const baseY = target.anchor.groundY;
      const height = progress * (30 + rand(seed + 5, i) * 48);
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = rgba(COLORS.ice, alpha * 0.62); ctx.strokeStyle = rgba([235, 253, 255], alpha); ctx.shadowColor = rgba(COLORS.ice, alpha); ctx.shadowBlur = 9;
      ctx.beginPath(); ctx.moveTo(x - 4, baseY); ctx.lineTo(x, baseY - height); ctx.lineTo(x + 4, baseY); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    drawSnowflake(target.point, 0.55 + progress * 0.25, COLORS.ice);
  }

  function drawManaFountain(effect, target, progress, alpha) {
    const base = { x: target.point.x, y: target.anchor.groundY };
    for (let i = 0; i < 7; i++) {
      const offset = (i - 3) * 6;
      const height = progress * (45 + Math.abs(i - 3) * -4);
      pathGlow([{ x: base.x + offset, y: base.y }, { x: base.x + offset * 0.35, y: base.y - height }], COLORS.water, alpha, 2.2, 9);
    }
    const returnT = easeInOut(clamp((progress - 0.46) / 0.54));
    if (returnT > 0) {
      const control = { x: (base.x + effect.start.x) / 2, y: Math.min(base.y, effect.start.y) - 34 };
      const points = [];
      for (let i = 0; i <= 18; i++) points.push(qBezier(base, control, effect.start, returnT * i / 18));
      pathGlow(points, [75, 150, 255], alpha * 0.45, 1.4, 7);
    }
  }

  function drawToxicDust(target, progress, alpha, seed) {
    for (let i = 0; i < 18; i++) {
      const angle = rand(seed + target.index, i) * Math.PI * 2;
      const distance = progress * (10 + rand(seed + 4, i) * 48);
      discGlow(target.point.x + Math.cos(angle) * distance, target.point.y + Math.sin(angle) * distance * 0.65, 2 + rand(seed + 9, i) * 6, COLORS.poison, alpha * 0.48);
    }
    drawCrackedShield(target.point, 0.60 + progress * 0.2, COLORS.poison);
  }

  function drawSporeVeil(target, progress, alpha, seed) {
    for (let i = 0; i < 16; i++) {
      const x = target.point.x + (rand(seed + target.index, i) - 0.5) * 78 * progress;
      const y = target.point.y + (rand(seed + 5, i) - 0.5) * 82 * progress;
      discGlow(x, y, 2 + rand(seed + 8, i) * 4, COLORS.teal, alpha * 0.62);
    }
    const eye = { x: target.point.x, y: target.point.y - 32 };
    ellipseGlow(eye.x, eye.y, 13, 8, COLORS.teal, alpha, 1.6);
    pathGlow([{ x: eye.x - 11, y: eye.y - 9 }, { x: eye.x + 11, y: eye.y + 9 }], COLORS.teal, alpha, 2, 6);
  }

  function drawLavaEruption(target, progress, alpha, seed) {
    const base = { x: target.point.x, y: target.anchor.groundY };
    for (let i = 0; i < 9; i++) {
      const angle = lerp(-Math.PI * 0.88, -Math.PI * 0.12, i / 8);
      const distance = progress * (28 + rand(seed + target.index, i) * 48);
      pathGlow([base, { x: base.x + Math.cos(angle) * distance, y: base.y + Math.sin(angle) * distance }], COLORS.fire, alpha, 2 + rand(seed, i) * 2, 10);
    }
    drawFracturing({ targets: [target], profile: { color: COLORS.fire }, seed }, 0.42 + progress * 0.28);
  }

  function drawFirestorm(target, p, alpha, seed) {
    const local = easeOut(clamp((p - 0.28) / 0.48));
    for (let ring = 0; ring < 3; ring++) {
      const points = [];
      for (let i = 0; i <= 30; i++) {
        const q = i / 30;
        const angle = q * Math.PI * 2.3 + p * 8 + ring * 1.7;
        const radius = (18 + ring * 12) * local * (0.7 + q * 0.3);
        points.push({ x: target.point.x + Math.cos(angle) * radius, y: target.anchor.groundY - q * (45 + ring * 7) + Math.sin(angle) * radius * 0.22 });
      }
      pathGlow(points, ring === 1 ? COLORS.gold : COLORS.fire, alpha * (0.72 - ring * 0.12), 2.5 + ring, 13);
    }
  }

  function drawEntangle(effect, p) {
    for (const target of effect.targets.slice(0, 1)) {
      const travel = easeInOut(clamp((p - 0.20) / 0.42));
      const baseA = { x: effect.start.x, y: effect.sourceAnchor.groundY };
      const baseB = { x: target.point.x, y: target.anchor.groundY };
      const points = [];
      for (let i = 0; i <= 26; i++) {
        const t = travel * i / 26;
        points.push({ x: lerp(baseA.x, baseB.x, t), y: lerp(baseA.y, baseB.y, t) + Math.sin(t * Math.PI * 8 + effect.seed) * 6 });
      }
      pathGlow(points, COLORS.green, fadeOut(p, 0.82), 3, 10);
      if (p > 0.52) {
        for (let i = 0; i < 7; i++) {
          const angle = lerp(Math.PI * 0.95, Math.PI * 2.05, i / 6);
          pathGlow([
            { x: baseB.x + Math.cos(angle) * 24, y: baseB.y },
            { x: target.point.x + Math.cos(angle) * 14, y: target.point.y - 30 + Math.sin(angle) * 18 }
          ], COLORS.green, fadeOut(p, 0.85), 2.5, 9);
        }
        drawStunStars(target.point, p, effect.seed);
      }
    }
  }

  function drawLifeDrain(effect, p) {
    for (const target of effect.targets.slice(0, 1)) {
      const local = clamp((p - 0.22) / 0.60);
      const alpha = fadeOut(p, 0.84);
      const control = { x: (target.point.x + effect.start.x) / 2, y: Math.min(target.point.y, effect.start.y) - 36 };
      const points = [];
      for (let i = 0; i <= 28; i++) {
        const t = i / 28;
        const point = qBezier(target.point, control, effect.start, t);
        point.y += Math.sin(t * Math.PI * 7 + p * 10) * 5;
        points.push(point);
      }
      pathGlow(points, [220, 43, 116], alpha * clamp(local * 3), 4, 15);
      for (let i = 0; i < 8; i++) {
        const t = (local + i / 8) % 1;
        const point = qBezier(target.point, control, effect.start, t);
        discGlow(point.x, point.y, 2.5 + rand(effect.seed, i) * 2.5, t > 0.7 ? COLORS.green : [220, 43, 116], alpha);
      }
      if (p > 0.52) impactRing(target.point, p, [220, 43, 116], effect.seed, 32);
      if (p > 0.58) discGlow(effect.start.x, effect.start.y, 13, COLORS.green, alpha * 0.75);
    }
  }

  function drawEnemyAttack(effect, p) {
    for (const target of effect.targets) {
      const curve = projectileCurve(effect, target, p, 18);
      pathGlow(curve.points, COLORS.enemy, fadeOut(p, 0.70), 2.4, 10);
      if (p > 0.52) impactRing(target.point, p, COLORS.enemy, effect.seed + target.index, 29);
    }
  }

  function drawCastingEffect(effect, p) {
    const appear = smoothstep(0, 0.12, p);
    const disappear = 1 - smoothstep(0.90, 1, p);
    const alpha = appear * disappear * (0.76 + Math.sin(p * Math.PI * 10) * 0.12);
    const radius = 31 + Math.sin(p * Math.PI * 4) * 3;
    magicCircle(effect.sourceAnchor, effect.profile.color, alpha, p * Math.PI * 5 + effect.seed, radius);
    if (effect.towardPoint) verticalRing(effect.sourceAnchor, effect.towardPoint, effect.profile.color, alpha * 0.82, 21);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = rgba(effect.profile.color, alpha * 0.92);
    ctx.shadowColor = rgba(effect.profile.color, alpha);
    ctx.shadowBlur = 9;
    ctx.lineCap = "round";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(
      effect.sourceAnchor.x,
      effect.sourceAnchor.groundY,
      radius + 7,
      (radius + 7) * 0.27,
      0,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * p
    );
    ctx.stroke();
    ctx.restore();
  }

  function drawStatusDrop(x, y, size, color, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = rgba(color, alpha);
    ctx.shadowColor = rgba(color, alpha);
    ctx.shadowBlur = 7;
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.5);
    ctx.bezierCurveTo(size * 0.9, -size * 0.35, size, size * 0.4, 0, size);
    ctx.bezierCurveTo(-size, size * 0.4, -size * 0.9, -size * 0.35, 0, -size * 1.5);
    ctx.fill();
    ctx.restore();
  }

  function drawStatusFlame(x, y, size, alpha, phase) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = rgba(COLORS.fire, alpha * 0.82);
    ctx.shadowColor = rgba(COLORS.fire, alpha);
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, -size * (1.3 + Math.sin(phase) * 0.16));
    ctx.bezierCurveTo(size * 0.75, -size * 0.55, size * 0.85, size * 0.35, 0, size * 0.72);
    ctx.bezierCurveTo(-size * 0.85, size * 0.35, -size * 0.7, -size * 0.45, 0, -size * 1.3);
    ctx.fill();
    ctx.fillStyle = rgba([255, 221, 71], alpha * 0.9);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.64);
    ctx.bezierCurveTo(size * 0.34, -size * 0.2, size * 0.32, size * 0.3, 0, size * 0.45);
    ctx.bezierCurveTo(-size * 0.32, size * 0.3, -size * 0.32, -size * 0.18, 0, -size * 0.64);
    ctx.fill();
    ctx.restore();
  }

  function drawStatusSnowflake(x, y, radius, alpha, spin) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = rgba(COLORS.ice, alpha);
    ctx.shadowColor = rgba(COLORS.ice, alpha);
    ctx.shadowBlur = 7;
    ctx.lineWidth = 1.5;
    for (let arm = 0; arm < 3; arm++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(-radius, 0);
      ctx.lineTo(radius, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawAttachedStatus(status, anchor, now) {
    const wallNow = Date.now();
    const fadeInAlpha = clamp((wallNow - status.createdAt) / 220);
    const fadeOutAlpha = Number.isFinite(status.endAt) ? clamp((status.endAt - wallNow) / 420) : 1;
    const alpha = Math.min(fadeInAlpha, fadeOutAlpha) * 0.92;
    if (alpha <= 0) return;

    const phase = now * 0.001 + status.seed;
    const pulse = 0.72 + Math.sin(phase * 4.2) * 0.18;
    const point = { x: anchor.x, y: anchor.y };

    if (status.kind === "bleed") {
      for (let i = 0; i < 7; i++) {
        const fall = (phase * (0.42 + rand(status.seed, i) * 0.18) + rand(status.seed + 5, i)) % 1;
        const x = point.x + (rand(status.seed + 11, i) - 0.5) * Math.max(30, anchor.width * 0.54);
        const y = point.y - anchor.height * 0.24 + fall * anchor.height * 0.76;
        drawStatusDrop(x, y, 2.5 + rand(status.seed + 17, i) * 2.2, COLORS.red, alpha * (1 - fall * 0.3));
      }
      const slashPhase = phase % 1.35;
      if (slashPhase < 0.28) {
        const local = slashPhase / 0.28;
        pathGlow([
          { x: point.x - 24, y: point.y - 22 },
          { x: point.x + 24, y: point.y + 16 }
        ], COLORS.red, alpha * Math.sin(local * Math.PI) * 0.72, 2.8, 9);
      }
      return;
    }

    if (status.kind === "burn") {
      const baseY = anchor.groundY - 2;
      for (let i = 0; i < 6; i++) {
        const drift = (phase * (0.38 + rand(status.seed, i) * 0.18) + rand(status.seed + 3, i)) % 1;
        const x = point.x + (rand(status.seed + 7, i) - 0.5) * Math.max(38, anchor.width * 0.62) + Math.sin(phase * 3 + i) * 3;
        const y = baseY - 8 - drift * Math.max(30, anchor.height * 0.64);
        drawStatusFlame(x, y, 6 + rand(status.seed + 13, i) * 5, alpha * (1 - drift * 0.55), phase * 5 + i);
      }
      for (let i = 0; i < 8; i++) {
        const rise = (phase * 0.55 + rand(status.seed + 19, i)) % 1;
        discGlow(point.x + (rand(status.seed + 23, i) - 0.5) * anchor.width * 0.7, baseY - rise * anchor.height * 0.8, 1.2 + rand(status.seed + 29, i) * 1.8, COLORS.gold, alpha * (1 - rise));
      }
      return;
    }

    if (status.kind === "corrosion") {
      for (let i = 0; i < 10; i++) {
        const rise = (phase * (0.18 + rand(status.seed, i) * 0.14) + rand(status.seed + 31, i)) % 1;
        const x = point.x + (rand(status.seed + 37, i) - 0.5) * Math.max(35, anchor.width * 0.7);
        const y = anchor.groundY - rise * Math.max(36, anchor.height * 0.78);
        discGlow(x, y, 2 + rand(status.seed + 41, i) * 5, i % 2 ? COLORS.poison : [100, 238, 115], alpha * (0.22 + (1 - rise) * 0.38));
      }
      drawCrackedShield({ x: point.x, y: point.y + 3 }, 0.25, COLORS.poison);
      return;
    }

    if (status.kind === "frost" || status.kind === "slow") {
      ellipseGlow(point.x, anchor.groundY - 2, Math.max(26, anchor.width * 0.38), 8, COLORS.ice, alpha * pulse * 0.58, 1.4);
      for (let i = 0; i < 7; i++) {
        const orbit = phase * (0.35 + i * 0.025) + rand(status.seed, i) * Math.PI * 2;
        const radius = Math.max(22, anchor.width * 0.34) + rand(status.seed + 5, i) * 13;
        drawStatusSnowflake(point.x + Math.cos(orbit) * radius, point.y - 5 + Math.sin(orbit * 1.3) * anchor.height * 0.36, 3 + rand(status.seed + 9, i) * 2.5, alpha * 0.8, orbit);
      }
      return;
    }

    if (status.kind === "stun") {
      const starPoint = { x: point.x, y: point.y - Math.max(28, anchor.height * 0.46) };
      drawStunStars(starPoint, 0.62 + (Math.sin(phase * 2.2) + 1) * 0.04, status.seed + phase * 0.1);
      return;
    }

    if (status.kind === "silence") {
      drawMuteGlyph({ x: point.x, y: point.y - Math.max(15, anchor.height * 0.22) }, 0.34, COLORS.purple);
      return;
    }

    if (status.kind === "blind") {
      for (let i = 0; i < 7; i++) {
        const orbit = phase * 0.42 + i * Math.PI * 2 / 7;
        discGlow(point.x + Math.cos(orbit) * (18 + i % 3 * 5), point.y - 8 + Math.sin(orbit) * 16, 5 + i % 3 * 2, [126, 85, 177], alpha * 0.28);
      }
      ellipseGlow(point.x, point.y - 10, 18, 8, COLORS.purple, alpha * pulse, 1.4);
      pathGlow([{ x: point.x - 18, y: point.y - 23 }, { x: point.x + 18, y: point.y + 3 }], COLORS.purple, alpha * 0.86, 2.2, 7);
      return;
    }

    if (status.kind === "armorBreak") {
      drawCrackedShield({ x: point.x, y: point.y + 2 }, 0.22, COLORS.gold);
      return;
    }

    if (status.kind === "vulnerable" || status.kind === "weaken") {
      drawDownGlyph({ x: point.x, y: point.y - 1 }, 0.28, status.kind === "vulnerable" ? COLORS.red : COLORS.purple);
    }
  }

  function drawAttachedStatuses(now) {
    const wallNow = Date.now();
    const { monsters } = findCombatUnits();
    const visible = new Map();

    for (const [key, status] of attachedStatuses) {
      if ((Number.isFinite(status.endAt) && status.endAt <= wallNow) || monsterHp[status.monsterIndex] <= 0) {
        attachedStatuses.delete(key);
        continue;
      }
      const aggregateKey = `${status.monsterIndex}:${status.kind}`;
      const previous = visible.get(aggregateKey);
      if (!previous || status.endAt > previous.endAt) visible.set(aggregateKey, status);
    }

    for (const status of visible.values()) {
      const monster = monsters[status.monsterIndex];
      const anchor = unitAnchor(monster);
      if (anchor) drawAttachedStatus(status, anchor, now);
    }
    return visible.size;
  }

  function drawEffect(effect, now) {
    const p = clamp((now - effect.startedAt) / effect.duration);
    const style = effect.profile.style;
    ctx.save();
    if (effect.kind === "cast") {
      drawCastingEffect(effect, p);
    } else if (effect.enemy) {
      drawEnemyAttack(effect, p);
    } else {
      const route = STYLE_ROUTES[style];
      if (route === "weapon") drawWeapon(effect, p);
      else if (route === "thrust") drawThrust(effect, p, style);
      else if (route === "slash") drawSlash(effect, p, style);
      else if (route === "blunt") drawBlunt(effect, p, style);
      else if (route === "arrow") drawArrow(effect, p, style);
      else if (route === "magic") drawMagicProjectile(effect, p, style);
    }
    ctx.restore();
    if (effect.kind !== "cast") drawDamage(effect, p);
    return p < 1;
  }

  function render(now) {
    animationFrame = 0;
    if (!ensureCanvas()) {
      animationFrame = requestAnimationFrame(render);
      return;
    }
    resizeCanvas();
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const statusCount = drawAttachedStatuses(now);
    activeEffects = activeEffects.filter(effect => drawEffect(effect, now));
    if (activeEffects.length || statusCount) animationFrame = requestAnimationFrame(render);
  }

  function requestRender() {
    if (!animationFrame) animationFrame = requestAnimationFrame(render);
  }

  function intervalToMilliseconds(value) {
    const numeric = numberOr(value, 1200);
    const milliseconds = numeric > 100000 ? numeric / 1000000 : numeric;
    return clamp(milliseconds, 350, 6000);
  }

  function stopCastEffect(playerIndex) {
    activeEffects = activeEffects.filter(effect => !(effect.kind === "cast" && effect.playerIndex === playerIndex));
  }

  function spawnCastEffect(playerIndex, abilityHrid, intervalValue) {
    const profile = PROFILES[abilityHrid];
    if (pageHidden || !profile?.magic || !MAGIC_STYLES.has(profile.style)) return;
    const { players, monsters } = findCombatUnits();
    const player = players[playerIndex];
    if (!player) return;
    const firstMonsterRect = monsters[0]?.getBoundingClientRect();
    const towardX = firstMonsterRect ? firstMonsterRect.left + firstMonsterRect.width / 2 : window.innerWidth;
    const sourceAnchor = unitAnchor(player, towardX);
    if (!sourceAnchor) return;
    stopCastEffect(playerIndex);
    activeEffects.push({
      id: ++effectSequence,
      kind: "cast",
      playerIndex,
      abilityHrid,
      profile,
      sourceAnchor,
      towardPoint: firstMonsterRect ? { x: towardX, y: firstMonsterRect.top + firstMonsterRect.height / 2 } : null,
      seed: effectSequence * 131 + playerIndex * 29,
      duration: intervalToMilliseconds(intervalValue),
      startedAt: performance.now()
    });
    requestRender();
  }

  function spawnPlayerAttack(playerIndex, abilityHrid, hits, isCrit = false) {
    if (pageHidden || !hits.length) return;
    const profile = PROFILES[abilityHrid] || PROFILES.autoAttack;
    const { players, monsters } = findCombatUnits();
    const player = players[playerIndex];
    if (!player || !monsters.length) return;

    const validHits = hits
      .filter(hit => monsters[hit.index])
      .map(hit => ({ ...hit, element: monsters[hit.index] }))
      .sort((a, b) => a.index - b.index);
    if (!validHits.length) return;

    let selected = validHits;
    if (!profile.area && !profile.chain) selected = [validHits.slice().sort((a, b) => b.damage - a.damage)[0]];
    if (profile.chain) selected = validHits.slice(0, 2);

    const firstTargetRect = selected[0].element.getBoundingClientRect();
    const sourceAnchor = unitAnchor(player, firstTargetRect.left + firstTargetRect.width / 2);
    if (!sourceAnchor) return;
    const targets = selected.map(hit => {
      const anchor = unitAnchor(hit.element, sourceAnchor.x);
      const missDirection = Math.sign(anchor.x - sourceAnchor.x) || 1;
      return {
        index: hit.index,
        damage: hit.damage,
        miss: Boolean(hit.miss),
        anchor,
        point: {
          x: anchor.x + (hit.miss ? missDirection * 36 : 0),
          y: anchor.y - (hit.miss ? 26 : 0)
        }
      };
    });

    activeEffects.push({
      id: ++effectSequence,
      seed: effectSequence * 97 + playerIndex * 19,
      abilityHrid,
      profile,
      sourceAnchor,
      start: { x: sourceAnchor.x, y: sourceAnchor.y },
      targets,
      isCrit,
      enemy: false,
      duration: profile.duration,
      startedAt: syncedAttackStartedAt(profile)
    });
    requestRender();
  }

  function spawnEnemyAttack(monsterIndex, hits, isCrit = false) {
    if (pageHidden || !hits.length) return;
    const { players, monsters } = findCombatUnits();
    const monster = monsters[monsterIndex];
    if (!monster || !players.length) return;
    const validHits = hits.filter(hit => players[hit.index]).map(hit => ({ ...hit, element: players[hit.index] }));
    if (!validHits.length) return;
    const firstRect = validHits[0].element.getBoundingClientRect();
    const sourceAnchor = unitAnchor(monster, firstRect.left + firstRect.width / 2);
    const targets = validHits.map(hit => {
      const anchor = unitAnchor(hit.element, sourceAnchor.x);
      return { index: hit.index, damage: hit.damage, anchor, point: { x: anchor.x, y: anchor.y } };
    });
    const profile = { style: "enemyAttack", color: COLORS.enemy, duration: 760 };
    activeEffects.push({
      id: ++effectSequence,
      seed: effectSequence * 103 + monsterIndex * 31,
      abilityHrid: "enemyAttack",
      profile,
      sourceAnchor,
      start: { x: sourceAnchor.x, y: sourceAnchor.y },
      targets,
      isCrit,
      enemy: true,
      duration: profile.duration,
      startedAt: syncedAttackStartedAt(profile)
    });
    requestRender();
  }

  function numberOr(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function parseServerTimestamp(value) {
    if (typeof value !== "string" || !value || value.startsWith("0001-")) return NaN;
    const normalized = value.replace(/\.(\d{3})\d*Z$/, ".$1Z");
    return Date.parse(normalized);
  }

  function durationNanosecondsToMilliseconds(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric / 1000000 : 0;
  }

  function classifyCombatStatus(mapKey, buff) {
    const unique = String(buff?.uniqueHrid || mapKey || "").toLowerCase();
    const type = String(buff?.typeHrid || "").toLowerCase();
    const text = `${unique} ${type}`;
    const isDot = /damage_over_time|damage-over-time|\bdot\b/.test(text);

    if ((isDot && /fire|burn|blaze|firestorm/.test(text)) || /burn|burning|firestorm/.test(text)) return "burn";
    if ((isDot && /physical|maim|bleed/.test(text)) || /bleed|bleeding/.test(text)) return "bleed";
    if (/stun/.test(text)) return "stun";
    if (/silence|silencing|mute/.test(text)) return "silence";
    if (/blind|natures?_veil|smoke_burst/.test(text)) return "blind";
    if (/pestilent|toxic_pollen|corrosion|all_resistance|resistance_down/.test(text)) return "corrosion";
    if (/puncture|armor_break|armor_down/.test(text)) return "armorBreak";
    if (/ice_spear|frost_surge|freeze|frozen|slow|attack_speed_down/.test(text)) return "frost";
    if (/crippling_slash|damage_dealt_down|weaken/.test(text)) return "weaken";
    if (/damage_taken|fracturing_impact|vulnerable|curse/.test(text)) return "vulnerable";
    if (/maim/.test(text)) return type.includes("damage_taken") ? "vulnerable" : "bleed";
    return "";
  }

  function findCombatBuffMap(unit) {
    if (!unit || typeof unit !== "object") return null;
    for (const field of ["combatBuffMap", "combatBuffs", "buffMap", "buffs"]) {
      if (Object.prototype.hasOwnProperty.call(unit, field) && unit[field] && typeof unit[field] === "object") {
        return unit[field];
      }
    }
    return null;
  }

  function upsertAttachedStatus(key, next, authoritative = false) {
    const previous = attachedStatuses.get(key);
    if (previous) {
      next.createdAt = previous.createdAt;
      next.seed = previous.seed;
      if (!authoritative) next.endAt = Math.max(previous.endAt, next.endAt);
    }
    attachedStatuses.set(key, next);
  }

  function syncExactMonsterStatuses(monsterIndex, buffMap) {
    if (!buffMap || typeof buffMap !== "object") return;
    const prefix = `exact:${monsterIndex}:`;
    const seen = new Set();
    const wallNow = Date.now();

    for (const [mapKey, rawBuff] of Object.entries(buffMap)) {
      const buff = rawBuff && typeof rawBuff === "object" ? rawBuff : null;
      if (!buff) continue;
      const kind = classifyCombatStatus(mapKey, buff);
      const duration = durationNanosecondsToMilliseconds(buff.duration);
      const startAt = parseServerTimestamp(buff.startTime);
      if (!kind || !duration || !Number.isFinite(startAt)) continue;
      const endAt = startAt + duration;
      if (endAt <= wallNow) continue;

      const unique = String(buff.uniqueHrid || mapKey || `${kind}:${startAt}`);
      const key = `${prefix}${unique}`;
      seen.add(key);
      upsertAttachedStatus(key, {
        monsterIndex,
        kind,
        source: "server",
        unique,
        startAt,
        endAt,
        createdAt: Math.min(wallNow, startAt),
        seed: (monsterIndex + 1) * 211 + unique.length * 17
      }, true);

      for (const [otherKey, status] of attachedStatuses) {
        if (otherKey.startsWith(`inferred:${monsterIndex}:`) && status.kind === kind) attachedStatuses.delete(otherKey);
      }
    }

    for (const key of [...attachedStatuses.keys()]) {
      if (key.startsWith(prefix) && !seen.has(key)) attachedStatuses.delete(key);
    }
    if (seen.size) requestRender();
  }

  function applyInferredStatuses(abilityHrid, hits) {
    const specs = INFERRED_STATUS_SPECS[abilityHrid];
    if (!specs || !hits?.length) return;
    const wallNow = Date.now();
    for (const hit of hits) {
      if (hit.miss || !(hit.damage > 0) || !Number.isInteger(hit.index)) continue;
      for (const spec of specs) {
        const key = `inferred:${hit.index}:${abilityHrid}:${spec.kind}`;
        upsertAttachedStatus(key, {
          monsterIndex: hit.index,
          kind: spec.kind,
          source: abilityHrid,
          startAt: wallNow,
          endAt: wallNow + spec.duration,
          createdAt: wallNow,
          seed: (hit.index + 1) * 173 + abilityHrid.length * 23 + spec.kind.length * 31
        });
      }
    }
    requestRender();
  }

  function clearPendingCasts(casts) {
    for (const cast of casts.values()) {
      if (cast.missTimer) clearTimeout(cast.missTimer);
    }
    casts.clear();
  }

  function normalizePreparingAbility(value) {
    return typeof value === "string" && value ? value : "autoAttack";
  }

  function chooseMissTarget(counter) {
    const alive = [];
    for (let index = 0; index < monsterHp.length; index++) {
      if (monsterHp[index] > 0) alive.push(index);
    }
    if (!alive.length) {
      const { monsters } = findCombatUnits();
      for (let index = 0; index < monsters.length; index++) alive.push(index);
    }
    if (!alive.length) return -1;
    return alive[Math.abs(numberOr(counter, 0)) % alive.length];
  }

  function spawnMissedPlayerAttack(cast) {
    const targetIndex = chooseMissTarget(cast.counter);
    if (targetIndex >= 0) {
      spawnPlayerAttack(cast.index, cast.abilityHrid, [{ index: targetIndex, damage: 0, miss: true }], false);
    }
  }

  function scheduleInitialCastEffects(players) {
    const generation = battleGeneration;
    window.setTimeout(() => {
      if (generation !== battleGeneration) return;
      players.forEach((player, index) => {
        const abilityHrid = playerPreparingAbility[index];
        spawnCastEffect(index, abilityHrid, player.attackOrCastInterval);
      });
    }, 80);
  }

  function handleBattleMessage(payload) {
    if (typeof payload !== "string" || payload.charCodeAt(0) !== 123) return;
    let obj;
    try {
      obj = JSON.parse(payload);
    } catch (_) {
      return;
    }
    if (!obj || typeof obj !== "object") return;

    if (obj.type === "new_battle" && Array.isArray(obj.monsters) && Array.isArray(obj.players)) {
      battleGeneration++;
      monsterHp = obj.monsters.map(monster => numberOr(monster.currentHitpoints, 0));
      monsterMp = obj.monsters.map(monster => numberOr(monster.currentManapoints, 0));
      monsterAtkCounter = obj.monsters.map(monster => numberOr(monster.attackAttemptCounter, 0));
      monsterDmgCounter = obj.monsters.map(monster => numberOr(monster.damageSplatCounter, 0));
      monsterCritCounter = obj.monsters.map(monster => numberOr(monster.criticalDamageSplatCounter, 0));
      playerHp = obj.players.map(player => numberOr(player.currentHitpoints, 0));
      playerMp = obj.players.map(player => numberOr(player.currentManapoints, 0));
      playerAtkCounter = obj.players.map(player => numberOr(player.attackAttemptCounter, 0));
      playerDmgCounter = obj.players.map(player => numberOr(player.damageSplatCounter, 0));
      playerCritCounter = obj.players.map(player => numberOr(player.criticalDamageSplatCounter, 0));
      playerPreparingAbility = obj.players.map(player => normalizePreparingAbility(player.preparingAbilityHrid));
      clearPendingCasts(pendingMonsterCasts);
      activeEffects = [];
      attachedStatuses.clear();
      obj.monsters.forEach((monster, index) => {
        const buffMap = findCombatBuffMap(monster);
        if (buffMap) syncExactMonsterStatuses(index, buffMap);
      });
      scheduleInitialCastEffects(obj.players);
      if (attachedStatuses.size) requestRender();
      return;
    }

    if (obj.type !== "battle_updated") return;
    const mMap = obj.mMap || {};
    const pMap = obj.pMap || {};
    const monsterEntries = Object.entries(mMap);
    const playerEntries = Object.entries(pMap);
    if (!monsterEntries.length && !playerEntries.length) return;

    const now = performance.now();
    for (const [index, cast] of pendingMonsterCasts) {
      if (now - cast.createdAt > 900) pendingMonsterCasts.delete(index);
    }

    const completedPlayerCasts = [];
    for (const [key, player] of playerEntries) {
      const index = Number(key);
      const previousMp = playerMp[index];
      const currentMp = numberOr(player.cMP, previousMp);
      const previousAtk = playerAtkCounter[index];
      const currentAtk = numberOr(player.atkCounter, previousAtk);
      const abilityHrid = typeof player.abilityHrid === "string" ? player.abilityHrid : "";
      if (Number.isFinite(currentAtk) && (!Number.isFinite(previousAtk) || currentAtk > previousAtk)) {
        const completedAbility = playerPreparingAbility[index] || "autoAttack";
        stopCastEffect(index);
        if (ATTACK_ABILITIES.has(completedAbility)) {
          completedPlayerCasts.push({ index, abilityHrid: completedAbility, counter: currentAtk });
        }
        const nextAbility = normalizePreparingAbility(abilityHrid);
        playerPreparingAbility[index] = nextAbility;
        spawnCastEffect(index, nextAbility, player.int);
      }
      if (Number.isFinite(currentMp)) playerMp[index] = currentMp;
      if (Number.isFinite(currentAtk)) playerAtkCounter[index] = currentAtk;
    }

    for (const [key, monster] of monsterEntries) {
      const index = Number(key);
      const buffMap = findCombatBuffMap(monster);
      if (buffMap) syncExactMonsterStatuses(index, buffMap);
      const previousMp = monsterMp[index];
      const currentMp = numberOr(monster.cMP, previousMp);
      const previousAtk = monsterAtkCounter[index];
      const currentAtk = numberOr(monster.atkCounter, previousAtk);
      if (Number.isFinite(currentAtk) && (!Number.isFinite(previousAtk) || currentAtk > previousAtk)) {
        pendingMonsterCasts.set(index, { index, counter: currentAtk, createdAt: now });
      }
      if (Number.isFinite(currentMp)) monsterMp[index] = currentMp;
      if (Number.isFinite(currentAtk)) monsterAtkCounter[index] = currentAtk;
    }

    const monsterHits = [];
    for (const [key, monster] of monsterEntries) {
      const index = Number(key);
      const previousHp = monsterHp[index];
      const currentHp = numberOr(monster.cHP, previousHp);
      const damage = Number.isFinite(previousHp) && Number.isFinite(currentHp) ? previousHp - currentHp : 0;
      const previousDmg = monsterDmgCounter[index];
      const currentDmg = numberOr(monster.dmgCounter, previousDmg);
      const previousCrit = monsterCritCounter[index];
      const currentCrit = numberOr(monster.critCounter, previousCrit);
      if (damage > 0) {
        const crit = Number.isFinite(previousCrit) && Number.isFinite(currentCrit) && currentCrit > previousCrit;
        monsterHits.push({ index, damage, crit });
      }
      if (Number.isFinite(currentHp)) monsterHp[index] = currentHp;
      if (Number.isFinite(currentDmg)) monsterDmgCounter[index] = currentDmg;
      if (Number.isFinite(currentCrit)) monsterCritCounter[index] = currentCrit;
    }

    if (completedPlayerCasts.length) {
      for (const cast of completedPlayerCasts) {
        if (monsterHits.length) {
          spawnPlayerAttack(cast.index, cast.abilityHrid, monsterHits, monsterHits.some(hit => hit.crit));
          applyInferredStatuses(cast.abilityHrid, monsterHits);
        } else {
          spawnMissedPlayerAttack(cast);
        }
      }
    }

    const playerHits = [];
    for (const [key, player] of playerEntries) {
      const index = Number(key);
      const previousHp = playerHp[index];
      const currentHp = numberOr(player.cHP, previousHp);
      const damage = Number.isFinite(previousHp) && Number.isFinite(currentHp) ? previousHp - currentHp : 0;
      const previousDmg = playerDmgCounter[index];
      const currentDmg = numberOr(player.dmgCounter, previousDmg);
      const previousCrit = playerCritCounter[index];
      const currentCrit = numberOr(player.critCounter, previousCrit);
      if (damage > 0) {
        const crit = Number.isFinite(previousCrit) && Number.isFinite(currentCrit) && currentCrit > previousCrit;
        playerHits.push({ index, damage, crit });
      }
      if (Number.isFinite(currentHp)) playerHp[index] = currentHp;
      if (Number.isFinite(currentDmg)) playerDmgCounter[index] = currentDmg;
      if (Number.isFinite(currentCrit)) playerCritCounter[index] = currentCrit;
    }
    if (playerHits.length) {
      const casts = [...pendingMonsterCasts.values()].filter(cast => now - cast.createdAt <= 900);
      for (const cast of casts) {
        spawnEnemyAttack(cast.index, playerHits, playerHits.some(hit => hit.crit));
        pendingMonsterCasts.delete(cast.index);
      }
    }
  }

  function hookWebSocketMessages() {
    const descriptor = Object.getOwnPropertyDescriptor(MessageEvent.prototype, "data");
    if (!descriptor || typeof descriptor.get !== "function" || descriptor.configurable === false) {
      console.warn(`[MWI Combat VFX ${VERSION}] 無法掛接戰鬥訊息。`);
      return;
    }
    const originalGet = descriptor.get;
    const seenEvents = new WeakSet();
    Object.defineProperty(MessageEvent.prototype, "data", {
      ...descriptor,
      get: function () {
        const value = originalGet.call(this);
        if (!seenEvents.has(this)) {
          seenEvents.add(this);
          const socket = this.currentTarget;
          const url = socket && typeof socket.url === "string" ? socket.url : "";
          if (WS_HOSTS.some(host => url.includes(host))) {
            try {
              handleBattleMessage(value);
            } catch (error) {
              console.warn(`[MWI Combat VFX ${VERSION}] 戰鬥訊息處理失敗：`, error);
            }
          }
        }
        return value;
      }
    });
  }

  document.addEventListener("visibilitychange", () => {
    pageHidden = document.hidden;
    if (pageHidden) {
      activeEffects = [];
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      if (ctx) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    } else if (attachedStatuses.size) {
      requestRender();
    }
  });
  window.addEventListener("resize", resizeCanvas, { passive: true });
  document.addEventListener("DOMContentLoaded", ensureCanvas, { once: true });

  hookWebSocketMessages();
  if (document.body) ensureCanvas();

  console.info(`[MWI Combat VFX] ${VERSION} 已載入（攻擊特效、無調整介面）`);
})();
