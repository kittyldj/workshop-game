/* ============================================================
   我的工作室 · WORKSHOP  —  游戏主逻辑 + 赛博朋克 3D 车间
   单文件构建：template.html + three.min.js + 本文件
   ============================================================ */
(function () {
  'use strict';
  window.addEventListener('error', function(ev){ var v=document.getElementById('ver'); if(v) v.textContent='ERR: '+ev.message+' @'+(ev.lineno||0); });
  const T = window.THREE;
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const fmt = (n) => '¥' + Math.round(n).toLocaleString('zh-CN');

  /* ============================================================
     一、数据表（改这里就能加内容）
     ============================================================ */

  const SKILL_DEF = [
    { id: 'weld', name: '焊接', ic: '⚡' },
    { id: 'lathe', name: '车削', ic: '⚙' },
    { id: 'elec', name: '电工', ic: '⏚' },
    { id: 'code', name: '编程', ic: '⌨' },
    { id: 'ai', name: 'AI 绘图', ic: '◈' },
    { id: 'cnc', name: 'CNC', ic: '⌗' },
    { id: 'design', name: '机械设计', ic: '◬' }
  ];

  const EQUIP_DEF = [
    { id: 'welder', name: '二手氩弧焊机', price: 1000, tier: 1, pos: [-3.8, 0, -3.5], rot: 0.5 },
    { id: 'drill', name: '台钻', price: 800, tier: 1, pos: [-3.8, 0, 0], rot: 0.16 },
    { id: 'lathe', name: '小车床', price: 6000, tier: 2, pos: [-3.8, 0, 3.5], rot: 0 },
    { id: 'printer', name: '3D 打印机', price: 2000, tier: 1, pos: [3.8, 0, -3.5], rot: -0.5 },
    { id: 'scope', name: '示波器', price: 1200, tier: 2, pos: [3.8, 0, 0], rot: 0 },
    { id: 'cnc', name: '小型数控加工中心', price: 30000, tier: 3, pos: [3.8, 0, 3.5], rot: 0 }
  ];

  // 订单池：按声望门槛分级。req = 技能等级需求；equip = 必须有的设备
  const ORDER_POOL = [
    { t: 1, name: '修一台料架', desc: '车间料架横梁断了，焊回去就行。', reward: 900, days: 3, steps: 2, req: { weld: 1 }, equip: ['welder'], mat: 120 },
    { t: 1, name: '打一组孔', desc: '法兰盘上 6 个孔，位置要对。', reward: 700, days: 3, steps: 2, req: { lathe: 1 }, equip: ['drill'], mat: 80 },
    { t: 1, name: '车一个轴套', desc: '旧泵上换下来的轴套，照着配一个。', reward: 1400, days: 4, steps: 3, req: { lathe: 2 }, equip: ['lathe'], mat: 260 },
    { t: 1, name: '焊个小推车', desc: '库房要一辆两轮推车，方管焊。', reward: 1800, days: 4, steps: 3, req: { weld: 2 }, equip: ['welder'], mat: 340 },
    { t: 2, name: '不锈钢台面拼接', desc: '食品车间台面，满焊不留缝。', reward: 3200, days: 5, steps: 4, req: { weld: 3 }, equip: ['welder'], mat: 620 },
    { t: 2, name: '丝杠支座一对', desc: '公差要紧，车完还得配。', reward: 3600, days: 5, steps: 4, req: { lathe: 3 }, equip: ['lathe'], mat: 540 },
    { t: 2, name: '控制柜接线', desc: '一条小线的控制柜，按图接线。', reward: 4200, days: 5, steps: 4, req: { elec: 3 }, equip: ['scope'], mat: 700 },
    { t: 2, name: '夹具出图', desc: '客户只给零件，让你画一套定位夹具的图。', reward: 3800, days: 5, steps: 4, req: { design: 3 }, equip: [], mat: 120 },
    { t: 3, name: '传感器支架小批', desc: '50 件，尺寸一样，上数控。', reward: 9000, days: 6, steps: 5, req: { lathe: 3, cnc: 3 }, equip: ['lathe', 'cnc'], mat: 1400 },
    { t: 3, name: '非标夹具', desc: '给产线做一个定位夹具，设计加制作。', reward: 11000, days: 7, steps: 6, req: { weld: 3, lathe: 3, design: 3 }, equip: ['welder', 'lathe'], mat: 1800 },
    { t: 3, name: '小产线改造', desc: '老线加一个自动上料，电控重做。', reward: 16000, days: 8, steps: 7, req: { elec: 4, code: 3, design: 2 }, equip: ['scope'], mat: 2400 },
    { t: 3, name: '批量端盖（数控）', desc: '200 件端盖，程序编好一次跑完。', reward: 13000, days: 7, steps: 5, req: { cnc: 4, design: 2 }, equip: ['cnc'], mat: 2100 },
    { t: 4, name: '视觉分拣单元', desc: '相机认件，气缸分料，写一套程序。', reward: 26000, days: 9, steps: 8, req: { code: 4, ai: 3, design: 3 }, equip: ['scope', 'printer'], mat: 4200 },
    { t: 4, name: '一整套工装交付', desc: '从出图到装配，客户只给一张草图。', reward: 34000, days: 10, steps: 9, req: { lathe: 4, weld: 4, design: 4, cnc: 2 }, equip: ['welder', 'lathe', 'cnc'], mat: 5200 }
  ];

  // 作品（长线关卡）。解锁顺序即数组顺序；后续想加新东西直接往这里加一条。
  const WORKS = [
    {
      id: 'guitar', name: '自动识谱弹琴的吉他', rep: 14,
      desc: '一张谱子摊开，它自己知道按哪个品、拨哪根弦。',
      parts: [
        { id: 'finger', name: '机械指组', desc: '六根手指压在指板上，力要够、回位要快。', cost: 1200, steps: 3, req: { lathe: 3, weld: 2, design: 2 }, equip: ['lathe', 'welder'] },
        { id: 'reader', name: '识谱模块', desc: '把纸上的音符读成坐标。', cost: 600, steps: 3, req: { code: 3 }, equip: [] },
        { id: 'ctrl', name: '控制板', desc: '十六路输出，延时不能抖。', cost: 900, steps: 3, req: { elec: 3, code: 2 }, equip: ['scope'] },
        { id: 'tuner', name: '自动调音', desc: '六根弦，各自听、各自拧。', cost: 1500, steps: 4, req: { elec: 4, code: 3, lathe: 2 }, equip: ['scope', 'lathe'] }
      ]
    },
    {
      id: 'dog', name: '四足机器狗', rep: 20,
      desc: '十二条舵机腿，走起来不摔。',
      parts: [
        { id: 'frame', name: '机身框架', desc: '铝合金框，轻但要硬。', cost: 2200, steps: 4, req: { lathe: 4, weld: 3, design: 3 }, equip: ['lathe', 'welder'] },
        { id: 'leg', name: '腿部关节', desc: '每条腿三个关节，共十二条。', cost: 3000, steps: 5, req: { lathe: 4, code: 3, cnc: 3 }, equip: ['lathe', 'cnc'] },
        { id: 'gait', name: '步态程序', desc: '让它四条腿不打架。', cost: 800, steps: 4, req: { code: 4 }, equip: [] },
        { id: 'power', name: '电源与驱动', desc: '瞬时电流很大，别烧。', cost: 1600, steps: 3, req: { elec: 4 }, equip: ['scope'] }
      ]
    },
    {
      id: 'atv', name: '小型全地形车', rep: 28,
      desc: '四个宽胎，能上土坡。',
      parts: [
        { id: 'chassis', name: '车架', desc: '方管焊接，受力点补强。', cost: 4200, steps: 6, req: { weld: 5, lathe: 3, design: 3 }, equip: ['welder', 'lathe'] },
        { id: 'trans', name: '传动与差速', desc: '链条传动，后桥差速。', cost: 5600, steps: 6, req: { lathe: 5, cnc: 4 }, equip: ['lathe', 'cnc'] },
        { id: 'susp', name: '悬挂', desc: '四个减震，行程要够。', cost: 3200, steps: 5, req: { weld: 4, lathe: 4 }, equip: ['welder', 'lathe'] },
        { id: 'dash', name: '仪表与线束', desc: '转速、电压、灯光。', cost: 1800, steps: 4, req: { elec: 4 }, equip: ['scope'] }
      ]
    }
  ];

  const SLOT_NAME = ['上午', '下午', '晚上'];
  const SAVE_PREFIX = 'workshop_v3_slot';
  const SETTINGS_KEY = 'workshop_v3_settings';
  const VERSION = '0.2.0';

  /* ============================================================
     二、设置 / 音效 / 状态
     ============================================================ */

  // iPad / 平板：判定用于「布局改抽屉 + 画质降档 + 开触摸手势」。
  // iPadOS 13+ 的 Safari 伪装成 Macintosh，只能靠 maxTouchPoints 认出来。
  const IS_TOUCH = (navigator.maxTouchPoints || 0) > 1 ||
    !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  let settings = { q: 2, vol: 0.55, sfx: true, theme: 'woodshop' };

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) settings = Object.assign(settings, JSON.parse(raw));
    } catch (e) {}
  }
  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {}
  }

  // 程序化音效：不依赖任何外部素材
  const SFX = {
    ctx: null, master: null, amb: null, ready: false,
    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch (e) { return; }
      this.master = this.ctx.createGain();
      this.master.gain.value = settings.sfx ? settings.vol : 0;
      this.master.connect(this.ctx.destination);
      this.ready = true;
    },
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    apply() { if (this.master) this.master.gain.value = settings.sfx ? settings.vol : 0; },
    tone(freq, dur, type, vol, slideTo) {
      if (!this.ready || !settings.sfx) return;
      const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol || 0.08), t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.03);
    },
    noise(dur, vol, cut) {
      if (!this.ready || !settings.sfx) return;
      const c = this.ctx, t = c.currentTime;
      const len = Math.max(1, Math.floor(c.sampleRate * dur));
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource(); src.buffer = buf;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.value = cut || 1200; bp.Q.value = 0.9;
      const g = c.createGain(); g.gain.value = vol || 0.08;
      src.connect(bp); bp.connect(g); g.connect(this.master);
      src.start(t);
    },
    click() { this.tone(720, 0.045, 'square', 0.03); },
    work() { this.noise(0.16, 0.075, 820); this.tone(112, 0.15, 'sine', 0.045, 70); },
    coin() { this.tone(880, 0.07, 'triangle', 0.055); const s = this; setTimeout(() => s.tone(1320, 0.1, 'triangle', 0.045), 70); },
    good() { this.tone(523, 0.1, 'sine', 0.06); const s = this; setTimeout(() => s.tone(784, 0.14, 'sine', 0.05), 100); },
    bad() { this.tone(190, 0.2, 'sawtooth', 0.06, 90); },
    drill(ms) {
      if (!this.ready || !settings.sfx) return;
      const n = 3, gap = Math.max(200, (ms || 1500) / n);
      for (let i = 0; i < n; i++) {
        setTimeout(() => {
          this.noise(0.26, 0.05, 2600);
          this.tone(146, 0.24, 'sawtooth', 0.028, 112);
        }, i * gap);
      }
    },
    // 车床：主轴低频嗡鸣 + 断续的切削屑声（跟台钻的"一下一下"明显不同）
    lathe(ms) {
      if (!this.ready || !settings.sfx) return;
      this.tone(98, 0.95, 'sawtooth', 0.030, 86);
      const n = 5, gap = Math.max(150, (ms || 1500) / n);
      for (let i = 0; i < n; i++) setTimeout(() => this.noise(0.10, 0.026, 3400), i * gap);
    },
    // 焊机：电弧"嘶——"的高频底噪 + 不规则的爆点（跟钻/车完全不同的声音质感）
    weld(ms) {
      if (!this.ready || !settings.sfx) return;
      this.noise(0.34, 0.030, 5200);                     // 电弧底噪
      this.tone(128, 0.32, 'sawtooth', 0.020, 118);      // 变压器低鸣
      const n = 7, gap = Math.max(110, (ms || 1500) / n);
      for (let i = 0; i < n; i++) setTimeout(() => this.noise(0.055, 0.019, 6800), i * gap);
    },
    ambient(on) {
      if (!this.ready) return;
      if (on && !this.amb) {
        const c = this.ctx;
        const len = Math.floor(c.sampleRate * 2);
        const buf = c.createBuffer(1, len, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.4;
        const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 170;
        const g = c.createGain(); g.gain.value = 0.045;
        src.connect(lp); lp.connect(g); g.connect(this.master);
        src.start();
        this.amb = { src: src, gain: g };
      } else if (!on && this.amb) {
        try { this.amb.src.stop(); } catch (e) {}
        this.amb = null;
      }
    }
  };

  let state = null;
  let logs = [];
  let curSlot = 0;

  function newState(slotNo) {
    const s = {
      started: false, slotNo: slotNo || 0,
      day: 1, slot: 0, cash: 8000, rep: 0,
      skills: {}, equip: {}, orders: [], works: {}, workIdx: 0, uid: 1, board: null
    };
    SKILL_DEF.forEach((k) => (s.skills[k.id] = 0));
    EQUIP_DEF.forEach((e) => (s.equip[e.id] = false));
    WORKS.forEach((w) => {
      s.works[w.id] = {};
      w.parts.forEach((p) => (s.works[w.id][p.id] = 0));
    });
    return s;
  }

  function save() {
    if (!curSlot || !state || !state.started) return;
    try {
      localStorage.setItem(SAVE_PREFIX + curSlot, JSON.stringify({
        v: VERSION, ts: Date.now(), state: state, logs: logs.slice(-30)
      }));
    } catch (e) {}
  }
  function readSlot(n) {
    try {
      const raw = localStorage.getItem(SAVE_PREFIX + n);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return d && d.state ? d : null;
    } catch (e) { return null; }
  }
  function loadSlot(n) {
    const d = readSlot(n);
    if (!d) return false;
    state = Object.assign(newState(n), d.state);
    state.slotNo = n;
    state.started = true;
    logs = d.logs || [];
    curSlot = n;
    return true;
  }
  function delSlot(n) {
    try { localStorage.removeItem(SAVE_PREFIX + n); } catch (e) {}
  }

  /* ============================================================
     三、3D 引擎
     ============================================================ */

  let renderer, scene, camera, clock;
  let sceneRT, bloomRT = [], bloomTmp = [], compMat = null;
  let fsScene, fsCam, fsQuad;
  let camTheta = -0.16, camPhi = 0.94, camRadius = 17.5;
  let autoSpin = true, lastInteract = 0;
  let equipMeshes = {};
  let anim = { drill: 0, drillDur: 1600, lathe: 0, latheDur: 1500, weld: 0, weldDur: 1500 };
  let lastT = 0;
  let camTarget = null;   // 开发用：把镜头钉在某台设备上
  let qualityLevel = 2;
  const QSET = {
    1: { name: '标准', dpr: 0.85, shadow: 1024 },
    2: { name: '高清', dpr: 1.35, shadow: 2048 },
    3: { name: '4K', dpr: 2.0, shadow: 4096 }
  };

  // 平板上 dpr 与阴影图要单独封顶：iPad 的逻辑分辨率本来就高，
  // 再乘 2.0 的 dpr 会直接把帧率打下来。
  function qcfg() {
    const c = QSET[settings.q] || QSET[2];
    return IS_TOUCH
      ? { name: c.name, dpr: Math.min(c.dpr, 1.6), shadow: Math.min(c.shadow, 2048) }
      : c;
  }

  const MAT = {};

  // 从高度图（canvas 灰度）用 Sobel 求切线空间法线贴图
  // —— 这是"表面不再是一块塑料"的关键：铸铁麻面、木纹凹凸、墙面砂粒都靠它
  function normalTex(size, draw, strength, rep) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    draw(g, size);
    const src = g.getImageData(0, 0, size, size).data;
    const out = g.createImageData(size, size);
    const d = out.data;
    const H = (x, y) => {
      x = (x + size) % size; y = (y + size) % size;
      const i = (y * size + x) * 4;
      return (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114) / 255;
    };
    const k = strength == null ? 2.2 : strength;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (H(x + 1, y) - H(x - 1, y)) * k;
        const dy = (H(x, y + 1) - H(x, y - 1)) * k;
        let nx = -dx, ny = -dy, nz = 1;
        const l = Math.sqrt(nx * nx + ny * ny + nz * nz);
        const i = (y * size + x) * 4;
        d[i] = (nx / l * 0.5 + 0.5) * 255;
        d[i + 1] = (ny / l * 0.5 + 0.5) * 255;
        d[i + 2] = (nz / l * 0.5 + 0.5) * 255;
        d[i + 3] = 255;
      }
    }
    g.putImageData(out, 0, 0);
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.colorSpace = T.NoColorSpace;
    t.anisotropy = 4;
    const r = rep == null ? 2 : rep;
    t.repeat.set(r, r);
    return t;
  }

  // 粗糙度乘数贴图（灰度只在 lo~1.0 之间抖动，不改整体材质观感）
  function roughTex(size, lo, amt, rep) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (lo + Math.random() * amt) * 255;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // 加几处"被手摸亮"的滑腻带
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * size, y = Math.random() * size, r = 4 + Math.random() * 26;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(150,150,150,.55)');
      grd.addColorStop(1, 'rgba(150,150,150,0)');
      g.fillStyle = grd; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.colorSpace = T.NoColorSpace;
    t.anisotropy = 4;
    t.repeat.set(rep, rep);
    return t;
  }

  // 铸铁麻面：细砂粒 + 偶发砂眼
  function castIronHeight(g, size) {
    g.fillStyle = '#808080'; g.fillRect(0, 0, size, size);
    const img = g.getImageData(0, 0, size, size);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 62;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    g.putImageData(img, 0, 0);
    for (let i = 0; i < 130; i++) {
      const x = Math.random() * size, y = Math.random() * size, r = 1.2 + Math.random() * 3.6;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(40,40,40,.85)');
      grd.addColorStop(1, 'rgba(128,128,128,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
    }
  }

  // 木纹：沿 x 的纤维起伏
  function woodHeight(g, size) {
    g.fillStyle = '#808080'; g.fillRect(0, 0, size, size);
    for (let i = 0; i < 210; i++) {
      const y = Math.random() * size;
      const amp = 1.5 + Math.random() * 5;
      const w = 0.6 + Math.random() * 2.4;
      g.strokeStyle = 'rgba(255,255,255,' + (0.05 + Math.random() * 0.16).toFixed(3) + ')';
      g.lineWidth = w;
      g.beginPath();
      for (let x = 0; x <= size; x += 8) {
        const yy = y + Math.sin(x * 0.021 + i) * amp + Math.sin(x * 0.07 + i * 2) * amp * 0.3;
        x === 0 ? g.moveTo(x, yy) : g.lineTo(x, yy);
      }
      g.stroke();
      g.strokeStyle = 'rgba(0,0,0,' + (0.04 + Math.random() * 0.12).toFixed(3) + ')';
      g.lineWidth = w * 0.7;
      g.beginPath();
      for (let x = 0; x <= size; x += 8) {
        const yy = y + 1.6 + Math.sin(x * 0.021 + i) * amp + Math.sin(x * 0.07 + i * 2) * amp * 0.3;
        x === 0 ? g.moveTo(x, yy) : g.lineTo(x, yy);
      }
      g.stroke();
    }
  }

  // 墙面抹灰：砂粒 + 抹刀痕
  function plasterHeight(g, size) {
    g.fillStyle = '#808080'; g.fillRect(0, 0, size, size);
    const img = g.getImageData(0, 0, size, size);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 34;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    g.putImageData(img, 0, 0);
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = 'rgba(' + (Math.random() > 0.5 ? '210,210,210' : '60,60,60') + ',.09)';
      g.lineWidth = 2 + Math.random() * 9;
      g.beginPath();
      const x = Math.random() * size, y = Math.random() * size;
      g.moveTo(x, y);
      g.bezierCurveTo(x + 40, y + 12, x + 90, y - 18, x + 150, y + 6);
      g.stroke();
    }
  }

  function initMaterials() {
    MAT.steel = new T.MeshStandardMaterial({ color: 0x3c4653, metalness: 0.95, roughness: 0.3 });
    MAT.steelDark = new T.MeshStandardMaterial({ color: 0x1b222c, metalness: 0.9, roughness: 0.45 });
    MAT.paint = new T.MeshStandardMaterial({ color: 0x0d5f78, metalness: 0.15, roughness: 0.55 });
    MAT.paintLt = new T.MeshStandardMaterial({ color: 0x17708f, metalness: 0.14, roughness: 0.5 });
    MAT.black = new T.MeshStandardMaterial({ color: 0x0a0d12, metalness: 0.35, roughness: 0.72 });
    MAT.rubber = new T.MeshStandardMaterial({ color: 0x0b0e13, metalness: 0.1, roughness: 0.95 });
    MAT.glass = new T.MeshPhysicalMaterial({
      color: 0x0b1b22, metalness: 0.2, roughness: 0.1,
      transparent: true, opacity: 0.42, transmission: 0.5, side: T.DoubleSide
    });
    MAT.cy = new T.MeshStandardMaterial({ color: 0x001014, emissive: 0x00e5ff, emissiveIntensity: 2.6 });
    MAT.mg = new T.MeshStandardMaterial({ color: 0x14000b, emissive: 0xff2d95, emissiveIntensity: 2.6 });
    MAT.ye = new T.MeshStandardMaterial({ color: 0x141000, emissive: 0xffd166, emissiveIntensity: 2.2 });
    MAT.gn = new T.MeshStandardMaterial({ color: 0x001408, emissive: 0x39ff88, emissiveIntensity: 2.2 });
    MAT.white = new T.MeshStandardMaterial({ color: 0x0a0f14, emissive: 0xbfe9ff, emissiveIntensity: 2.4 });
    MAT.line = new T.MeshStandardMaterial({ color: 0xd8b13a, metalness: 0.1, roughness: 0.62 });
    MAT.woodLight = new T.MeshStandardMaterial({ color: 0xb08a5a, metalness: 0.02, roughness: 0.86 });
    MAT.woodDark = new T.MeshStandardMaterial({ color: 0x6b4a2c, metalness: 0.02, roughness: 0.9 });
    MAT.woodTop = new T.MeshStandardMaterial({ color: 0xc09a66, metalness: 0.02, roughness: 0.8 });
    MAT.paper = new T.MeshStandardMaterial({ color: 0xefe7d2, metalness: 0, roughness: 0.95 });
    MAT.cork = new T.MeshStandardMaterial({ color: 0xb98a52, metalness: 0, roughness: 0.95 });
    // 老铸铁件（不随主题变，保持"铁灰/机加工亮面"两档）
    MAT.iron = new T.MeshStandardMaterial({ color: 0x63635a, metalness: 0.14, roughness: 0.76 });
    MAT.ironD = new T.MeshStandardMaterial({ color: 0x47473c, metalness: 0.12, roughness: 0.78 });
    MAT.mach = new T.MeshStandardMaterial({ color: 0xa39c8e, metalness: 0.55, roughness: 0.44 });
    MAT.brass = new T.MeshStandardMaterial({ color: 0x9a7a3c, metalness: 0.85, roughness: 0.38 });

    // ---- 程序化凹凸：铸铁 / 机加工面 / 木料 / 涂装 ----
    const nCast = normalTex(256, castIronHeight, 2.6, 3);
    const nCastF = normalTex(256, castIronHeight, 1.5, 6);
    const nWood = normalTex(256, woodHeight, 1.7, 2);
    const nWoodF = normalTex(256, woodHeight, 1.1, 4);
    const nPlaster = normalTex(256, plasterHeight, 1.15, 3);

    MAT.iron.normalMap = nCast; MAT.iron.normalScale.set(0.32, 0.32);
    MAT.ironD.normalMap = nCast; MAT.ironD.normalScale.set(0.36, 0.36);
    MAT.mach.normalMap = nCastF; MAT.mach.normalScale.set(0.16, 0.16);
    MAT.steel.normalMap = nCastF; MAT.steel.normalScale.set(0.10, 0.10);
    MAT.steelDark.normalMap = nCastF; MAT.steelDark.normalScale.set(0.14, 0.14);
    MAT.paint.normalMap = nCastF; MAT.paint.normalScale.set(0.28, 0.28);
    MAT.paintLt.normalMap = nCastF; MAT.paintLt.normalScale.set(0.26, 0.26);

    // 粗糙度贴图：亮度落在 0.80~1.0 之间做乘数扰动 —— 油污/磨损处反光不一致，
    // 去掉"一整块均匀塑料亮面"。基准 roughness 保持不变。
    const rCast = roughTex(256, 0.80, 0.20, 3);
    const rMach = roughTex(256, 0.82, 0.18, 6);
    MAT.iron.roughnessMap = rCast;
    MAT.ironD.roughnessMap = rCast;
    MAT.mach.roughnessMap = rMach;

    MAT.woodLight.normalMap = nWood; MAT.woodLight.normalScale.set(0.5, 0.5);
    MAT.woodDark.normalMap = nWood; MAT.woodDark.normalScale.set(0.6, 0.6);
    MAT.woodTop.normalMap = nWoodF; MAT.woodTop.normalScale.set(0.22, 0.22);

    // 后置赋贴图必须重编译材质，否则 shader 里根本没有 UV/法线采样分支
    [MAT.iron, MAT.ironD, MAT.mach, MAT.steel, MAT.steelDark, MAT.paint, MAT.paintLt,
     MAT.woodLight, MAT.woodDark, MAT.woodTop].forEach((m) => { m.needsUpdate = true; });

    MAT.userData = MAT.userData || {};
    MAT.userData.plasterNormal = nPlaster;
  }

  function gridTexture(rgb, rep, base) {
    rgb = rgb || '0,229,255';
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = base || '#000'; g.fillRect(0, 0, 256, 256);

    // albedo 版：给地坪做一块一块的砖面微差，避免大片纯色死板
    if (base) {
      for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 2; x++) {
          g.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.05)';
          g.fillRect(x * 128 + 2, y * 128 + 2, 124, 124);
        }
      }
    }

    g.strokeStyle = 'rgba(' + rgb + ',' + (base ? 0.55 : 0.85) + ')';
    g.lineWidth = base ? 2 : 2;
    g.strokeRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(' + rgb + ',' + (base ? 0.18 : 0.22) + ')';
    g.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke();
    }
    const tex = new T.CanvasTexture(c);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    const k = rep || 16;
    tex.repeat.set(k, k);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  /* ============================================================
     车间风格：只改材质/灯光/后期，不改几何与玩法
     ============================================================ */
  const THEMES = {
    cyber: {
      label: '赛博朋克', short: '赛博',
      bg: 0x05070c, fog: 0x05070c, fogD: 0.024,
      floor: { base: '#0b1119', seam: '90,150,175', grid: '0,229,255', rep: 16, metal: 0.86, rough: 0.24, emis: 0x00c8ff, emisI: 0.55 },
      key: { color: 0xcfe9ff, i: 1.7 },
      amb: { color: 0x2a3a52, i: 2.1 },
      hemi: { sky: 0x2c4a63, ground: 0x05070c, i: 0.7 },
      pts: [[0xff2d95, 95, -8.5, 4.2, -6], [0x00e5ff, 95, 8.5, 4.2, -5], [0xffd166, 45, 0, 4.6, 1.4]],
      ceil: 0xbfe9ff, ceilI: 2.6,
      body: { paint: 0x0d5f78, paintLt: 0x17708f, steel: 0x3c4653, steelDark: 0x1b222c, steelM: 0.95, steelR: 0.3 },
      lamp: { cy: 0x00e5ff, mg: 0xff2d95, ye: 0xffd166, gn: 0x39ff88, white: 0xbfe9ff, i: 2.6 },
      wood: { light: 0x3a4450, dark: 0x1e242c, top: 0x46525e, paper: 0xa9bccb, cork: 0x4a5462 },
      post: { expo: 1.5, bloom: 1.2, vig: 0.5, noise: 0.022, scan: 0.03 }
    },

    clean: {
      label: '暗场展陈', short: '暗场',
      bg: 0x000000, fog: 0x010204, fogD: 0.040,
      floor: { base: '#07090c', seam: '50,80,95', grid: '70,130,150', rep: 14, metal: 0.9, rough: 0.14, emis: 0x2a7f9a, emisI: 0.35 },
      key: { color: 0xbcd8ff, i: 1.2 },
      amb: { color: 0x141c28, i: 1.4 },
      hemi: { sky: 0x1a2636, ground: 0x000000, i: 0.3 },
      pts: [[0x66ccff, 110, -8.5, 3.4, -6], [0xffffff, 95, 8.5, 3.4, -5], [0xfff0cc, 70, 0, 3.6, 1.4]],
      ceil: 0xdfeaff, ceilI: 1.8,
      body: { paint: 0x1a1e24, paintLt: 0x252b33, steel: 0x2a3138, steelDark: 0x14171c, steelM: 0.95, steelR: 0.25 },
      lamp: { cy: 0x66ddff, mg: 0xff5aa8, ye: 0xffd166, gn: 0x52ffa8, white: 0xe6f4ff, i: 3.0 },
      wood: { light: 0x24282e, dark: 0x12161a, top: 0x2a2f36, paper: 0x8fa4b4, cork: 0x2c3138 },
      post: { expo: 1.6, bloom: 1.6, vig: 0.28, noise: 0.026, scan: 0.02 }
    },

    studio: {
      label: '摄影棚·中性灰', short: '影棚',
      bg: 0x24272c, fog: 0x282c32, fogD: 0.016,
      floor: { base: '#3a3e44', seam: '150,158,168', grid: '130,140,155', rep: 18, metal: 0.35, rough: 0.50, emis: 0x8899aa, emisI: 0.10 },
      key: { color: 0xf2f6ff, i: 2.1 },
      amb: { color: 0x606a78, i: 1.9 },
      hemi: { sky: 0x9aa4b2, ground: 0x2a2d33, i: 1.0 },
      pts: [[0x9fb8ff, 50, -9, 5.2, -6], [0xffd7c0, 50, 9, 5.2, -5], [0xffffff, 40, 0, 5.4, 1.4]],
      ceil: 0xffffff, ceilI: 2.6,
      body: { paint: 0x7b848f, paintLt: 0x909aa5, steel: 0x8d949c, steelDark: 0x4a5058, steelM: 0.8, steelR: 0.3 },
      lamp: { cy: 0x8fb4d8, mg: 0xc08a9a, ye: 0xe8c890, gn: 0x8fc0a0, white: 0xffffff, i: 1.2 },
      wood: { light: 0x8a857c, dark: 0x5a554e, top: 0x9a948a, paper: 0xe8e4da, cork: 0x8a7f70 },
      post: { expo: 1.10, bloom: 0.5, vig: 0.70, noise: 0.012, scan: 0 }
    },

    modern: {
      label: '现代科技·洁净车间', short: '洁净',
      bg: 0xd8e2ea, fog: 0xdce7ef, fogD: 0.013,
      floor: { base: '#c9d4dd', seam: '150,168,182', grid: '120,150,172', rep: 24, metal: 0.12, rough: 0.62, emis: 0x9fb4c4, emisI: 0.10 },
      key: { color: 0xffffff, i: 1.5 },
      amb: { color: 0xe8f0f6, i: 1.05 },
      hemi: { sky: 0xffffff, ground: 0xc2ced8, i: 0.9 },
      pts: [[0xffffff, 45, -9, 5.4, -6], [0xe6f4ff, 40, 9, 5.4, -5], [0xfff4e2, 30, 0, 5.2, 1.4]],
      ceil: 0xffffff, ceilI: 3.0,
      body: { paint: 0xb9c6d2, paintLt: 0xd2dde6, steel: 0x8794a1, steelDark: 0x6e7a86, steelM: 0.55, steelR: 0.35 },
      lamp: { cy: 0x3f9fd0, mg: 0xd06a92, ye: 0xf3b64f, gn: 0x4fbf86, white: 0xffffff, i: 1.0 },
      wood: { light: 0xc4b4a0, dark: 0x8b7a68, top: 0xd0c0aa, paper: 0xf5f2ec, cork: 0xc0a888 },
      post: { expo: 1.00, bloom: 0.32, vig: 0.86, noise: 0.005, scan: 0 }
    },

    practical: {
      label: '真实车间·环氧地坪日光灯', short: '车间',
      bg: 0xb9c3c9, fog: 0xc2ccd2, fogD: 0.016,
      floor: { base: '#5f7c6a', seam: '210,232,216', grid: '205,226,212', rep: 20, metal: 0.22, rough: 0.38, emis: 0x88aa99, emisI: 0.08 },
      key: { color: 0xf2f7ff, i: 1.7 },
      amb: { color: 0xdde8ee, i: 1.15 },
      hemi: { sky: 0xffffff, ground: 0x6f8a7a, i: 0.95 },
      pts: [[0xffffff, 40, -9, 5.6, -6], [0xf4faff, 36, 9, 5.6, -5], [0xffffff, 26, 0, 5.4, 1.4]],
      ceil: 0xf2f8ff, ceilI: 3.0,
      body: { paint: 0x2f6b8a, paintLt: 0x3d7f9e, steel: 0x9aa2a8, steelDark: 0x555b61, steelM: 0.7, steelR: 0.3 },
      lamp: { cy: 0x3f9fd0, mg: 0xd05a72, ye: 0xf0b23c, gn: 0x4fb37a, white: 0xffffff, i: 1.1 },
      wood: { light: 0xa89070, dark: 0x6b563c, top: 0xb29a7a, paper: 0xf2ede0, cork: 0xa88f6c },
      post: { expo: 1.04, bloom: 0.34, vig: 0.84, noise: 0.006, scan: 0 }
    },

    woodshop: {
      label: '暖光木工房', short: '木工房',
      bg: 0x231a10, fog: 0x2a1f14, fogD: 0.008,
      floor: { base: '#7a6f5f', seam: '112,100,84', grid: '126,108,88', rep: 11, metal: 0.05, rough: 0.9, emis: 0xffc888, emisI: 0.03 },
      key: { color: 0xffe2c0, i: 0.14 },
      amb: { color: 0x8a7458, i: 0.075 },
      hemi: { sky: 0xbda079, ground: 0x1c150e, i: 0.16 },
      pts: [[0xffca7a, 1.0, -6.6, 2.9, -5.0], [0xfff0d0, 0.9, 6.2, 2.9, -3.0], [0xffd08a, 0.7, -1.0, 2.9, 2.6]],
      ceil: 0xffe8c8, ceilI: 0.55,
      body: { paint: 0x4a6350, paintLt: 0x5b7459, steel: 0x6d6a60, steelDark: 0x2a2823, steelM: 0.42, steelR: 0.62 },
      lamp: { cy: 0x8fc8b0, mg: 0xc98a6a, ye: 0xffc266, gn: 0xa8c078, white: 0xffe6c0, i: 1.2 },
      wood: { light: 0x5f4a30, dark: 0x3e2e1c, top: 0x6a4f33, paper: 0xe4d9c0, cork: 0x74603f },
      post: { expo: 1.24, bloom: 0.28, vig: 0.88, noise: 0.018, scan: 0, sat: 0.90, ao: 0.72, aoR: 0.50, aoP: 1.2 }
    },

    retro: {
      label: '复古工业·八十年代车间', short: '复古',
      bg: 0x241c13, fog: 0x2a2015, fogD: 0.028,
      floor: { base: '#3a2f22', seam: '120,95,55', grid: '150,110,45', rep: 12, metal: 0.15, rough: 0.90, emis: 0xffb347, emisI: 0.22 },
      key: { color: 0xffe0b0, i: 1.9 },
      amb: { color: 0x50402a, i: 2.2 },
      hemi: { sky: 0x7a5f3c, ground: 0x1a1208, i: 0.9 },
      pts: [[0xffb347, 70, -9, 4.6, -6], [0xffcf8a, 55, 9, 4.6, -5], [0xffc266, 50, 0, 4.6, 1.4]],
      ceil: 0xffd9a0, ceilI: 2.4,
      body: { paint: 0x556b52, paintLt: 0x6b8064, steel: 0x6b6257, steelDark: 0x2a2620, steelM: 0.7, steelR: 0.55 },
      lamp: { cy: 0x7fd0c0, mg: 0xd98a5a, ye: 0xffb347, gn: 0x9ac36a, white: 0xffe2b8, i: 1.5 },
      wood: { light: 0x8a6a44, dark: 0x4a3520, top: 0x96754d, paper: 0xd8cbb0, cork: 0x8f6b42 },
      post: { expo: 1.32, bloom: 0.80, vig: 0.50, noise: 0.055, scan: 0.02 }
    }
  };

  let themeId = 'woodshop';

  function hexRgb(h) {
    return [(h >> 16) & 255, (h >> 8) & 255, h & 255].join(',');
  }


  // 木工房里的设备位置（照着参考图摆；其余风格仍用 EQUIP_DEF 里的默认位）
  const WOOD_LAYOUT = {
    lathe:   [-2.58, -0.35, Math.PI / 2],
    drill:   [ 1.62, -2.95, -0.30],
    welder:  [ 2.62, -1.55, 0.85],
    printer: [ 3.30,  3.55, 0.55],
    scope:   [ 2.05,  3.85, -0.55],
    cnc:     [-2.60,  4.30, 0.15]
  };
  const WOOD_BENCH = { x: 2.18, z: 1.18, ry: -0.42 };
  // 木工房的镜头：低机位、走近看，像参考图那样三台机器占满画面
  const CAM_WOOD = { theta: 0.548, phi: 1.335, r: 6.68, t: { x: -1.36, y: 1.07, z: -1.72 } };

  function applyTheme(id) {
    const th = THEMES[id] || THEMES.cyber;
    themeId = THEMES[id] ? id : 'cyber';
    const R = scene && scene.userData.theme;
    if (!R) return;

    scene.background = new T.Color(th.bg);
    if (scene.fog) { scene.fog.color.setHex(th.fog); scene.fog.density = th.fogD; }

    // ---- 木工房专属道具：只在这个风格出现 ----
    const isWood = (themeId === 'woodshop');
    if (R.props) R.props.visible = isWood;
    // 场地那块 120×120 的大地面在木工房里必须让位：房间自带水泥地面，
    // 两块地面叠在一起会互相 z-fighting，看到的永远是主题砖面
    const fm = scene.userData.floorMesh;
    if (fm) fm.visible = !isWood;
    // 木工房自带水泥地面，主题那块砖面大地板必须让位，否则一直叠在上面
    // （砖缝被当成"瓷砖"就是这个原因）

    if (R.lines) R.lines.visible = !isWood;

    // 设备位置：木工房按参考图重排，其余风格用默认位
    EQUIP_DEF.forEach((def) => {
      const h = equipMeshes[def.id];
      if (!h) return;
      const L = WOOD_LAYOUT[def.id];
      if (isWood && L) { h.position.set(L[0], 0, L[1]); h.rotation.y = L[2]; }
      else { h.position.set(def.pos[0], 0, def.pos[2]); h.rotation.y = def.rot || 0; }
    });

    // 中央工作台：木工房挪到右前，其余风格回原位
    if (R.bench) {
      if (isWood) {
        R.bench.position.set(WOOD_BENCH.x, 0, WOOD_BENCH.z);
        R.bench.rotation.y = WOOD_BENCH.ry;
        R.bench.scale.set(1, 1, 1);
      } else {
        R.bench.position.set(0, 0, 1.4); R.bench.rotation.y = 0; R.bench.scale.set(1, 1, 1);
      }
    }
    // 台面杂物跟台子一起缩放，保持摆放贴合
    if (R.props) {
      const bc = R.props.getObjectByName('benchClutter');
      if (bc) bc.scale.set(1, 1, 1);
    }

    scene.environment = isWood ? (scene.userData.envTex || null) : null;
    if (isWood) {
      // IBL 只留"金属面上一点点反射"，不承担照明 —— 否则整个房间被均匀糊亮，
      // 光影就没有方向了。主光必须交给太阳。
      scene.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        const m = o.material;
        if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) m.envMapIntensity = 0.045;
      });
      MAT.iron.color.setHex(0x63635a); MAT.ironD.color.setHex(0x47473c);
      MAT.iron.envMapIntensity = 0.40; MAT.ironD.envMapIntensity = 0.34;
      MAT.mach.envMapIntensity = 0.75; MAT.steel.envMapIntensity = 0.62;
      MAT.steelDark.envMapIntensity = 0.40; MAT.paint.envMapIntensity = 0.32;
      MAT.paintLt.envMapIntensity = 0.45;
    } else {
      // 其余六套风格：铸铁恢复改造前的颜色，不让这轮调色外溢
      MAT.iron.color.setHex(0x4a463f);
    }

    // 镜头：木工房用参考图那种低机位近景，其余风格回默认远景
    if (isWood) {
      camTheta = CAM_WOOD.theta; camPhi = CAM_WOOD.phi; camRadius = CAM_WOOD.r;
      camTarget = { x: CAM_WOOD.t.x, y: CAM_WOOD.t.y, z: CAM_WOOD.t.z };
    } else {
      camTheta = -0.16; camPhi = 0.94; camRadius = 17.5; camTarget = null;
    }

    // ---- 地面：albedo 砖面 + 发光网格双贴图 ----
    // 注意：TRef.floor 存的是「地面材质」不是 mesh。
    // 木工房有自己的一套水泥地面（含烘焙窗光斑），这里必须整段跳过，
    // 否则每次切主题都会把水泥贴图和光斑覆盖成主题砖面。
    const f = th.floor;
    if (!isWood) {
      if (R.floor.map) R.floor.map.dispose();
      if (R.floor.emissiveMap) R.floor.emissiveMap.dispose();
      R.floor.map = gridTexture(f.seam, f.rep * 3, f.base);
      R.floor.emissiveMap = gridTexture(f.grid, f.rep * 3, null);
      R.floor.color.setHex(0xffffff);
      R.floor.metalness = f.metal;
      R.floor.roughness = f.rough;
      R.floor.emissive.setHex(f.emis);
      R.floor.emissiveIntensity = f.emisI;
      R.floor.needsUpdate = true;
    }

    // ---- 灯光 ----
    R.key.color.setHex(th.key.color); R.key.intensity = th.key.i;
    R.amb.color.setHex(th.amb.color); R.amb.intensity = th.amb.i;
    R.hemi.color.setHex(th.hemi.sky); R.hemi.groundColor.setHex(th.hemi.ground); R.hemi.intensity = th.hemi.i;

    R.pts.forEach((p, i) => {
      const d = th.pts[i] || th.pts[0];
      p.color.setHex(d[0]);
      p.intensity = d[1];
      p.position.set(d[2], d[3], d[4]);
      p.userData.base = d[1];
    });

    R.ceil.forEach((m) => { m.emissive.setHex(th.ceil); m.emissiveIntensity = th.ceilI; });

    // ---- 设备本体材质 ----
    const b = th.body;
    MAT.paint.color.setHex(b.paint);
    MAT.paintLt.color.setHex(b.paintLt);
    MAT.steel.color.setHex(b.steel); MAT.steel.metalness = b.steelM; MAT.steel.roughness = b.steelR;
    MAT.steelDark.color.setHex(b.steelDark); MAT.steelDark.metalness = b.steelM; MAT.steelDark.roughness = b.steelR + 0.12;

    // ---- 指示灯 / 霓虹件 ----
    const lp = th.lamp;
    MAT.cy.emissive.setHex(lp.cy); MAT.cy.color.setHex(lp.cy).multiplyScalar(0.06); MAT.cy.emissiveIntensity = lp.i;
    MAT.mg.emissive.setHex(lp.mg); MAT.mg.color.setHex(lp.mg).multiplyScalar(0.06); MAT.mg.emissiveIntensity = lp.i;
    MAT.ye.emissive.setHex(lp.ye); MAT.ye.color.setHex(lp.ye).multiplyScalar(0.06); MAT.ye.emissiveIntensity = lp.i * 0.85;
    MAT.gn.emissive.setHex(lp.gn); MAT.gn.color.setHex(lp.gn).multiplyScalar(0.06); MAT.gn.emissiveIntensity = lp.i * 0.85;
    MAT.white.emissive.setHex(lp.white); MAT.white.emissiveIntensity = lp.i * 0.9;
    MAT.line.color.setHex(lp.ye).multiplyScalar(0.34);
    if (th.wood) {
      const hx = (n) => ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
      MAT.paper.color.setHex(th.wood.paper);
      MAT.cork.color.setHex(th.wood.cork);
      MAT.woodDark.color.setHex(th.wood.dark);
      // 木料挂木纹贴图（无贴图会是一块纯色板，不像木头）
      [[MAT.woodTop, th.wood.top, 4, 4], [MAT.woodLight, th.wood.light, 3, 3]].forEach(([m, col, a, b]) => {
        if (m.map) m.map.dispose();
        m.map = woodTexture('#' + col.toString(16).padStart(6, '0'), hx(th.wood.dark), [a, b]);
        m.color.setHex(0xffffff);
        m.needsUpdate = true;
      });
    }

    // ---- 后期 ----
    if (compMat) {
      compMat.uniforms.uExposure.value = th.post.expo;
      compMat.uniforms.uStrength.value = th.post.bloom;
      compMat.uniforms.uVigMin.value = th.post.vig;
      compMat.uniforms.uNoise.value = th.post.noise;
      compMat.uniforms.uScan.value = th.post.scan;
      compMat.uniforms.uSat.value = (th.post.sat == null ? 1.0 : th.post.sat);
      // 只有木工房开 SSAO，其余六套风格保持原样
      compMat.uniforms.uAO.value = (th.post.ao == null ? 0.0 : th.post.ao);
      ssaoMat.uniforms.uRadius.value = (th.post.aoR == null ? 0.42 : th.post.aoR);
      ssaoMat.uniforms.uPower.value = (th.post.aoP == null ? 1.35 : th.post.aoP);
    }

    // 已摆放的设备重建一次（材质是共享的，不必重建；此处只保证新增设备也吃到新材质）
    $('#ver') && ($('#ver').dataset.theme = themeId);
  }

  function woodTexture(base, dark, rep) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    // 木纹：几十条深浅不一的横纹
    for (let i = 0; i < 150; i++) {
      const y = Math.random() * 256;
      const h = 0.8 + Math.random() * 4.2;
      g.strokeStyle = 'rgba(' + dark + ',' + (0.12 + Math.random() * 0.34).toFixed(3) + ')';
      g.lineWidth = h;
      g.beginPath();
      g.moveTo(-10, y);
      for (let x = 0; x <= 276; x += 40) {
        g.lineTo(x, y + Math.sin((x + i * 30) * 0.02) * 3);
      }
      g.stroke();
    }
    // 浅色高光纹（木料反光的纤维）
    for (let i = 0; i < 60; i++) {
      const y = Math.random() * 256;
      g.strokeStyle = 'rgba(255,240,214,' + (0.05 + Math.random() * 0.10).toFixed(3) + ')';
      g.lineWidth = 0.6 + Math.random() * 1.6;
      g.beginPath();
      g.moveTo(-10, y);
      for (let x = 0; x <= 276; x += 40) g.lineTo(x, y + Math.sin((x + i * 20) * 0.02) * 2.5);
      g.stroke();
    }
    // 两处节疤
    [[70, 60], [190, 190]].forEach(([cx, cy]) => {
      const rg = g.createRadialGradient(cx, cy, 1, cx, cy, 14);
      rg.addColorStop(0, 'rgba(' + dark + ',.42)');
      rg.addColorStop(1, 'rgba(' + dark + ',0)');
      g.fillStyle = rg;
      g.beginPath(); g.ellipse(cx, cy, 16, 8, 0.3, 0, Math.PI * 2); g.fill();
    });
    const tex = new T.CanvasTexture(c);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(rep ? rep[0] : 2, rep ? rep[1] : 1);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }

  function textSprite(text, color, sub, opt) {
    opt = opt || {};
    const W = opt.w || 512, H = opt.h || 160;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    const fs = opt.fs || 52;
    g.font = 'bold ' + fs + 'px "Microsoft YaHei",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = fs * 0.48;
    g.fillStyle = color;
    g.fillText(text, W / 2, sub ? H * 0.36 : H * 0.5);
    if (sub) {
      const sfs = opt.sfs || Math.round(fs * 0.46);
      g.font = sfs + 'px "Segoe UI",sans-serif';
      g.shadowBlur = sfs * 0.6;
      g.fillStyle = 'rgba(200,225,245,.72)';
      g.fillText(sub, W / 2, H * 0.72);
    }
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    const m = new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
    const sp = new T.Sprite(m);
    const sw = opt.scale || 3.2;
    sp.scale.set(sw, sw * H / W, 1);
    return sp;
  }

  /* ---------- 设备造型 ---------- */
  // ---------------------------------------------------------------
  // 倒角盒：把场景里所有方块换成"切角 + 顶点法线共享"的几何
  // 真实工厂里没有绝对锐边的钢板/铸件，锐边正是"积木感"的首要来源。
  // 24 顶点 / 26 面（6 八边形 + 12 棱斜面 + 8 角三角），共享顶点做法线
  // 平均后轮廓出现 0.5~1.6cm 的圆角，刚好是铸件倒圆与折弯 R 角的量级。
  // ---------------------------------------------------------------
  function chamferBox(w, h, d, cAmt) {
    const hx = w / 2, hy = h / 2, hz = d / 2;
    const H = [hx, hy, hz];
    let cc = (cAmt == null) ? Math.min(w, h, d) * 0.09 : cAmt;
    cc = Math.min(cc, Math.min(hx, Math.min(hy, hz)) * 0.45, 0.011);
    if (!(cc > 0.0009)) return new T.BoxGeometry(w, h, d);

    const vp = [];                       // 24 个切角点（仅用于查坐标）
    const vid = new Map();
    function V(x, y, z) {
      const k = Math.round(x * 1e4) + ',' + Math.round(y * 1e4) + ',' + Math.round(z * 1e4);
      let i = vid.get(k);
      if (i === undefined) { i = vp.length / 3; vp.push(x, y, z); vid.set(k, i); }
      return i;
    }
    for (let a = 0; a < 3; a++) {
      for (let b = 0; b < 3; b++) {
        if (b === a) continue;
        const c = 3 - a - b;
        for (const sa of [-1, 1]) for (const sb of [-1, 1]) for (const sc of [-1, 1]) {
          const p = [0, 0, 0];
          p[a] = sa * H[a]; p[b] = sb * H[b]; p[c] = sc * (H[c] - cc);
          V(p[0], p[1], p[2]);
        }
      }
    }

    const pos = [], nrm = [], uv = [];
    function emitPoly(ids, ex, ey, ez) {
      // 用多边形前三点定平面法线（凸面且共面）
      const A3 = ids[0] * 3, B3 = ids[1] * 3, C3 = ids[2] * 3;
      const ux = vp[B3] - vp[A3], uy = vp[B3 + 1] - vp[A3 + 1], uz = vp[B3 + 2] - vp[A3 + 2];
      const vx = vp[C3] - vp[A3], vy = vp[C3 + 1] - vp[A3 + 1], vz = vp[C3 + 2] - vp[A3 + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const L = Math.hypot(nx, ny, nz) || 1;
      nx /= L; ny /= L; nz /= L;
      let order = ids;
      if (nx * ex + ny * ey + nz * ez < 0) { nx = -nx; ny = -ny; nz = -nz; order = ids.slice().reverse(); }
      for (let i = 1; i < order.length - 1; i++) {
        for (const id of [order[0], order[i], order[i + 1]]) {
          const x = vp[id * 3], y = vp[id * 3 + 1], z = vp[id * 3 + 2];
          pos.push(x, y, z); nrm.push(nx, ny, nz);
          uv.push(x / Math.max(w, 1e-4) + 0.5, y / Math.max(h, 1e-4) + 0.5);
        }
      }
    }

    // 6 个八边形面
    for (let a = 0; a < 3; a++) {
      const b = (a + 1) % 3, c = (a + 2) % 3;
      for (const sa of [-1, 1]) {
        const list = [];
        for (const sb of [-1, 1]) for (const sc of [-1, 1]) {
          const p1 = [0, 0, 0]; p1[a] = sa * H[a]; p1[b] = sb * H[b]; p1[c] = sc * (H[c] - cc);
          list.push(V(p1[0], p1[1], p1[2]));
          const p2 = [0, 0, 0]; p2[a] = sa * H[a]; p2[b] = sb * (H[b] - cc); p2[c] = sc * H[c];
          list.push(V(p2[0], p2[1], p2[2]));
        }
        list.sort((i, j) => Math.atan2(vp[i * 3 + c], vp[i * 3 + b]) - Math.atan2(vp[j * 3 + c], vp[j * 3 + b]));
        const e = [0, 0, 0]; e[a] = sa;
        emitPoly(list, e[0], e[1], e[2]);
      }
    }

    // 12 条棱斜面（两段，做出一点圆角过渡）
    for (let a = 0; a < 3; a++) {
      const b = (a + 1) % 3, c = (a + 2) % 3;
      for (const sb of [-1, 1]) for (const sc of [-1, 1]) {
        const mk = (sa, which) => {
          const p = [0, 0, 0];
          p[a] = sa * (H[a] - cc);
          if (which === 0) { p[b] = sb * H[b]; p[c] = sc * (H[c] - cc); }
          else { p[b] = sb * (H[b] - cc); p[c] = sc * H[c]; }
          return V(p[0], p[1], p[2]);
        };
        const ids = [mk(-1, 0), mk(1, 0), mk(1, 1), mk(-1, 1)];
        const e = [0, 0, 0]; e[b] = sb; e[c] = sc;
        emitPoly(ids, e[0], e[1], e[2]);
      }
    }

    // 8 个角三角
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const ids = [
        V(sx * (hx - cc), sy * hy, sz * hz),
        V(sx * hx, sy * (hy - cc), sz * hz),
        V(sx * hx, sy * hy, sz * (hz - cc))
      ];
      emitPoly(ids, sx, sy, sz);
    }

    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    return g;
  }

  function box(w, h, d, mat, x, y, z) {
    const m = new T.Mesh(chamferBox(w, h, d), mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  function cyl(rt, rb, h, mat, x, y, z, seg) {
    const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 20), mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  function rot(m, axis, ang) { m.rotation[axis] = ang; return m; }

  function modelWelder() {
    const g = new T.Group();
    g.add(box(1.5, 1.3, 1.0, MAT.steelDark, 0, 0.65, 0));
    g.add(box(1.44, 0.28, 0.94, MAT.paint, 0, 1.28, 0));
    g.add(box(0.5, 0.28, 0.06, MAT.black, -0.34, 1.0, 0.52));
    g.add(box(0.08, 0.08, 0.02, MAT.mg, 0.16, 1.05, 0.56));
    g.add(cyl(0.1, 0.1, 0.14, MAT.black, 0.52, 0.85, 0.5));
    /* ---------- 焊接小台 + 工件（弧光的落点，否则电弧悬在半空很假）----------
       放在机身左前侧：+x 方向背后贴墙、从房间内看会被机箱挡住，看不到弧光 */
    const WX = -1.05, WZ = 0.45;         // 焊接台中心（模型局部坐标）
    g.add(box(0.44, 0.045, 0.36, MAT.steelDark, WX, 0.31, WZ));            // 台面
    [[-0.19, -0.15], [0.19, -0.15], [-0.19, 0.15], [0.19, 0.15]].forEach(([a, b]) => {
      g.add(box(0.035, 0.31, 0.035, MAT.steelDark, WX + a, 0.155, WZ + b)); // 四条腿
    });
    g.add(box(0.40, 0.02, 0.32, MAT.steelDark, WX, 0.115, WZ));            // 下横撑
    // 工件：横板 + 立板，交界处就是焊缝
    g.add(box(0.26, 0.040, 0.09, MAT.steel, WX - 0.04, 0.3525, WZ));
    g.add(box(0.04, 0.16, 0.09, MAT.steel, WX + 0.05, 0.4525, WZ));

    /* ---------- 焊枪（可摆动：枪口是 torchG 的局部原点）---------- */
    const torchG = new T.Group();
    torchG.position.set(WX + 0.03, 0.40, WZ);
    torchG.add(cyl(0.028, 0.021, 0.09, new T.MeshStandardMaterial({
      color: 0xc9c2ae, roughness: 0.62, metalness: 0.05
    }), 0, 0.045, 0, 16));                                                 // 陶瓷喷嘴
    torchG.add(cyl(0.020, 0.020, 0.05, MAT.brass, 0, 0.115, 0, 12));       // 铜接头
    torchG.add(cyl(0.019, 0.019, 0.15, MAT.steel, 0, 0.21, 0, 12));        // 枪管
    const grip = box(0.048, 0.13, 0.048, MAT.black, -0.008, 0.20, 0.055);  // 手柄
    grip.rotation.x = -0.26; torchG.add(grip);
    torchG.add(cyl(0.015, 0.015, 0.055, MAT.black, 0, 0.285, -0.015, 10)); // 尾部电缆接头
    torchG.rotation.z = -0.12;
    g.add(torchG);

    /* ---------- 电缆：机身接口 → 枪尾 ---------- */
    const curve = new T.CatmullRomCurve3([
      new T.Vector3(0.45, 0.85, 0.52), new T.Vector3(-0.18, 0.56, 0.82),
      new T.Vector3(-0.78, 0.34, 0.68), new T.Vector3(-1.02, 0.66, 0.44)
    ]);
    const tube = new T.Mesh(new T.TubeGeometry(curve, 26, 0.030, 8, false), MAT.black);
    tube.castShadow = true;
    g.add(tube);

    /* ---------- 弧光：一个小发光球 + 真正的点光源（会照亮工件和台面）---------- */
    const arc = new T.Mesh(new T.SphereGeometry(0.042, 12, 10),
      new T.MeshBasicMaterial({ color: 0xeaf4ff }));
    arc.position.set(WX + 0.03, 0.378, WZ);
    arc.visible = false;
    g.add(arc);
    const arcLight = new T.PointLight(0xc4dcff, 0, 2.6, 2);
    arcLight.position.copy(arc.position);
    g.add(arcLight);

    /* ---------- 火花粒子 ---------- */
    const sparks = [];
    const sparkMat = new T.MeshBasicMaterial({ color: 0xffdf92 });
    for (let i = 0; i < 18; i++) {
      const s = new T.Mesh(new T.BoxGeometry(0.013, 0.013, 0.013), sparkMat);
      s.visible = false;
      s.userData = { v: new T.Vector3(), life: 0 };
      g.add(s);
      sparks.push(s);
    }

    /* ---------- 面板指示灯：单独一份材质，才好单独调亮度 ---------- */
    const glowMat = new T.MeshStandardMaterial({ color: 0x001408, emissive: 0x39ff88, emissiveIntensity: 0.6 });
    const glow = box(0.18, 0.06, 0.02, glowMat, -0.34, 1.0, 0.56);
    g.add(glow);

    g.userData.arc = arc;
    g.userData.arcLight = arcLight;
    g.userData.torch = torchG;
    g.userData.torchZ = WZ;
    g.userData.sparks = sparks;
    g.userData.glowMat = glowMat;
    return g;
  }

  function modelDrill() {
    const g = new T.Group();

    /* ---------- 底座 ---------- */
    g.add(box(1.00, 0.028, 0.74, MAT.black, 0, 0.014, 0.02));          // 底座底脚
    g.add(box(0.90, 0.085, 0.64, MAT.steelDark, 0, 0.070, 0.02));       // 底座本体
    for (let i = -1; i <= 1; i++) {                                      // 底座 T 型槽
      g.add(box(0.028, 0.012, 0.52, MAT.black, i * 0.24, 0.115, 0.05));
    }
    [[-0.40, -0.28], [0.40, -0.28], [-0.40, 0.32], [0.40, 0.32]].forEach(([a, b]) => { // 底座地脚螺栓
      g.add(cyl(0.018, 0.018, 0.02, MAT.steel, a, 0.12, b, 8));
    });

    /* ---------- 立柱 ---------- */
    g.add(cyl(0.118, 0.138, 0.10, MAT.steelDark, 0, 0.16, -0.24, 26));  // 立柱法兰座
    for (let i = 0; i < 4; i++) {                                        // 法兰螺栓
      const a = i * Math.PI / 2 + Math.PI / 4;
      g.add(cyl(0.014, 0.014, 0.03, MAT.steel, Math.cos(a) * 0.108, 0.215, -0.24 + Math.sin(a) * 0.108, 8));
    }
    g.add(cyl(0.062, 0.062, 1.62, MAT.steel, 0, 1.00, -0.24, 26));       // 立柱
    g.add(box(0.030, 1.34, 0.052, MAT.steelDark, 0.068, 1.00, -0.24));   // 升降齿条
    g.add(cyl(0.070, 0.070, 0.05, MAT.steel, 0, 1.83, -0.24, 26));       // 立柱顶盖

    /* ---------- 工作台 ---------- */
    const table = new T.Group();
    table.position.set(-0.02, 0.44, 0.02);
    table.add(box(0.58, 0.048, 0.46, MAT.steel, 0, 0, 0));               // 台面
    table.add(box(0.60, 0.010, 0.48, MAT.steelDark, 0, 0.026, 0));       // 台面压边
    for (let i = -1; i <= 1; i++)                                        // 台面 T 槽
      table.add(box(0.022, 0.014, 0.46, MAT.black, i * 0.17, 0.031, 0));
    table.add(box(0.20, 0.16, 0.13, MAT.steelDark, 0.02, -0.10, -0.20)); // 升降支架
    // 升降手轮
    const tcrank = new T.Group();
    tcrank.position.set(0.02, -0.09, -0.30);
    tcrank.add(rot(cyl(0.012, 0.012, 0.14, MAT.steel, 0, 0, 0, 8), 'x', Math.PI / 2));
    tcrank.add(rot(cyl(0.055, 0.055, 0.018, MAT.black, 0, 0, 0.085, 18), 'x', Math.PI / 2));
    tcrank.add(cyl(0.010, 0.010, 0.05, MAT.steel, 0.040, 0, 0.10, 8));
    table.add(tcrank);
    // 工件 + 挡块（钻削目标）
    const work = box(0.16, 0.07, 0.14, MAT.steel, -0.05, 0.059, 0.02);
    work.name = 'work';
    table.add(work);
    table.add(box(0.10, 0.10, 0.05, MAT.paint, -0.05, 0.055, 0.12));     // 挡块
    table.add(box(0.04, 0.04, 0.10, MAT.black, -0.05, 0.115, 0.06));     // 压板
    g.add(table);
    g.userData.table = table;

    /* ---------- 机头 ---------- */
    const head = new T.Group();
    head.add(box(0.50, 0.42, 0.42, MAT.paintLt, 0, 1.28, -0.05));         // 机头主体
    head.add(box(0.52, 0.05, 0.44, MAT.steelDark, 0, 1.512, -0.05));     // 顶盖
    head.add(box(0.30, 0.15, 0.05, MAT.black, 0.01, 1.30, 0.145));       // 面板底衬
    head.add(box(0.20, 0.07, 0.02, MAT.cy, 0.01, 1.32, 0.175));          // 显示屏
    head.add(box(0.075, 0.10, 0.045, MAT.black, 0.17, 1.13, 0.145));     // 开关盒
    head.add(rot(cyl(0.020, 0.020, 0.014, MAT.gn, 0.17, 1.16, 0.172, 12), 'x', Math.PI / 2)); // 绿色指示灯
    head.add(rot(cyl(0.034, 0.034, 0.028, MAT.mg, 0.17, 1.09, 0.172, 16), 'x', Math.PI / 2)); // 急停
    head.add(box(0.17, 0.28, 0.24, MAT.steelDark, 0, 1.34, -0.26));      // 皮带罩
    head.add(rot(cyl(0.115, 0.115, 0.30, MAT.black, -0.02, 1.60, 0.02, 22), 'x', Math.PI / 2)); // 电机
    head.add(rot(cyl(0.118, 0.118, 0.028, MAT.steel, -0.02, 1.60, 0.18, 22), 'x', Math.PI / 2)); // 电机端盖
    head.add(cyl(0.012, 0.012, 0.24, MAT.steel, -0.245, 1.32, 0.06, 8)); // 深度限位杆
    head.add(cyl(0.032, 0.032, 0.03, MAT.mg, -0.245, 1.21, 0.06, 14));   // 限位挡圈
    head.add(box(0.12, 0.03, 0.06, MAT.steel, 0.16, 1.555, -0.20));      // 皮带罩固定耳
    // 进给手轮（三辐）
    const handle = new T.Group();
    handle.position.set(0.34, 1.24, -0.06);
    handle.add(rot(cyl(0.022, 0.022, 0.09, MAT.steel, -0.045, 0, 0, 12), 'z', Math.PI / 2));
    for (let i = 0; i < 3; i++) {
      const arm = new T.Group();
      arm.add(cyl(0.011, 0.011, 0.24, MAT.steel, 0, 0.12, 0, 8));
      arm.add(cyl(0.024, 0.024, 0.075, MAT.black, 0, 0.255, 0, 12));
      arm.rotation.z = (i * Math.PI * 2) / 3;
      handle.add(arm);
    }
    head.add(handle);
    g.add(head);
    g.userData.handle = handle;

    /* ---------- 主轴 / 钻夹 / 钻头（旋转 + 下压） ---------- */
    const quill = new T.Group();
    quill.position.set(0, 0, 0.02);
    quill.add(cyl(0.056, 0.056, 0.22, MAT.steel, 0, 0.965, 0, 20));      // 主轴套
    quill.add(cyl(0.058, 0.058, 0.022, MAT.steel, 0, 0.855, 0, 20));     // 锁紧环
    quill.add(cyl(0.060, 0.074, 0.12, MAT.steelDark, 0, 0.795, 0, 20));  // 钻夹头
    // 钻夹头上的钥匙孔（用来体现旋转）
    quill.add(box(0.018, 0.085, 0.018, MAT.black, 0.052, 0.795, 0));
    quill.add(box(0.018, 0.085, 0.018, MAT.black, 0, 0.795, 0.052));
    quill.add(cyl(0.062, 0.062, 0.012, MAT.black, 0, 0.735, 0, 20));     // 卡爪底环
    const bit = cyl(0.013, 0.004, 0.20, MAT.steel, 0, 0.635, 0, 10);     // 钻头
    quill.add(bit);
    quill.add(box(0.020, 0.13, 0.006, MAT.steelDark, 0.008, 0.655, 0.008)); // 排屑槽
    g.add(quill);
    g.userData.quill = quill;
    g.userData.spin = quill;
    g.userData.bitTip = 0.542;

    /* ---------- 工作灯 ---------- */
    g.add(rot(cyl(0.011, 0.011, 0.26, MAT.steel, 0.22, 1.52, 0.10, 8), 'x', 0.55));
    g.add(cyl(0.048, 0.036, 0.06, MAT.steelDark, 0.22, 1.44, 0.26, 16));
    g.add(cyl(0.038, 0.038, 0.008, MAT.ye, 0.22, 1.408, 0.26, 16));
    const dl = new T.PointLight(0xd6f0ff, 0.55, 2.0, 2);
    dl.position.set(0.05, 0.72, 0.20);
    g.add(dl);
    g.userData.lamp = dl;

    /* ---------- 铁屑池 ---------- */
    const chips = [];
    for (let i = 0; i < 16; i++) {
      const c = box(0.014, 0.007, 0.014, MAT.steel, 0, -9, 0);
      c.visible = false; c.castShadow = false;
      c.userData.v = new T.Vector3();
      c.userData.life = 0;
      g.add(c);
      chips.push(c);
    }
    g.userData.chips = chips;
    return g;
  }

  /* 老式铸铁车床：床身/主轴箱/走刀箱/溜板/尾座/丝杠，按参考图那台机器还原 */
  function modelLathe() {
    const g = new T.Group();
    const IRON = MAT.iron, IROND = MAT.ironD, MACH = MAT.mach, PAINT = MAT.paint;
    const RZ = (m) => rot(m, 'x', Math.PI / 2);   // 轴向沿 Z 的圆柱

    /* 老车床的"三层材质对比"：刷漆铸铁 / 研磨导轨 / 黑胶木手柄。
       三者反光完全不同，这是它从"灰色塑料模型"变成"一台机器"的最大来源。
       clone 是为了继承 MAT.iron 已挂好的铸铁麻面法线贴图与粗糙度扰动。 */
    const PBody = MAT.iron.clone();          // 漆身：老机床灰绿，哑光
    PBody.color.setHex(0x7d8072); PBody.metalness = 0.04; PBody.roughness = 0.54;
    const PDark = MAT.ironD.clone();         // 漆身暗部：底面、凹槽
    PDark.color.setHex(0x5c5f53); PDark.metalness = 0.05; PDark.roughness = 0.62;
    const WAY = MAT.mach.clone();            // 裸露研磨导轨：亮钢，强反光
    WAY.color.setHex(0xb9b6a7); WAY.metalness = 0.86; WAY.roughness = 0.20;
    const BAK = MAT.black.clone();           // 黑胶木手柄
    BAK.color.setHex(0x14140f); BAK.roughness = 0.50;

    /* ---------- 铸铁立柱底座（两台）---------- */
    function pedestal(z) {
      const p = new T.Group();
      p.add(box(0.62, 0.055, 0.56, PDark, 0, 0.028, 0));         // 地脚板（外扩一圈）
      p.add(box(0.54, 0.045, 0.48, PBody, 0, 0.078, 0));         // 地脚台阶
      p.add(box(0.48, 0.30, 0.40, PBody, 0, 0.25, 0));           // 立柱下段
      p.add(box(0.42, 0.30, 0.34, PBody, 0, 0.55, 0));           // 立柱上段（收窄 → 锥形）
      p.add(box(0.50, 0.06, 0.42, PDark, 0, 0.69, 0));           // 顶托板（顶面 0.72 承床身）
      // 四角铸造凸棱 —— 立柱不再是一整块方块
      [[0.238, 0.198], [-0.238, 0.198], [0.238, -0.198], [-0.238, -0.198]].forEach(([a, b]) => {
        p.add(box(0.030, 0.58, 0.030, PBody, a, 0.40, b));
      });
      // 前后腹板凹槽（铸造减重）
      [0.208, -0.208].forEach((z2) => p.add(box(0.30, 0.26, 0.012, PDark, 0, 0.32, z2)));
      // 地脚螺栓 + 垫片
      [[-0.21, -0.19], [0.21, -0.19], [-0.21, 0.19], [0.21, 0.19]].forEach(([a, b]) => {
        p.add(cyl(0.024, 0.024, 0.010, PDark, a, 0.060, b, 10));
        p.add(cyl(0.015, 0.015, 0.028, MACH, a, 0.078, b, 8));
      });
      p.position.z = z;
      return p;
    }
    g.add(pedestal(-0.80));
    g.add(pedestal(0.90));

    /* ---------- 床身（厚重铸铁箱体，不是架起来的薄板）---------- */
    const BEDY = 0.79;
    g.add(box(0.46, 0.130, 2.38, PBody, 0, 0.785, 0.05));        // 床身箱体（底面 0.72）
    g.add(box(0.48, 0.020, 2.40, PDark, 0, 0.860, 0.05));        // 导轨台面
    g.add(box(0.48, 0.026, 2.40, PDark, 0, 0.733, 0.05));        // 下沿
    // 侧面横向加强肋：铸铁箱体的标志，去掉"一片铁板"的观感
    for (let i = 0; i < 6; i++) {
      const zz = -1.12 + i * 0.45;
      [0.234, -0.234].forEach((x) => g.add(box(0.014, 0.095, 0.048, PBody, x, 0.79, zz)));
    }
    // 两条研磨导轨（亮钢，与哑光漆身形成强对比）
    [-0.115, 0.115].forEach((x) => {
      g.add(box(0.092, 0.030, 2.34, WAY, x, 0.884, 0.05));
    });
    // 中间让刀槽
    g.add(box(0.10, 0.016, 2.30, PDark, 0, 0.862, 0.05));
    // 齿条护板
    g.add(box(0.03, 0.07, 2.26, PDark, 0.225, BEDY - 0.02, 0.05));
    // 床身端面法兰
    [-1.15, 1.20].forEach((z) => g.add(box(0.44, 0.15, 0.03, PDark, 0, BEDY, z)));

    /* ---------- 接屑盘（带卷边）---------- */
    g.add(box(0.74, 0.025, 2.10, PDark, 0, 0.655, 0.05));
    g.add(box(0.74, 0.10, 0.02, PDark, 0, 0.705, 1.09));
    g.add(box(0.74, 0.10, 0.02, PDark, 0, 0.705, -0.99));
    [0.37, -0.37].forEach((x) => g.add(box(0.02, 0.10, 2.10, PDark, x, 0.705, 0.05)));
    // 卷边：钣金边圆角，去掉"四张纸片围一圈"的感觉
    [0.37, -0.37].forEach((x) => g.add(RZ(cyl(0.012, 0.012, 2.10, PDark, x, 0.755, 0.05, 8))));
    [1.09, -0.99].forEach((z) => g.add(rot(cyl(0.012, 0.012, 0.74, PDark, 0, 0.755, z, 8), 'z', Math.PI / 2)));

    /* ---------- 主轴箱 ---------- */
    const HY = 1.15;
    g.add(box(0.46, 0.58, 0.56, PBody, 0, 1.19, -0.83));          // 箱体（底面 0.90 坐在床身上）
    g.add(box(0.48, 0.08, 0.58, PDark, 0, 1.52, -0.83));          // 箱顶
    g.add(box(0.32, 0.06, 0.32, PBody, 0, 1.58, -0.83));          // 顶盖凸台
    g.add(box(0.34, 0.34, 0.03, PDark, 0, 1.19, -0.565));         // 前脸凸台（做出层次）
    // 顶部变速拨杆
    g.add(cyl(0.012, 0.012, 0.17, MACH, 0.11, 1.67, -0.74, 8));
    g.add(cyl(0.026, 0.026, 0.034, BAK, 0.11, 1.77, -0.74, 12));

    // 主轴头 + 法兰 + 三爪卡盘
    g.add(RZ(cyl(0.105, 0.115, 0.10, WAY, 0, HY, -0.52, 24)));    // 主轴法兰（研磨亮面）
    const chuck = new T.Group();
    chuck.position.set(0, HY, -0.44);
    chuck.add(RZ(cyl(0.150, 0.155, 0.115, WAY, 0, 0, 0, 28)));    // 卡盘体
    chuck.add(RZ(cyl(0.142, 0.142, 0.012, PDark, 0, 0, 0.062, 28))); // 端面台阶
    for (let i = 0; i < 3; i++) {                                  // 三爪：做阶梯牙，不再是三块平砖
      const a = (i / 3) * Math.PI * 2 + 0.4;
      const jaw = box(0.048, 0.056, 0.058, MACH, Math.cos(a) * 0.072, Math.sin(a) * 0.072, 0.048);
      jaw.rotation.z = a;
      chuck.add(jaw);
      const jaw2 = box(0.034, 0.040, 0.042, MACH, Math.cos(a) * 0.064, Math.sin(a) * 0.064, 0.098);
      jaw2.rotation.z = a;
      chuck.add(jaw2);
      // 夹爪调节孔 + 卡盘扳手方孔
      chuck.add(RZ(cyl(0.013, 0.013, 0.02, PDark, Math.cos(a + 0.5) * 0.112, Math.sin(a + 0.5) * 0.112, 0.055, 10)));
      chuck.add(box(0.019, 0.019, 0.008, MAT.black, Math.cos(a + 1.05) * 0.118, Math.sin(a + 1.05) * 0.118, 0.066));
    }
    // 工件（车到一半的轴）
    chuck.add(RZ(cyl(0.036, 0.036, 0.40, MACH, 0, 0, 0.32, 18)));
    chuck.add(RZ(cyl(0.030, 0.030, 0.10, MAT.brass, 0, 0, 0.52, 14)));  // 铜环
    // 工件表面一条键槽标记：圆柱本身是对称的，转起来看不出动，
    // 全靠这条黑线 + 三爪才让人看见"卡盘在转"
    chuck.add(box(0.009, 0.008, 0.36, MAT.black, 0, 0.034, 0.30));
    chuck.add(box(0.007, 0.007, 0.030, MAT.black, 0, 0.030, 0.57));     // 端面记号
    g.add(chuck);

    // 主轴箱侧面的变速手柄（朝外伸出）+ 铭牌 + 油标
    [[-0.62, 1.30, 0.16], [-0.62, 1.10, 0.12], [-0.95, 1.30, 0.13]].forEach(([z, y, len]) => {
      const stem = cyl(0.016, 0.016, len, MACH, 0.235 + len / 2, y, z, 10);
      stem.rotation.z = Math.PI / 2;
      g.add(stem);
      const knob = cyl(0.030, 0.030, 0.048, BAK, 0.238 + len, y, z, 12);   // 黑胶木球头
      knob.rotation.z = Math.PI / 2;
      g.add(knob);
      g.add(box(0.028, 0.058, 0.058, PBody, 0.238, y, z));                 // 手柄根部铸出凸台
    });
    // 转速铭牌：黄铜底板要比字牌大一圈，边缘露出铜色
    g.add(box(0.004, 0.112, 0.152, MAT.brass, 0.231, HY + 0.10, -0.72));
    g.add(box(0.006, 0.096, 0.136, MAT.paper, 0.234, HY + 0.10, -0.72));
    g.add(RZ(cyl(0.022, 0.022, 0.014, MAT.brass, 0.231, HY - 0.16, -0.66, 12))); // 油标
    // 后置电机 + 皮带罩
    g.add(rot(cyl(0.135, 0.135, 0.30, IROND, -0.44, 0.62, -0.86, 20), 'z', Math.PI / 2));
    g.add(box(0.10, 0.34, 0.42, IRON, -0.32, 1.02, -0.86));        // 皮带罩
    g.add(box(0.11, 0.26, 0.44, PAINT, -0.315, 0.72, -0.86));

    /* ---------- 走刀箱（床头前端面）---------- */
    g.add(box(0.30, 0.34, 0.16, PBody, -0.03, 0.68, -1.20));
    [0.60, 0.74].forEach((y) => {
      const k = cyl(0.014, 0.014, 0.12, MACH, 0.145, y, -1.24, 8);
      k.rotation.z = Math.PI / 2; g.add(k);
      const kn = cyl(0.026, 0.026, 0.036, BAK, 0.215, y, -1.24, 12);   // 黑胶木球头
      kn.rotation.z = Math.PI / 2; g.add(kn);
    });
    g.add(RZ(cyl(0.045, 0.045, 0.02, MACH, -0.03, 0.68, -1.29, 16)));      // 进给表盘
    g.add(RZ(cyl(0.048, 0.048, 0.008, MAT.brass, -0.03, 0.68, -1.302, 16))); // 表盘铜圈

    /* ---------- 溜板 + 刀架 ---------- */
    const CAR = 0.26;
    // 溜板（骑在导轨上）
    const saddle = new T.Group();
    saddle.position.set(0, BEDY + 0.13, CAR);
    saddle.add(box(0.40, 0.11, 0.34, PBody, 0, 0, 0));
    saddle.add(box(0.42, 0.020, 0.36, PDark, 0, 0.055, 0));
    // 与导轨的贴合面（亮钢，说明它真的骑在导轨上，不是浮着）
    [-0.115, 0.115].forEach((x) => saddle.add(box(0.090, 0.012, 0.34, WAY, x, -0.058, 0)));
    // 横向滑板
    saddle.add(box(0.30, 0.075, 0.30, PBody, 0, 0.095, 0.02));
    saddle.add(box(0.28, 0.012, 0.28, MACH, 0, 0.135, 0.02));
    // 小刀架
    saddle.add(box(0.20, 0.075, 0.20, PBody, 0.01, 0.175, 0.0));
    // 四工位刀台
    const post = box(0.15, 0.13, 0.15, PDark, 0.01, 0.265, 0.0);
    post.rotation.y = 0.4; saddle.add(post);
    // 车刀（伸向工件）
    const tool = box(0.035, 0.030, 0.17, MACH, 0.01, 0.30, -0.10);
    tool.rotation.x = -0.12; saddle.add(tool);
    saddle.add(box(0.05, 0.045, 0.03, PDark, 0.01, 0.305, 0.0));
    // 横向进给手轮：做成辐条轮，不是一块圆饼
    const cw = new T.Group();
    cw.position.set(-0.30, 0.095, 0.02);
    cw.add(rot(cyl(0.012, 0.012, 0.10, MACH, 0.05, 0, 0, 8), 'z', Math.PI / 2));
    cw.add(rot(cyl(0.075, 0.075, 0.012, PDark, 0.115, 0, 0, 20), 'z', Math.PI / 2));   // 轮缘
    cw.add(rot(cyl(0.026, 0.026, 0.024, MACH, 0.118, 0, 0, 12), 'z', Math.PI / 2));    // 轮毂
    for (let i = 0; i < 4; i++) {                                                       // 四根辐条
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const sp = box(0.010, 0.100, 0.014, PDark, 0.113, Math.cos(a) * 0.05, Math.sin(a) * 0.05);
      sp.rotation.z = a - Math.PI / 2;
      cw.add(sp);
    }
    cw.add(cyl(0.010, 0.010, 0.055, MACH, 0.113, 0.062, 0, 8));                         // 手柄杆
    cw.add(cyl(0.020, 0.020, 0.05, BAK, 0.113, 0.092, 0, 10));                          // 黑胶木握球
    saddle.add(cw);
    g.add(saddle);

    // 溜板箱（正面，带手动进给轮）
    const apron = new T.Group();
    apron.position.set(0.16, BEDY - 0.06, CAR);
    apron.add(box(0.22, 0.34, 0.16, PBody, 0, -0.06, 0));
    for (let i = 0; i < 3; i++) {                                     // 三个操纵手柄
      const st = cyl(0.013, 0.013, 0.10, MACH, 0.155, -0.02 + i * 0.09, -0.02, 8);
      st.rotation.z = Math.PI / 2; apron.add(st);
      const kb = cyl(0.022, 0.022, 0.030, BAK, 0.205, -0.02 + i * 0.09, -0.02, 10);
      kb.rotation.z = Math.PI / 2; apron.add(kb);
    }
    // 开合螺母手柄（溜板箱下部，横向长杆）
    const nut = new T.Group();
    nut.position.set(0.125, -0.195, 0.05);
    nut.add(rot(cyl(0.012, 0.012, 0.16, MACH, 0, 0, 0, 8), 'z', Math.PI / 2));
    nut.add(cyl(0.024, 0.024, 0.036, BAK, 0.10, 0, 0, 10));
    apron.add(nut);
    const aw = new T.Group();
    aw.position.set(0.115, -0.13, 0.0);
    aw.add(rot(cyl(0.010, 0.010, 0.09, MACH, 0.045, 0, 0, 8), 'z', Math.PI / 2));
    aw.add(rot(cyl(0.062, 0.062, 0.012, PDark, 0.10, 0, 0, 18), 'z', Math.PI / 2));
    aw.add(cyl(0.009, 0.009, 0.05, MACH, 0.10, 0.055, 0, 8));
    apron.add(aw);
    // 螺纹表
    apron.add(rot(cyl(0.030, 0.030, 0.012, MACH, 0.10, 0.10, -0.02, 14), 'z', Math.PI / 2));
    g.add(apron);

    /* ---------- 尾座 ---------- */
    const TS = 0.92;
    g.add(box(0.34, 0.10, 0.34, PBody, 0, BEDY + 0.13, TS));          // 尾座底板
    g.add(box(0.03, 0.14, 0.34, PDark, 0.175, BEDY + 0.10, TS));      // 压板
    g.add(box(0.26, 0.24, 0.26, PBody, 0, BEDY + 0.30, TS));          // 尾座体
    g.add(box(0.28, 0.03, 0.28, PDark, 0, BEDY + 0.42, TS));
    g.add(RZ(cyl(0.032, 0.032, 0.34, MACH, 0, HY, TS - 0.10, 16)));   // 套筒
    // 顶尖：圆锥，不是一根圆柱（原来一眼假）
    g.add(RZ(cyl(0.046, 0.007, 0.078, MACH, 0, HY, TS - 0.276, 14)));
    g.add(RZ(cyl(0.046, 0.046, 0.012, PDark, 0, HY, TS - 0.233, 16))); // 顶尖根部台阶
    // 尾座手轮
    const tw = new T.Group();
    tw.position.set(0, HY, TS + 0.20);
    tw.add(RZ(cyl(0.020, 0.020, 0.16, MACH, 0, 0, 0, 10)));
    tw.add(RZ(cyl(0.082, 0.082, 0.014, PDark, 0, 0, 0.09, 20)));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      tw.add(cyl(0.008, 0.008, 0.06, MACH, Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0.10, 8));
    }
    g.add(tw);
    // 尾座锁紧手柄
    g.add(RZ(cyl(0.013, 0.013, 0.14, MACH, 0.16, BEDY + 0.26, TS + 0.02, 8)));
    g.add(cyl(0.020, 0.020, 0.034, BAK, 0.16, BEDY + 0.26, TS + 0.10, 10));

    /* ---------- 丝杠 / 光杠 / 操纵杆 ---------- */
    // 丝杠单独成组：只有绕自身轴（z）自转，螺纹环才会跟着转，看出"进给在走"
    const screw = new T.Group();
    screw.position.set(-0.235, 0.62, 0.02);
    screw.add(RZ(cyl(0.024, 0.024, 2.10, MACH, 0, 0, 0, 12)));
    for (let i = 0; i < 52; i++) {                                        // 螺纹（细环，加密后像真螺纹）
      screw.add(RZ(cyl(0.027, 0.027, 0.004, MACH, 0, 0, -1.03 + i * 0.04, 10)));
    }
    g.add(screw);
    // 丝杠两端支撑座 —— 原来丝杠是悬空的，像一根插着的棍
    [1.03, -1.00].forEach((z) => {
      g.add(box(0.088, 0.125, 0.052, PBody, -0.235, 0.62, z));
      g.add(RZ(cyl(0.031, 0.031, 0.026, PDark, -0.235, 0.62, z + (z > 0 ? -0.033 : 0.033), 12)));
    });
    g.add(RZ(cyl(0.017, 0.017, 2.10, MACH, -0.185, 0.68, 0.02, 10)));    // 光杠
    g.add(RZ(cyl(0.014, 0.014, 2.10, IROND, -0.150, 0.74, 0.02, 8)));    // 操纵杆
    // 挂轮箱（床头左侧）
    g.add(box(0.10, 0.30, 0.34, PBody, -0.14, 0.52, -1.24));
    g.add(box(0.014, 0.245, 0.285, PDark, -0.196, 0.52, -1.24));         // 挂轮箱盖板

    /* ---------- 冷却液管 + 卡盘扳手（车间里最"活"的两件小东西）---------- */
    (function coolant() {
      const c = new T.Group();
      c.position.set(0.20, 1.42, -0.50);
      const h1 = cyl(0.010, 0.010, 0.12, MACH, 0.06, 0, 0, 8);
      h1.rotation.z = Math.PI / 2; c.add(h1);                          // ① 出箱，沿 +x
      c.add(cyl(0.010, 0.010, 0.17, MACH, 0.12, -0.085, 0, 8));        // ② 下垂
      const h2 = cyl(0.010, 0.010, 0.14, MACH, 0.12, -0.168, -0.07, 8);
      h2.rotation.x = Math.PI / 2; c.add(h2);                          // ③ 转向工件，沿 -z
      c.add(cyl(0.012, 0.008, 0.030, MAT.brass, 0.12, -0.188, -0.145, 8)); // ④ 铜喷嘴
      g.add(c);
    })();
    (function chuckKey() {
      const k = new T.Group();
      k.position.set(0.246, 1.32, -0.92);
      k.add(box(0.012, 0.012, 0.13, MACH, 0, 0, 0));                   // 横杆
      k.add(box(0.012, 0.085, 0.012, MACH, 0, -0.045, 0.058));         // 竖柄
      k.add(box(0.017, 0.017, 0.017, MAT.brass, 0, 0, -0.072));        // 四方头
      g.add(k);
    })();

    /* ---------- 台面上的铁屑/油渍 ---------- */
    for (let i = 0; i < 12; i++) {
      const c = box(0.012 + Math.random() * 0.02, 0.004, 0.012 + Math.random() * 0.03, MACH,
        (Math.random() - 0.5) * 0.5, 0.89, (Math.random() - 0.5) * 2.0);
      c.rotation.y = Math.random() * 3;
      c.castShadow = false;
      g.add(c);
    }
    /* ---------- 加工铁屑（车削时从刀尖甩出，跑在 renderFrame 里）---------- */
    const chips = [];
    for (let i = 0; i < 12; i++) {
      const c = box(0.011, 0.004, 0.020, MACH, 0, 0, 0);
      c.visible = false;
      c.castShadow = false;
      c.userData = { v: new T.Vector3(), life: 0 };
      g.add(c); chips.push(c);
    }

    // 运行时动画要靠这些引用：卡盘自转 / 溜板走刀 / 手轮 / 丝杠 / 铁屑
    g.userData.chuck = chuck;
    g.userData.saddle = saddle;
    g.userData.cw = cw;              // 横向进给手轮
    g.userData.screw = screw;        // 丝杠
    g.userData.chips = chips;
    g.userData.chipT = 0;
    g.userData.carZ = CAR;           // 溜板原位，停机要回到这里
    return g;
  }

  function modelPrinter() {
    const g = new T.Group();
    const s = 0.9;
    // 四立柱 + 顶框
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => {
      g.add(box(0.08, 1.5, 0.08, MAT.steel, a * s * 0.5, 0.75, b * s * 0.5));
    });
    g.add(box(1.0, 0.08, 1.0, MAT.steelDark, 0, 1.5, 0));
    g.add(box(1.0, 0.06, 1.0, MAT.steelDark, 0, 0.03, 0));
    g.add(box(0.86, 0.03, 0.86, MAT.black, 0, 0.1, 0));
    // 横梁
    g.add(box(1.0, 0.07, 0.07, MAT.steel, 0, 1.1, 0.3));
    // 打印头
    const head = box(0.18, 0.2, 0.18, MAT.paint, 0.3, 1.02, 0.3);
    head.name = 'head';
    g.add(head);
    g.add(box(0.06, 0.02, 0.06, MAT.mg, 0.3, 0.91, 0.3));
    g.userData.head = head;
    return g;
  }

  function modelScope() {
    const g = new T.Group();
    g.add(box(0.9, 0.5, 0.6, MAT.steelDark, 0, 0.72, 0));
    g.add(box(0.78, 0.42, 0.02, MAT.black, 0, 0.8, 0.31));
    g.add(box(0.62, 0.32, 0.01, MAT.cy, 0, 0.8, 0.33));
    // 桌面腿
    g.add(box(0.06, 0.48, 0.06, MAT.steel, -0.3, 0.24, -0.2));
    g.add(box(0.06, 0.48, 0.06, MAT.steel, 0.3, 0.24, -0.2));
    // 探头
    const pr = cyl(0.03, 0.03, 0.5, MAT.black, 0.5, 0.55, 0.2);
    pr.rotation.z = 0.4; g.add(pr);
    g.add(box(0.2, 0.03, 0.16, MAT.ye, 0.02, 0.98, 0));
    return g;
  }

  function modelCnc() {
    const g = new T.Group();
    g.add(box(2.2, 1.9, 2.0, MAT.steelDark, 0, 0.95, 0));
    g.add(box(2.0, 1.5, 0.06, MAT.glass, 0, 1.05, 1.02));
    g.add(box(2.24, 0.1, 2.04, MAT.paint, 0, 1.92, 0));
    // 门框霓虹
    g.add(box(2.05, 0.05, 0.05, MAT.cy, 0, 1.82, 1.05));
    // 内部亮光
    const inner = box(1.6, 0.06, 1.4, MAT.white, 0, 1.78, 0);
    g.add(inner);
    // 控制面板
    g.add(box(0.7, 0.5, 0.06, MAT.black, 0.6, 1.35, 1.06));
    g.add(box(0.4, 0.26, 0.02, MAT.cy, 0.6, 1.38, 1.1));
    // 按钮
    for (let i = 0; i < 5; i++) {
      const b = cyl(0.03, 0.03, 0.03, i === 0 ? MAT.mg : MAT.steel, 0.42 + i * 0.09, 1.16, 1.1, 10);
      b.rotation.x = Math.PI / 2; g.add(b);
    }
    return g;
  }

  const MODEL_BUILD = {
    welder: modelWelder, drill: modelDrill, lathe: modelLathe,
    printer: modelPrinter, scope: modelScope, cnc: modelCnc
  };

  function ghostFor(def) {
    const g = new T.Group();
    const GH = { welder: [1.7, 1.5, 1.2], drill: [1.05, 2.05, 0.9], lathe: [1.0, 1.9, 2.9], printer: [1.2, 1.7, 1.2], scope: [1.0, 1.3, 0.8], cnc: [2.4, 2.1, 2.2] };
    const s = GH[def.id] || [1.2, 1.5, 1.2];
    const geo = new T.BoxGeometry(s[0], s[1], s[2]);
    const edges = new T.LineSegments(
      new T.EdgesGeometry(geo),
      new T.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.28 })
    );
    edges.position.y = s[1] / 2;
    g.add(edges);
    const pad = new T.Mesh(new T.PlaneGeometry(s[0] * 1.35, s[2] * 1.35),
      new T.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.055, blending: T.AdditiveBlending, depthWrite: false }));
    pad.rotation.x = -Math.PI / 2; pad.position.y = 0.015;
    g.add(pad);
    // 标签：宽度按设备本体收窄，避免字比机器还大
    const label = textSprite(def.name, '#86ecff', '空位 · ' + fmt(def.price), { w: 512, h: 190, fs: 46, sfs: 27, scale: 2.75 });
    label.position.set(0, s[1] + 0.34, 0);
    label.material.opacity = 0.85;
    g.add(label);
    g.userData.ghost = true;
    return g;
  }

  function buildScene() {
    scene = new T.Scene();
    scene.background = new T.Color(0x05070c);
    scene.fog = new T.FogExp2(0x05070c, 0.026);

    const TRef = { ceil: [], pts: [] };

    // 木工房专属道具（只在 woodshop 风格显示，其余风格保持原样）
    const PROPS = new T.Group();
    PROPS.name = 'woodshopProps';
    scene.add(PROPS);
    TRef.props = PROPS;

    // ---- 地面（无墙，向远处延伸到雾里）----
    const floorMat = new T.MeshStandardMaterial({
      color: 0x0a0e15, metalness: 0.92, roughness: 0.26,
      emissive: 0x0d5f78, emissiveIntensity: 0.72, emissiveMap: gridTexture()
    });
    const floor = new T.Mesh(new T.PlaneGeometry(120, 120), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    TRef.floor = floorMat;
    TRef.floorMesh = floor;
    scene.userData.floorMesh = floor;

    // 地面外圈：一道低矮的挡水沿，给场地一个边界感（不是墙）
    const curbMat = new T.MeshStandardMaterial({ color: 0x171c24, metalness: 0.5, roughness: 0.7 });
    [[0, -12.4, 34, 0.16], [0, 12.4, 34, 0.16]].forEach(([x, z, w, d]) => {
      const c = new T.Mesh(new T.BoxGeometry(w, 0.12, d), curbMat);
      c.position.set(x, 0.06, z); c.receiveShadow = true; scene.add(c);
    });
    [-16.6, 16.6].forEach((x) => {
      const c = new T.Mesh(new T.BoxGeometry(0.16, 0.12, 25), curbMat);
      c.position.set(x, 0.06, 0); c.receiveShadow = true; scene.add(c);
    });

    // ---- 地面安全标线（围出作业区，替代原来的墙来界定空间）----
    const LINE_G = new T.Group();
    scene.add(LINE_G);
    TRef.lines = LINE_G;
    const Y = 0.008;
    [[0, -5.9, 13.0, 0.07], [0, 5.9, 13.0, 0.07]].forEach(([x, z, w, d]) => {
      const m = new T.Mesh(new T.BoxGeometry(w, 0.006, d), MAT.line);
      m.position.set(x, Y, z); LINE_G.add(m);
    });
    [[-6.4, 0, 0.07, 11.9], [6.4, 0, 0.07, 11.9]].forEach(([x, z, w, d]) => {
      const m = new T.Mesh(new T.BoxGeometry(w, 0.006, d), MAT.line);
      m.position.set(x, Y, z); LINE_G.add(m);
    });
    // 工作台中心的一条横向分区线
    const mid = new T.Mesh(new T.BoxGeometry(12.6, 0.006, 0.05), MAT.line);
    mid.position.set(0, Y, 2.55); LINE_G.add(mid);

    // ---- 场地物件：料架、工具箱、木托盘（把地面填满，不至于空荡）----
    function rack(x, z, ry) {
      const r = new T.Group();
      r.add(box(1.9, 0.06, 0.7, MAT.woodTop, 0, 0.16, 0));
      r.add(box(1.9, 0.06, 0.7, MAT.woodTop, 0, 0.86, 0));
      r.add(box(1.9, 0.06, 0.7, MAT.woodTop, 0, 1.56, 0));
      [[-0.9, -0.3], [0.9, -0.3], [-0.9, 0.3], [0.9, 0.3]].forEach(([a, b2]) => {
        r.add(box(0.07, 1.9, 0.07, MAT.steel, a, 0.95, b2));
      });
      // 架子上的料箱
      r.add(box(0.5, 0.3, 0.46, MAT.paint, -0.55, 0.36, 0));
      r.add(box(0.42, 0.26, 0.42, MAT.paintLt, 0.42, 1.05, 0));
      r.add(box(0.56, 0.34, 0.5, MAT.paint, 0.2, 1.78, 0));
      r.position.set(x, 0, z); r.rotation.y = ry || 0;
      r.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(r);
    }
    rack(-7.6, -4.9, 0.14);
    rack(-7.8, 1.2, -0.06);

    // 工具箱推车
    const cart = new T.Group();
    cart.add(box(0.86, 0.5, 0.52, MAT.paint, 0, 0.62, 0));
    cart.add(box(0.9, 0.05, 0.56, MAT.steelDark, 0, 0.9, 0));
    cart.add(box(0.86, 0.06, 0.5, MAT.black, 0, 0.36, 0));
    [[-0.36, -0.2], [0.36, -0.2], [-0.36, 0.2], [0.36, 0.2]].forEach(([a, b2]) => {
      cart.add(cyl(0.06, 0.06, 0.04, MAT.rubber, a, 0.07, b2));
    });
    cart.position.set(6.4, 0, 5.6); cart.rotation.y = -0.4;
    cart.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(cart);

    // 木托盘
    const pal = new T.Group();
    for (let i = 0; i < 5; i++) pal.add(box(1.0, 0.03, 0.14, MAT.woodDark, 0, 0.16, -0.4 + i * 0.2));
    pal.add(box(1.0, 0.02, 0.9, MAT.woodLight, 0, 0.19, 0));
    pal.position.set(-3.0, 0, 5.7);
    pal.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(pal);

    // ---- 工位背板：木质洞洞板 + 挂具 + 图纸（参考图里的工具墙）----
    function pegboard(x, w) {
      const G = new T.Group();
      G.add(box(w, 1.6, 0.06, MAT.cork, 0, 0, 0));
      // 边框
      G.add(box(w + 0.1, 0.08, 0.09, MAT.woodDark, 0, 0.82, 0));
      G.add(box(w + 0.1, 0.08, 0.09, MAT.woodDark, 0, -0.82, 0));
      G.add(box(0.08, 1.64, 0.09, MAT.woodDark, -w / 2 - 0.03, 0, 0));
      G.add(box(0.08, 1.64, 0.09, MAT.woodDark, w / 2 + 0.03, 0, 0));
      // 挂在板上的工具：手锯、锤子、扳手、钳子、角尺、卷尺、卡子
      const tools = [
        ['saw', -0.05], ['hammer', 0.30], ['wrench', 0.60],
        ['pliers', 0.86], ['square', -0.34], ['tape', -0.62]
      ];
      tools.forEach(([kind, fx]) => {
        const px = fx * (w / 2) / 0.9;
        if (Math.abs(px) > w / 2 - 0.12) return;
        if (kind === 'saw') {
          // 手锯：锯板 + 木柄
          G.add(box(0.34, 0.14, 0.012, MAT.steel, px, 0.30, 0.055));
          G.add(box(0.10, 0.16, 0.03, MAT.woodDark, px + 0.21, 0.30, 0.055));
          G.add(cyl(0.012, 0.012, 0.10, MAT.woodDark, px + 0.15, 0.30, 0.042)).rotation.z = Math.PI / 2;
        } else if (kind === 'hammer') {
          G.add(cyl(0.014, 0.017, 0.30, MAT.woodDark, px, 0.26, 0.055));
          G.add(box(0.13, 0.045, 0.045, MAT.steel, px, 0.42, 0.055));
        } else if (kind === 'wrench') {
          G.add(box(0.028, 0.30, 0.014, MAT.steel, px, 0.22, 0.055));
          G.add(cyl(0.042, 0.042, 0.016, MAT.steel, px, 0.38, 0.055)).rotation.x = Math.PI / 2;
        } else if (kind === 'pliers') {
          G.add(box(0.024, 0.26, 0.014, MAT.steelDark, px - 0.026, 0.20, 0.05));
          G.add(box(0.024, 0.26, 0.014, MAT.steelDark, px + 0.026, 0.20, 0.05));
          G.add(cyl(0.022, 0.022, 0.02, MAT.steel, px, 0.31, 0.062)).rotation.x = Math.PI / 2;
        } else if (kind === 'square') {
          G.add(box(0.028, 0.26, 0.014, MAT.steel, px, 0.20, 0.05));
          G.add(box(0.20, 0.028, 0.014, MAT.steel, px + 0.09, 0.07, 0.05));
        } else {
          // 卷尺：黄色小方块 + 挂孔
          G.add(box(0.09, 0.09, 0.05, MAT.ye, px, 0.16, 0.06));
          G.add(cyl(0.02, 0.02, 0.055, MAT.steelDark, px, 0.16, 0.06)).rotation.x = Math.PI / 2;
        }
      });
      // 板上钉的两只铁罐（放螺丝）
      [-0.72, 0.74].forEach((fx) => {
        const px = fx * (w / 2) / 0.9;
        if (Math.abs(px) > w / 2 - 0.08) return;
        G.add(cyl(0.055, 0.05, 0.09, MAT.steel, px, -0.10, 0.075));
      });
      // 贴的图纸 / 便条
      [[-w / 2 + 0.6, 0.42, 0.42, 0.56], [w / 2 - 0.9, 0.3, 0.34, 0.44], [0.2, 0.5, 0.3, 0.38]].forEach(([px, py, pw, ph]) => {
        if (Math.abs(px) > w / 2 - 0.2) return;
        G.add(box(pw, ph, 0.006, MAT.paper, px, py, 0.05));
      });
      // 软木板（一小块，钉照片）
      G.add(box(0.6, 0.4, 0.02, MAT.cork, -w / 2 + 0.5, -0.32, 0.05));
      G.position.set(x, 1.78, -8.02);
      G.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      PROPS.add(G);

    }
    // 旧版大车间挂板已由新木工房替代，这里不再生成

    // ---- 吊灯：工业灯罩 + 细吊杆（无墙无顶，吊杆引到画面外）----
    function pendant(x, z) {
      const g2 = new T.Group();
      g2.add(cyl(0.19, 0.22, 0.05, MAT.steelDark, 0, 0.03, 0));
      g2.add(cyl(0.024, 0.024, 1.92, MAT.steelDark, 0, 1.0, 0));
      const shade = new T.Mesh(new T.ConeGeometry(0.3, 0.34, 24, 1, true), MAT.steelDark);
      shade.position.y = 2.14; shade.rotation.x = Math.PI;
      g2.add(shade);
      g2.add(cyl(0.05, 0.05, 0.05, MAT.ye, 0, 1.98, 0));
      const pl = new T.PointLight(0xffc98a, 7.0, 5.0, 2);
      pl.position.set(0, 1.86, 0);
      g2.add(pl);
      g2.position.set(x, 0, z);
      PROPS.add(g2);
      return pl;
    }
    // 旧版吊灯由新木工房黑色搪瓷吊灯替代

    // ---- 气瓶（焊机旁）----
    function bottle(x, z, col) {
      const m = new T.MeshStandardMaterial({ color: col, metalness: 0.55, roughness: 0.42 });
      const g2 = new T.Group();
      g2.add(cyl(0.15, 0.15, 1.32, m, 0, 0.68, 0));
      g2.add(cyl(0.09, 0.13, 0.18, m, 0, 1.43, 0));
      g2.add(cyl(0.035, 0.035, 0.14, MAT.steel, 0, 1.58, 0));
      g2.add(cyl(0.16, 0.16, 0.04, MAT.steelDark, 0, 0.06, 0));
      g2.position.set(x, 0, z);
      g2.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      PROPS.add(g2);
    }
    // 气瓶挪到新木工房内单独摆放

    /* ============================================================
       木工房专属：老机加工车间（照参考图重建）
       白灰抹面墙 + 木窗 + 暖阳斜射 + 工具墙 + 老车床/台钻
       ============================================================ */
    (function wsRoom() {
      const RX = 3.9, ZB = -4.6, ZF = 3.6, H = 3.0;

      /* ---------- 贴图工厂 ---------- */
      function tex(w, h, fn, rx, ry) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        fn(c.getContext('2d'), w, h);
        const t = new T.CanvasTexture(c);
        t.colorSpace = T.SRGBColorSpace;
        t.wrapS = t.wrapT = T.RepeatWrapping;
        if (rx) t.repeat.set(rx, ry || rx);
        t.anisotropy = 4;
        return t;
      }

      // 白灰抹面墙
      const plasterTex = tex(512, 512, (g, w, h) => {
        g.fillStyle = '#ded1b9'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 340; i++) {
          const x = Math.random() * w, y = Math.random() * h, r = 14 + Math.random() * 80;
          const a = 0.02 + Math.random() * 0.06;
          const grd = g.createRadialGradient(x, y, 1, x, y, r);
          const tone = Math.random() < 0.45 ? '116,98,72' : '248,240,222';
          grd.addColorStop(0, 'rgba(' + tone + ',' + a.toFixed(3) + ')');
          grd.addColorStop(1, 'rgba(' + tone + ',0)');
          g.fillStyle = grd;
          g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
        }
        g.strokeStyle = 'rgba(96,78,56,.13)'; g.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
          let x = Math.random() * w, y = Math.random() * h;
          g.beginPath(); g.moveTo(x, y);
          for (let k = 0; k < 7; k++) { x += (Math.random() - 0.5) * 44; y += 10 + Math.random() * 26; g.lineTo(x, y); }
          g.stroke();
        }
        const bg = g.createLinearGradient(0, h * 0.52, 0, h);
        bg.addColorStop(0, 'rgba(92,74,52,0)');
        bg.addColorStop(0.6, 'rgba(86,66,44,.22)');
        bg.addColorStop(1, 'rgba(66,50,34,.52)');
        g.fillStyle = bg; g.fillRect(0, h * 0.52, w, h * 0.48);
        // 竖向水渍 / 磕碰
        for (let i = 0; i < 14; i++) {
          const x = Math.random() * w;
          const lg = g.createLinearGradient(x, h * 0.3, x, h);
          lg.addColorStop(0, 'rgba(80,64,44,0)');
          lg.addColorStop(1, 'rgba(70,54,36,.16)');
          g.fillStyle = lg; g.fillRect(x, h * 0.3, 3 + Math.random() * 9, h * 0.7);
        }
      }, 2.2, 1);

      // 水泥地
      const concreteTex = tex(512, 512, (g, w, h) => {
        g.fillStyle = '#8d8272'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 7000; i++) {
          const x = Math.random() * w, y = Math.random() * h;
          g.fillStyle = Math.random() < 0.5 ? 'rgba(255,248,228,.11)' : 'rgba(54,44,32,.15)';
          g.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
        }
        for (let i = 0; i < 44; i++) {
          const x = Math.random() * w, y = Math.random() * h, r = 12 + Math.random() * 54;
          const grd = g.createRadialGradient(x, y, 1, x, y, r);
          grd.addColorStop(0, 'rgba(46,36,24,.16)');
          grd.addColorStop(1, 'rgba(46,36,24,0)');
          g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
        }
        g.strokeStyle = 'rgba(38,30,20,.75)'; g.lineWidth = 5;
        g.strokeRect(0, 0, w, h);
        g.strokeStyle = 'rgba(255,248,228,.10)'; g.lineWidth = 2;
        g.strokeRect(3, 3, w - 6, h - 6);
      }, 5, 5);

      // 洞洞板
      const pegTex = tex(256, 256, (g, w, h) => {
        g.fillStyle = '#6f5433'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 80; i++) {
          g.strokeStyle = 'rgba(46,30,14,' + (0.06 + Math.random() * 0.14).toFixed(2) + ')';
          g.beginPath(); g.moveTo(0, Math.random() * h); g.lineTo(w, Math.random() * h); g.stroke();
        }
        for (let y = 14; y < h; y += 26) {
          for (let x = 14; x < w; x += 26) {
            g.fillStyle = 'rgba(44,28,14,.7)';
            g.beginPath(); g.arc(x, y, 3.2, 0, 6.283); g.fill();
            g.fillStyle = 'rgba(255,240,210,.12)';
            g.beginPath(); g.arc(x - 1, y - 1.2, 2.0, 0, 6.283); g.fill();
          }
        }
      }, 2, 1);

      const wallMat = new T.MeshStandardMaterial({ map: plasterTex, color: 0xcfc7b6, roughness: 0.96, metalness: 0, normalMap: MAT.userData.plasterNormal, normalScale: new T.Vector2(0.35, 0.35) });
      const floorMat = new T.MeshStandardMaterial({ map: concreteTex, color: 0x4b4740, roughness: 0.62, metalness: 0.05, normalMap: MAT.userData.plasterNormal, normalScale: new T.Vector2(0.5, 0.5) });
      const ceilMat = new T.MeshStandardMaterial({ color: 0xb2a996, roughness: 0.95, metalness: 0 });

      const trimMat = new T.MeshStandardMaterial({ color: 0x6a4f34, roughness: 0.86, metalness: 0.04 });
      const pegMat = new T.MeshStandardMaterial({ map: pegTex, roughness: 0.9, metalness: 0.02 });

      const STEEL = new T.MeshStandardMaterial({ color: 0x50524c, metalness: 0.35, roughness: 0.58 });
      const STEELD = new T.MeshStandardMaterial({ color: 0x4b463d, metalness: 0.78, roughness: 0.52 });
      const RUBBER = new T.MeshStandardMaterial({ color: 0x1a1815, roughness: 0.94 });
      const RED = new T.MeshStandardMaterial({ color: 0x9c3a2c, roughness: 0.62, metalness: 0.25 });
      const BLUE = new T.MeshStandardMaterial({ color: 0x2f5e88, roughness: 0.6, metalness: 0.25 });
      const GREEN = new T.MeshStandardMaterial({ color: 0x45634a, roughness: 0.62, metalness: 0.2 });
      const YELLOW = new T.MeshStandardMaterial({ color: 0xc79a3c, roughness: 0.55, metalness: 0.3 });
      const woodMat = new T.MeshStandardMaterial({
        map: woodTexture('#8a6a44', '74,54,32', [2, 2]),
        color: 0xffffff, roughness: 0.80, metalness: 0.02
      });
      const woodDark = new T.MeshStandardMaterial({
        map: woodTexture('#5b4128', '44,30,16', [2, 2]),
        color: 0xffffff, roughness: 0.84, metalness: 0.02
      });

      /* ---------- 地面 ---------- */
      const fl = new T.Mesh(new T.PlaneGeometry(RX * 2 + 0.6, ZF - ZB + 0.6), floorMat);
      fl.rotation.x = -Math.PI / 2;
      fl.position.set(0, 0.012, (ZF + ZB) / 2);
      fl.receiveShadow = true;
      PROPS.add(fl);

      /* ---------- 地面窗光斑 ----------
         太阳方向 (0,-0.684,0.729)，窗在 z=ZB 平面。
         窗上一点 (x,y) 落到地面的 z = ZB + y*(0.729/0.684)。
         直接把四个角投下去组成四边形，位置一定对。 */
      (function sunPatch() {
        const K = 0.729 / 0.684;
        const WX0 = -0.62, WX1 = 0.98, WY0 = 1.26, WY1 = 2.60;
        const z0 = ZB + WY0 * K, z1 = ZB + WY1 * K;   // 近边 / 远边
        const y = 0.016;
        const pos = [
          WX0, y, z1, WX1, y, z1, WX1, y, z0,
          WX0, y, z1, WX1, y, z0, WX0, y, z0
        ];
        const uv = [0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0];
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));

        const t = tex(256, 256, (g, w, h) => {
          const img = g.createImageData(w, h);
          const d = img.data;
          for (let py = 0; py < h; py++) {
            for (let px = 0; px < w; px++) {
              const u = px / (w - 1), v = py / (h - 1);
              // 边缘软化（真实光斑受窗框与角度影响，边缘不是刀切的）
              let e = Math.min(Math.min(u, 1 - u), Math.min(v, 1 - v));
              let a = Math.min(1, e / 0.085);
              a = a * a * (3 - 2 * a);
              // 中梃（十字分隔）在光斑里是暗的
              if (Math.abs(u - 0.5) < 0.020 || Math.abs(v - 0.5) < 0.020) a *= 0.10;
              // 四格玻璃亮度略有差异
              const pane = (u < 0.5 ? 0 : 1) + (v < 0.5 ? 0 : 2);
              a *= [1.0, 0.86, 0.93, 0.74][pane];
              const i = (py * w + px) * 4;
              d[i] = 255; d[i + 1] = 230; d[i + 2] = 186; d[i + 3] = a * 255;
            }
          }
          g.putImageData(img, 0, 0);
        }, 1, 1);

        const m = new T.Mesh(geo, new T.MeshBasicMaterial({
          map: t, transparent: true, blending: T.AdditiveBlending,
          depthWrite: false, opacity: 0.80, color: 0xffeed0,
          side: T.DoubleSide          // 四边形绕序朝下，必须双面否则被剔除
        }));
        m.renderOrder = 3;
        PROPS.add(m);
      })();

      /* ---------- 墙体（带窗洞；墙要投影，阳光才能打出窗形光斑）---------- */
      const WX0 = -0.62, WX1 = 0.98, WY0 = 1.26, WY1 = 2.60;
      function wallPanel(x, y, z, w, h, ry) {
        const m = new T.Mesh(new T.BoxGeometry(w, h, 0.18), wallMat);
        m.position.set(x, y, z);
        if (ry) m.rotation.y = ry;
        m.castShadow = true; m.receiveShadow = true;
        PROPS.add(m);
        return m;
      }
      wallPanel((WX0 - RX) / 2, H / 2, ZB, RX + WX0, H);
      wallPanel((WX1 + RX) / 2, H / 2, ZB, RX - WX1, H);
      wallPanel((WX0 + WX1) / 2, WY0 / 2, ZB, WX1 - WX0, WY0);
      wallPanel((WX0 + WX1) / 2, (WY1 + H) / 2, ZB, WX1 - WX0, H - WY1);
      wallPanel(-RX, H / 2, (ZB + ZF) / 2, ZF - ZB, H, Math.PI / 2);
      wallPanel(RX, H / 2, (ZB + ZF) / 2, ZF - ZB, H, Math.PI / 2);
      const ce = new T.Mesh(new T.PlaneGeometry(RX * 2, ZF - ZB), ceilMat);
      ce.rotation.x = Math.PI / 2; ce.position.set(0, H, (ZB + ZF) / 2);
      ce.receiveShadow = true;
      // 天花板必须挡光，否则阳光穿透屋顶把整个房间照平，窗形光斑无从谈起。
      // 单面朝下的平面从上方看是背面，shadowSide 必须设成 DoubleSide 才会写进阴影图。
      ce.castShadow = true;
      ceilMat.shadowSide = T.DoubleSide;
      PROPS.add(ce);

      // 踢脚线 + 挂镜线
      const skirt = (x, z, w, ry) => {
        const s = box(w, 0.13, 0.05, trimMat, x, 0.065, z);
        if (ry) s.rotation.y = ry;
        PROPS.add(s);
      };
      skirt((WX0 - RX) / 2, ZB + 0.1, RX + WX0);
      skirt((WX1 + RX) / 2, ZB + 0.1, RX - WX1);
      skirt(-RX + 0.1, (ZB + ZF) / 2, ZF - ZB, Math.PI / 2);
      skirt(RX - 0.1, (ZB + ZF) / 2, ZF - ZB, Math.PI / 2);
      [[-RX + 0.1], [RX - 0.1]].forEach(([x]) => {
        const m = box(ZF - ZB, 0.08, 0.04, trimMat, x, H - 0.16, (ZB + ZF) / 2);
        m.rotation.y = Math.PI / 2; PROPS.add(m);
      });
      PROPS.add(box(RX * 2, 0.08, 0.04, trimMat, 0, H - 0.16, ZB + 0.1));

      /* ---------- 窗 ---------- */
      const outTex = tex(256, 256, (g, w, h) => {
        const sky = g.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#fff2d2'); sky.addColorStop(0.4, '#ffe4b4');
        sky.addColorStop(0.7, '#f7cf98'); sky.addColorStop(1, '#d9ae78');
        g.fillStyle = sky; g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(122,116,64,.45)';
        for (let i = 0; i < 18; i++) {
          const x = Math.random() * w, y = h * 0.44 + Math.random() * h * 0.28, r = 16 + Math.random() * 38;
          g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
        }
        g.fillStyle = 'rgba(246,232,204,.9)';
        g.fillRect(0, h * 0.74, w, h * 0.26);
        g.fillStyle = 'rgba(158,126,94,.45)';
        g.beginPath(); g.moveTo(0, h * 0.8); g.lineTo(w * 0.3, h * 0.64); g.lineTo(w * 0.62, h * 0.8); g.fill();
      });
      const winGlow = new T.Mesh(new T.PlaneGeometry(WX1 - WX0, WY1 - WY0),
        new T.MeshBasicMaterial({ map: outTex, color: 0xfff0d8 }));
      winGlow.position.set((WX0 + WX1) / 2, (WY0 + WY1) / 2, ZB - 0.14);
      PROPS.add(winGlow);
      const glassPane = new T.Mesh(new T.PlaneGeometry(WX1 - WX0 - 0.06, WY1 - WY0 - 0.06),
        new T.MeshBasicMaterial({ color: 0xfff6e4, transparent: true, opacity: 0.10 }));
      glassPane.position.set((WX0 + WX1) / 2, (WY0 + WY1) / 2, ZB + 0.06);
      PROPS.add(glassPane);

      const winFrame = new T.MeshStandardMaterial({ color: 0xeae2ce, roughness: 0.66, metalness: 0.04 });
      const cxw = (WX0 + WX1) / 2, cyw = (WY0 + WY1) / 2, ww = WX1 - WX0, wh = WY1 - WY0;
      [[0, wh / 2 + 0.045, ww + 0.18, 0.09], [0, -wh / 2 - 0.045, ww + 0.18, 0.09]].forEach(([dx, dy, w, h]) => {
        PROPS.add(box(w, h, 0.16, winFrame, cxw + dx, cyw + dy, ZB + 0.02));
      });
      [-1, 1].forEach((s) => PROPS.add(box(0.09, wh + 0.18, 0.16, winFrame, cxw + s * (ww / 2 + 0.045), cyw, ZB + 0.02)));
      PROPS.add(box(0.055, wh, 0.10, winFrame, cxw, cyw, ZB + 0.04));
      [wh / 3, -wh / 3].forEach((dy) => PROPS.add(box(ww, 0.055, 0.10, winFrame, cxw, cyw + dy, ZB + 0.04)));
      PROPS.add(box(ww + 0.34, 0.07, 0.30, trimMat, cxw, WY0 - 0.05, ZB + 0.16));

      /* ---------- 阳光 ---------- */
      const sun = new T.DirectionalLight(0xffd39e, 18);
      // 仰角 45°：窗中心高 1.93m，光斑是一块 ~1.6×1.4m 的窗形亮区，
      // 落在柜子前的地面（画面中部），与参考图里阳光打在地面上的位置一致
      sun.position.set(0.18, 7.58, ZB - 5.66);
      sun.target.position.set(0.18, 0, -2.18);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -8; sun.shadow.camera.right = 8;
      sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
      sun.shadow.camera.near = 1; sun.shadow.camera.far = 34;
      sun.shadow.bias = -0.0006;
      sun.shadow.normalBias = 0.02;
      // 关键：改了视锥必须重建投影矩阵，否则仍是默认 ±5，墙板落在范围外不投影
      sun.shadow.camera.updateProjectionMatrix();
      PROPS.add(sun); PROPS.add(sun.target);
      PROPS.userData.sun = sun;
      scene.userData.sunRef = sun;

      // 窗口反射光 + 地面反弹光：补暗部、不冲掉光比
      const winFill = new T.PointLight(0xffc48c, 1.6, 5.0, 2);
      winFill.position.set((WX0 + WX1) / 2, 1.75, ZB + 0.65);
      PROPS.add(winFill);
      const bounce = new T.DirectionalLight(0xffcaa0, 0.22);
      bounce.position.set(1.2, -3.0, 2.4);
      bounce.target.position.set(-0.6, 1.6, -1.4);
      PROPS.add(bounce); PROPS.add(bounce.target);

      /* ---------- 车床工作灯（黑臂鹅颈灯）---------- */
      (function latheLamp() {
        const g = new T.Group();
        const blk = new T.MeshStandardMaterial({ color: 0x1a1b19, metalness: 0.45, roughness: 0.5 });
        g.add(box(0.16, 0.03, 0.16, blk, 0, 0, 0));                      // 墙座
        g.add(rot(cyl(0.016, 0.016, 0.52, blk, 0.10, -0.10, 0.04, 8), 'z', -0.9));  // 上臂
        g.add(rot(cyl(0.014, 0.014, 0.62, blk, 0.22, -0.52, 0.11, 8), 'z', -1.5));  // 下臂
        const shade = new T.Mesh(new T.ConeGeometry(0.15, 0.18, 20, 1, true), blk);
        shade.position.set(0.30, -0.93, 0.18);
        shade.rotation.set(0.30, 0, -0.30);
        shade.material.side = T.DoubleSide;
        g.add(shade);
        const bulb = new T.Mesh(new T.SphereGeometry(0.045, 12, 10),
          new T.MeshStandardMaterial({ color: 0xfff3d6, emissive: 0xffdcae, emissiveIntensity: 5.5, roughness: 0.4 }));
        bulb.position.set(0.295, -0.985, 0.18);
        g.add(bulb);
        const pl = new T.PointLight(0xffeccd, 6.5, 3.6, 2);
        pl.position.set(0.295, -1.02, 0.18);
        g.add(pl);
        // 挂在左墙上、正对车床卡盘位置（参考图里就是这盏灯在给车床打光）
        g.position.set(-3.62, 2.34, -0.72);
        g.rotation.y = Math.PI / 2;
        g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        PROPS.add(g);
      })();

      /* ---------- 顶棚日光灯 ---------- */
      function tube(x, z, ry) {
        const g = new T.Group();
        const housing = new T.MeshStandardMaterial({ color: 0xdcd6c4, roughness: 0.5, metalness: 0.3 });
        g.add(box(2.3, 0.09, 0.22, housing, 0, -0.06, 0));
        g.add(cyl(0.02, 0.02, 0.16, STEELD, -1.05, 0.06, 0, 6));
        g.add(cyl(0.02, 0.02, 0.16, STEELD, 1.05, 0.06, 0, 6));
        const lit = new T.Mesh(new T.PlaneGeometry(2.14, 0.16), new T.MeshBasicMaterial({ color: 0xe2d9bf }));
        lit.rotation.x = Math.PI / 2;
        lit.position.y = -0.108;
        g.add(lit);
        const pl = new T.PointLight(0xfff0dc, 5.6, 6.0, 2);
        pl.position.set(0, -0.28, 0);
        g.add(pl);
        g.position.set(x, H - 0.02, z);
        if (ry) g.rotation.y = ry;
        PROPS.add(g);
      }
      tube(-1.6, -2.6, 0.05);
      tube(0.9, 1.1, -0.03);

      /* ---------- 工具件 ---------- */
      function wrench(len) {
        const g = new T.Group();
        g.add(box(0.026, len, 0.009, STEEL, 0, 0, 0));
        g.add(box(0.055, 0.05, 0.011, STEEL, 0, len / 2, 0));
        g.add(box(0.048, 0.045, 0.011, STEEL, 0, -len / 2, 0));
        return g;
      }
      function hammer() {
        const g = new T.Group();
        g.add(box(0.022, 0.30, 0.02, woodMat, 0, 0, 0));
        g.add(box(0.10, 0.036, 0.034, STEELD, 0, 0.155, 0));
        return g;
      }
      function file() {
        const g = new T.Group();
        g.add(box(0.024, 0.26, 0.008, STEELD, 0, 0.02, 0));
        g.add(box(0.026, 0.10, 0.026, woodDark, 0, -0.15, 0));
        return g;
      }
      function driver() {
        const g = new T.Group();
        g.add(cyl(0.006, 0.006, 0.20, STEEL, 0, 0.06, 0, 8));
        g.add(cyl(0.016, 0.018, 0.11, RED, 0, -0.09, 0, 10));
        return g;
      }
      function plier() {
        const g = new T.Group();
        g.add(rot(box(0.014, 0.22, 0.008, STEEL, -0.012, 0.02, 0), 'y', 0.12));
        g.add(rot(box(0.014, 0.22, 0.008, STEEL, 0.012, 0.02, 0), 'y', -0.12));
        const p = cyl(0.014, 0.014, 0.012, STEELD, 0, 0.06, 0, 10);
        p.rotation.x = Math.PI / 2; g.add(p);
        g.add(cyl(0.014, 0.014, 0.10, RUBBER, -0.02, -0.08, 0, 8));
        g.add(cyl(0.014, 0.014, 0.10, RUBBER, 0.02, -0.08, 0, 8));
        return g;
      }
      function chisel() {
        const g = new T.Group();
        g.add(box(0.02, 0.16, 0.012, STEEL, 0, -0.06, 0));
        g.add(box(0.026, 0.10, 0.026, woodDark, 0, 0.06, 0));
        return g;
      }
      function saw() {
        const g = new T.Group();
        g.add(box(0.02, 0.38, 0.006, STEEL, 0, -0.04, 0));
        g.add(box(0.05, 0.14, 0.026, woodMat, 0.005, 0.2, 0));
        return g;
      }
      function jar(col, h) {
        const g = new T.Group();
        g.add(cyl(0.045, 0.045, h, col, 0, h / 2, 0, 12));
        g.add(cyl(0.047, 0.047, 0.012, STEELD, 0, h, 0, 12));
        return g;
      }

      // 洞洞板；面朝 +Z，左墙用 ry=PI/2
      function pegboard(x, y, z, w, h, ry, kinds) {
        const g = new T.Group();
        g.add(box(w, h, 0.03, pegMat, 0, 0, 0));
        g.add(box(w + 0.06, 0.035, 0.045, trimMat, 0, h / 2, 0.002));
        g.add(box(w + 0.06, 0.035, 0.045, trimMat, 0, -h / 2, 0.002));
        const n = kinds.length;
        for (let i = 0; i < n; i++) {
          const t = kinds[i];
          if (!t) continue;
          const m = t();
          const px = -w / 2 + 0.10 + (i + 0.5) * ((w - 0.20) / n);
          m.scale.setScalar(1.15);
          m.position.set(px, 0.03 + (i % 2) * 0.05, 0.040);
          m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
          g.add(m);
          g.add(cyl(0.005, 0.005, 0.05, STEELD, px, 0.15, 0.024, 6));
        }
        g.position.set(x, y, z);
        if (ry) g.rotation.y = ry;
        g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        PROPS.add(g);
        return g;
      }

      // 左墙：车床上方大挂板
      pegboard(-RX + 0.09, 2.02, -0.85, 2.55, 1.15, Math.PI / 2,
        [() => wrench(0.30), () => wrench(0.26), () => wrench(0.22), () => plier(),
         () => hammer(), () => wrench(0.24), () => file(), () => driver()]);
      // 左墙靠后：锯 + 锉
      pegboard(-RX + 0.09, 1.98, -2.95, 1.35, 1.05, Math.PI / 2,
        [() => saw(), () => file(), () => driver(), () => hammer()]);
      // 后墙左：凿子 / 钻头 / 扳手
      pegboard(-2.30, 1.98, ZB + 0.09, 1.55, 1.05, 0,
        [() => chisel(), () => file(), () => wrench(0.22), () => driver(), () => chisel(), () => plier()]);
      // 后墙窗右：小挂板
      pegboard(3.28, 1.95, ZB + 0.09, 0.90, 0.90, 0,
        [() => hammer(), () => driver(), () => file()]);

      /* ---------- 木牌 ---------- */
      (function signBoard() {
        const t = tex(512, 160, (g, w, h) => {
          g.fillStyle = '#8a6136'; g.fillRect(0, 0, w, h);
          for (let i = 0; i < 44; i++) {
            g.strokeStyle = 'rgba(70,44,20,' + (0.05 + Math.random() * 0.1).toFixed(2) + ')';
            g.lineWidth = 1 + Math.random() * 2;
            g.beginPath(); g.moveTo(0, Math.random() * h); g.lineTo(w, Math.random() * h); g.stroke();
          }
          g.fillStyle = '#3a2410';
          g.font = 'bold 96px "STKaiti","KaiTi","Microsoft YaHei",serif';
          g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText('专注每一刀', w / 2, h / 2 + 4);
        });
        const m = new T.Mesh(new T.PlaneGeometry(1.42, 0.44),
          new T.MeshStandardMaterial({ map: t, roughness: 0.85 }));
        m.position.set(-2.28, 2.68, ZB + 0.10);
        m.castShadow = true;
        PROPS.add(m);
        PROPS.add(box(1.46, 0.05, 0.04, trimMat, -2.28, 2.44, ZB + 0.11));
      })();

      /* ---------- 图纸 / 挂钟 ---------- */
      (function papers() {
        const paperTex = tex(256, 320, (g, w, h) => {
          g.fillStyle = '#f4ecd6'; g.fillRect(0, 0, w, h);
          g.strokeStyle = 'rgba(60,80,110,.5)'; g.lineWidth = 1.4;
          for (let i = 0; i < 3; i++) {
            const x = 20 + i * 74, y = 46;
            g.strokeRect(x, y, 56, 120);
            g.beginPath(); g.arc(x + 28, y + 40, 16, 0, 6.283); g.stroke();
            g.beginPath(); g.moveTo(x - 6, y + 40); g.lineTo(x + 62, y + 40); g.stroke();
            g.beginPath(); g.moveTo(x + 28, y - 6); g.lineTo(x + 28, y + 160); g.stroke();
          }
          g.strokeStyle = 'rgba(40,50,70,.45)';
          g.strokeRect(6, 6, w - 12, h - 12);
          g.fillStyle = 'rgba(60,80,110,.45)';
          for (let i = 0; i < 5; i++) g.fillRect(24, 210 + i * 16, 60 + Math.random() * 100, 4);
        });
        const pm = new T.MeshStandardMaterial({ map: paperTex, roughness: 0.95 });
        [[-3.52, 2.30, 0.36, 0.47, 0.02], [-3.16, 2.52, 0.26, 0.34, -0.03],
         [3.34, 2.42, 0.26, 0.34, 0.03], [-0.10, 2.48, 0.24, 0.32, -0.02],
         [3.42, 1.72, 0.22, 0.29, 0.05]].forEach(([x, y, w, h, rz]) => {
          const p = new T.Mesh(new T.PlaneGeometry(w, h), pm);
          p.position.set(x, y, ZB + 0.10);
          p.rotation.z = rz;
          PROPS.add(p);
        });
        const clock = new T.Group();
        clock.add(cyl(0.145, 0.145, 0.045, STEELD, 0, 0, 0, 24));
        clock.add(cyl(0.132, 0.132, 0.012, new T.MeshStandardMaterial({ color: 0xf0e8d2, roughness: 0.6 }), 0, 0, 0.028, 24));
        clock.add(box(0.006, 0.09, 0.004, STEELD, 0, 0.035, 0.038));
        clock.add(box(0.05, 0.006, 0.004, STEELD, 0.018, 0, 0.038));
        clock.rotation.x = Math.PI / 2;
        clock.position.set(3.62, 2.68, ZB + 0.07);
        clock.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        PROPS.add(clock);
      })();

      /* ---------- 高柜（后墙左角）---------- */
      (function cabinet() {
        const g = new T.Group();
        g.add(box(1.02, 1.98, 0.52, woodMat, 0, 1.00, 0));
        g.add(box(1.09, 0.06, 0.58, woodDark, 0, 2.01, 0));
        g.add(box(1.09, 0.05, 0.56, woodDark, 0, 0.04, 0));
        g.add(box(0.02, 1.76, 0.02, woodDark, 0, 1.00, 0.265));
        [-0.08, 0.08].forEach((dx) => {
          const h = cyl(0.016, 0.016, 0.10, STEEL, dx, 1.08, 0.28, 10);
          h.rotation.x = Math.PI / 2; g.add(h);
        });
        for (let i = 0; i < 5; i++) g.add(box(0.42, 0.02, 0.012, woodDark, -0.25, 0.58 + i * 0.12, 0.27));
        g.position.set(-3.35, 0, ZB + 0.36);
        g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        PROPS.add(g);
        PROPS.add(box(0.54, 0.30, 0.40, BLUE, -3.44, 2.19, ZB + 0.36));
        PROPS.add(box(0.40, 0.22, 0.34, new T.MeshStandardMaterial({ color: 0xb8b0a0, roughness: 0.8 }), -2.85, 2.15, ZB + 0.38));
      })();

      /* ---------- 右墙：木层板 + 零件罐 + 挂具 ---------- */
      (function rightShelf() {
        [-0.55, 1.45].forEach((z) => {
          const g = new T.Group();
          g.add(box(0.32, 0.05, 1.75, woodMat, 0, 0, 0));
          [-0.7, 0.7].forEach((dz) => g.add(box(0.28, 0.22, 0.04, woodDark, -0.02, -0.11, dz)));
          for (let i = 0; i < 6; i++) {
            const dz = -0.72 + i * 0.29;
            const c = i % 3 === 0 ? RED : (i % 3 === 1 ? BLUE : YELLOW);
            const j = jar(c, 0.13 + (i % 3) * 0.05);
            j.position.set(0, 0.03, dz);
            j.traverse((o) => { if (o.isMesh) o.castShadow = true; });
            g.add(j);
          }
          g.position.set(RX - 0.19, 1.86, z);
          g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
          PROPS.add(g);
          for (let i = 0; i < 4; i++) {
            const dz = z - 0.55 + i * 0.37;
            const m = i % 2 ? hammer() : driver();
            m.position.set(RX - 0.12, 1.66, dz);
            m.rotation.y = -Math.PI / 2;
            m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
            PROPS.add(m);
            PROPS.add(cyl(0.005, 0.005, 0.09, STEELD, RX - 0.10, 1.80, dz, 6));
          }
        });
      })();

      /* ---------- 台灯 ---------- */
      function taskLamp(x, y, z, ry) {
        const g = new T.Group();
        const blk = new T.MeshStandardMaterial({ color: 0x26221c, metalness: 0.45, roughness: 0.52 });
        g.add(box(0.11, 0.12, 0.11, blk, 0, 0, 0));                              // 底座
        g.add(rot(box(0.028, 0.42, 0.028, blk, 0.13, 0.16, 0), 'z', -0.55));     // 下臂
        g.add(rot(box(0.024, 0.36, 0.024, blk, 0.32, 0.36, 0), 'z', 1.05));      // 上臂
        // 灯罩（喇叭口朝下）
        const shade = new T.Mesh(new T.ConeGeometry(0.105, 0.13, 20, 1, true), blk);
        shade.position.set(0.42, 0.40, 0);
        shade.rotation.set(Math.PI, 0, -0.35);
        shade.material.side = T.DoubleSide;
        g.add(shade);
        const bulb = cyl(0.072, 0.072, 0.012, new T.MeshStandardMaterial({
          color: 0xfff0cc, emissive: 0xffd9a0, emissiveIntensity: 3.4
        }), 0.44, 0.345, 0, 18);
        g.add(bulb);
        const pl = new T.PointLight(0xffcf9a, 6.5, 3.8, 2);
        pl.position.set(0.46, 0.30, 0);
        g.add(pl);
        g.position.set(x, y, z); g.rotation.y = ry || 0;
        g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        PROPS.add(g);
      }
      taskLamp(-RX + 0.14, 2.18, -1.55, Math.PI * 0.5);
      taskLamp(RX - 0.16, 1.72, 0.75, -Math.PI * 0.5);

      /* ---------- 绿植 ---------- */
      function plant(x, z, s) {
        const g = new T.Group();
        const potMat = new T.MeshStandardMaterial({ color: 0x9c5a3c, roughness: 0.9 });
        g.add(cyl(0.17, 0.13, 0.26, potMat, 0, 0.13, 0, 16));
        g.add(cyl(0.18, 0.18, 0.03, potMat, 0, 0.26, 0, 16));
        g.add(cyl(0.022, 0.026, 0.52, new T.MeshStandardMaterial({ color: 0x5a4a2c, roughness: 0.9 }), 0, 0.54, 0, 8));
        const leafMat = new T.MeshStandardMaterial({ color: 0x54772f, roughness: 0.8, side: T.DoubleSide });
        for (let i = 0; i < 26; i++) {
          const a = (i / 26) * Math.PI * 2 + Math.random();
          const r = 0.10 + Math.random() * 0.20;
          const leaf = new T.Mesh(new T.PlaneGeometry(0.17, 0.09), leafMat);
          leaf.position.set(Math.cos(a) * r, 0.60 + Math.random() * 0.44, Math.sin(a) * r);
          leaf.rotation.set(Math.random() * 0.8 - 0.4, -a, 0.5 + Math.random() * 0.6);
          g.add(leaf);
        }
        g.position.set(x, 0, z);
        if (s) g.scale.setScalar(s);
        g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        PROPS.add(g);
      }
      plant(-1.42, ZB + 0.78, 1.0);
      plant(0.62, WY0 - 0.02, 0.26);

      /* ---------- 窗下小桌 + 焊机 ---------- */
      (function weldTable() {
        const g = new T.Group();
        g.add(box(1.45, 0.06, 0.62, woodMat, 0, 0.76, 0));
        [[-0.64, -0.24], [0.64, -0.24], [-0.64, 0.24], [0.64, 0.24]].forEach(([a, b]) => {
          g.add(box(0.07, 0.76, 0.07, woodDark, a, 0.38, b));
        });
        g.add(box(1.4, 0.04, 0.06, woodDark, 0, 0.30, -0.23));
        g.position.set(2.55, 0, ZB + 0.80);
        g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        PROPS.add(g);

        const w = new T.Group();
        w.add(box(0.50, 0.56, 0.38, BLUE, 0, 0.30, 0));
        w.add(box(0.52, 0.05, 0.40, new T.MeshStandardMaterial({ color: 0x1e3a56, roughness: 0.6 }), 0, 0.60, 0));
        [-0.11, 0.11].forEach((dx) => {
          const m = cyl(0.048, 0.048, 0.012, new T.MeshStandardMaterial({ color: 0xe8e2d0, emissive: 0x8fa4b8, emissiveIntensity: 0.35, roughness: 0.5 }), dx, 0.44, 0.195, 18);
          m.rotation.x = Math.PI / 2; w.add(m);
        });
        const kn = cyl(0.036, 0.036, 0.03, MAT.black, 0, 0.24, 0.20, 14);
        kn.rotation.x = Math.PI / 2; w.add(kn);
        w.position.set(2.42, 0.79, ZB + 0.80);
        w.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        PROPS.add(w);

        // 桌上的零件、纸、茶杯
        PROPS.add(box(0.24, 0.05, 0.18, STEELD, 2.98, 0.82, ZB + 0.86));
        const cup = cyl(0.05, 0.042, 0.10, new T.MeshStandardMaterial({ color: 0xe8e0cc, roughness: 0.5 }), 3.12, 0.87, ZB + 0.66);
        PROPS.add(cup);
      })();

      /* ---------- 电缆 ---------- */
      (function cables() {
        [[[2.30, ZB + 0.95], [1.95, -2.9], [2.35, -1.4], [2.55, 0.2], [2.15, 1.0]],
         [[-1.6, ZB + 0.7], [-2.0, -2.4], [-3.0, -1.7], [-3.6, -0.8]]].forEach((pts) => {
          const curve = new T.CatmullRomCurve3(pts.map(([x, z]) => new T.Vector3(x, 0.022, z)));
          const tube2 = new T.Mesh(new T.TubeGeometry(curve, 44, 0.018, 6, false), RUBBER);
          tube2.castShadow = true;
          PROPS.add(tube2);
        });
      })();

      /* ---------- 木凳 ---------- */
      (function stool() {
        const g = new T.Group();
        g.add(box(0.40, 0.05, 0.30, woodMat, 0, 0.44, 0));
        [[-0.15, -0.10], [0.15, -0.10], [-0.15, 0.10], [0.15, 0.10]].forEach(([a, b]) => {
          g.add(box(0.045, 0.44, 0.045, woodDark, a, 0.22, b));
        });
        g.add(box(0.34, 0.03, 0.03, woodDark, 0, 0.16, 0));
        g.position.set(-1.55, 0, -1.95);
        g.rotation.y = 0.3;
        g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        PROPS.add(g);
      })();

      /* ---------- 靠左墙的木料堆 ---------- */
      (function lumber() {
        for (let i = 0; i < 5; i++) {
          PROPS.add(box(0.15, 0.10, 1.7, woodMat, -RX + 0.24 + (i % 2) * 0.02, 0.05 + i * 0.102, 1.05));
        }
        for (let i = 0; i < 3; i++) {
          PROPS.add(box(0.13, 0.09, 1.1, woodDark, -RX + 0.56, 0.05 + i * 0.092, 1.45));
        }
      })();

      /* ---------- 工作台上的杂物（跟着 WOOD_BENCH 走）---------- */
      const BC = new T.Group();
      BC.name = 'benchClutter';
      BC.position.set(WOOD_BENCH.x, 0, WOOD_BENCH.z);
      BC.rotation.y = WOOD_BENCH.ry;
      PROPS.add(BC);
      (function benchClutter() {
        const BT = 1.10;
        const vg = new T.Group();
        const vm = new T.MeshStandardMaterial({ color: 0x46543f, roughness: 0.55, metalness: 0.5 });
        const vm2 = new T.MeshStandardMaterial({ color: 0x3a4738, roughness: 0.5, metalness: 0.55 });
        vg.add(box(0.32, 0.08, 0.26, vm, 0, 0.04, 0));
        vg.add(box(0.13, 0.17, 0.24, vm2, -0.11, 0.16, 0));
        vg.add(box(0.13, 0.17, 0.24, vm2, 0.11, 0.16, 0));
        vg.add(box(0.05, 0.03, 0.26, STEEL, -0.11, 0.245, 0));
        vg.add(box(0.05, 0.03, 0.26, STEEL, 0.11, 0.245, 0));
        const screw = cyl(0.018, 0.018, 0.30, STEEL, 0.24, 0.10, 0, 10);
        screw.rotation.z = Math.PI / 2; vg.add(screw);
        vg.add(cyl(0.014, 0.014, 0.13, STEELD, 0.40, 0.10, 0, 8));
        vg.position.set(-1.28, BT, -0.02);
        vg.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        BC.add(vg);

        const scatter = [
          [file(), -0.55, 0.16, 0.5], [wrench(0.24), -0.15, -0.12, 1.1],
          [driver(), 0.05, 0.22, 0.7], [driver(), 0.16, 0.14, 1.4],
          [hammer(), 0.42, -0.06, 1.6], [plier(), 0.30, 0.24, 0.3],
          [chisel(), -0.42, 0.28, 1.9], [wrench(0.20), 0.62, 0.20, 0.9],
          // 再铺一层：工具散落 + 料头 + 小件，参考图的台面就是"什么都放不下"
          [file(), -0.22, 0.30, 2.4], [driver(), -0.68, -0.10, 1.05],
          [chisel(), 0.06, -0.28, 0.6], [wrench(0.17), 0.72, -0.16, 2.0],
          [plier(), -0.46, -0.26, 1.35], [hammer(), -0.05, 0.34, 0.35],
          [saw(), 0.94, -0.02, 0.22], [chisel(), 0.52, 0.32, 2.7],
          // 第三层：往右前铺满，别让台面留大片空地
          [hammer(), 0.84, 0.30, 1.0], [file(), 0.20, 0.36, 1.7],
          [wrench(0.22), -0.32, 0.36, 0.4], [plier(), 0.66, 0.34, 2.2],
          [driver(), 0.40, 0.36, 0.9], [chisel(), 0.98, 0.26, 1.2]
        ];
        scatter.forEach(([m, x, z, r]) => {
          m.position.set(x * 0.78, BT + 0.012, z * 1.05);
          m.rotation.set(Math.PI / 2, 0, r);
          m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
          BC.add(m);
        });

        [[RED, 0.86, 0.02], [BLUE, 1.16, 0.18]].forEach(([mat, x, z]) => {
          BC.add(box(0.26, 0.15, 0.20, mat, x, BT + 0.075, z));
          BC.add(box(0.22, 0.02, 0.16, new T.MeshStandardMaterial({ color: 0x2a2722, roughness: 0.9 }), x, BT + 0.15, z));
        });
        // 料头 / 卷尺 / 螺丝盒 / 抹布
        [[0.30, 0.10, 0.055], [0.26, 0.09, 0.048], [0.34, 0.08, 0.062]].forEach(([L, W, H], i) => {
          const m = box(W, H, L, woodMat, -0.72 + i * 0.02, BT + H / 2 + i * H, -0.20 + i * 0.09);
          m.rotation.y = 0.4 + i * 0.3;
          m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
          BC.add(m);
        });
        BC.add(cyl(0.058, 0.058, 0.055, new T.MeshStandardMaterial({ color: 0xd8b13a, roughness: 0.55, metalness: 0.3 }), 0.14, BT + 0.028, -0.30, 18));
        BC.add(box(0.20, 0.055, 0.15, new T.MeshStandardMaterial({ color: 0x7a1f18, roughness: 0.7 }), -0.92, BT + 0.028, -0.26));
        for (let i = 0; i < 9; i++) {
          BC.add(cyl(0.007, 0.007, 0.022, STEEL, -0.95 + Math.random() * 0.06, BT + 0.062, -0.26 + Math.random() * 0.05, 6));
        }
        const rag = box(0.26, 0.018, 0.22, new T.MeshStandardMaterial({ color: 0x8a8371, roughness: 0.95 }), 0.86, BT + 0.010, 0.24);
        rag.rotation.y = 0.7; BC.add(rag);
        BC.add(cyl(0.045, 0.045, 0.13, STEEL, -0.86, BT + 0.065, 0.16, 14));
        BC.add(cyl(0.042, 0.042, 0.012, STEELD, -0.86, BT + 0.13, 0.16, 14));
        // 木屑
        for (let i = 0; i < 18; i++) {
          const s = box(0.02 + Math.random() * 0.03, 0.004, 0.006, new T.MeshStandardMaterial({ color: 0xc8a878, roughness: 1 }),
            (Math.random() - 0.5) * 2.4, BT + 0.004, (Math.random() - 0.5) * 0.5);
          s.rotation.y = Math.random() * 3;
          s.castShadow = false;
          BC.add(s);
        }
      })();

      /* ---------- 台下收纳箱 ---------- */
      (function underBench() {
        const bx = WOOD_BENCH.x, bz = WOOD_BENCH.z;
        const dark = new T.MeshStandardMaterial({ color: 0x24262a, roughness: 0.85 });
        [[-1.05, 0.28], [-0.45, 0.28], [-0.75, -0.26]].forEach(([dx, dz]) => {
          const b = box(0.50, 0.38, 0.36, dark, bx + dx, 0.19, bz + dz);
          b.rotation.y = WOOD_BENCH.ry;
          PROPS.add(b);
        });
        const tb = box(0.44, 0.22, 0.24, RED, bx + 1.05, 0.12, bz - 0.28);
        tb.rotation.y = WOOD_BENCH.ry;
        PROPS.add(tb);
        PROPS.add(box(0.10, 0.03, 0.03, STEEL, bx + 1.05, 0.24, bz - 0.28));
      })();

      /* ============================================================
         真实感补强：接触阴影 / 墙角 AO / 防疲劳垫 / 搪瓷吊灯
         ============================================================ */

      // 软接触阴影贴图（径向渐变，压住物体与地面的"悬浮感"）
      const blobTex = tex(128, 128, (g, w, h) => {
        const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
        gr.addColorStop(0, 'rgba(0,0,0,.92)');
        gr.addColorStop(0.45, 'rgba(0,0,0,.55)');
        gr.addColorStop(0.78, 'rgba(0,0,0,.18)');
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      });
      function contact(x, z, w, d, op, ry) {
        const m = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshBasicMaterial({
          map: blobTex, transparent: true, opacity: op == null ? 0.5 : op,
          depthWrite: false, color: 0x1a120a
        }));
        m.rotation.x = -Math.PI / 2;
        m.rotation.z = ry || 0;
        m.position.set(x, 0.011, z);
        m.renderOrder = 2;
        PROPS.add(m);
      }
      contact(-2.45, -0.10, 2.9, 1.05, 0.62, Math.PI / 2);   // 车床
      contact(-0.30, -2.55, 1.25, 1.0, 0.5);                  // 台钻
      contact(2.25, 0.60, 3.7, 1.9, 0.42, -0.42);             // 中央工作台
      contact(-3.35, -4.20, 1.25, 0.8, 0.42);                 // 高柜
      contact(2.55, -3.60, 1.65, 0.9, 0.4);                   // 窗下桌
      contact(-1.55, -1.95, 0.6, 0.5, 0.36);                  // 木凳
      contact(-3.70, 1.05, 0.5, 1.9, 0.34);                   // 木料堆
      contact(1.55, 2.35, 0.9, 0.9, 0.3);                     // 待放设备位

      // 墙角 AO：贴地一圈渐变压暗，替代缺失的屏幕空间环境光遮蔽
      const aoTex = tex(8, 128, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, 'rgba(0,0,0,0)');
        gr.addColorStop(0.55, 'rgba(0,0,0,.30)');
        gr.addColorStop(1, 'rgba(0,0,0,.72)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      });
      function aoStrip(w, x, z, ry) {
        const m = new T.Mesh(new T.PlaneGeometry(w, 0.95), new T.MeshBasicMaterial({
          map: aoTex, transparent: true, opacity: 0.55, depthWrite: false, color: 0x241a10
        }));
        m.position.set(x, 0.475, z);
        if (ry) m.rotation.y = ry;
        m.renderOrder = 1;
        PROPS.add(m);
      }
      aoStrip(RX * 2, 0, ZB + 0.03, 0);
      aoStrip(ZF - ZB, -RX + 0.03, (ZB + ZF) / 2, Math.PI / 2);
      aoStrip(ZF - ZB, RX - 0.03, (ZB + ZF) / 2, -Math.PI / 2);

      // 防疲劳垫（参考图里工作台前那块黑色橡胶垫）
      const matTex = tex(256, 256, (g, w, h) => {
        g.fillStyle = '#2b2a27'; g.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 12) {
          for (let x = 0; x < w; x += 12) {
            g.fillStyle = ((x + y) / 12) % 2 ? 'rgba(0,0,0,.35)' : 'rgba(120,118,110,.18)';
            g.beginPath(); g.arc(x + 6, y + 6, 4.4, 0, 6.283); g.fill();
          }
        }
      }, 2, 2);
      const matM = new T.Mesh(new T.PlaneGeometry(2.6, 1.9), new T.MeshStandardMaterial({
        map: matTex, color: 0x8a8880, roughness: 0.95, metalness: 0.02
      }));
      matM.rotation.x = -Math.PI / 2;
      matM.rotation.z = -0.42;
      matM.position.set(1.85, 0.013, 1.35);
      matM.receiveShadow = true;
      PROPS.add(matM);

      // 黑色搪瓷吊灯（两张参考图里都有，最提气氛）
      function enamelPendant(x, z, drop) {
        const g = new T.Group();
        const enamel = new T.MeshStandardMaterial({ color: 0x1d1e1c, metalness: 0.42, roughness: 0.42 });
        const inner = new T.MeshStandardMaterial({ color: 0x6b6354, metalness: 0.3, roughness: 0.62 });
        g.add(box(0.14, 0.03, 0.14, STEELD, 0, 0, 0));                 // 顶盘
        g.add(cyl(0.008, 0.008, drop, STEELD, 0, -drop / 2, 0, 6));     // 吊线
        const shade = new T.Mesh(new T.ConeGeometry(0.21, 0.17, 24, 1, true), enamel);
        shade.position.y = -drop - 0.09;
        shade.material.side = T.DoubleSide;
        g.add(shade);
        g.add(cyl(0.21, 0.21, 0.012, inner, 0, -drop - 0.165, 0, 24));  // 内壁反光碗
        g.add(cyl(0.055, 0.055, 0.09, new T.MeshStandardMaterial({
          color: 0xfff0cc, emissive: 0xffd39a, emissiveIntensity: 4.2, roughness: 0.4
        }), 0, -drop - 0.16, 0, 14));                                   // 灯泡
        const pl = new T.PointLight(0xffd2a0, 5.0, 4.6, 2);
        pl.position.set(0, -drop - 0.30, 0);
        g.add(pl);
        g.position.set(x, H - 0.02, z);
        g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        PROPS.add(g);
      }
      enamelPendant(-2.55, -1.15, 0.66);
      // 第二盏灯正对镜头，透视下罩口会占掉右上角一大块，去掉

      // 角落气瓶（焊机旁，成对摆放）
      [[-3.55, -1.95, 0x2f5f4a], [-3.15, -2.05, 0x6a6f76]].forEach(([x, z, c]) => {
        const m = new T.MeshStandardMaterial({ color: c, metalness: 0.5, roughness: 0.45 });
        const g2 = new T.Group();
        g2.add(cyl(0.14, 0.14, 1.20, m, 0, 0.62, 0, 20));
        g2.add(cyl(0.085, 0.12, 0.17, m, 0, 1.30, 0, 18));
        g2.add(cyl(0.032, 0.032, 0.13, STEEL, 0, 1.44, 0, 10));
        g2.add(cyl(0.10, 0.10, 0.05, STEELD, 0, 1.51, 0, 14));
        g2.add(cyl(0.15, 0.15, 0.04, STEELD, 0, 0.06, 0, 20));
        g2.position.set(x, 0, z);
        g2.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        PROPS.add(g2);
      });

      // 台面上再补几件小物（图纸 / 胶带 / 游标卡尺 / 螺丝盒），避免台面发空
      (function benchExtra() {
        const BT = 1.10;
        const paperTex = tex(256, 200, (g, w, h) => {
          g.fillStyle = '#efe7d4'; g.fillRect(0, 0, w, h);
          g.strokeStyle = 'rgba(70,90,120,.55)'; g.lineWidth = 1.2;
          g.strokeRect(18, 16, 110, 70);
          g.beginPath(); g.arc(73, 51, 24, 0, 6.283); g.stroke();
          g.beginPath(); g.moveTo(24, 51); g.lineTo(122, 51); g.stroke();
          g.beginPath(); g.moveTo(73, 22); g.lineTo(73, 80); g.stroke();
          for (let i = 0; i < 6; i++) g.fillRect(150, 26 + i * 16, 70 - i * 6, 4);
        });
        const pm = new T.MeshStandardMaterial({ map: paperTex, roughness: 0.95 });
        const sheet = new T.Mesh(new T.PlaneGeometry(0.46, 0.36), pm);
        sheet.rotation.x = -Math.PI / 2;
        sheet.rotation.z = 0.24;
        sheet.position.set(0.02, BT + 0.006, 0.02);
        sheet.receiveShadow = true;
        BC.add(sheet);
        // 胶带卷
        const tape = cyl(0.055, 0.055, 0.045, new T.MeshStandardMaterial({ color: 0xd8ccb2, roughness: 0.8 }), -0.78, BT + 0.025, -0.14, 18);
        BC.add(tape);
        // 游标卡尺
        const cal = new T.Group();
        cal.add(box(0.20, 0.008, 0.022, STEEL, 0, 0, 0));
        cal.add(box(0.05, 0.010, 0.05, STEELD, 0.06, 0.004, 0));
        cal.position.set(0.34, BT + 0.008, -0.20);
        cal.rotation.y = 0.5;
        BC.add(cal);
        // 蓝色小零件盒
        BC.add(box(0.12, 0.06, 0.09, BLUE, -0.30, BT + 0.03, -0.22));
      })();
    })();




    // ---- 天花板灯带（悬空，用细吊杆往上引，不出画面就能交代顶棚）----


    // ---- 中央工作台 ----
    const bench = new T.Group();
    bench.add(box(3.4, 0.10, 1.5, MAT.woodTop, 0, 1.04, 0));
    bench.add(box(3.5, 0.04, 1.56, MAT.woodDark, 0, 0.97, 0));
    [[-1.55, -0.62], [1.55, -0.62], [-1.55, 0.62], [1.55, 0.62]].forEach(([a, b]) => {
      bench.add(box(0.1, 1.0, 0.1, MAT.steelDark, a, 0.5, b));
    });
    // 台面杂物：台钳 + 零件盒
    const vise = box(0.36, 0.20, 0.28, MAT.iron, -1.1, 1.19, 0.1);
    bench.add(vise);
    bench.add(box(0.12, 0.10, 0.24, MAT.ironD, -1.0, 1.28, 0.1));
    const tray = box(0.5, 0.06, 0.34, MAT.ironD, 0.9, 1.15, -0.1);
    bench.add(tray);
    bench.position.set(0, 0, 1.4);
    scene.add(bench);
    TRef.bench = bench;

    // 工作台上方：一根细导轨 + 两盏小射灯（不再悬空）
    scene.add(box(3.8, 0.05, 0.05, MAT.steelDark, 0, 4.35, 1.4));
    [-1.2, 1.2].forEach((x) => {
      const spot = new T.Mesh(new T.ConeGeometry(0.11, 0.2, 16, 1, true), MAT.steelDark);
      spot.position.set(x, 4.2, 1.4);
      spot.rotation.x = Math.PI;
      scene.add(spot);
      scene.add(cyl(0.055, 0.055, 0.03, MAT.ye, x, 4.11, 1.4));
    });

    // ---- 设备 / 空位 ----
    EQUIP_DEF.forEach((def) => {
      const holder = new T.Group();
      holder.position.set(def.pos[0], 0, def.pos[2]);
      holder.rotation.y = def.rot || 0;
      scene.add(holder);
      equipMeshes[def.id] = holder;
      refreshEquipMesh(def.id);
    });

    // ---- 灯 ----
    const dir = new T.DirectionalLight(0xcfe9ff, 1.55);
    dir.position.set(9, 15, 9);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -16; dir.shadow.camera.right = 16;
    dir.shadow.camera.top = 16; dir.shadow.camera.bottom = -16;
    dir.shadow.camera.far = 50;
    dir.shadow.bias = -0.0006;
    if (dir.shadow.camera.updateProjectionMatrix) dir.shadow.camera.updateProjectionMatrix();
    scene.add(dir);
    scene.userData.dir = dir;

    const p1 = new T.PointLight(0xff2d95, 90, 34, 2);
    p1.position.set(-8.5, 4.2, -6);
    scene.add(p1);
    const p2 = new T.PointLight(0x00e5ff, 90, 34, 2);
    p2.position.set(8.5, 4.2, -5);
    scene.add(p2);
    const p3 = new T.PointLight(0xffd166, 42, 18, 2);
    p3.position.set(0, 4.6, 1.4);
    scene.add(p3);
    const amb = new T.AmbientLight(0x243244, 1.9);
    scene.add(amb);
    const hemi = new T.HemisphereLight(0x2c4a63, 0x05070c, 0.55);
    scene.add(hemi);

    scene.userData.lights = [p1, p2, p3];
    TRef.key = dir; TRef.amb = amb; TRef.hemi = hemi;
    TRef.pts = [p1, p2, p3];
    scene.userData.theme = TRef;

    // 程序化环境光照贴图（暖色房间 + 窗口亮斑）：让金属和漆面反射出环境，
    // 这一层对"照片感"的贡献比再加灯光更大
    (function buildEnv() {
      try {
        const c = document.createElement('canvas');
        c.width = 512; c.height = 256;
        const g = c.getContext('2d');
        const grd = g.createLinearGradient(0, 0, 0, 256);
        grd.addColorStop(0.00, '#f2e2c2');
        grd.addColorStop(0.42, '#c6ac82');
        grd.addColorStop(0.52, '#6d5942');
        grd.addColorStop(1.00, '#211a12');
        g.fillStyle = grd; g.fillRect(0, 0, 512, 256);
        // 窗口亮斑（右侧偏上）
        const wg = g.createRadialGradient(352, 86, 6, 352, 86, 78);
        wg.addColorStop(0, '#fffaf0'); wg.addColorStop(1, 'rgba(255,246,224,0)');
        g.fillStyle = wg; g.fillRect(270, 10, 170, 150);
        // 吊灯暖点
        const pg = g.createRadialGradient(120, 44, 4, 120, 44, 46);
        pg.addColorStop(0, '#fff0cc'); pg.addColorStop(1, 'rgba(255,236,200,0)');
        g.fillStyle = pg; g.fillRect(60, 0, 130, 110);
        const tex = new T.CanvasTexture(c);
        tex.mapping = T.EquirectangularReflectionMapping;
        tex.colorSpace = T.SRGBColorSpace;
        const pm = new T.PMREMGenerator(renderer);
        pm.compileEquirectangularShader();
        const rt = pm.fromEquirectangular(tex);
        pm.dispose(); tex.dispose();
        scene.userData.envTex = rt.texture;
      } catch (e) { scene.userData.envTex = null; }
    })();

    applyTheme(themeId);
  }

  function refreshEquipMesh(id) {
    const holder = equipMeshes[id];
    if (!holder) return;
    const def = EQUIP_DEF.find((d) => d.id === id);
    while (holder.children.length) holder.remove(holder.children[0]);
    if (state.equip[id]) {
      const m = MODEL_BUILD[id]();
      m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      holder.add(m);
      holder.userData.born = performance.now();
    } else {
      holder.add(ghostFor(def));
    }
  }

  /* ---------- 后期：自写 Bloom ---------- */
  function makeRT(w, h, depth, wantDepthTex) {
    const rt = new T.WebGLRenderTarget(w, h, {
      type: T.HalfFloatType,
      minFilter: T.LinearFilter,
      magFilter: T.LinearFilter,
      depthBuffer: !!depth,
      stencilBuffer: false
    });
    rt.texture.colorSpace = T.NoColorSpace;
    if (depth && wantDepthTex) {
      const dt = new T.DepthTexture(w, h);
      dt.format = T.DepthFormat;
      dt.type = T.UnsignedIntType;
      dt.minFilter = T.NearestFilter;
      dt.magFilter = T.NearestFilter;
      rt.depthTexture = dt;
    }
    return rt;
  }

  const FS_VERT = `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `;

  function makePass(frag, uniforms) {
    return new T.ShaderMaterial({
      uniforms: uniforms, vertexShader: FS_VERT, fragmentShader: frag,
      depthTest: false, depthWrite: false
    });
  }

  const brightMat = makePass(`
    uniform sampler2D tMap; uniform float uThreshold; uniform vec2 uTexel;
    varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tMap, vUv).rgb;
      float l = dot(c, vec3(0.2126,0.7152,0.0722));
      float w = smoothstep(uThreshold, uThreshold + 0.45, l);
      // 中心偏亮，边缘衰减，避免整屏泛光
      vec2 d = vUv - 0.5;
      w *= 1.0 - clamp(length(d) * 0.55, 0.0, 0.8);
      gl_FragColor = vec4(c * w, 1.0);
    }
  `, { tMap: { value: null }, uThreshold: { value: 0.62 }, uTexel: { value: new T.Vector2() } });

  const blurMat = makePass(`
    uniform sampler2D tMap; uniform vec2 uDir;
    varying vec2 vUv;
    void main(){
      vec3 s = texture2D(tMap, vUv).rgb * 0.227027;
      s += (texture2D(tMap, vUv + uDir * 1.3846).rgb + texture2D(tMap, vUv - uDir * 1.3846).rgb) * 0.3162162;
      s += (texture2D(tMap, vUv + uDir * 3.2308).rgb + texture2D(tMap, vUv - uDir * 3.2308).rgb) * 0.0702702;
      gl_FragColor = vec4(s, 1.0);
    }
  `, { tMap: { value: null }, uDir: { value: new T.Vector2() } });

  compMat = makePass(`
    uniform sampler2D tBase; uniform sampler2D tB1; uniform sampler2D tB2; uniform sampler2D tB3;
    uniform sampler2D tAO;
    uniform float uTime; uniform float uStrength; uniform vec2 uRes;
    uniform float uExposure; uniform float uVigMin; uniform float uNoise; uniform float uScan; uniform float uSat;
    uniform float uAO;
    varying vec2 vUv;

    vec3 aces(vec3 x){
      float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;
      return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
    }

    void main(){
      vec2 uv = vUv;
      // 轻微色差
      vec2 d = uv - 0.5;
      float r2 = dot(d,d);
      vec2 off = d * r2 * 0.012;
      vec3 base;
      base.r = texture2D(tBase, uv + off).r;
      base.g = texture2D(tBase, uv).g;
      base.b = texture2D(tBase, uv - off).b;

      vec3 bloom = texture2D(tB1, uv).rgb * 0.52
                 + texture2D(tB2, uv).rgb * 0.34
                 + texture2D(tB3, uv).rgb * 0.24;

      // 环境光遮蔽只压漫反射，不动辉光（否则高光处会出现脏灰边）
      if (uAO > 0.001) base *= mix(1.0, texture2D(tAO, uv).r, uAO);

      vec3 col = base + bloom * uStrength;

      // 暗角
      float vig = smoothstep(0.95, 0.28, length(d) * 1.12);
      col *= mix(uVigMin, 1.0, vig);

      // 色调映射 + gamma
      col = aces(col * uExposure);
      col = pow(col, vec3(1.0/2.2));

      // 降饱和 + 分离色调（高光暖、暗部冷），更像照片而不是插画
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(lum), col, uSat);
      vec3 warmT = vec3(1.035, 1.0, 0.955);
      vec3 coolT = vec3(0.955, 0.975, 1.03);
      col *= mix(coolT, warmT, smoothstep(0.12, 0.88, lum));

      // 噪点 + 极淡扫描线
      float n = fract(sin(dot(uv * uRes, vec2(12.9898,78.233)) + uTime) * 43758.5453);
      col += (n - 0.5) * uNoise;
      col *= 1.0 - uScan * step(0.5, fract(uv.y * uRes.y * 0.5));

      gl_FragColor = vec4(col, 1.0);
    }
  `, {
    tBase: { value: null }, tB1: { value: null }, tB2: { value: null }, tB3: { value: null },
    tAO: { value: null },
    uTime: { value: 0 }, uStrength: { value: 1.15 }, uRes: { value: new T.Vector2(1, 1) },
    uExposure: { value: 1.42 }, uVigMin: { value: 0.55 }, uNoise: { value: 0.022 }, uScan: { value: 0.03 }, uSat: { value: 1.0 },
    uAO: { value: 0.0 }
  });

  /* ---------- 后期：SSAO（深度重建法线，无需额外法线 pass） ---------- */
  const SSAO_N = 14;
  const ssaoKernel = (() => {
    const arr = [];
    let seed = 20261102;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < SSAO_N; i++) {
      const v = new T.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 0.9 + 0.1);
      v.normalize();
      const k = (i + 1) / SSAO_N;
      v.multiplyScalar(0.3 + 0.7 * k * k);   // 越靠后的样本越远，模拟半球分布
      arr.push(v);
    }
    return arr;
  })();

  let ssaoRT = null, ssaoTmp = null;

  // 兜底：AO 贴图未就绪时用纯白，避免整屏乘 0 变黑
  const whiteTex = (() => {
    const d = new Uint8Array([255, 255, 255, 255]);
    const t = new T.DataTexture(d, 1, 1);
    t.needsUpdate = true;
    return t;
  })();

  const ssaoMat = makePass(
    '#define SSAO_N ' + SSAO_N + '\n' + `
    uniform sampler2D tDepth;
    uniform mat4 uProj; uniform mat4 uProjInv;
    uniform vec2 uRes;
    uniform float uRadius; uniform float uBias; uniform float uPower;
    uniform vec3 uKernel[SSAO_N];
    varying vec2 vUv;

    float dAt(vec2 uv){ return texture2D(tDepth, uv).r; }

    vec3 vPos(vec2 uv, float d){
      vec4 c = vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
      vec4 v = uProjInv * c;
      return v.xyz / v.w;
    }

    void main(){
      vec2 texel = 1.0 / uRes;
      float d = dAt(vUv);
      // 背景（天空/远景）不参与遮蔽
      if (d >= 0.999999) { gl_FragColor = vec4(1.0); return; }
      vec3 p = vPos(vUv, d);

      vec2 uvR = vUv + vec2(texel.x, 0.0);
      vec2 uvU = vUv - vec2(0.0, texel.y);   // UV 的 y 向下，取「视图空间上方」需减
      vec3 pR = vPos(uvR, dAt(uvR));
      vec3 pU = vPos(uvU, dAt(uvU));
      vec3 n = normalize(cross(pR - p, pU - p));


      // 逐像素旋转核，把带状伪影打散
      float a = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831853;
      vec3 rv = vec3(cos(a), sin(a), 0.15);
      vec3 tang = normalize(rv - n * dot(rv, n));
      vec3 bitang = cross(n, tang);
      mat3 TBN = mat3(tang, bitang, n);

      float occ = 0.0;
      for (int i = 0; i < SSAO_N; i++) {
        vec3 s = p + (TBN * uKernel[i]) * uRadius;
        vec4 clip = uProj * vec4(s, 1.0);
        if (clip.w <= 0.0) continue;
        vec2 suv = clip.xy / clip.w * 0.5 + 0.5;
        if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) continue;
        vec3 sp = vPos(suv, dAt(suv));
        // 距离衰减：远处的几何体不该遮蔽近处
        float rc = smoothstep(0.0, 1.0, uRadius / max(0.0001, abs(p.z - sp.z)));
        occ += (sp.z - s.z > uBias ? 1.0 : 0.0) * rc;
      }
      float ao = 1.0 - occ / float(SSAO_N);
      ao = pow(clamp(ao, 0.0, 1.0), uPower);
      gl_FragColor = vec4(vec3(ao), 1.0);
    }
  `, {
    tDepth: { value: null }, uProj: { value: new T.Matrix4() }, uProjInv: { value: new T.Matrix4() },
    uRes: { value: new T.Vector2(1, 1) }, uRadius: { value: 0.42 }, uBias: { value: 0.018 },
    uPower: { value: 1.35 },
    uKernel: { value: ssaoKernel }
  });

  // 双向模糊，抹掉 14 个样本带来的颗粒
  const aoBlurMat = makePass(`
    uniform sampler2D tMap; uniform vec2 uDir;
    varying vec2 vUv;
    void main(){
      float s = texture2D(tMap, vUv).r * 0.332;
      s += (texture2D(tMap, vUv + uDir * 1.407).r + texture2D(tMap, vUv - uDir * 1.407).r) * 0.276;
      s += (texture2D(tMap, vUv + uDir * 3.294).r + texture2D(tMap, vUv - uDir * 3.294).r) * 0.058;
      gl_FragColor = vec4(vec3(s), 1.0);
    }
  `, { tMap: { value: null }, uDir: { value: new T.Vector2() } });

  function initPost() {
    fsScene = new T.Scene();
    fsCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    fsQuad = new T.Mesh(new T.PlaneGeometry(2, 2), brightMat);
    fsQuad.frustumCulled = false;
    fsScene.add(fsQuad);
  }

  function resizePost(w, h) {
    if (sceneRT) {
      if (sceneRT.depthTexture) sceneRT.depthTexture.dispose();
      sceneRT.dispose();
    }
    bloomRT.forEach((r) => r.dispose());
    bloomTmp.forEach((r) => r.dispose());
    if (ssaoRT) ssaoRT.dispose();
    if (ssaoTmp) ssaoTmp.dispose();
    sceneRT = makeRT(w, h, true, true);
    // SSAO 走半分辨率：4 倍提速，且天然更柔和（噪点被平均掉）
    const aw = Math.max(2, Math.floor(w / 2)), ah = Math.max(2, Math.floor(h / 2));
    ssaoRT = makeRT(aw, ah, false, false);
    ssaoTmp = makeRT(aw, ah, false, false);
    bloomRT = []; bloomTmp = [];
    let cw = w, ch = h;
    for (let i = 0; i < 3; i++) {
      cw = Math.max(2, Math.floor(cw / 2));
      ch = Math.max(2, Math.floor(ch / 2));
      bloomRT.push(makeRT(cw, ch, false));
      bloomTmp.push(makeRT(cw, ch, false));
    }
    compMat.uniforms.uRes.value.set(w, h);
    ssaoMat.uniforms.uRes.value.set(w, h);
  }

  function blit(mat, target) {
    fsQuad.material = mat;
    renderer.setRenderTarget(target);
    renderer.render(fsScene, fsCam);
  }

  function spawnChip(ud) {
    const c = ud.chips.find((x) => x.userData.life <= 0);
    if (!c) return;
    c.visible = true;
    c.position.set((Math.random() - 0.5) * 0.03, 0.548, 0.02 + (Math.random() - 0.5) * 0.03);
    c.userData.v.set((Math.random() - 0.5) * 0.85, 0.55 + Math.random() * 0.75, (Math.random() - 0.5) * 0.85);
    c.userData.life = 0.45 + Math.random() * 0.3;
    c.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
  }

  // 车床铁屑：从刀尖（跟着溜板走）甩向操作者一侧
  function spawnLatheChip(ud) {
    const c = ud.chips.find((x) => x.userData.life <= 0);
    if (!c) return;
    c.visible = true;
    c.position.set(0.042, 1.185, ud.saddle.position.z - 0.10);
    c.userData.v.set(0.18 + Math.random() * 0.55, 0.30 + Math.random() * 0.55, (Math.random() - 0.5) * 0.7);
    c.userData.life = 0.55 + Math.random() * 0.35;
    c.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
  }

  function spawnWeldSpark(ud) {
    const s = ud.sparks.find((x) => x.userData.life <= 0);
    if (!s) return;
    s.visible = true;
    s.position.copy(ud.arc.position);
    // 电弧把熔化的铁水甩出去：以斜上方为主，方向随机散开
    const a = Math.random() * Math.PI * 2;
    const sp = 0.30 + Math.random() * 0.85;
    s.userData.v.set(Math.cos(a) * sp, 0.55 + Math.random() * 1.15, Math.sin(a) * sp);
    s.userData.life = 0.28 + Math.random() * 0.42;
    s.scale.setScalar(0.55 + Math.random() * 0.9);
  }

  function renderFrame(t) {
    const dt = Math.min(0.05, lastT ? Math.max(0.001, t - lastT) : 0.016);
    lastT = t;
    // 自动缓慢环绕
    if (autoSpin && performance.now() - lastInteract > 6000) camTheta += 0.00075;

    const R = camRadius;
    const LT = camTarget || { x: 0, y: 1.6, z: 0 };
    camera.position.set(
      LT.x + R * Math.sin(camPhi) * Math.sin(camTheta),
      LT.y + R * Math.cos(camPhi),
      LT.z + R * Math.sin(camPhi) * Math.cos(camTheta)
    );
    camera.lookAt(LT.x, LT.y, LT.z);

    // 设备呼吸光
    const lights = scene.userData.lights;
    lights[0].intensity = (lights[0].userData.base || 82) * (1 + Math.sin(t * 1.7) * 0.14);
    lights[1].intensity = (lights[1].userData.base || 88) * (1 + Math.sin(t * 1.3 + 2) * 0.15);

    // 3D 打印头动画
    const ph = equipMeshes.printer;
    if (ph && ph.children[0]) {
      const head = ph.children[0].userData.head;
      if (head) {
        head.position.x = Math.sin(t * 2.1) * 0.32;
        head.position.z = Math.cos(t * 1.6) * 0.26;
      }
    }

    // ---- 台钻：主轴旋转 + 三程进给 + 铁屑 ----
    const dg = equipMeshes.drill;
    if (dg && dg.children[0]) {
      const ud = dg.children[0].userData;
      if (ud && ud.quill && ud.chips) {
        const now = performance.now();
        const on = anim.drill > now;
        const p = on ? clamp(1 - (anim.drill - now) / anim.drillDur, 0, 1) : 0;

        ud.spin.rotation.y += dt * (on ? 36 : 1.5);

        let dip = 0;
        if (on) {
          const cyc = (p * 3) % 1;
          const stroke = Math.sin(cyc * Math.PI);       // 0 → 1 → 0
          dip = -0.086 * stroke;
          if (ud.handle) ud.handle.rotation.z -= dt * 6.4 * stroke;
          ud.chipT = (ud.chipT || 0) + dt;
          if (ud.chipT > 0.045 && stroke > 0.35) { ud.chipT = 0; spawnChip(ud); }
        }
        ud.quill.position.y += ((on ? dip : 0) - ud.quill.position.y) * Math.min(1, dt * 20);
        if (ud.lamp) ud.lamp.intensity = on ? 0.85 + Math.sin(now * 0.035) * 0.2 : 0.5;

        ud.chips.forEach((c) => {
          if (c.userData.life <= 0) return;
          c.userData.life -= dt;
          c.userData.v.y -= 9.2 * dt;
          c.position.addScaledVector(c.userData.v, dt);
          c.rotation.x += dt * 9; c.rotation.z += dt * 7;
          if (c.position.y < 0.445) {                       // 落在台面上反弹
            c.position.y = 0.445;
            c.userData.v.y *= -0.32;
            c.userData.v.x *= 0.45; c.userData.v.z *= 0.45;
          }
          if (c.userData.life <= 0) c.visible = false;
        });
      }
    }

    // ---- 车床：卡盘自转 + 溜板走刀 + 手轮/丝杠 + 铁屑 ----
    const lg = equipMeshes.lathe;
    if (lg && lg.children[0]) {
      const ud = lg.children[0].userData;
      if (ud && ud.chuck && ud.saddle) {
        const now = performance.now();
        const on = anim.lathe > now;
        const p = on ? clamp(1 - (anim.lathe - now) / anim.latheDur, 0, 1) : 0;

        // 主轴：工作时转起来，停机后靠惯性慢慢停 —— 一刀切到 0 会很假
        const cur = ud.spin || 0;
        const nv = cur + ((on ? 17 : 0) - cur) * Math.min(1, dt * (on ? 6 : 1.7));
        ud.spin = nv;
        if (nv > 0.02) ud.chuck.rotation.z += dt * nv;

        // 溜板：沿床身往复走刀（这是最容易被看见的动作），停机回原位
        // 一次开工走一个来回：sin(p*2π) 在 p 从 0 到 1 时正好去而复返
        const walk = on ? Math.sin(p * Math.PI * 2) * 0.22 : 0;
        const wantZ = ud.carZ + walk;
        ud.dbgP = p; ud.dbgWant = wantZ;     // 调试入口读用
        ud.dbgWalkMax = Math.max(ud.dbgWalkMax || 0, Math.abs(walk));
        ud.saddle.position.z += (wantZ - ud.saddle.position.z) * Math.min(1, dt * 9);

        // 横向进给手轮 + 丝杠：只在切削时转
        if (on) {
          ud.cw.rotation.x += dt * 2.1;
          if (ud.screw) ud.screw.rotation.z += dt * 6.2;
        }

        // 铁屑：从刀尖甩出，落到接屑盘上弹一下
        ud.chipT = (ud.chipT || 0) + dt;
        if (on && ud.chipT > 0.05 && nv > 6) { ud.chipT = 0; spawnLatheChip(ud); }
        ud.chips.forEach((c) => {
          if (c.userData.life <= 0) return;
          c.userData.life -= dt;
          c.userData.v.y -= 9.2 * dt;
          c.position.addScaledVector(c.userData.v, dt);
          c.rotation.x += dt * 9; c.rotation.z += dt * 7;
          if (c.position.y < 0.672) {                       // 接屑盘底面
            c.position.y = 0.672;
            c.userData.v.y *= -0.30;
            c.userData.v.x *= 0.40; c.userData.v.z *= 0.40;
          }
          if (c.userData.life <= 0) c.visible = false;
        });
      }
    }

    // ---- 焊机：电弧闪烁 + 焊枪摆动 + 火花飞溅 ----
    const wg = equipMeshes.welder;
    if (wg && wg.children[0]) {
      const ud = wg.children[0].userData;
      if (ud && ud.arc && ud.sparks) {
        const now = performance.now();
        const on = anim.weld > now;
        const p = on ? clamp(1 - (anim.weld - now) / anim.weldDur, 0, 1) : 0;

        // 电弧亮度：真实焊接电流本身就不稳，用两个不同频率的正弦相乘做出不规则闪烁，
        // 再加一点随机 —— 恒定亮度的弧光一眼就是贴图，不是电
        const flick = on
          ? 0.60 + 0.40 * Math.abs(Math.sin(now * 0.041) * Math.sin(now * 0.0173)) + (Math.random() - 0.5) * 0.12
          : 0;
        ud.dbgFlick = flick;                 // 调试入口读用
        ud.arc.visible = on && flick > 0.22;
        ud.arc.scale.setScalar(0.68 + flick * 0.85);
        ud.arcLight.intensity = on ? 2.0 + flick * 16.0 : 0;
        ud.glowMat.emissiveIntensity = on ? 3.2 : 0.6;

        // 焊枪：沿焊缝来回摆（焊工的手不会完全静止），停工时回中位
        const sway = on ? Math.sin(p * Math.PI * 7) : 0;
        ud.dbgSway = Math.max(ud.dbgSway || 0, Math.abs(sway));
        ud.torch.position.z = ud.torchZ + sway * 0.024;
        ud.torch.rotation.x = sway * 0.055;
        ud.torch.rotation.z = -0.12 + Math.sin(now * 0.0021) * 0.010;

        // 火花：密度跟亮度走，弧光亮的时候甩得更多
        ud.sparkT = (ud.sparkT || 0) + dt;
        if (on && ud.sparkT > 0.030) { ud.sparkT = 0; if (flick > 0.45) spawnWeldSpark(ud); }
        ud.sparks.forEach((s) => {
          if (s.userData.life <= 0) return;
          s.userData.life -= dt;
          s.userData.v.y -= 7.4 * dt;
          s.position.addScaledVector(s.userData.v, dt);
          s.rotation.x += dt * 12; s.rotation.z += dt * 9;
          if (s.position.y < 0.34) {               // 落到台面/工件上就熄了
            s.userData.life = 0;
          }
          if (s.userData.life <= 0) s.visible = false;
        });
      }
    }

    renderer.setRenderTarget(sceneRT);
    renderer.clear();
    renderer.render(scene, camera);

    // ---- SSAO：深度重建法线 → 半球采样 → 双向模糊 ----
    const aoOn = compMat.uniforms.uAO.value > 0.001 && !!sceneRT.depthTexture;
    compMat.uniforms.tAO.value = aoOn ? ssaoRT.texture : whiteTex;
    if (aoOn) {
      ssaoMat.uniforms.tDepth.value = sceneRT.depthTexture;
      ssaoMat.uniforms.uProj.value.copy(camera.projectionMatrix);
      ssaoMat.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
      blit(ssaoMat, ssaoRT);

      aoBlurMat.uniforms.tMap.value = ssaoRT.texture;
      aoBlurMat.uniforms.uDir.value.set(1.6 / ssaoRT.width, 0);
      blit(aoBlurMat, ssaoTmp);

      aoBlurMat.uniforms.tMap.value = ssaoTmp.texture;
      aoBlurMat.uniforms.uDir.value.set(0, 1.6 / ssaoRT.height);
      blit(aoBlurMat, ssaoRT);
    }

    // bright pass -> b1
    brightMat.uniforms.tMap.value = sceneRT.texture;
    blit(brightMat, bloomRT[0]);

    // 逐级模糊
    for (let i = 0; i < 3; i++) {
      if (i > 0) {
        // 降采样：把上一级结果拷贝到本级
        blurMat.uniforms.tMap.value = bloomRT[i - 1].texture;
        blurMat.uniforms.uDir.value.set(0.6 / bloomRT[i - 1].width, 0);
        blit(blurMat, bloomRT[i]);
      }
      blurMat.uniforms.tMap.value = bloomRT[i].texture;
      blurMat.uniforms.uDir.value.set(1.4 / bloomRT[i].width, 0);
      blit(blurMat, bloomTmp[i]);
      blurMat.uniforms.tMap.value = bloomTmp[i].texture;
      blurMat.uniforms.uDir.value.set(0, 1.4 / bloomRT[i].height);
      blit(blurMat, bloomRT[i]);
    }

    compMat.uniforms.tBase.value = sceneRT.texture;
    compMat.uniforms.tB1.value = bloomRT[0].texture;
    compMat.uniforms.tB2.value = bloomRT[1].texture;
    compMat.uniforms.tB3.value = bloomRT[2].texture;
    compMat.uniforms.uTime.value = t;
    blit(compMat, null);
  }

  function applyQuality() {
    if (!renderer) return;
    const cfg = qcfg();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cfg.dpr));
    const dir = scene && scene.userData.dir;
    if (dir) dir.shadow.mapSize.set(cfg.shadow, cfg.shadow);
    if (dir && dir.shadow.map) { dir.shadow.map.dispose(); dir.shadow.map = null; }
    onResize();
  }

  function onResize() {
    if (!renderer) return;
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const pr = renderer.getPixelRatio();
    resizePost(Math.floor(w * pr), Math.floor(h * pr));
  }

  function initThree() {
    const canvas = $('#scene');
    // 截图模式必须保留绘制缓冲，否则停掉 rAF 后画布会被清空
    renderer = new T.WebGLRenderer({
      canvas, antialias: true, powerPreference: 'high-performance',
      preserveDrawingBuffer: location.hash.indexOf('shot') >= 0
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, qcfg().dpr));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.NoToneMapping; // 自己在合成里做

    camera = new T.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);
    clock = new T.Clock();

    initMaterials();
    buildScene();
    initPost();
    onResize();

    /* ---- 相机操作 ----
       桌面：拖拽旋转 + 滚轮推拉
       触摸：单指旋转、双指捏合缩放（按指距比例缩放，比加减更跟手） */
    let dragging = false, px = 0, py = 0;
    const pts = new Map();
    let pinchPrev = 0;
    const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    canvas.addEventListener('pointerdown', (e) => {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      lastInteract = performance.now();
      if (pts.size === 2) {
        const v = Array.from(pts.values());
        pinchPrev = dist2(v[0], v[1]);
        dragging = false;                       // 进入捏合，先停旋转
      } else if (pts.size === 1) {
        dragging = true; px = e.clientX; py = e.clientY;
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      lastInteract = performance.now();

      if (pts.size >= 2) {
        const v = Array.from(pts.values());
        const d = dist2(v[0], v[1]);
        if (pinchPrev > 6 && d > 6) camRadius = clamp(camRadius * (pinchPrev / d), 3.4, 26);
        pinchPrev = d;
        return;
      }
      if (!dragging) return;
      camTheta -= (e.clientX - px) * 0.006;
      camPhi = clamp(camPhi - (e.clientY - py) * 0.004, 0.40, 1.55);
      px = e.clientX; py = e.clientY;
    });

    function endPointer(e) {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinchPrev = 0;
      if (pts.size === 1) {                     // 松开一根手指后接着转，视角不能跳
        const v = Array.from(pts.values());
        dragging = true; px = v[0].x; py = v[0].y;
      } else if (pts.size === 0) {
        dragging = false;
      }
    }
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);

    canvas.addEventListener('wheel', (e) => {
      camRadius = clamp(camRadius + e.deltaY * 0.012, 4, 26);
      lastInteract = performance.now();
      e.preventDefault();
    }, { passive: false });

    // 兜底：Safari 的双指缩放整页手势（画布上已 touch-action:none）
    document.addEventListener('gesturestart', (e) => e.preventDefault());

    window.addEventListener('resize', onResize);
    animate();
  }

  // 截图/自检模式：渲染固定帧数后停住，避免软件渲染下长时间空转
  const SHOT_MAX = location.hash.indexOf('shot') >= 0 ? 14 : -1;
  let shotFrames = 0;

  function animate() {
    const stop = SHOT_MAX > 0 && shotFrames >= SHOT_MAX;
    if (!stop) requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    renderFrame(t);
    shotFrames++;
    // 同一帧内导出画布，绕开 headless 合成时机问题
    if (SHOT_MAX > 0 && shotFrames === 10) {
      try {
        const u = renderer.domElement.toDataURL('image/png');
        const img = document.createElement('img');
        img.id = 'cap';
        img.src = u;
        document.body.appendChild(img);
        document.title = 'cap|' + u.length;
      } catch (e) { document.title = 'caperr|' + e.message; }
    }
  }

  /* ============================================================
     四、游戏逻辑
     ============================================================ */

  function log(msg, cls) {
    logs.push({ m: msg, c: cls || '' });
    if (logs.length > 80) logs.shift();
    renderLog();
  }

  function toast(msg, kind) {
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = msg;
    $('#toast').appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; }, 1900);
    setTimeout(() => el.remove(), 2400);
  }

  // 让某台设备"动起来"（已实现：台钻、车床、焊机；数控照这个模式扩）
  function animEquip(id, ms) {
    if (!state || !state.equip[id] || !equipMeshes[id]) return false;
    anim[id] = performance.now() + (ms || 1600);
    if (id === 'drill') { anim.drillDur = ms || 1600; if (SFX.drill) SFX.drill(ms || 1600); }
    else if (id === 'lathe') { anim.latheDur = ms || 1500; if (SFX.lathe) SFX.lathe(ms || 1500); }
    else if (id === 'welder') { anim.weldDur = ms || 1500; if (SFX.weld) SFX.weld(ms || 1500); }
    lastInteract = performance.now();
    return true;
  }

  // 一张活可能同时用到多台机器（比如车完再钻），凡是点到的都让它转起来
  function animEquipList(list, ms) {
    (list || []).forEach((id) => animEquip(id, ms));
  }

  function skillLv(id) { return state.skills[id] || 0; }

  function hasAllEquip(list) { return (list || []).every((e) => state.equip[e]); }

  function missingEquip(list) { return (list || []).filter((e) => !state.equip[e]); }

  function skillGap(req) {
    let g = 0;
    for (const k in req) g += Math.max(0, req[k] - skillLv(k));
    return g;
  }

  // 这单还差什么才能接：技能不够 / 缺设备，逐条列成人话
  function orderBlockers(o) {
    const out = [];
    Object.keys(o.req || {}).forEach((k) => {
      const need = o.req[k], have = skillLv(k);
      if (have >= need) return;
      const s = SKILL_DEF.find((x) => x.id === k);
      out.push((s ? s.name : k) + ' ' + have + '/' + need + ' 级');
    });
    (o.equip || []).forEach((e) => {
      if (state.equip[e]) return;
      const d = EQUIP_DEF.find((x) => x.id === e);
      out.push('没有「' + (d ? d.name : e) + '」');
    });
    return out;
  }

  function advanceTime() {
    state.slot++;
    if (state.slot > 2) {
      state.slot = 0;
      state.day++;
      onNewDay();
    }
    save(); renderAll();
  }

  function onNewDay() {
    // 逾期检查
    state.orders.forEach((o) => {
      const over = state.day - o.takenDay - o.days;
      if (over >= 3) {
        o.failed = true;
        log('<b>订单失败</b> 「' + o.name + '」逾期太久，客户撤单了。', 'b');
        state.rep = Math.max(0, state.rep - 3);
      }
    });
    state.orders = state.orders.filter((o) => !o.failed);
    // 刷新订单板
    state.board = genBoard();
    // 随机事件
    if (Math.random() < 0.34) randomEvent();
    log('<b>第 ' + state.day + ' 天</b> 天亮了，车间风扇开始转。');
  }

  function randomEvent() {
    const r = Math.random();
    const owned = EQUIP_DEF.filter((e) => state.equip[e.id]);
    if (r < 0.22) {
      const e = pick(EQUIP_DEF);
      toast('二手市场：' + e.name + ' 今天七折', 'good');
      log('<b>机遇</b> 有人出二手「' + e.name + '」，今天只要 ' + fmt(e.price * 0.7) + '。', 'g');
      state.discount = { id: e.id, until: state.day };
    } else if (r < 0.44 && owned.length) {
      const e = pick(owned);
      const cost = Math.round(e.price * 0.06) + 80;
      state.cash -= cost;
      toast('设备故障：' + e.name + ' 停了半天', 'bad');
      log('<b>故障</b> 「' + e.name + '」出了点毛病，修掉 ' + fmt(cost) + '。', 'b');
    } else if (r < 0.62) {
      state.rep += 2;
      toast('熟人介绍：声望 +2', 'good');
      log('<b>人脉</b> 老客户带了句话过来，说下次还找你。', 'g');
    } else if (r < 0.8) {
      state.cash += 400;
      toast('小活顺手：+¥400', 'good');
      log('<b>外快</b> 帮人改了个小件，收了 ' + fmt(400) + '。');
    } else {
      toast('断电半天，今天少一格');
      log('<b>停电</b> 车间跳了闸，半天没了。', 'w');
      state.slot = 1;
    }
  }

  function genBoard() {
    const pool = ORDER_POOL.filter((o) => o.t <= Math.max(1, Math.floor(state.rep / 16) + 1));
    const out = [];
    const used = new Set();
    let guard = 0;
    while (out.length < 3 && guard++ < 60) {
      const o = pick(pool);
      if (used.has(o.name)) continue;
      used.add(o.name);
      out.push({
        uid: state.uid++,
        name: o.name, desc: o.desc,
        reward: Math.round(o.reward * rnd(0.92, 1.15)),
        days: o.days, steps: o.steps, done: 0,
        req: JSON.parse(JSON.stringify(o.req)),
        equip: (o.equip || []).slice(),
        mat: o.mat, takenDay: 0
      });
    }
    return out;
  }

  function takeOrder(uid) {
    if (state.orders.length >= 3) { toast('手上最多接 3 单', 'bad'); return; }
    const idx = state.board.findIndex((o) => o.uid === uid);
    if (idx < 0) return;
    const o = state.board[idx];
    // 条件不够的单不许接：接了也干不动，只会白占一个订单位、最后交付出次品
    const blockers = orderBlockers(o);
    if (blockers.length) {
      toast('接不了「' + o.name + '」，还差：' + blockers.join('、'), 'bad');
      log('「' + o.name + '」够不上条件：' + blockers.join('、') + '。', 'w');
      return;
    }
    state.board.splice(idx, 1);
    o.takenDay = state.day;
    state.orders.push(o);
    state.board = genBoard().slice(0, 3);
    log('接下「' + o.name + '」，' + o.days + ' 天内交。');
    save(); renderAll();
  }

  function dropOrder(uid) {
    const i = state.orders.findIndex((o) => o.uid === uid);
    if (i < 0) return;
    const o = state.orders.splice(i, 1)[0];
    state.rep = Math.max(0, state.rep - 1);
    log('放了「' + o.name + '」，名声掉一点。', 'w');
    save(); renderAll();
  }

  function workOrder(uid) {
    const o = state.orders.find((x) => x.uid === uid);
    if (!o) return;
    const eff = state.slot === 2 ? 0.8 : 1.0;
    o.done = Math.min(o.steps, o.done + eff);
    const left = Math.ceil(o.steps - o.done);
    log('干了一格「' + o.name + '」，还差 ' + left + ' 格。');
    // 用到的机器直接在 3D 车间里开机（一台活可能同时要用车床和台钻）
    animEquipList(o.equip, 1500);
    advanceTime();
    if (o.done >= o.steps) toast('「' + o.name + '」可以交了', 'good');
  }

  function deliver(uid) {
    const i = state.orders.findIndex((x) => x.uid === uid);
    if (i < 0) return;
    const o = state.orders[i];
    if (o.done < o.steps - 0.001) { toast('还没干完', 'bad'); return; }

    const gap = skillGap(o.req) + missingEquip(o.equip).length * 1.5;
    let q = 1 - gap * 0.17 + rnd(-0.06, 0.06);
    q = clamp(q, 0.05, 1.15);

    const over = Math.max(0, state.day - o.takenDay - o.days);

    let pay = o.reward, repGain = 0, text = '';
    if (q >= 0.92) { pay *= 1.22; repGain = 3; text = '干得漂亮，客户当场加钱。'; }
    else if (q >= 0.68) { pay *= 1.0; repGain = 2; text = '顺利交付。'; }
    else if (q >= 0.42) { pay *= 0.82; repGain = 1; text = '勉强能用，客户皱了皱眉。'; }
    else { pay *= 0.55; repGain = -1; text = '返工了：手艺不够，活做得糙。'; }

    if (over > 0) { pay *= Math.max(0.5, 1 - over * 0.1); repGain -= over; }

    pay -= o.mat;
    state.cash += Math.round(pay);
    state.rep = Math.max(0, state.rep + repGain);

    state.orders.splice(i, 1);
    log('<b>交付</b> 「' + o.name + '」 ' + text + ' 到手 ' + fmt(pay) + '，声望 ' + (repGain >= 0 ? '+' : '') + repGain + '.',
      repGain > 0 ? 'g' : repGain < 0 ? 'b' : '');
    toast('交付成功 ' + fmt(pay), repGain >= 0 ? 'good' : 'bad');
    save(); renderAll();
  }

  function trainSkill(id) {
    const lv = skillLv(id);
    if (lv >= 5) { toast('已经到顶了', 'bad'); return; }
    const cost = 400 + lv * 520;
    if (state.cash < cost) { toast('钱不够，要 ' + fmt(cost), 'bad'); return; }
    state.cash -= cost;
    state.skills[id] = lv + 1;
    const nm = SKILL_DEF.find((s) => s.id === id).name;
    log('<b>练手</b> ' + nm + ' 升到 ' + (lv + 1) + ' 级，花了 ' + fmt(cost) + '。', 'g');
    advanceTime();
  }

  function buyEquip(id) {
    const def = EQUIP_DEF.find((d) => d.id === id);
    if (!def || state.equip[id]) return;
    const dis = state.discount && state.discount.id === id && state.discount.until >= state.day;
    const price = Math.round(def.price * (dis ? 0.7 : 1));
    if (state.cash < price) { toast('钱不够，要 ' + fmt(price), 'bad'); return; }
    state.cash -= price;
    state.equip[id] = true;
    state.discount = null;
    refreshEquipMesh(id);
    log('<b>进设备</b> 「' + def.name + '」搬进车间，' + fmt(price) + '。', 'g');
    toast('「' + def.name + '」已就位', 'good');
    save(); renderAll();
    // 新机器落位后空转一下，让人看见它是活的
    setTimeout(() => animEquip(id, 1300), 400);
  }

  function curWork() { return WORKS[state.workIdx] || null; }

  // 这件部件现在还不能开工的原因（按优先级列出来）
  function partBlockers(p) {
    const out = [];
    Object.keys(p.req || {}).forEach((k) => {
      const need = p.req[k], have = skillLv(k);
      if (have < need) {
        const s = SKILL_DEF.find((x) => x.id === k);
        out.push((s ? s.name : k) + ' ' + have + '/' + need);
      }
    });
    missingEquip(p.equip).forEach((e) => {
      const d = EQUIP_DEF.find((x) => x.id === e);
      out.push('缺设备 ' + (d ? d.name : e));
    });
    if (state.cash < p.cost) out.push('材料钱差 ' + fmt(p.cost - state.cash));
    return out;
  }

  function buildPart(workId, partId) {
    const w = WORKS.find((x) => x.id === workId);
    if (!w) return;
    const p = w.parts.find((x) => x.id === partId);
    if (!p) return;
    const prog = state.works[workId][partId];
    if (prog >= p.steps) { toast('这件已经做完了', 'good'); return; }

    if (prog === 0) {
      const blockers = partBlockers(p);
      if (blockers.length) { toast('还差：' + blockers.join('、'), 'bad'); return; }
      state.cash -= p.cost;
      log('<b>开工</b> 「' + p.name + '」下料，材料 ' + fmt(p.cost) + '。');
    }
    state.works[workId][partId] = Math.min(p.steps, prog + 1);
    animEquipList(p.equip, 1400);
    if (state.works[workId][partId] >= p.steps) {
      log('<b>完成</b> 「' + p.name + '」做出来了。', 'g');
      toast('「' + p.name + '」完成', 'good');
      checkWorkDone(w);
    }
    advanceTime();
  }

  function checkWorkDone(w) {
    const all = w.parts.every((p) => state.works[w.id][p.id] >= p.steps);
    if (!all) return;
    state.rep += w.rep;
    log('<b>作品达成</b> 「' + w.name + '」成了，声望 +' + w.rep + '。', 'g');
    modal('作品达成 · ' + w.name,
      '<p>' + w.desc + '</p><p style="color:#39ff88">四件部件全部做出来了。它站在工作台上，比图纸上好看。</p>' +
      '<p style="color:#7f8fa6;font-size:11px">声望 +' + w.rep + '。车间的灯好像亮了一点。</p>');
    if (state.workIdx < WORKS.length - 1) {
      state.workIdx++;
      log('<b>新目标</b> 「' + WORKS[state.workIdx].name + '」摆上了台面。');
    }
  }

  function skipSlot() {
    log('这一格没干活，喝了口水。');
    advanceTime();
  }

  /* ============================================================
     五、界面
     ============================================================ */

  function renderHUD() {
    $('#s-cash').textContent = fmt(state.cash);
    $('#s-rep').textContent = state.rep;
    $('#s-day').textContent = state.day;
    $('#s-slot').textContent = SLOT_NAME[state.slot];
    const dots = $('#s-slots').children;
    for (let i = 0; i < 3; i++) dots[i].className = i <= state.slot ? 'on' : '';
  }

  function reqLine(req) {
    return Object.keys(req).map((k) => {
      const s = SKILL_DEF.find((x) => x.id === k);
      const need = req[k], have = skillLv(k);
      const cls = have >= need ? 'ok' : 'bad';
      return '<span class="pill ' + cls + '">' + s.name + ' ' + need + '</span>';
    }).join(' ');
  }

  function equipLine(list) {
    return (list || []).map((e) => {
      const d = EQUIP_DEF.find((x) => x.id === e);
      return '<span class="pill ' + (state.equip[e] ? 'ok' : 'bad') + '">' + d.name + '</span>';
    }).join(' ');
  }

  function renderBoard() {
    const box = $('#l-orders');
    if (!state.board || !state.board.length) { box.innerHTML = '<div class="empty">今天没新单</div>'; return; }
    const html = state.board.map((o) => {
      const blockers = orderBlockers(o);
      const locked = blockers.length > 0;
      return '<div class="card ' + (locked ? 'locked' : 'hot') + '">' +
        '<div class="t">' + o.name +
        (locked
          ? '<span class="pill bad">接不了</span>'
          : '<span class="pill ok">能接</span>') + '</div>' +
        '<div class="d">' + o.desc + '</div>' +
        (locked
          ? '<div class="miss">还差：' + blockers.join('、') + '</div>'
          : '') +
        '<div class="row"><span class="money">' + fmt(o.reward) + '</span>' +
        '<span class="days">' + o.days + ' 天</span><span>' + o.steps + ' 格</span>' +
        '<span class="spacer"></span>' +
        '<button class="btn sm' + (locked ? ' dim' : '') + '" data-act="take" data-id="' + o.uid + '">' +
        (locked ? '接不了' : '接下') + '</button></div>' +
        '<div class="row" style="margin-top:5px;flex-wrap:wrap;gap:4px">' + reqLine(o.req) + equipLine(o.equip) + '</div>' +
        '</div>';
    }).join('');
    // 一张都接不了时，别让人对着订单板发呆，直接说明该去哪补什么
    const allLocked = state.board.every((o) => orderBlockers(o).length > 0);
    box.innerHTML = (allLocked
      ? '<div class="hint">板上的活都够不上。先去「工位 · 技能」练手，再去「设备」添机器。</div>'
      : '') + html;
    $('#t-orders').textContent = state.board.length;
  }

  function renderMine() {
    const box = $('#l-mine');
    if (!state.orders.length) { box.innerHTML = '<div class="empty">手上没有活</div>'; $('#t-mine').textContent = 0; return; }
    box.innerHTML = state.orders.map((o) => {
      const pct = Math.round((o.done / o.steps) * 100);
      const left = Math.max(0, o.takenDay + o.days - state.day);
      const ready = o.done >= o.steps - 0.001;
      const gap = skillGap(o.req) + missingEquip(o.equip).length;
      return '<div class="card ' + (ready ? 'hot' : '') + '">' +
        '<div class="t">' + o.name + (gap ? '<span class="pill bad">手艺缺口</span>' : '') + '</div>' +
        '<div class="row"><span class="days">剩 ' + left + ' 天</span>' +
        '<span>' + Math.floor(o.done) + '/' + o.steps + ' 格</span><span class="spacer"></span>' +
        (ready
          ? '<button class="btn sm mg" data-act="deliver" data-id="' + o.uid + '">交付</button>'
          : '<button class="btn sm" data-act="work" data-id="' + o.uid + '">干一格</button>') +
        '</div>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
        '</div>';
    }).join('');
    $('#t-mine').textContent = state.orders.length;
  }

  function renderSkills() {
    const total = SKILL_DEF.reduce((n, s) => n + skillLv(s.id), 0);
    if ($('#t-skills')) $('#t-skills').textContent = total;
    $('#l-skills').innerHTML = SKILL_DEF.map((s) => {
      const lv = skillLv(s.id);
      const cost = 400 + lv * 520;
      let dots = '';
      for (let i = 0; i < 5; i++) dots += '<i class="' + (i < lv ? 'on' : '') + '"></i>';
      return '<div class="skill"><span class="ic">' + s.ic + '</span>' +
        '<span class="nm">' + s.name + '</span>' +
        '<span class="lv">' + dots + '</span>' +
        '<button class="btn sm" data-act="train" data-id="' + s.id + '" style="margin-left:4px"' +
        (lv >= 5 || state.cash < cost ? ' disabled' : '') + '>' +
        (lv >= 5 ? '满' : fmt(cost)) + '</button></div>';
    }).join('');
  }

  function renderEquip() {
    const owned = EQUIP_DEF.filter((e) => state.equip[e.id]).length;
    $('#t-equip').textContent = owned + '/' + EQUIP_DEF.length;
    $('#l-equip').innerHTML = EQUIP_DEF.map((e) => {
      const has = state.equip[e.id];
      const dis = state.discount && state.discount.id === e.id && state.discount.until >= state.day;
      const price = Math.round(e.price * (dis ? 0.7 : 1));
      return '<div class="eq' + (has ? ' done' : '') + '" title="' + e.name + '">' +
        '<span class="nm">' + e.name + (dis ? ' <span class="pill bad">七折</span>' : '') + '</span>' +
        (has
          ? '<span class="pill ok">已在车间</span>'
          : '<span class="pr">' + fmt(price) + '</span>' +
            '<button class="btn sm" data-act="buy" data-id="' + e.id + '"' + (state.cash < price ? ' disabled' : '') + '>买下</button>') +
        '</div>';
    }).join('');
  }

  function renderWorks() {
    const w = curWork();
    const box = $('#l-works');
    if (!w) { box.innerHTML = '<div class="empty">都做完了</div>'; $('#t-works').textContent = '✓'; return; }
    $('#t-works').textContent = (state.workIdx + 1) + '/' + WORKS.length;
    let html = '<div class="card" style="border-color:rgba(255,45,149,.35);flex:0 0 auto">' +
      '<div class="t">' + w.name + '</div><div class="d">' + w.desc + '</div>' +
      '<div class="d" style="margin-top:6px;color:#7f8fa6">做完这件声望 +' + w.rep + '，下一件自动摆上台面。</div></div>';
    html += w.parts.map((p) => {
      const prog = state.works[w.id][p.id];
      const done = prog >= p.steps;
      const blockers = prog > 0 ? [] : partBlockers(p);
      const pct = Math.round((prog / p.steps) * 100);
      return '<div class="card' + (done ? ' done' : '') + '" style="flex:0 0 auto">' +
        '<div class="t">' + p.name + (done ? ' <span class="pill ok">✓</span>' : '') + '</div>' +
        '<div class="d">' + p.desc + '</div>' +
        '<div class="row" style="flex-wrap:wrap;gap:4px">' + reqLine(p.req) + equipLine(p.equip) + '</div>' +
        (blockers.length ? '<div class="row" style="color:var(--mg)">还差：' + blockers.join('、') + '</div>' : '') +
        '<div class="row"><span class="money">' + fmt(p.cost) + '</span>' +
        '<span>' + prog + '/' + p.steps + '</span><span class="spacer"></span>' +
        (done ? '<span class="pill ok">完成</span>' :
          '<button class="btn sm" data-act="part" data-w="' + w.id + '" data-id="' + p.id + '">' +
          (prog > 0 ? '继续' : '开工') + '</button>') +
        '</div><div class="bar"><i style="width:' + pct + '%"></i></div></div>';
    }).join('');
    box.innerHTML = html;
  }

  function renderLog() {
    const box = $('#logbar');
    box.innerHTML = logs.slice(-40).map((l) => '<div class="' + l.c + '">' + l.m + '</div>').join('');
    box.scrollTop = box.scrollHeight;
  }

  // 右侧三个标签页：技能 / 设备 / 作品 —— 每页独占整列高度，不再互相挤
  let rightTab = 'skills';
  function setTab(name) {
    rightTab = name;
    ['skills', 'equip', 'works'].forEach((k) => {
      const el = $('#l-' + k);
      if (el) el.style.display = (k === name ? 'flex' : 'none');
    });
    const btns = document.querySelectorAll('#rtabs .tab');
    for (let i = 0; i < btns.length; i++) btns[i].classList.toggle('on', btns[i].dataset.tab === name);
  }

  function renderAll() {
    renderHUD(); renderBoard(); renderMine(); renderSkills(); renderEquip(); renderWorks(); renderLog();
  }

  /* ---------- 弹窗 ---------- */
  function modal(title, body, actions) {
    const acts = actions || [{ t: '知道了' }];
    $('#sheet').innerHTML = '<h2>' + title + '</h2><div class="sub">WORKSHOP · 车间记录</div>' + body +
      '<div class="fx">' + acts.map((a, i) =>
        '<button class="btn ' + (a.cls || '') + '" data-mact="' + i + '">' + a.t + '</button>').join('') + '</div>';
    $('#modal').classList.add('on');
    $('#sheet').querySelectorAll('[data-mact]').forEach((b) => {
      b.onclick = () => {
        const a = acts[+b.dataset.mact];
        $('#modal').classList.remove('on');
        if (a && a.fn) a.fn();
      };
    });
  }

  function showHelp() {
    modal('怎么玩', [
      '<p><b style="color:#00e5ff">① 时间</b>　一天三格（上午 / 下午 / 晚上）。接单、练技能、做部件，每做一件事吃一格；晚上的效率是 0.8 格。</p>',
      '<p><b style="color:#00e5ff">② 手艺决定质量</b>　订单上写的技能等级和设备，是这活的最低要求。差得越多，交付时质量越低：干得好客户加钱，干得糙就压价、还掉声望。</p>',
      '<p><b style="color:#00e5ff">③ 先武装自己</b>　右侧技能每练一次升一级（要钱要时间）；设备买下就直接进车间，3D 车间里空位会变成真机器。</p>',
      '<p><b style="color:#00e5ff">④ 长线是「作品」</b>　右下角那几件东西才是真正的目标。部件要技能够、设备齐、材料钱付清，才能开工。</p>',
      '<p><b style="color:#00e5ff">⑤ 拖不动就转视角</b>　鼠标拖拽旋转车间，滚轮拉近拉远，右上角切画质（标准 / 高清 / 4K）。</p>',
      '<p style="color:#7f8fa6;font-size:11px">没有结局。做完一件作品，下一件会自己摆上台面。</p>'
    ].join(''));
  }

  /* ============================================================
     六、外壳（标题 / 存档 / 设置 / 暂停）
     ============================================================ */

  function syncEquipMeshes() { EQUIP_DEF.forEach((d) => refreshEquipMesh(d.id)); }

  function showGhostAll() {
    EQUIP_DEF.forEach((d) => {
      const h = equipMeshes[d.id];
      if (!h) return;
      while (h.children.length) h.remove(h.children[0]);
      h.add(ghostFor(d));
    });
  }

  function shellShow(html) {
    $('#shell-box').innerHTML = html;
    $('#shell').classList.remove('hide');
  }
  function shellHide() { $('#shell').classList.add('hide'); }
  function shellOpen() { return !$('#shell').classList.contains('hide'); }

  let shellBackTo = 'title';

  function slotRow(n) {
    const d = readSlot(n);
    if (!d) return '<button class="menu-btn dim" data-load="' + n + '"><span class="idx">0' + n + '</span>空存档<span class="meta">未使用</span></button>';
    const s = d.state, t = new Date(d.ts);
    const pad = (x) => String(x).padStart(2, '0');
    return '<button class="menu-btn" data-load="' + n + '"><span class="idx">0' + n + '</span>第 ' + s.day + ' 天 · ' + fmt(s.cash) +
      '<span class="meta">' + (t.getMonth() + 1) + '/' + t.getDate() + ' ' + pad(t.getHours()) + ':' + pad(t.getMinutes()) + '</span></button>';
  }

  function showTitle() {
    showGhostAll();
    $('#app').classList.add('hide');
    shellBackTo = 'title';
    shellShow(
      '<div class="big">我的工作室</div>' +
      '<div class="sub-big">W O R K S H O P</div>' +
      '<div class="hr"></div>' +
      '<div class="menu">' +
      '<button class="menu-btn" data-shell="new"><span class="idx">▸</span>新的一间<span class="meta">从 ¥8,000 起</span></button>' +
      slotRow(1) + slotRow(2) + slotRow(3) +
      '<button class="menu-btn" data-shell="settings"><span class="idx">⚙</span>设置</button>' +
      '<button class="menu-btn" data-shell="about"><span class="idx">i</span>关于</button>' +
      '</div>'
    );
  }

  function shellNew() {
    const rows = [1, 2, 3].map((n) => {
      const d = readSlot(n);
      return '<button class="menu-btn" data-new="' + n + '"><span class="idx">0' + n + '</span>' +
        (d ? '覆盖：第 ' + d.state.day + ' 天' : '空存档') +
        '<span class="meta">' + (d ? '原进度会消失' : '可用') + '</span></button>';
    }).join('');
    shellShow(
      '<div class="big" style="font-size:20px;letter-spacing:.18em">选一个存档位</div>' +
      '<div class="sub-big">S A V E &nbsp; S L O T</div><div class="hr"></div>' +
      '<div class="menu">' + rows +
      '<button class="menu-btn" data-shell="back"><span class="idx">←</span>返回</button></div>'
    );
  }

  function shellSettings() {
    const qrow = [1, 2, 3].map((q) =>
      '<button class="seg' + (settings.q === q ? ' on' : '') + '" data-q="' + q + '">' + QSET[q].name + '</button>').join('');
    shellShow(
      '<div class="big" style="font-size:20px;letter-spacing:.18em">设置</div>' +
      '<div class="sub-big">S E T T I N G S</div><div class="hr"></div>' +
      '<div class="rowline"><span class="lb">画质</span><span class="vl">' + qrow + '</span></div>' +
      '<div class="rowline"><span class="lb">音效</span><span class="vl">' +
      '<button class="seg' + (settings.sfx ? ' on' : '') + '" data-sfx="1">开</button>' +
      '<button class="seg' + (!settings.sfx ? ' on' : '') + '" data-sfx="0">关</button></span></div>' +
      '<div class="rowline"><span class="lb">音量</span><span class="vl"><input type="range" min="0" max="100" step="1" value="' +
      Math.round(settings.vol * 100) + '" id="vol"></span></div>' +
      '<div class="rowline"><span class="lb">车间</span><span class="vl" style="flex-wrap:wrap;gap:5px">' +
      Object.keys(THEMES).map((k) =>
        '<button class="seg' + (settings.theme === k ? ' on' : '') + '" data-theme="' + k + '" title="' + THEMES[k].label + '">' +
        THEMES[k].short + '</button>').join('') + '</span></div>' +
      '<div class="rowline"><span class="lb">窗口</span><span class="vl"><button class="seg" data-full="1">全屏 / 还原</button></span></div>' +
      '<div class="menu" style="margin-top:20px">' +
      '<button class="menu-btn" data-shell="back"><span class="idx">←</span>返回</button></div>' +
      '<div style="margin-top:14px;font-size:10.5px;color:#5a6a7d;line-height:1.8">' +
      (IS_TOUCH
        ? '提示：平板默认按设备上限封顶（dpr≤1.6 / 阴影≤2048）。如果掉帧就选「标准」。</div>'
        : '提示：4K 画质更适合独立显卡；如果掉帧就退回「高清」。</div>')
    );
    const v = $('#vol');
    if (v) v.oninput = () => { settings.vol = v.value / 100; saveSettings(); SFX.apply(); };
  }

  function showPause() {
    if (!state || !state.started) return;
    shellBackTo = 'pause';
    shellShow(
      '<div class="big" style="font-size:22px;letter-spacing:.24em">暂停</div>' +
      '<div class="sub-big">P A U S E D</div><div class="hr"></div>' +
      '<div class="menu">' +
      '<button class="menu-btn" data-shell="resume"><span class="idx">▸</span>继续<span class="meta">第 ' + state.day + ' 天</span></button>' +
      '<button class="menu-btn" data-shell="settings"><span class="idx">⚙</span>设置</button>' +
      '<button class="menu-btn" data-shell="savequit"><span class="idx">⏏</span>保存并退出<span class="meta">回到标题</span></button>' +
      '</div>'
    );
  }

  function showAbout() {
    shellShow(
      '<div class="big" style="font-size:20px;letter-spacing:.18em">关于</div>' +
      '<div class="sub-big">A B O U T</div><div class="hr"></div>' +
      '<p style="font-size:12px;line-height:2;color:#c4d3e2">' +
      '《我的工作室》· 单机经营 · 版本 ' + VERSION + '</p>' +
      '<p style="font-size:11.5px;line-height:2;color:#8fa3b8">' +
      '一间空屋，八千块，一台二手焊机都买不起。<br>' +
      '接活、练手、添设备，把工序一格一格排下去。<br>' +
      '目标不是把工作室做大，是把那几件东西做出来。</p>' +
      '<p style="font-size:11px;line-height:1.9;color:#5a6a7d;margin-top:14px">' +
      '3D 场景与界面全部在本机运行，不联网、不收集任何数据。<br>' +
      '存档保存在本机浏览器里（三个槽位）。</p>' +
      '<div class="menu" style="margin-top:20px">' +
      '<button class="menu-btn" data-shell="back"><span class="idx">←</span>返回</button></div>'
    );
  }

  function toggleFull() {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      if (!el.requestFullscreen) {                 // iPad Safari 无元素级全屏
        toast('iPad 请用「分享 → 添加到主屏幕」获得全屏', 'good');
        return;
      }
      el.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function startGame(n, fresh) {
    SFX.init(); SFX.resume(); SFX.ambient(true);
    if (IS_TOUCH) {
      let seen = false;
      try { seen = !!localStorage.getItem('ws.touch.hint'); } catch (e) {}
      if (!seen) {
        try { localStorage.setItem('ws.touch.hint', '1'); } catch (e) {}
        setTimeout(() => toast('单指拖动转视角 · 双指捏合缩放', 'good'), 900);
      }
    }
    if (fresh) {
      state = newState(n);
      state.started = true;
      state.board = genBoard();
      curSlot = n;
      logs = [];
      log('拿到了钥匙。屋子是空的，只有 8000 块。');
      log('先把能接的单接住，再想设备的事。');
    } else {
      if (!loadSlot(n)) { toast('这个存档读不出来', 'bad'); return; }
    }
    syncEquipMeshes();
    shellHide();
    $('#app').classList.remove('hide');
    setTab('skills');
    renderAll();
    save();
    SFX.good();
  }

  function toTitle() {
    save();
    SFX.ambient(false);
    curSlot = 0;
    state.started = false;
    showTitle();
  }

  /* ============================================================
     七、事件绑定 & 启动
     ============================================================ */

  /* 平板布局：左右侧栏是抽屉，同一时刻只开一个 */
  const DRAWERS = { orders: '#p-orders', right: '#p-right', log: '#logbar' };

  function syncTouchbar() {
    const tb = $('#touchbar');
    if (!tb) return;
    Object.keys(DRAWERS).forEach((k) => {
      const b = tb.querySelector('[data-drawer="' + k + '"]');
      const el = $(DRAWERS[k]);
      if (b && el) b.classList.toggle('on', el.classList.contains('open'));
    });
  }

  function toggleDrawer(which) {
    const cur = $(DRAWERS[which]);
    if (!cur) return;
    const willOpen = !cur.classList.contains('open');
    Object.keys(DRAWERS).forEach((k) => {
      const el = $(DRAWERS[k]);
      if (el) el.classList.toggle('open', k === which ? willOpen : false);
    });
    syncTouchbar();
  }

  function closeDrawers() {
    Object.keys(DRAWERS).forEach((k) => {
      const el = $(DRAWERS[k]);
      if (el) el.classList.remove('open');
    });
    syncTouchbar();
  }

  function bind() {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el) return;
      const act = el.dataset.act, id = el.dataset.id;
      SFX.init(); SFX.resume();
      if (act === 'take') { SFX.click(); takeOrder(+id); }
      else if (act === 'work') { SFX.work(); workOrder(+id); }
      else if (act === 'deliver') { deliver(+id); }
      else if (act === 'drop') { SFX.click(); dropOrder(+id); }
      else if (act === 'train') { SFX.work(); trainSkill(id); }
      else if (act === 'buy') { SFX.coin(); buyEquip(id); }
      else if (act === 'part') { SFX.work(); buildPart(el.dataset.w, id); }
      else if (act === 'skip') { SFX.click(); skipSlot(); }
    });

    $('#b-pause').onclick = () => { SFX.click(); closeDrawers(); showPause(); };

    const tb = $('#touchbar');
    if (tb) tb.addEventListener('click', (e) => {
      const b = e.target.closest('[data-drawer]');
      if (!b) return;
      SFX.init(); SFX.resume(); SFX.click();
      toggleDrawer(b.dataset.drawer);
    });

    const tabs = $('#rtabs');
    if (tabs) tabs.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]');
      if (!b) return;
      SFX.init(); SFX.resume(); SFX.click();
      setTab(b.dataset.tab);
    });

    $('#shell').addEventListener('click', (e) => {
      const t = e.target.closest('[data-shell],[data-load],[data-new],[data-q],[data-sfx],[data-full]');
      if (!t) return;
      SFX.init(); SFX.resume(); SFX.click();
      if (t.dataset.load) { startGame(+t.dataset.load, false); return; }
      if (t.dataset.new) { startGame(+t.dataset.new, true); return; }
      if (t.dataset.theme) { settings.theme = t.dataset.theme; saveSettings(); applyTheme(settings.theme); shellSettings(); return; }
      if (t.dataset.q) { settings.q = +t.dataset.q; saveSettings(); applyQuality(); shellSettings(); return; }
      if (t.dataset.sfx) { settings.sfx = t.dataset.sfx === '1'; saveSettings(); SFX.apply(); shellSettings(); return; }
      if (t.dataset.full) { toggleFull(); return; }
      const s = t.dataset.shell;
      if (s === 'new') shellNew();
      else if (s === 'settings') { shellBackTo = (state && state.started) ? 'pause' : 'title'; shellSettings(); }
      else if (s === 'back') { if (shellBackTo === 'pause') showPause(); else showTitle(); }
      else if (s === 'resume') { shellHide(); }
      else if (s === 'savequit') { toTitle(); }
      else if (s === 'about') showAbout();
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        if (shellOpen()) { if (state && state.started) shellHide(); }
        else if (state && state.started) showPause();
        return;
      }
      if (e.code === 'Space') {
        if (state && state.started && !shellOpen()) { e.preventDefault(); skipSlot(); }
      }
    });
  }

  let booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    // 车间风格：URL 带 style=cyber|modern|retro|studio|woodshop|clean 即可切换
    const HN = location.hash;
    const stHit = HN.match(/style=([a-z]+)/);
    loadSettings();
    if (IS_TOUCH) document.body.classList.add('touch');
    themeId = THEMES[settings.theme] ? settings.theme : 'woodshop';
    if (stHit && THEMES[stHit[1]]) themeId = stHit[1];
    state = newState(0);       // 空场景，仅用于标题页背景
    bind();
    initThree();
    applyQuality();
    showTitle();
    // 开发直达：#dev 开新档；#dev2 给钱给设备；#dev3 台钻特写；加 &tab=equip|works 切标签页
    const H = location.hash, tabHit = H.match(/tab=(skills|equip|works)/);
    if (H.indexOf('#dev') === 0) startGame(1, true);
    if (H.indexOf('#dev2') === 0 || H.indexOf('#dev3') === 0) {
      startGame(1, true);
      state.cash = 60000;
      state.equip.drill = true; state.equip.welder = true;
      state.skills.lathe = 3; state.skills.weld = 2; state.skills.design = 3;
      syncEquipMeshes(); renderAll();
      animEquip('drill', 60000);
      if (H.indexOf('#dev3') === 0) { autoSpin = false; camTheta = -0.55; camPhi = 1.19; camRadius = 4.2; camTarget = { x: -5.4, y: 0.95, z: 0 }; }
    }
    // #dev4：满技能满设备 + 自动点一下「作品」里的开工按钮，验证这条链是通的
    if (tabHit) setTab(tabHit[1]);
    if (H.indexOf('clean') >= 0) {           // 对比风格用：隐藏全部界面，只留场景
      const st = document.createElement('style');
      st.textContent = '#p-orders,#p-right,#logbar,#hud{display:none!important}';
      document.head.appendChild(st);
    }
    if (H.indexOf('#ui') === 0) setTimeout(() => shellSettings(), 500);
    // #dev5：满设备满技能、固定机位不旋转 —— 用于对比车间风格
    if (H.indexOf('#dev5') === 0) {
      startGame(1, true);
      state.cash = 200000;
      EQUIP_DEF.forEach((e) => (state.equip[e.id] = true));
      SKILL_DEF.forEach((s) => (state.skills[s.id] = 5));
      syncEquipMeshes(); renderAll();
      autoSpin = false;
      camTheta = CAM_WOOD.theta; camPhi = CAM_WOOD.phi; camRadius = CAM_WOOD.r;
      camTarget = { x: CAM_WOOD.t.x, y: CAM_WOOD.t.y, z: CAM_WOOD.t.z };
    }
    // #dev6：车床特写，用于逐件打磨（不影响玩家）
    // #dev6run：车床常开 + 全景机位，并把运动量写进 title，供无头脚本验证动画在跑
    if (H.indexOf('#dev6') === 0) {
      startGame(1, true);
      state.cash = 200000;
      EQUIP_DEF.forEach((e) => (state.equip[e.id] = true));
      SKILL_DEF.forEach((s) => (state.skills[s.id] = 5));
      syncEquipMeshes(); renderAll();
      autoSpin = false;
      if (H.indexOf('#dev6run') === 0) {
        camTheta = CAM_WOOD.theta; camPhi = CAM_WOOD.phi; camRadius = CAM_WOOD.r;
        camTarget = { x: CAM_WOOD.t.x, y: CAM_WOOD.t.y, z: CAM_WOOD.t.z };
        // 调试入口：每 1.3 秒重开一次，p 循环走 0→1，走刀才会真的来回
        anim.lathe = performance.now() + 1300; anim.latheDur = 1300;
        setInterval(() => { anim.lathe = performance.now() + 1300; anim.latheDur = 1300; }, 1300);
        // 无头环境的 rAF 帧数很少，这里手动推进若干帧，让走刀/铁屑真的走完一个来回
        let dbgN = 0;
        setInterval(() => {
          if (dbgN === 0) { anim.lathe = performance.now() + 1300; anim.latheDur = 1300; }
          if (dbgN++ > 70) return;
          renderFrame(performance.now());
        }, 24);
        setInterval(() => {
          const lg2 = equipMeshes.lathe;
          const ud2 = lg2 && lg2.children[0] && lg2.children[0].userData;
          document.title = (ud2 && ud2.chuck)
            ? ('LATHE rz=' + ud2.chuck.rotation.z.toFixed(2) + ' sz=' + ud2.saddle.position.z.toFixed(3) +
               ' peak=' + (ud2.dbgWalkMax || 0).toFixed(3) + ' spin=' + (ud2.spin || 0).toFixed(1) +
               ' p=' + (ud2.dbgP || 0).toFixed(2))
            : 'LATHE-MISSING';
        }, 250);
      } else {
        camTheta = 1.88; camPhi = 1.20; camRadius = 2.3;
        camTarget = { x: -3.75, y: 1.02, z: 3.35 };
      }
    }
    // #dev7run：焊机常开 + 固定机位，把电弧亮度/焊枪摆幅写进 title 供无头脚本验证
    if (H.indexOf('#dev7') === 0) {
      startGame(1, true);
      state.cash = 200000;
      EQUIP_DEF.forEach((e) => (state.equip[e.id] = true));
      SKILL_DEF.forEach((s) => (state.skills[s.id] = 5));
      syncEquipMeshes(); renderAll();
      autoSpin = false;
      camTheta = -1.31; camPhi = 1.146; camRadius = 3.00;
      camTarget = { x: 2.50, y: 0.55, z: -1.20 };
      anim.weld = performance.now() + 600000; anim.weldDur = 600000;
      // 无头环境 rAF 帧数极少，手动推帧让火花真的飞出来
      let wN = 0;
      setInterval(() => {
        if (wN++ > 70) return;
        anim.weld = performance.now() + 600000;
        renderFrame(performance.now());
      }, 24);
      setInterval(() => {
        const wg2 = equipMeshes.welder;
        const ud3 = wg2 && wg2.children[0] && wg2.children[0].userData;
        document.title = (ud3 && ud3.arc)
          ? ('WELD arc=' + (ud3.arc.visible ? 1 : 0) + ' li=' + ud3.arcLight.intensity.toFixed(1) +
             ' flick=' + (ud3.dbgFlick || 0).toFixed(2) + ' sway=' + (ud3.dbgSway || 0).toFixed(3) +
             ' spark=' + ud3.sparks.filter((s) => s.userData.life > 0).length +
             ' glow=' + ud3.glowMat.emissiveIntensity.toFixed(1))
          : 'WELD-MISSING';
      }, 250);
    }
    if (H.indexOf('#dev4') === 0) {
      startGame(1, true);
      state.cash = 200000;
      EQUIP_DEF.forEach((e) => (state.equip[e.id] = true));
      SKILL_DEF.forEach((s) => (state.skills[s.id] = 5));
      syncEquipMeshes(); renderAll(); setTab('works');
      setTimeout(() => {
        const btns = document.querySelectorAll('#l-works [data-act="part"]');
        if (btns.length) btns[0].click();
        setTimeout(() => {
          const el = document.querySelector('#ver');
          if (el) el.textContent = 'T2 btns=' + btns.length + ' cash=' + state.cash +
            ' slot=' + state.slot + ' parts=' + JSON.stringify(Object.values(state.works.guitar));
        }, 700);
      }, 900);
    }
  }

  window.addEventListener('DOMContentLoaded', boot);
  if (document.readyState === 'interactive' || document.readyState === 'complete') boot();

})();
