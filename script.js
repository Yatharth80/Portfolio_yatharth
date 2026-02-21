// Global reference for particle background (section-driven shape formation)
let particleBackgroundInstance = null;

// ===== PERFORMANCE-AWARE MOTION =====
const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = navigator.connection && navigator.connection.saveData;
const lowMemory = navigator.deviceMemory && navigator.deviceMemory <= 4;
const reducedMotionMode = prefersReducedMotion || saveData || lowMemory;

if (reducedMotionMode) {
  document.documentElement.classList.add('reduced-motion');
}

// ===== ORB 3D GLOBES =====
const DEBUG_CONSTELLATIONS_ALWAYS_VISIBLE = true;
// ===== ORB CONSTELLATIONS =====
const ORB_CONSTELLATIONS = {
  linkedin: {
    name: 'Orion',
    points: [
      { x: 0.2, y: 0.22 },
      { x: 0.38, y: 0.18 },
      { x: 0.32, y: 0.36 },
      { x: 0.48, y: 0.38 },
      { x: 0.28, y: 0.52 },
      { x: 0.62, y: 0.58 },
      { x: 0.18, y: 0.62 },
    ],
    edges: [
      [0, 2],
      [1, 2],
      [2, 3],
      [3, 5],
      [2, 6],
      [2, 4],
      [4, 3],
    ],
  },
  x: {
    name: 'Lyra',
    points: [
      { x: 0.65, y: 0.22 },
      { x: 0.76, y: 0.34 },
      { x: 0.7, y: 0.48 },
      { x: 0.56, y: 0.42 },
      { x: 0.55, y: 0.3 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
    ],
  },
  github: {
    name: 'Ara',
    points: [
      { x: 0.28, y: 0.64 },
      { x: 0.4, y: 0.72 },
      { x: 0.54, y: 0.68 },
      { x: 0.62, y: 0.54 },
      { x: 0.46, y: 0.5 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
    ],
  },
};

class ConstellationOrb {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.orb = canvas.closest('.eco-orb');
    if (!this.ctx || !this.orb) return;

    const key = canvas.dataset.orb;
    this.constellation = ORB_CONSTELLATIONS[key] || ORB_CONSTELLATIONS.linkedin;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.stars = this.createBackgroundStars(70);
    this.pointer = { x: 0, y: 0, active: false };
    this.repulsion = 0;
    this.repulsionTarget = 0;
    this.edgeParticles = this.createEdgeParticles();
    this.hovered = 0;
    this.hoverTarget = 0;
    this.time = 0;
    this.isVisible = true;

    this.resize = this.resize.bind(this);
    this.animate = this.animate.bind(this);
    this.onEnter = this.onEnter.bind(this);
    this.onLeave = this.onLeave.bind(this);
    this.onMove = this.onMove.bind(this);

    this.resize();
    window.addEventListener('resize', this.resize);
    this.orb.addEventListener('pointerenter', this.onEnter);
    this.orb.addEventListener('pointerleave', this.onLeave);
    this.canvas.addEventListener('pointerenter', this.onEnter);
    this.canvas.addEventListener('pointerleave', this.onLeave);
    this.orb.addEventListener('pointermove', this.onMove);
    this.canvas.addEventListener('pointermove', this.onMove);

    if ('IntersectionObserver' in window) {
      this.visibilityObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          this.isVisible = !!(entry && entry.isIntersecting);
        },
        { threshold: 0.02 }
      );
      this.visibilityObserver.observe(this.orb);
    }

    if (reducedMotionMode) {
      this.render(0);
    } else {
      requestAnimationFrame(this.animate);
    }
  }

  onEnter() {
    this.hoverTarget = 1;
    this.repulsionTarget = 1;
    this.pointer.active = true;
    this.pointer.x = this.width * 0.5;
    this.pointer.y = this.height * 0.5;
  }

  onLeave() {
    this.hoverTarget = 0;
    this.pointer.active = false;
    this.repulsionTarget = 0;
  }

  onMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.active = true;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const fallbackWidth = this.orb ? this.orb.clientWidth : 0;
    const fallbackHeight = this.orb ? this.orb.clientHeight : 0;
    this.width = rect.width || fallbackWidth || 190;
    this.height = rect.height || fallbackHeight || 190;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  createBackgroundStars(count) {
    const stars = [];
    for (let i = 0; i < count; i += 1) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.6 + Math.random() * 1.4,
        seed: Math.random() * Math.PI * 2,
        alpha: 0.35 + Math.random() * 0.5,
      });
    }
    return stars;
  }

  createEdgeParticles() {
    const particles = [];
    const edgeCount = this.constellation.edges.length;
    const count = Math.max(8, edgeCount * 3);
    for (let i = 0; i < count; i += 1) {
      particles.push({
        edgeIndex: i % edgeCount,
        t: Math.random(),
        speed: 0.18 + Math.random() * 0.22,
        size: 1 + Math.random() * 1.2,
        alpha: 0.35 + Math.random() * 0.45,
      });
    }
    return particles;
  }

  drawBackground(time) {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(
      this.width * 0.35,
      this.height * 0.28,
      this.width * 0.1,
      this.width * 0.5,
      this.height * 0.5,
      this.width * 0.7
    );
    gradient.addColorStop(0, 'rgba(125, 211, 252, 0.18)');
    gradient.addColorStop(0.45, 'rgba(15, 23, 42, 0.55)');
    gradient.addColorStop(1, 'rgba(2, 6, 23, 0.95)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    this.stars.forEach((star) => {
      const driftX = Math.sin(time * 0.25 + star.seed) * 6;
      const driftY = Math.cos(time * 0.2 + star.seed) * 4;
      const twinkle = 0.2 + 0.8 * Math.abs(Math.sin(time * 0.8 + star.seed));
      ctx.fillStyle = `rgba(226, 232, 240, ${(star.alpha * twinkle).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(star.x * this.width + driftX, star.y * this.height + driftY, star.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawConstellation(time) {
    const ctx = this.ctx;
    const padding = Math.min(this.width, this.height) * 0.12;
    const points = this.constellation.points.map((pt, idx) => {
      const baseX = padding + pt.x * (this.width - padding * 2);
      const baseY = padding + pt.y * (this.height - padding * 2);
      const drift = 3.5;
      return {
        x: baseX + Math.sin(time * 1.2 + idx) * drift,
        y: baseY + Math.cos(time * 1.1 + idx) * drift,
      };
    });

    const warpedPoints = points.map((pt) => {
      if (!this.pointer.active && this.hovered < 0.05) return pt;
      const pointerX = this.pointer.active ? this.pointer.x : this.width * 0.5;
      const pointerY = this.pointer.active ? this.pointer.y : this.height * 0.5;
      const dx = pt.x - pointerX;
      const dy = pt.y - pointerY;
      const dist = Math.hypot(dx, dy) || 1;
      const falloff = Math.max(0, 1 - dist / (this.width * 0.5));
      const push = (44 * this.repulsion) * falloff;
      return {
        x: pt.x + (dx / dist) * push,
        y: pt.y + (dy / dist) * push,
      };
    });

    const glow = 0.55 + this.hovered * 0.35;
    ctx.strokeStyle = `rgba(255, 200, 122, ${glow})`;
    ctx.lineWidth = 1.2 + this.hovered * 0.6;
    ctx.shadowColor = 'rgba(255, 200, 122, 0.6)';
    ctx.shadowBlur = 8 + this.hovered * 6;

    this.constellation.edges.forEach((edge) => {
      const a = warpedPoints[edge[0]];
      const b = warpedPoints[edge[1]];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });

    warpedPoints.forEach((pt, idx) => {
      const pulse = 0.75 + 0.25 * Math.sin(time * 1.6 + idx);
      const radius = 2.1 + pulse * 1.1 + this.hovered * 0.6;
      ctx.fillStyle = `rgba(255, 214, 170, ${0.9 * pulse})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fill();

      const halo = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius * 4);
      halo.addColorStop(0, `rgba(255, 214, 170, ${0.5 * pulse})`);
      halo.addColorStop(1, 'rgba(255, 214, 170, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius * 4, 0, Math.PI * 2);
      ctx.fill();
    });

    this.edgeParticles.forEach((particle) => {
      const edge = this.constellation.edges[particle.edgeIndex];
      const start = warpedPoints[edge[0]];
      const end = warpedPoints[edge[1]];
      particle.t = (particle.t + particle.speed * 0.004) % 1;
      const t = particle.t;
      const x = start.x + (end.x - start.x) * t;
      const y = start.y + (end.y - start.y) * t;
      const glow = 0.5 + this.hovered * 0.4;
      this.ctx.fillStyle = `rgba(255, 209, 140, ${(particle.alpha * glow).toFixed(3)})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  render(time) {
    this.hovered += (this.hoverTarget - this.hovered) * 0.08;
    this.repulsion += (this.repulsionTarget - this.repulsion) * 0.12;
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground(time);
    this.drawConstellation(time);
  }

  animate(time) {
    if (!this.isVisible || document.hidden) {
      requestAnimationFrame(this.animate);
      return;
    }

    const seconds = time * 0.001;
    this.render(seconds);
    requestAnimationFrame(this.animate);
  }
}

function initOrbConstellations() {
  document.querySelectorAll('.eco-orb-canvas').forEach((canvas) => {
    new ConstellationOrb(canvas);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOrbConstellations);
} else {
  initOrbConstellations();
}

// ===== SECTION CONSTELLATION OVERLAYS =====
const SECTION_CONSTELLATIONS = {
  ursa: {
    name: 'Ursa Major',
    points: [
      { x: 0.15, y: 0.25 },
      { x: 0.28, y: 0.22 },
      { x: 0.42, y: 0.28 },
      { x: 0.5, y: 0.4 },
      { x: 0.62, y: 0.52 },
      { x: 0.72, y: 0.6 },
      { x: 0.82, y: 0.64 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },
  cassiopeia: {
    name: 'Cassiopeia',
    points: [
      { x: 0.2, y: 0.3 },
      { x: 0.35, y: 0.22 },
      { x: 0.48, y: 0.33 },
      { x: 0.62, y: 0.24 },
      { x: 0.78, y: 0.34 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  shani: {
    name: 'Lord Shani',
    points: [
      { x: 0.28, y: 0.62 },
      { x: 0.42, y: 0.48 },
      { x: 0.56, y: 0.56 },
      { x: 0.66, y: 0.42 },
      { x: 0.78, y: 0.52 },
      { x: 0.68, y: 0.68 },
      { x: 0.52, y: 0.7 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 0],
      [2, 6],
    ],
  },
  lyra: {
    name: 'Lyra',
    points: [
      { x: 0.62, y: 0.24 },
      { x: 0.72, y: 0.36 },
      { x: 0.66, y: 0.5 },
      { x: 0.52, y: 0.44 },
      { x: 0.52, y: 0.3 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
    ],
  },
  cancer: {
    name: 'Cancer',
    points: [
      { x: 0.50, y: 0.20 },
      { x: 0.51, y: 0.30 },
      { x: 0.50, y: 0.44 },
      { x: 0.33, y: 0.61 },
      { x: 0.60, y: 0.52 },
      { x: 0.67, y: 0.67 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
      [4, 5],
    ],
  },
  aries: {
    name: 'Aries',
    points: [
      { x: 0.70, y: 0.58 },
      { x: 0.70, y: 0.52 },
      { x: 0.58, y: 0.38 },
      { x: 0.32, y: 0.24 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
  },
  libra: {
    name: 'Libra',
    starNames: ['Zubeneschamali', 'Zubenelhakrabi', 'Zubenelgenubi', 'Brachium', 'Upsilon Librae', 'Iota Librae'],
    points: [
      { x: 0.58, y: 0.22 },
      { x: 0.44, y: 0.36 },
      { x: 0.60, y: 0.46 },
      { x: 0.52, y: 0.62 },
      { x: 0.43, y: 0.64 },
      { x: 0.44, y: 0.54 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 0],
      [2, 3],
      [1, 5],
      [5, 4],
    ],
  },
};

const SECTION_CONSTELLATION_SETS = {
  hero: ['ursa', 'cassiopeia', 'shani', 'lyra'],
  ursa: ['ursa'],
  cassiopeia: ['cassiopeia'],
  shani: ['shani'],
  lyra: ['lyra'],
  cancer: ['cancer'],
  aries: ['aries'],
  libra: ['libra'],
};

class SectionConstellation {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    const key = canvas.dataset.constellation || 'hero';
    this.sets = SECTION_CONSTELLATION_SETS[key] || ['ursa'];
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.stars = [];
    this.time = 0;
    this.isVisible = true;

    this.resize = this.resize.bind(this);
    this.animate = this.animate.bind(this);

    this.resize();
    window.addEventListener('resize', this.resize);

    if ('IntersectionObserver' in window) {
      this.visibilityObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          this.isVisible = !!(entry && entry.isIntersecting);
        },
        { threshold: 0.02 }
      );
      this.visibilityObserver.observe(this.canvas);
    }

    if (reducedMotionMode) {
      this.render(0);
    } else {
      requestAnimationFrame(this.animate);
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || this.canvas.parentElement?.clientWidth || 1;
    this.height = rect.height || this.canvas.parentElement?.clientHeight || 1;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.stars = this.createStars();
  }

  createStars() {
    const count = Math.min(160, Math.floor((this.width * this.height) / 14000));
    const stars = [];
    for (let i = 0; i < count; i += 1) {
      stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: 0.5 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.8,
        alpha: 0.2 + Math.random() * 0.4,
      });
    }
    return stars;
  }

  drawStars(time) {
    this.stars.forEach((star) => {
      const twinkle = star.alpha + Math.sin(time * star.speed + star.phase) * 0.25;
      this.ctx.fillStyle = `rgba(226, 232, 240, ${Math.max(0, twinkle)})`;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  drawConstellation(def, time, offsetX, offsetY) {
    const padding = Math.min(this.width, this.height) * 0.1;
    const width = this.width - padding * 2;
    const height = this.height - padding * 2;
    const isLibra = def.name === 'Libra';
    const jitterX = isLibra ? 0 : 3;
    const jitterY = isLibra ? 0 : 3;
    const wholeDriftX = isLibra ? 0 : 0;
    const wholeDriftY = isLibra ? 0 : 0;
    const points = def.points.map((pt, idx) => {
      const x = padding + pt.x * width + Math.sin(time * 0.9 + idx) * jitterX + offsetX + wholeDriftX;
      const y = padding + pt.y * height + Math.cos(time * 0.8 + idx) * jitterY + offsetY + wholeDriftY;
      return { x, y };
    });

    this.ctx.strokeStyle = isLibra ? 'rgba(255, 230, 190, 0.92)' : 'rgba(255, 200, 122, 0.6)';
    this.ctx.lineWidth = isLibra ? 2 : 1;
    this.ctx.shadowColor = isLibra ? 'rgba(255, 232, 198, 0.78)' : 'rgba(255, 200, 122, 0.5)';
    this.ctx.shadowBlur = isLibra ? 12 : 6;

    def.edges.forEach((edge) => {
      const a = points[edge[0]];
      const b = points[edge[1]];
      this.ctx.beginPath();
      this.ctx.moveTo(a.x, a.y);
      this.ctx.lineTo(b.x, b.y);
      this.ctx.stroke();
    });

    points.forEach((pt, idx) => {
      const pulse = 0.7 + 0.3 * Math.sin(time * 1.2 + idx * 1.05);
      const isLibraPrimary = isLibra && idx <= 2;
      const radius = isLibra
        ? (isLibraPrimary ? 2.9 + pulse * 1.55 : 2.0 + pulse * 1.05)
        : 1.6 + pulse * 1.2;
      const alpha = isLibra
        ? (isLibraPrimary ? 1.0 * pulse : 0.68 * pulse)
        : 0.7 * pulse;
      this.ctx.fillStyle = `rgba(255, 228, 188, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      if (isLibra) {
        const haloScale = isLibraPrimary ? 4.1 : 3.0;
        const haloAlpha = isLibraPrimary ? 0.5 : 0.26;
        const halo = this.ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius * haloScale);
        halo.addColorStop(0, `rgba(255, 230, 190, ${haloAlpha * pulse})`);
        halo.addColorStop(1, 'rgba(255, 230, 190, 0)');
        this.ctx.fillStyle = halo;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, radius * haloScale, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
  }

  render(time) {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawStars(time);
    const spread = this.sets.length > 1 ? 0.18 : 0;
    this.sets.forEach((key, index) => {
      const def = SECTION_CONSTELLATIONS[key];
      if (!def) return;
      const offsetX = (index - (this.sets.length - 1) / 2) * this.width * spread;
      const offsetY = (def.name === 'Libra' || def.name === 'Aries') ? 0 : Math.sin(time * 0.2 + index) * this.height * 0.02;
      this.drawConstellation(def, time, offsetX, offsetY);
    });
  }

  animate(time) {
    if (!this.isVisible || document.hidden) {
      requestAnimationFrame(this.animate);
      return;
    }

    this.render(time * 0.001);
    requestAnimationFrame(this.animate);
  }
}

function initSectionConstellations() {
  document.querySelectorAll('.section-constellation').forEach((canvas) => {
    new SectionConstellation(canvas);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSectionConstellations);
} else {
  initSectionConstellations();
}
class CosmicHero {
  constructor() {
    this.hero = document.querySelector('.cosmic-hero');
    this.canvas = document.getElementById('cosmic-sky');
    if (!this.hero || !this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;

    this.labelEl = document.getElementById('cosmic-label');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.mouse = { x: -1e5, y: -1e5, active: false };
    this.stars = [];
    this.nodes = [];
    this.nodeDefs = [
      { label: 'Ursa Major', target: 'about-screen', rx: 0.22, ry: 0.36, depth: 0.6 },
      { label: 'Cassiopeia', target: 'skills-screen', rx: 0.5, ry: 0.25, depth: 0.7 },
      { label: 'Lord Shani', target: 'overview-screen', rx: 0.74, ry: 0.42, depth: 0.75 },
      { label: 'Lyra', target: 'connect-screen', rx: 0.42, ry: 0.72, depth: 0.65 },
    ];
    this.linkDefs = [];
    this.hoverNode = null;

    this.resize = this.resize.bind(this);
    this.animate = this.animate.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onLeave = this.onLeave.bind(this);
    this.onClick = this.onClick.bind(this);

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', this.resize);
    this.hero.addEventListener('mousemove', this.onMove);
    this.hero.addEventListener('mouseleave', this.onLeave);
    this.hero.addEventListener('click', this.onClick);

    const navStars = this.hero.querySelectorAll('.cosmic-nav-star');
    navStars.forEach((star) => {
      star.addEventListener('click', () => {
        const target = star.getAttribute('data-target');
        this.scrollToTarget(target);
      });
    });

    if (reducedMotionMode) {
      this.render(0);
      return;
    }

    requestAnimationFrame(this.animate);
  }

  resize() {
    this.width = this.hero.clientWidth;
    this.height = this.hero.clientHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.stars = this.createStars();
    this.nodes = this.nodeDefs.map((node) => ({
      ...node,
      x: node.rx * this.width,
      y: node.ry * this.height,
    }));
  }

  createStars() {
    const count = Math.min(180, Math.floor((this.width * this.height) / 9000));
    const stars = [];
    for (let i = 0; i < count; i += 1) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      stars.push({
        x,
        y,
        ox: x,
        oy: y,
        vx: 0,
        vy: 0,
        r: 0.6 + Math.random() * 1.6,
        base: 0.35 + Math.random() * 0.5,
        tw: 0.12 + Math.random() * 0.25,
        speed: 0.4 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2,
        depth: 0.2 + Math.random() * 0.9,
        driftAmp: 0.6 + Math.random() * 1.4,
        drift: 0.6 + Math.random() * 0.8,
      });
    }
    return stars;
  }

  onMove(e) {
    const rect = this.hero.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
    this.mouse.active = true;
  }

  onLeave() {
    this.mouse.active = false;
    this.mouse.x = -1e5;
    this.mouse.y = -1e5;
    this.updateLabel(null);
  }

  onClick() {
    if (this.hoverNode) {
      this.scrollToTarget(this.hoverNode.target);
    }
  }

  scrollToTarget(targetId) {
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  getParallax(depth) {
    const mx = this.mouse.active ? this.mouse.x - this.width / 2 : 0;
    const my = this.mouse.active ? this.mouse.y - this.height / 2 : 0;
    return {
      x: mx * 0.02 * depth,
      y: my * 0.02 * depth,
    };
  }

  render(time) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const mx = this.mouse.active ? this.mouse.x - this.width / 2 : 0;
    const my = this.mouse.active ? this.mouse.y - this.height / 2 : 0;

    this.stars.forEach((star) => {
      if (this.mouse.active) {
        const dx = star.x - this.mouse.x;
        const dy = star.y - this.mouse.y;
        const dist = Math.hypot(dx, dy) || 1;
        const repelRadius = 120;
        if (dist < repelRadius) {
          const force = (1 - dist / repelRadius) * 12;
          star.vx += (dx / dist) * force;
          star.vy += (dy / dist) * force;
        }
      }

      const spring = 0.04;
      star.vx += (star.ox - star.x) * spring;
      star.vy += (star.oy - star.y) * spring;
      star.vx *= 0.88;
      star.vy *= 0.88;
      star.x += star.vx;
      star.y += star.vy;

      const twinkle = star.base + Math.sin(time * star.speed + star.phase) * star.tw;
      const driftX = Math.sin(time * star.drift + star.phase) * star.driftAmp;
      const driftY = Math.cos(time * star.drift + star.phase) * star.driftAmp;
      const px = star.x + mx * 0.02 * star.depth + driftX;
      const py = star.y + my * 0.02 * star.depth + driftY;

      ctx.globalAlpha = Math.max(0, Math.min(1, twinkle));
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(px, py, star.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;

    const nodePositions = this.nodes.map((node) => {
      const parallax = this.getParallax(node.depth || 0.6);
      return {
        x: node.x + parallax.x,
        y: node.y + parallax.y,
      };
    });

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    this.linkDefs.forEach(([a, b]) => {
      const start = nodePositions[a];
      const end = nodePositions[b];
      if (!start || !end) return;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    });

    this.hoverNode = null;
    let closest = Infinity;

    nodePositions.forEach((pos, index) => {
      const node = this.nodes[index];
      ctx.fillStyle = 'rgba(125, 211, 252, 0.9)';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (!this.mouse.active) return;
      const dx = this.mouse.x - pos.x;
      const dy = this.mouse.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 22 && dist < closest) {
        closest = dist;
        this.hoverNode = {
          ...node,
          px: pos.x,
          py: pos.y,
        };
      }
    });

    this.updateLabel(this.hoverNode);
  }

  updateLabel(node) {
    if (!this.labelEl) return;
    if (node) {
      this.labelEl.textContent = node.label;
      this.labelEl.style.left = `${node.px + 12}px`;
      this.labelEl.style.top = `${node.py - 12}px`;
      this.labelEl.classList.add('is-visible');
    } else {
      this.labelEl.classList.remove('is-visible');
    }
  }

  animate(time) {
    this.render(time * 0.001);
    requestAnimationFrame(this.animate);
  }
}

function initCosmicHero() {
  new CosmicHero();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCosmicHero);
} else {
  initCosmicHero();
}

// ===== GPU FLUID CURSOR DISTORTION =====
class FluidCursorDistortion {
  constructor() {
    this.canvas = document.getElementById('fluid-distortion-layer');
    if (!this.canvas || !window.THREE || reducedMotionMode) return;

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.mouse = new THREE.Vector2(-10, -10);
    this.prevMouse = new THREE.Vector2(-10, -10);
    this.velocity = new THREE.Vector2(0, 0);

    this.simSize = 96;
    this.dissipation = 0.95;
    this.force = 2.0;
    this.radius = 0.22;

    this.init();
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true });
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setPixelRatio(this.dpr);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Ping-pong render targets for velocity map
    this.rtA = new THREE.WebGLRenderTarget(this.simSize, this.simSize, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
    });
    this.rtB = this.rtA.clone();

    // Use particle canvas as a source texture (if available)
    const particleCanvas = document.getElementById('particle-canvas');
    this.sceneTexture = particleCanvas ? new THREE.CanvasTexture(particleCanvas) : null;
    if (this.sceneTexture) {
      this.sceneTexture.minFilter = THREE.LinearFilter;
      this.sceneTexture.magFilter = THREE.LinearFilter;
    }

    this.simScene = new THREE.Scene();
    this.renderScene = new THREE.Scene();
    const quad = new THREE.PlaneGeometry(2, 2);

    this.simMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_prev: { value: this.rtA.texture },
        u_mouse: { value: this.mouse.clone() },
        u_velocity: { value: this.velocity.clone() },
        u_dissipation: { value: this.dissipation },
        u_radius: { value: this.radius },
        u_force: { value: this.force },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D u_prev;
        uniform vec2 u_mouse;
        uniform vec2 u_velocity;
        uniform float u_dissipation;
        uniform float u_radius;
        uniform float u_force;

        void main() {
          vec4 prev = texture2D(u_prev, vUv);
          vec2 vel = prev.xy * u_dissipation;

          float dist = distance(vUv, u_mouse);
          float influence = smoothstep(u_radius, 0.0, dist);
          vel += u_velocity * influence * u_force;

          gl_FragColor = vec4(vel, 0.0, 1.0);
        }
      `,
      depthWrite: false,
    });

    this.renderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_velocityMap: { value: this.rtA.texture },
        u_scene: { value: this.sceneTexture },
        u_hasScene: { value: this.sceneTexture ? 1.0 : 0.0 },
        u_strength: { value: 0.06 },
        u_time: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D u_velocityMap;
        uniform sampler2D u_scene;
        uniform float u_hasScene;
        uniform float u_strength;
        uniform float u_time;

        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        void main() {
          vec2 vel = texture2D(u_velocityMap, vUv).xy;
          float n = noise(vUv * 200.0 + u_time * 0.15);
          vec2 offset = vel * u_strength + (n - 0.5) * 0.0015;
          vec2 uv = vUv + offset;

          vec3 color = vec3(0.0);
          if (u_hasScene > 0.5) {
            color = texture2D(u_scene, uv).rgb;
          }

          float vignette = smoothstep(0.9, 0.2, distance(vUv, vec2(0.5)));
          gl_FragColor = vec4(color * vignette, 0.8);
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    this.simMesh = new THREE.Mesh(quad, this.simMaterial);
    this.simScene.add(this.simMesh);

    this.renderMesh = new THREE.Mesh(quad, this.renderMaterial);
    this.renderScene.add(this.renderMesh);

    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('resize', () => this.onResize());
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  onMouseMove(e) {
    const x = e.clientX / this.width;
    const y = 1.0 - e.clientY / this.height;
    this.prevMouse.copy(this.mouse);
    this.mouse.set(x, y);
    this.velocity.subVectors(this.mouse, this.prevMouse);
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer.setSize(this.width, this.height, false);
  }

  swapTargets() {
    const temp = this.rtA;
    this.rtA = this.rtB;
    this.rtB = temp;
  }

  animate(time) {
    if (this.sceneTexture) {
      this.sceneTexture.needsUpdate = true;
    }

    this.simMaterial.uniforms.u_prev.value = this.rtA.texture;
    this.simMaterial.uniforms.u_mouse.value.copy(this.mouse);
    this.simMaterial.uniforms.u_velocity.value.copy(this.velocity);

    this.renderer.setRenderTarget(this.rtB);
    this.renderer.render(this.simScene, this.camera);
    this.renderer.setRenderTarget(null);
    this.swapTargets();

    this.renderMaterial.uniforms.u_velocityMap.value = this.rtA.texture;
    this.renderMaterial.uniforms.u_time.value = time * 0.001;

    this.renderer.render(this.renderScene, this.camera);

    // Ease velocity to avoid persistent drift
    this.velocity.multiplyScalar(0.85);

    requestAnimationFrame(this.animate);
  }
}

// ===== SOUND MANAGER WITH AUDIO VISUALIZER =====
class SoundManager {
  constructor() {
    this.isMuted = false;
    this.isPlaying = false;
    this.audioReactiveEnabled = true;
    this.toggle = document.getElementById('sound-toggle');
    this.canvas = document.getElementById('audio-visualizer');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.audioContext = null;
    this.audioElement = null;
    this.analyser = null;
    this.dataArray = null;
    this.animationId = null;
    this.visualizationData = new Array(12).fill(0); // Store visualization data
    this.init();
  }

  init() {
    if (this.toggle) {
      this.toggle.addEventListener('click', () => this.toggleSound());
      this.updateUI();
    }

    // Setup canvas size with DPI scaling
    if (this.canvas) {
      const dpr = window.devicePixelRatio || 1;
      // Set canvas resolution
      this.canvas.width = 60 * dpr;
      this.canvas.height = 60 * dpr;
      // Set display size
      this.canvas.style.width = '60px';
      this.canvas.style.height = '60px';
      // Scale drawing context
      if (this.ctx) {
        this.ctx.scale(dpr, dpr);
      }
      console.log('Canvas initialized:', { width: this.canvas.width, height: this.canvas.height, dpr });
    }

    // Initialize Web Audio API
    this.setupAudioContext();
  }

  setupAudioContext() {
    try {
      // Create audio element for background music
      this.audioElement = document.createElement('audio');
      this.audioElement.id = 'background-music';
      this.audioElement.loop = true;
      this.audioElement.volume = 0.3;
      this.audioElement.crossOrigin = 'anonymous';
      
      // Path to your music file
      const musicPath = 'fassounds-good-night-lofi-cozy-chill-music-160166.mp3';
      this.audioElement.src = musicPath;
      
      document.body.appendChild(this.audioElement);
      console.log('Audio element created');

      // Create analyser for beat timing (not connected to audio source due to browser limitations)
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioContext = new AudioContext();
        console.log('AudioContext created:', this.audioContext.state);
        
        // Create analyser for reference
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.85;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        console.log('Analyser created (using fallback visualization mode)');
      }
    } catch (error) {
      console.error('Error setting up audio element:', error);
    }
  }

  toggleSound() {
    this.isMuted = !this.isMuted;
    
    if (!this.isMuted && this.audioElement) {
      // Resume audio context if suspended
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      console.log('Playing audio...');
      this.audioElement.play().catch(e => console.error('Autoplay blocked:', e));
      this.isPlaying = true;
      
      // Start visualization
      this.startVisualization();
    } else if (this.audioElement) {
      console.log('Pausing audio...');
      this.audioElement.pause();
      this.isPlaying = false;
      this.stopVisualization();
    }
    
    this.updateUI();
    this.playSound('toggle');
  }

  setAudioReactiveEnabled(enabled) {
    this.audioReactiveEnabled = Boolean(enabled);
    if (!this.audioReactiveEnabled) {
      this.updateAudioGlow(0);
    }
  }

  updateAudioGlow(level) {
    if (!document.body) return;
    const safeLevel = Math.max(0, Math.min(1, level));
    document.body.style.setProperty('--audio-glow', String(safeLevel));
  }

  updateUI() {
    if (this.toggle) {
      const soundStateLabel = this.isMuted ? 'Sound Off' : 'Sound On';
      this.toggle.setAttribute('data-label', soundStateLabel);
      this.toggle.setAttribute('title', soundStateLabel);
      this.toggle.setAttribute('aria-label', soundStateLabel);

      if (this.isMuted) {
        this.toggle.classList.add('muted');
        this.toggle.classList.remove('playing');
      } else {
        this.toggle.classList.remove('muted');
        this.toggle.classList.add('playing');
      }
    }
  }

  startVisualization() {
    if (!this.ctx) {
      console.error('Canvas context not available');
      return;
    }
    
    console.log('Visualization started - using animated wave pattern');
    
    let frameCount = 0;
    const audioStartTime = Date.now();
    
    const draw = () => {
      this.animationId = requestAnimationFrame(draw);
      frameCount++;
      
      try {
        // Use time-based animation for smooth waves
        const elapsed = (Date.now() - audioStartTime) * 0.001; // seconds
        const barCount = 12;
        
        // Generate animated wave data
        for (let i = 0; i < barCount; i++) {
          // Each bar has its own frequency and phase
          const baseFreq = 1.5 + (i * 0.4);
          const phase = (i / barCount) * Math.PI * 2;
          
          // Create multiple sine waves that add together
          const wave1 = Math.sin(elapsed * baseFreq + phase) * 0.5;
          const wave2 = Math.sin(elapsed * (baseFreq * 0.7) + phase * 0.5) * 0.3;
          const wave3 = Math.sin(elapsed * (baseFreq * 1.3) + phase * 1.5) * 0.2;
          
          // Combine waves and normalize to 0-255
          const combined = (wave1 + wave2 + wave3 + 1.5) / 3;
          this.visualizationData[i] = Math.max(50, combined * 255);
        }

        if (this.audioReactiveEnabled) {
          const avg = this.visualizationData.reduce((sum, value) => sum + value, 0) / (barCount * 255);
          this.updateAudioGlow(avg * 0.7);
        }
        
        // Clear canvas completely
        this.ctx.fillStyle = 'rgba(2, 6, 23, 1)';
        this.ctx.fillRect(0, 0, 60, 60);
        
        // Draw bars
        const barWidth = 60 / barCount;
        const centerY = 30;
        
        for (let i = 0; i < barCount; i++) {
          const value = this.visualizationData[i] || 0;
          
          // Scale bar height with more dramatic ranges
          const barHeight = Math.max(4, (value / 255) * 28);
          
          // Calculate opacity based on frequency
          const opacity = Math.max(0.5, value / 255);
          
          // Create gradient for each bar
          const gradient = this.ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
          gradient.addColorStop(0, `rgba(94, 234, 212, ${opacity * 0.9})`);
          gradient.addColorStop(0.5, `rgba(129, 140, 248, ${opacity})`);
          gradient.addColorStop(1, `rgba(94, 234, 212, ${opacity * 0.9})`);
          
          this.ctx.fillStyle = gradient;
          
          // Draw upper bar
          this.ctx.fillRect(
            i * barWidth + 1,
            centerY - barHeight,
            barWidth - 2,
            barHeight
          );
          
          // Draw lower bar (mirrored)
          this.ctx.fillRect(
            i * barWidth + 1,
            centerY,
            barWidth - 2,
            barHeight
          );
          
          // Add glow outline
          this.ctx.strokeStyle = `rgba(94, 234, 212, ${opacity * 0.7})`;
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(
            i * barWidth + 1,
            centerY - barHeight,
            barWidth - 2,
            barHeight * 2
          );
        }
        
        if (frameCount === 1) {
          console.log('Animation frame drawn - bars should now be visible');
        }
      } catch (error) {
        console.error('Error in visualization draw:', error);
      }
    };
    
    draw();
  }

  stopVisualization() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    // Clear canvas
    if (this.ctx) {
      this.ctx.clearRect(0, 0, 60, 60);
    }

    this.updateAudioGlow(0);
  }

  playSound(type) {
    if (this.isMuted) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      switch(type) {
        case 'toggle':
          oscillator.frequency.value = 600;
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
          break;
        case 'click':
          oscillator.frequency.value = 800;
          gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
          break;
        case 'hover':
          oscillator.frequency.value = 700;
          gainNode.gain.setValueAtTime(0.03, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.05);
          break;
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }
}

// ===== MENU MANAGER =====
class MenuManager {
  constructor(soundManager) {
    this.soundManager = soundManager;
    this.menuToggle = document.getElementById('menu-toggle');
    this.menuOverlay = document.getElementById('menu-overlay');
    this.menuClose = document.getElementById('menu-close');
    this.menuItems = document.querySelectorAll('.menu-item');
    this.init();
  }

  init() {
    if (this.menuToggle) {
      this.menuToggle.addEventListener('click', () => this.toggle());
    }
    if (this.menuClose) {
      this.menuClose.addEventListener('click', () => this.close());
    }
    this.menuItems.forEach(item => {
      item.addEventListener('click', (e) => this.handleMenuItemClick(e));
    });
    // Close menu when clicking outside
    if (this.menuOverlay) {
      this.menuOverlay.addEventListener('click', (e) => {
        if (e.target === this.menuOverlay) this.close();
      });
    }
  }

  toggle() {
    if (this.menuOverlay.classList.contains('open')) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.menuOverlay.classList.add('open');
    this.menuToggle.classList.add('active');
    document.body.classList.add('menu-open');
    this.soundManager.playSound('click');
  }

  close() {
    this.menuOverlay.classList.remove('open');
    this.menuToggle.classList.remove('active');
    document.body.classList.remove('menu-open');
  }

  handleMenuItemClick(e) {
    const section = e.target.getAttribute('data-section');
    this.close();
    this.soundManager.playSound('click');
    
    // Handle section switching
    if (section === 'about') {
      showAbout();
    } else if (section === 'skills') {
      showSkills();
    } else if (section === 'overview') {
      showOverview();
    } else if (section === 'experience') {
      showExperience();
    } else if (section === 'contact') {
      showContact();
    } else if (section === 'classic') {
      showClassic();
    }
  }
}

// ===== CINEMATIC PRESET MANAGER =====
class CinematicPresetManager {
  constructor(soundManager) {
    this.soundManager = soundManager;
    this.themeSelect = document.getElementById('cinematic-theme');
    this.motionSelect = document.getElementById('motion-intensity');
    this.audioToggle = document.getElementById('audio-reactive-toggle');
    this.themeOptions = [
      'neo-noir',
      'warm-filmic',
      'futurist-minimal',
      'nebula-dream',
      'graphite-studio',
      'aurora-haze',
    ];
    this.motionOptions = ['subtle', 'medium', 'bold'];
    this.storageTheme = 'cinematicTheme';
    this.storageMotion = 'cinematicMotion';
    this.storageAudio = 'cinematicAudioReactive';
    this.init();
  }

  init() {
    const savedTheme = localStorage.getItem(this.storageTheme);
    const savedMotion = localStorage.getItem(this.storageMotion);
    const savedAudio = localStorage.getItem(this.storageAudio);

    const initialTheme = this.themeOptions.includes(savedTheme) ? savedTheme : 'neo-noir';
    const initialMotion = this.motionOptions.includes(savedMotion) ? savedMotion : 'medium';
    const audioEnabled = savedAudio === null ? true : savedAudio === 'true';

    this.applyTheme(initialTheme);
    this.applyMotion(initialMotion);
    this.setAudioReactiveEnabled(audioEnabled);

    if (this.themeSelect) {
      this.themeSelect.value = initialTheme;
      this.themeSelect.addEventListener('change', (e) => {
        this.applyTheme(e.target.value);
      });
    }

    if (this.motionSelect) {
      this.motionSelect.value = initialMotion;
      this.motionSelect.addEventListener('change', (e) => {
        this.applyMotion(e.target.value);
      });
      if (reducedMotionMode) {
        this.motionSelect.disabled = true;
        this.applyMotion('subtle');
      }
    }

    if (this.audioToggle) {
      this.audioToggle.checked = audioEnabled;
      this.audioToggle.addEventListener('change', (e) => {
        this.setAudioReactiveEnabled(e.target.checked);
      });
    }
  }

  applyTheme(theme) {
    if (!this.themeOptions.includes(theme)) return;
    document.body.classList.remove(
      'theme-neo-noir',
      'theme-warm-filmic',
      'theme-futurist-minimal',
      'theme-nebula-dream',
      'theme-graphite-studio',
      'theme-aurora-haze'
    );
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem(this.storageTheme, theme);
  }

  applyMotion(level) {
    const safeLevel = reducedMotionMode ? 'subtle' : level;
    if (!this.motionOptions.includes(safeLevel)) return;
    document.body.classList.remove('motion-subtle', 'motion-medium', 'motion-bold');
    document.body.classList.add(`motion-${safeLevel}`);
    localStorage.setItem(this.storageMotion, safeLevel);
  }

  setAudioReactiveEnabled(enabled) {
    const isEnabled = Boolean(enabled);
    localStorage.setItem(this.storageAudio, String(isEnabled));
    if (this.soundManager && this.soundManager.setAudioReactiveEnabled) {
      this.soundManager.setAudioReactiveEnabled(isEnabled);
    }
  }
}

// Initialize sound and menu
let soundManager;
let menuManager;
let fluidCursorManager;
let cinematicPresetManager;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    soundManager = new SoundManager();
    menuManager = new MenuManager(soundManager);
    fluidCursorManager = new FluidCursorManager();
    cinematicPresetManager = new CinematicPresetManager(soundManager);
  });
} else {
  soundManager = new SoundManager();
  menuManager = new MenuManager(soundManager);
  fluidCursorManager = new FluidCursorManager();
  cinematicPresetManager = new CinematicPresetManager(soundManager);
}

// ===== FLUID CURSOR & GOOEY REPEL MANAGER =====
class FluidCursorManager {
  constructor() {
    this.mouseX = 0;
    this.mouseY = 0;
    this.prevMouseX = 0;
    this.prevMouseY = 0;
    this.magneticElements = [];
    this.nameChars = [];
    this.cosmicChars = [];
    this.charVelocities = {};
    this.charCenters = {};
    this.attractRadius = 150;      // How far cursor attracts
    this.repelRadius = 80;         // How far before hard repel
    this.nameRepelRadius = 100;
    this.friction = 0.15;          // Higher = more gooey/sticky
    this.pendingNameUpdate = false;
    this.pendingCenterRefresh = false;
    this.scheduleNameUpdate = this.scheduleNameUpdate.bind(this);
    this.scheduleCenterRefresh = this.scheduleCenterRefresh.bind(this);
    this.init();
  }

  init() {
    // Keep only name repulsion behavior (disable magnetic shifting on other elements)
    this.magneticElements = [];

    // Convert name text to individual characters
    this.setupNameCharacters();
    this.scheduleCenterRefresh();

    document.addEventListener('pointermove', (e) => {
      this.prevMouseX = this.mouseX;
      this.prevMouseY = this.mouseY;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.scheduleNameUpdate();
    }, { passive: true });

    window.addEventListener('resize', this.scheduleCenterRefresh, { passive: true });
    window.addEventListener('scroll', this.scheduleCenterRefresh, { passive: true });
    window.addEventListener('load', this.scheduleCenterRefresh, { passive: true });

    document.addEventListener('mouseleave', () => {
      this.resetNameCharacters();
    });
  }

  scheduleNameUpdate() {
    if (this.pendingNameUpdate) return;
    this.pendingNameUpdate = true;
    requestAnimationFrame(() => {
      this.pendingNameUpdate = false;
      this.updateNameCharacters();
    });
  }

  scheduleCenterRefresh() {
    if (this.pendingCenterRefresh) return;
    this.pendingCenterRefresh = true;
    requestAnimationFrame(() => {
      this.pendingCenterRefresh = false;
      this.refreshCharCenters();
    });
  }

  setupNameCharacters() {
    this.nameChars = this.splitTextToChars('#name-text', 'name-char', 'name');
    this.cosmicChars = this.splitTextToChars('.cosmic-title', 'cosmic-char', 'cosmic');
  }

  splitTextToChars(selector, className, keyPrefix) {
    const el = document.querySelector(selector);
    if (!el) return [];

    const text = el.textContent || '';
    el.innerHTML = '';

    const chars = [];
    text.split('').forEach((char, index) => {
      const span = document.createElement('span');
      span.className = className;
      span.textContent = char;
      span.style.marginRight = char === ' ' ? '0.3em' : '0';
      span.dataset.index = `${keyPrefix}-${index}`;
      el.appendChild(span);

      this.charVelocities[`${keyPrefix}-${index}`] = { x: 0, y: 0 };
      this.charCenters[`${keyPrefix}-${index}`] = { x: 0, y: 0 };
      chars.push(span);
    });

    return chars;
  }

  refreshCharCenters() {
    const allChars = [...this.nameChars, ...this.cosmicChars];
    allChars.forEach((char) => {
      const key = char.dataset.index;
      if (!key) return;
      const rect = char.getBoundingClientRect();
      this.charCenters[key] = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    });
  }

  updateNameCharacters() {
    const allChars = [...this.nameChars, ...this.cosmicChars];
    allChars.forEach((char) => {
      const key = char.dataset.index;
      if (!key || !this.charVelocities[key]) return;

      const center = this.charCenters[key] || { x: 0, y: 0 };
      const charCenterX = center.x;
      const charCenterY = center.y;

      const distX = this.mouseX - charCenterX;
      const distY = this.mouseY - charCenterY;
      const distance = Math.sqrt(distX * distX + distY * distY);

      let targetX = 0;
      let targetY = 0;
      let rotation = 0;

      if (distance < this.attractRadius) {
        const angle = Math.atan2(distY, distX);
        const force = 1 - distance / this.attractRadius;

        if (distance < this.nameRepelRadius) {
          // REPEL - push away
          const repelForce = (1 - distance / this.nameRepelRadius) * 50;
          targetX = -Math.cos(angle) * repelForce;
          targetY = -Math.sin(angle) * repelForce;
          rotation = force * 12;
        } else {
          // ATTRACT - pull toward cursor (gooey effect)
          const attractForce = force * 35;
          targetX = Math.cos(angle) * attractForce;
          targetY = Math.sin(angle) * attractForce;
          rotation = force * 5;
        }
      }

      // Apply velocity with friction for gooey feel
      this.charVelocities[key].x += (targetX - this.charVelocities[key].x) * this.friction;
      this.charVelocities[key].y += (targetY - this.charVelocities[key].y) * this.friction;

      char.style.transform = `translate(${this.charVelocities[key].x}px, ${this.charVelocities[key].y}px) rotate(${rotation}deg)`;
    });
  }

  resetNameCharacters() {
    const allChars = [...this.nameChars, ...this.cosmicChars];
    allChars.forEach((char) => {
      // Slow decay to original position (gooey snap back)
      const key = char.dataset.index;
      if (!key || !this.charVelocities[key]) return;

      this.charVelocities[key].x *= 0.92;
      this.charVelocities[key].y *= 0.92;

      if (Math.abs(this.charVelocities[key].x) < 0.1 && Math.abs(this.charVelocities[key].y) < 0.1) {
        char.style.transform = 'translate(0, 0) rotate(0deg)';
        this.charVelocities[key] = { x: 0, y: 0 };
      } else {
        char.style.transform = `translate(${this.charVelocities[key].x}px, ${this.charVelocities[key].y}px)`;
      }
    });
  }

  updateMagneticElements() {
    this.magneticElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const elCenterX = rect.left + rect.width / 2;
      const elCenterY = rect.top + rect.height / 2;

      const distX = this.mouseX - elCenterX;
      const distY = this.mouseY - elCenterY;
      const distance = Math.sqrt(distX * distX + distY * distY);

      let transformValue = 'translate(0, 0)';

      if (distance < this.attractRadius) {
        const angle = Math.atan2(distY, distX);
        const force = 1 - distance / this.attractRadius;

        if (distance < this.repelRadius) {
          // Hard repel at close range
          const repelForce = (1 - distance / this.repelRadius) * 40;
          const pushX = -Math.cos(angle) * repelForce;
          const pushY = -Math.sin(angle) * repelForce;
          transformValue = `translate(${pushX}px, ${pushY}px)`;
        } else {
          // Soft attract/follow (gooey effect)
          const attractForce = force * 20;
          const pullX = Math.cos(angle) * attractForce;
          const pullY = Math.sin(angle) * attractForce;
          transformValue = `translate(${pullX}px, ${pullY}px)`;
        }
      }

      el.style.transform = transformValue;
      el.classList.add('magnetic-element');
    });
  }

  createWaveRipple(x, y) {
    // Create ripple effect at cursor position (less frequently to not spam)
    if (Math.random() > 0.92) {
      const ripple = document.createElement('div');
      ripple.className = 'wave-ripple';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      document.body.appendChild(ripple);

      setTimeout(() => ripple.remove(), 1000);
    }
  }

  resetElements() {
    this.magneticElements.forEach((el) => {
      el.style.transform = 'translate(0, 0)';
    });
  }
}

// ===== CUSTOM CURSOR TRACKING - ENHANCED =====
class CustomCursor {
  constructor() {
    this.cursor = null;
    this.onPointerMove = this.onPointerMove.bind(this);
    this.isActive = false;
    this.init();
  }

  init() {
    // Create cursor element
    this.cursor = document.createElement('div');
    this.cursor.classList.add('cursor');
    document.body.appendChild(this.cursor);

    // Track pointer movement with a single high-frequency source to avoid duplicate updates
    const moveEvent = 'onpointerrawupdate' in window ? 'pointerrawupdate' : 'pointermove';
    document.addEventListener(moveEvent, this.onPointerMove, { passive: true });
    
    // Detect interactive elements
    this.attachInteractiveListeners();
    
  }

  onPointerMove(e) {
    this.cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
  }

  attachInteractiveListeners() {
    const interactiveElements = document.querySelectorAll(
      'a, button, .project-link, .cv-button, .contact-link, input, textarea'
    );

    interactiveElements.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        this.cursor.classList.add('active');
        this.isActive = true;
      });
      el.addEventListener('mouseleave', () => {
        this.cursor.classList.remove('active');
        this.isActive = false;
      });
    });
  }

}

// Initialize custom cursor when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CustomCursor();
  });
} else {
  new CustomCursor();
}

// Initialize fluid cursor distortion when DOM is ready
// Fluid cursor distortion disabled for reliable click interactions.

// ===== SYSTEM REVEAL OBSERVER =====
let lastActiveSection = null;

function triggerScenePulse(sectionEl) {
  if (!sectionEl || reducedMotionMode) return;
  sectionEl.classList.remove('scene-pulse');
  void sectionEl.offsetWidth;
  sectionEl.classList.add('scene-pulse');
  setTimeout(() => {
    sectionEl.classList.remove('scene-pulse');
  }, 1000);
}

function initSystemReveal() {
  const sections = document.querySelectorAll('[data-reveal]');
  if (!sections.length) return;

  if (reducedMotionMode) {
    sections.forEach((section) => section.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          triggerScenePulse(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
  );

  sections.forEach((section) => observer.observe(section));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSystemReveal);
} else {
  initSystemReveal();
}

// ===== ECOSYSTEM FOOTER — SWIPEABLE ROTATING ORBS =====
function initEcosystemFooter() {
  const footerElement = document.querySelector('.ecosystem-footer');
  if (!footerElement) return;

  const orbs = footerElement.querySelectorAll('.eco-orb');
  orbs.forEach((orb) => {
    orb.addEventListener('mouseenter', () => {
      orb.classList.add('is-orb-active');
    });

    orb.addEventListener('mouseleave', () => {
      orb.classList.remove('is-orb-active');
    });
  });

  if (window.gsap && !reducedMotionMode) {
    gsap.set(footerElement, { opacity: 0, y: 40 });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.to(footerElement, {
              opacity: 1,
              y: 0,
              duration: 1,
              ease: 'power3.out',
            });
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(footerElement);
  }

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEcosystemFooter);
} else {
  initEcosystemFooter();
}

// ===== END CUSTOM CURSOR =====

// ===== THREE.JS DEPTH PORTRAIT (GLASS PARALLAX + GLITCH) =====
class DepthPortrait {
  constructor(wrapper) {
    this.wrapper = wrapper;
    this.imageSrc = wrapper.dataset.portrait;
    this.depthSrc = wrapper.dataset.depth;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'portrait-canvas';
    this.wrapper.appendChild(this.canvas);

    this.width = wrapper.clientWidth;
    this.height = wrapper.clientHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.mouse = new THREE.Vector2(0.5, 0.5);
    this.targetMouse = new THREE.Vector2(0.5, 0.5);
    this.glitchPower = 0;

    this.init();
  }

  async init() {
    if (!window.THREE || reducedMotionMode) return;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.width, this.height, false);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const loader = new THREE.TextureLoader();
    let imageTexture;
    let depthTexture;

    try {
      [imageTexture, depthTexture] = await Promise.all([
        loader.loadAsync(this.imageSrc),
        loader.loadAsync(this.depthSrc),
      ]);
    } catch (err) {
      console.warn('Depth portrait assets missing:', err);
      this.canvas.remove();
      return;
    }

    imageTexture.minFilter = imageTexture.magFilter = THREE.LinearFilter;
    depthTexture.minFilter = depthTexture.magFilter = THREE.LinearFilter;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        u_image: { value: imageTexture },
        u_depth: { value: depthTexture },
        u_mouse: { value: this.mouse.clone() },
        u_time: { value: 0 },
        u_depthStrength: { value: 0.25 },
        u_mouseStrength: { value: 0.08 },
        u_glitch: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        uniform sampler2D u_depth;
        uniform vec2 u_mouse;
        uniform float u_depthStrength;
        uniform float u_mouseStrength;
        uniform float u_time;

        void main() {
          vUv = uv;
          float depth = texture2D(u_depth, uv).r;
          vec2 mouse = (u_mouse - 0.5) * 2.0;

          vec3 pos = position;
          float parallax = depth * u_depthStrength;
          pos.z += parallax;
          pos.x += mouse.x * parallax * u_mouseStrength;
          pos.y += mouse.y * parallax * u_mouseStrength;

          float ripple = sin((uv.y + u_time * 0.15) * 6.2831) * 0.002;
          pos.z += ripple;

          gl_Position = vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D u_image;
        uniform float u_time;
        uniform float u_glitch;

        float rand(vec2 co) {
          return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          vec2 uv = vUv;

          float row = floor(uv.y * 120.0);
          float burst = step(0.985, rand(vec2(row, u_time * 2.0)));
          float glitch = burst * u_glitch;
          uv.x += glitch * 0.01 * (rand(vec2(row, 1.0)) - 0.5);

          vec3 color = texture2D(u_image, uv).rgb;
          if (glitch > 0.01) {
            float r = texture2D(u_image, uv + vec2(0.003, 0.0)).r;
            float g = texture2D(u_image, uv).g;
            float b = texture2D(u_image, uv - vec2(0.003, 0.0)).b;
            color = vec3(r, g, b);
          }

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 140, 140), this.material);
    this.scene.add(this.mesh);

    this.wrapper.classList.add('webgl-active');

    this.wrapper.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.wrapper.addEventListener('mouseleave', () => this.onMouseLeave());
    window.addEventListener('resize', () => this.onResize());

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  onMouseMove(e) {
    const rect = this.wrapper.getBoundingClientRect();
    this.targetMouse.set(
      (e.clientX - rect.left) / rect.width,
      1 - (e.clientY - rect.top) / rect.height
    );

    if (Math.random() > 0.92) {
      this.glitchPower = Math.min(1, this.glitchPower + 0.6);
    }
  }

  onMouseLeave() {
    this.targetMouse.set(0.5, 0.5);
  }

  onResize() {
    this.width = this.wrapper.clientWidth;
    this.height = this.wrapper.clientHeight;
    this.renderer.setSize(this.width, this.height, false);
  }

  animate(time) {
    this.mouse.lerp(this.targetMouse, 0.08);
    this.glitchPower *= 0.92;

    this.material.uniforms.u_mouse.value.copy(this.mouse);
    this.material.uniforms.u_time.value = time * 0.001;
    this.material.uniforms.u_glitch.value = this.glitchPower * 0.35;

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  }
}

function initDepthPortrait() {
  const wrapper = document.querySelector('.profile-photo-wrapper');
  if (!wrapper || reducedMotionMode || !window.THREE) return;
  new DepthPortrait(wrapper);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDepthPortrait);
} else {
  initDepthPortrait();
}

// ===== END THREE.JS DEPTH PORTRAIT =====

let swiper = null;
if (window.Swiper && document.querySelector('.swiper')) {
  swiper = new Swiper('.swiper', {
    slidesPerView: 1.1,
    centeredSlides: true,
    spaceBetween: 26,
    grabCursor: true,

    effect: 'coverflow',
    coverflowEffect: {
      rotate: 8,
      depth: 180,
      stretch: 0,
      modifier: 1,
      slideShadows: false,
    },

    keyboard: {
      enabled: true,
    },

    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },

    pagination: {
      el: '.swiper-pagination',
      clickable: true,
    },

    breakpoints: {
      768: {
        slidesPerView: 1.5,
        spaceBetween: 32,
      },
      1024: {
        slidesPerView: 1.8,
        spaceBetween: 40,
      },
    },
  });
}

// Scroll-based sections: About, Skills, Projects, Experience, Contact, Classic
let aboutScreen, skillsScreen, overviewScreen, experienceScreen, contactScreen, classicScreen;
let navAbout, navSkills, navOverview, navExperience, navContact, navClassic;

function getSectionEls() {
  aboutScreen = document.getElementById('about-screen');
  skillsScreen = document.getElementById('skills-screen');
  overviewScreen = document.getElementById('overview-screen');
  experienceScreen = document.getElementById('experience-screen');
  contactScreen = document.getElementById('connect-screen');
  classicScreen = document.getElementById('classic-screen');
  navAbout = document.querySelector('.nav-about');
  navSkills = document.querySelector('.nav-skills');
  navOverview = document.querySelector('.nav-overview');
  navExperience = document.querySelector('.nav-experience');
  navContact = document.querySelector('.nav-contact');
  navClassic = document.querySelector('.nav-classic');
}

function setActiveNav(section) {
  if (!navAbout || !navSkills || !navOverview || !navExperience || !navContact || !navClassic) return;
  navAbout.classList.toggle('active', section === 'about');
  navSkills.classList.toggle('active', section === 'skills');
  navOverview.classList.toggle('active', section === 'overview');
  navExperience.classList.toggle('active', section === 'experience');
  navContact.classList.toggle('active', section === 'contact');
  navClassic.classList.toggle('active', section === 'classic');
  if (particleBackgroundInstance) {
    const particleSection = ['classic'].includes(section)
      ? 'home'
      : section;
    particleBackgroundInstance.setSection(particleSection);
  }

  if (section !== lastActiveSection) {
    const sectionMap = {
      about: aboutScreen,
      skills: skillsScreen,
      overview: overviewScreen,
      experience: experienceScreen,
      contact: contactScreen,
      classic: classicScreen,
    };
    triggerScenePulse(sectionMap[section]);
    lastActiveSection = section;
  }
}

function scrollToSection(section) {
  const sectionMap = {
    about: aboutScreen,
    skills: skillsScreen,
    overview: overviewScreen,
    experience: experienceScreen,
    contact: contactScreen,
    classic: classicScreen,
  };
  const el = sectionMap[section];
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveNav(section);
  }
  if (section === 'overview') {
    try {
      if (typeof swiper !== 'undefined' && swiper && swiper.update) swiper.update();
    } catch (e) {}
    hideOverviewHint();
  }
}

function showOverview() {
  scrollToSection('overview');
}

function showSkills() {
  scrollToSection('skills');
}

function showAbout() {
  scrollToSection('about');
}

function showExperience() {
  scrollToSection('experience');
}

function showContact() {
  scrollToSection('contact');
}

function showClassic() {
  scrollToSection('classic');
}

// Intersection Observer: update nav + particles when user scrolls (pick section with max visibility)
let sectionRatios = {
  about: 0,
  skills: 0,
  overview: 0,
  experience: 0,
  contact: 0,
  classic: 0,
};

function initSectionObserver() {
  getSectionEls();
  const sections = [
    { id: 'about-screen', section: 'about' },
    { id: 'skills-screen', section: 'skills' },
    { id: 'overview-screen', section: 'overview' },
    { id: 'experience-screen', section: 'experience' },
    { id: 'connect-screen', section: 'contact' },
    { id: 'classic-screen', section: 'classic' },
  ];
  const observed = sections.map(({ id, section }) => ({
    el: document.getElementById(id),
    section,
  })).filter((o) => o.el);

  if (!observed.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const found = observed.find((o) => o.el === entry.target);
        if (found) sectionRatios[found.section] = entry.intersectionRatio;
      });
      const best = Object.entries(sectionRatios).reduce((a, b) => (a[1] >= b[1] ? a : b), ['about', 0]);
      if (best[1] >= 0.15) setActiveNav(best[0]);
    },
    { threshold: [0, 0.15, 0.5, 0.8, 1], rootMargin: '-15% 0px -15% 0px' }
  );

  observed.forEach(({ el }) => observer.observe(el));
}

function hideOverviewHint() {
  const hint = document.getElementById('overview-hint');
  if (hint) hint.classList.add('hidden');
}

function initScrollSectionListeners() {
  getSectionEls();
  if (navAbout) navAbout.addEventListener('click', showAbout);
  if (navSkills) navSkills.addEventListener('click', showSkills);
  if (navOverview) navOverview.addEventListener('click', showOverview);
  if (navExperience) navExperience.addEventListener('click', showExperience);
  if (navContact) navContact.addEventListener('click', showContact);
  if (navClassic) navClassic.addEventListener('click', showClassic);

  const portfolioTreeEl = document.getElementById('portfolio-tree');
  if (portfolioTreeEl) portfolioTreeEl.addEventListener('click', () => showOverview());

  setTimeout(hideOverviewHint, 8000);
  initSectionObserver();
  setActiveNav('about');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollSectionListeners);
} else {
  initScrollSectionListeners();
}

// ===== CONTINUOUS SCROLL LOOP =====
let loopScrollLock = false;
let loopScrollPending = false;
let loopLastJump = 0;
const LOOP_BUFFER = 96;
const LOOP_COOLDOWN_MS = 220;

function jumpScrollTo(targetTop) {
  const root = document.documentElement;
  root.classList.add('scroll-jump');
  window.scrollTo({ top: targetTop, behavior: 'auto' });
  requestAnimationFrame(() => {
    root.classList.remove('scroll-jump');
  });
}

function handleScrollLoop() {
  loopScrollPending = false;
  if (loopScrollLock) return;

  const doc = document.documentElement;
  const maxScroll = doc.scrollHeight - window.innerHeight;
  if (maxScroll <= 0) return;

  const buffer = LOOP_BUFFER;
  const top = window.scrollY || doc.scrollTop || 0;
  const now = performance.now();

  if (now - loopLastJump < LOOP_COOLDOWN_MS) return;

  const bottomThreshold = maxScroll - buffer;

  if (top >= bottomThreshold) {
    loopScrollLock = true;
    loopLastJump = now;
    const overflow = Math.max(0, top - bottomThreshold);
    jumpScrollTo(buffer + overflow);
    requestAnimationFrame(() => {
      loopScrollLock = false;
    });
    return;
  }

  if (top <= buffer) {
    loopScrollLock = true;
    loopLastJump = now;
    const underflow = Math.max(0, buffer - top);
    jumpScrollTo(Math.max(0, bottomThreshold - underflow));
    requestAnimationFrame(() => {
      loopScrollLock = false;
    });
  }
}

function initScrollLoop() {
  window.addEventListener(
    'scroll',
    () => {
      if (loopScrollPending) return;
      loopScrollPending = true;
      requestAnimationFrame(handleScrollLoop);
    },
    { passive: true }
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollLoop);
} else {
  initScrollLoop();
}

// CV and Contact Links Configuration
// Replace these with your actual links
const cvLink = document.getElementById('cv-link');
const emailLink = document.getElementById('email-link');
const linkedinLink = document.getElementById('linkedin-link');
const githubLink = document.getElementById('github-link');

// Update these URLs with your actual contact information
if (cvLink) {
  // Replace with your Google Drive resume link (make sure sharing is set to "Anyone with the link can view")
  cvLink.href =
    'https://drive.google.com/file/d/1ba3qtmlRkz3H8KAOMUNKr56r1nAWHk8_/view?usp=sharing';
}

if (emailLink) {
  // Replace with your actual email
  emailLink.href = 'mailto:yatharthrathi08@gmail.com';
}

if (linkedinLink) {
  // Replace with your LinkedIn profile URL
  linkedinLink.href =
    'https://www.linkedin.com/in/yatharth-rathi-781aa627b/';
}

if (githubLink) {
  // Replace with your GitHub profile URL
  githubLink.href = '#'; // e.g., 'https://github.com/yourusername'
}

// Project details handling
const overlay = document.getElementById('details-overlay');
const closeBtn = document.querySelector('.details-close');
const detailsTitle = document.getElementById('details-title');
const detailsDescription = document.getElementById('details-description');
const detailsProblem = document.getElementById('details-problem');
const detailsGoal = document.getElementById('details-goal');
const detailsRole = document.getElementById('details-role');
const detailsThinking = document.getElementById('details-thinking');
const detailsMetric = document.getElementById('details-metric');
const detailsList = document.getElementById('details-list');
const detailsLink = document.getElementById('details-link');
const detailsGallerySection = document.getElementById('details-gallery-section');
const detailsGallery = document.getElementById('details-gallery');
const chatbotUploadSection = document.getElementById('chatbot-upload');
const chatbotUploadInput = document.getElementById('chatbot-upload-input');
const chatbotUploadPreview = document.getElementById('chatbot-upload-preview');
const chatbotUploadImg = document.getElementById('chatbot-upload-img');
const chatbotUploadClear = document.getElementById('chatbot-upload-clear');
const chatbotUploadHint = document.getElementById('chatbot-upload-hint');

const projectDetails = {
  emotion: {
    title: 'Emotion Recognition App',
    description:
      'A machine learning project that detects facial emotions in real-time using computer vision and the Gemini API.',
    problem:
      'It is hard for systems to respond to how a user feels in the moment, because emotion is not visible to a computer without extra processing.',
    goal:
      'Build a simple demo that can recognise core facial emotions in real time from a webcam feed, using Gemini as the core model.',
    role:
      'Acted as PM and developer: framed the problem, chose the emotion classes, selected the Gemini API, and implemented the model and UI.',
    thinking:
      'Chose the Gemini API for its low latency and strong understanding of visual input, and prioritised a small, clear set of emotions with a responsive UI over adding many labels that would confuse users.',
    metric:
      'Model reached good accuracy on core emotions and ran in real-time on a normal laptop webcam.',
    artifacts: [
      'User flow: open app → allow webcam → face detected → emotion label overlaid.',
      'Short PRD for emotion classes and minimum acceptable FPS.',
      'Demo screenshots and link to the GitHub repository.',
    ],
    gallery: ['emotion-1.png', 'emotion-2.png', 'emotion-3.png'],
    caseStudyLink: '#',
  },
  chatbot: {
    title: 'AI Chatbot (Colab Prototype)',
    description:
      'A simple AI chatbot prototype built in Google Colab to explore how conversational interfaces can answer user questions.',
    problem:
      'I wanted a quick way to test how users would interact with an AI assistant and what types of questions they would ask.',
    goal:
      'Create a working chatbot demo in Colab that can respond to basic queries and show the core interaction pattern.',
    role:
      'Acted as both Product Manager and developer: scoped the MVP, set up the Colab environment, and designed the basic question–answer flows.',
    thinking:
      'Used Colab to move fast without worrying about deployment, focusing on conversation quality and understanding user intents over visuals.',
    metric:
      'A working end-to-end prototype that could handle typical test questions and helped me learn how to structure prompts and responses.',
    artifacts: [
      'User flow diagram from landing on help → asking a question → getting an answer → next suggested step.',
      '1-page PRD covering persona, functional requirements, and out-of-scope items.',
      'Annotated screenshots of the chatbot UI and a link to the GitHub repo.',
    ],
    gallery: ['AI chatbot MVP screen shot.png'],
    caseStudyLink: '#', // replace with your Google Drive / Notion case study link
  },
  portfolio: {
    title: 'Overview-Style Portfolio',
    description:
      'This website – inspired by mobile “recent apps” UI to showcase projects like app cards.',
    problem:
      'Traditional portfolios often feel static and do not match how people actually switch between apps or tasks.',
    goal:
      'Create a playful, recent-apps-style UI that makes it fun to swipe through projects and dive into details.',
    role:
      'Designed and built the full experience: layout, animations, and project details view.',
    thinking:
      'Used a familiar “recent apps” pattern to make navigation feel intuitive, even for first-time visitors.',
    metric:
      'A simple, memorable way to access case studies and proof of work in just a few taps or clicks.',
    artifacts: [
      'Sketch of the overview layout and navigation bar.',
      'Basic PRD for the Home and Overview states.',
      'Screenshots of the portfolio and link to the source code.',
    ],
    gallery: [
      'https://images.pexels.com/photos/11814659/pexels-photo-11814659.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
    caseStudyLink: '#',
  },
};

function setDetailsGallery(images, title) {
  if (!detailsGallery) return;
  detailsGallery.innerHTML = '';

  if (!images || !images.length) {
    if (detailsGallerySection) detailsGallerySection.style.display = 'none';
    return;
  }

  if (detailsGallerySection) detailsGallerySection.style.display = 'block';
  images.forEach((src, index) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = `${title} screen ${index + 1}`;
    detailsGallery.appendChild(img);
  });
}

function openDetails(key) {
  if (
    !overlay ||
    !detailsTitle ||
    !detailsDescription ||
    !detailsProblem ||
    !detailsGoal ||
    !detailsRole ||
    !detailsThinking ||
    !detailsMetric ||
    !detailsList
  )
    return;
  const data = projectDetails[key];
  if (!data) return;

  detailsTitle.textContent = data.title;
  detailsDescription.textContent = data.description;
  detailsProblem.textContent = data.problem || '';
  detailsGoal.textContent = data.goal || '';
  detailsRole.textContent = data.role || '';
  detailsThinking.textContent = data.thinking || '';
  detailsMetric.textContent = data.metric || '';

  detailsList.innerHTML = '';
  (data.artifacts || []).forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    detailsList.appendChild(li);
  });

  setDetailsGallery(data.gallery, data.title);
  setChatbotUploadVisible(key === 'chatbot');

  if (detailsLink) {
    if (data.caseStudyLink && data.caseStudyLink !== '#') {
      detailsLink.href = data.caseStudyLink;
      detailsLink.style.display = 'inline-block';
    } else {
      detailsLink.href = '#';
      detailsLink.style.display = 'none';
    }
  }

  overlay.classList.add('open');
}

function resetChatbotUpload() {
  if (chatbotUploadInput) chatbotUploadInput.value = '';
  if (chatbotUploadPreview) chatbotUploadPreview.hidden = true;
  if (chatbotUploadImg) chatbotUploadImg.src = '';
  if (chatbotUploadHint) chatbotUploadHint.textContent = '';
}

function setChatbotUploadVisible(isVisible) {
  if (!chatbotUploadSection) return;
  chatbotUploadSection.classList.toggle('is-visible', isVisible);
  chatbotUploadSection.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
  if (!isVisible) resetChatbotUpload();
}

function closeDetails() {
  if (!overlay) return;
  overlay.classList.remove('open');
}

if (closeBtn) {
  closeBtn.addEventListener('click', closeDetails);
}

if (overlay) {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeDetails();
    }
  });
}

if (chatbotUploadInput) {
  chatbotUploadInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      resetChatbotUpload();
      return;
    }

    if (!file.type.startsWith('image/')) {
      if (chatbotUploadHint) chatbotUploadHint.textContent = 'Please choose an image file.';
      chatbotUploadInput.value = '';
      if (chatbotUploadPreview) chatbotUploadPreview.hidden = true;
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      if (chatbotUploadHint) chatbotUploadHint.textContent = 'Image must be 5MB or smaller.';
      chatbotUploadInput.value = '';
      if (chatbotUploadPreview) chatbotUploadPreview.hidden = true;
      return;
    }

    if (chatbotUploadHint) chatbotUploadHint.textContent = '';
    const reader = new FileReader();
    reader.onload = () => {
      if (chatbotUploadImg && typeof reader.result === 'string') {
        chatbotUploadImg.src = reader.result;
      }
      if (chatbotUploadPreview) chatbotUploadPreview.hidden = false;
    };
    reader.readAsDataURL(file);
  });
}

if (chatbotUploadClear) {
  chatbotUploadClear.addEventListener('click', () => {
    resetChatbotUpload();
  });
}

document.querySelectorAll('.project-link').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const key = link.getAttribute('data-project');
    openDetails(key);
  });
});

// ===== GROWING PORTFOLIO TREE =====
// Tree stage: 0 = seed, 1 = sprout, 2 = small plant, 3 = medium tree, 4 = full tree
function getProjectCount() {
  const overviewWrapper = document.querySelector('#overview-screen .swiper-wrapper');
  if (!overviewWrapper) return 0;
  return overviewWrapper.querySelectorAll('.swiper-slide').length;
}

function getTreeStage(count) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4; // 4+ projects = full tree
}

function updatePortfolioTree() {
  const treeEl = document.getElementById('portfolio-tree');
  const labelEl = document.getElementById('tree-label');
  if (!treeEl) return;

  const count = getProjectCount();
  const stage = getTreeStage(count);

  treeEl.setAttribute('data-stage', String(stage));

  if (labelEl) {
    labelEl.textContent = count === 1 ? '1 project' : count + ' projects';
  }
}

// Run on load and when DOM might change (e.g. if you add/remove slides later)
updatePortfolioTree();

// Optional: re-run when Swiper is updated (e.g. after adding slides dynamically)
if (typeof swiper !== 'undefined' && swiper) {
  const originalUpdate = swiper.update;
  if (originalUpdate) {
    swiper.update = function () {
      originalUpdate.apply(this, arguments);
      updatePortfolioTree();
    };
  }
}

// ===== CURSOR REPEL / DISTORTION EFFECT =====
class CursorRepelEffect {
  constructor() {
    this.mouseX = window.innerWidth / 2;
    this.mouseY = window.innerHeight / 2;
    this.repelRadius = 120;
    this.repelStrength = 30;
    this.init();
  }

  init() {
    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.updateElements();
    });

    document.addEventListener('mouseleave', () => {
      this.resetElements();
    });
  }

  updateElements() {
    // Apply repel effect to text elements
    const textElements = document.querySelectorAll(
      '.name-text, .hello-text, .role-text, .sub-text, .category-title, .skill-name, h2, p'
    );

    textElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distX = this.mouseX - centerX;
      const distY = this.mouseY - centerY;
      const distance = Math.sqrt(distX * distX + distY * distY);

      if (distance < this.repelRadius) {
        const angle = Math.atan2(distY, distX);
        const force = (1 - distance / this.repelRadius) * this.repelStrength;
        const pushX = Math.cos(angle + Math.PI) * force;
        const pushY = Math.sin(angle + Math.PI) * force;

        el.style.transform = `translate(${pushX}px, ${pushY}px)`;
        el.style.transition = 'none';
      } else {
        el.style.transform = 'translate(0, 0)';
        el.style.transition = 'transform 0.4s ease-out';
      }
    });

    // Apply repel effect to images
    const images = document.querySelectorAll('.profile-photo, .project-image');

    images.forEach((img) => {
      const rect = img.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distX = this.mouseX - centerX;
      const distY = this.mouseY - centerY;
      const distance = Math.sqrt(distX * distX + distY * distY);

      if (distance < this.repelRadius) {
        const angle = Math.atan2(distY, distX);
        const force = (1 - distance / this.repelRadius) * this.repelStrength;
        const pushX = Math.cos(angle + Math.PI) * force;
        const pushY = Math.sin(angle + Math.PI) * force;

        img.style.transform = `translate(${pushX}px, ${pushY}px) scale(1.02)`;
        img.style.transition = 'none';
        img.style.filter = 'brightness(1.1)';
      } else {
        img.style.transform = 'translate(0, 0) scale(1)';
        img.style.transition = 'transform 0.4s ease-out, filter 0.4s ease-out';
        img.style.filter = 'brightness(1)';
      }
    });
  }

  resetElements() {
    const allElements = document.querySelectorAll(
      '.name-text, .hello-text, .role-text, .sub-text, .category-title, .skill-name, h2, p, .profile-photo, .project-image'
    );

    allElements.forEach((el) => {
      el.style.transform = 'translate(0, 0) scale(1)';
      el.style.transition = 'transform 0.6s ease-out, filter 0.6s ease-out';
      el.style.filter = 'brightness(1)';
    });
  }
}

// Initialize cursor repel effect when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Cursor repel effect disabled for smoother scrolling and reliable interactions.
    particleBackgroundInstance = new ParticleBackground();
    if (particleBackgroundInstance) particleBackgroundInstance.setSection('home');
  });
} else {
  // Cursor repel effect disabled for smoother scrolling and reliable interactions.
  particleBackgroundInstance = new ParticleBackground();
  if (particleBackgroundInstance) particleBackgroundInstance.setSection('home');
}

// ===== PARTICLE BACKGROUND – sand/fluid particles that form shapes by section =====
class ParticleBackground {
  constructor() {
    this.canvas = document.getElementById('particle-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.particles = [];
    const viewportArea = window.innerWidth * window.innerHeight;
    const baseCount = Math.floor(viewportArea / 900);
    this.particleCount = (reducedMotionMode ? 900 : Math.max(1400, Math.min(2800, baseCount))) + 500;
    this.connectionDistance = 50;
    this.connectionStride = 8;
    this.animationId = null;
    this.currentSection = 'home';
    this.formProgress = 0;
    this.targetFormProgress = 0;
    this.formStrength = 0.03;
    this.freeScatterOverscan = 0.18;
    this.freeDispersionBurst = 3.2;
    this.shapeSettings = {
      sAmplitude: 0.46,
      sStrokeScale: 0.18,
      sCapScale: 0.5,
      aStrokeScale: 0.2,
      eThicknessScale: 0.28,
      eSpineRatio: 1.1,
    };
    this.cardPoints = [];
    this.skillsPoints = [];
    this.experiencePoints = [];
    this.overviewPoints = [];
    this.aboutPoints = [];
    this.contactPoints = [];
    this.contactPivot = { x: 0, y: 0 };
    this.cursorX = -1e5;
    this.cursorY = -1e5;
    this.repelRadius = 210;
    this.repelStrength = 4.3;
    this.isScrolling = false;
    this.scrollFrameToggle = false;
    this.scrollTimer = null;
    this.isTabHidden = document.hidden;
    this.resize = this.resize.bind(this);
    this.animate = this.animate.bind(this);

    if (!this.canvas || !this.ctx) return;

    this.resize();
    window.addEventListener('resize', this.resize);
    document.addEventListener('pointermove', (e) => {
      this.cursorX = e.clientX;
      this.cursorY = e.clientY;
    }, { passive: true });
    document.addEventListener('mouseleave', () => {
      this.cursorX = -1e5;
      this.cursorY = -1e5;
    });
    window.addEventListener(
      'scroll',
      () => {
        this.isScrolling = true;
        clearTimeout(this.scrollTimer);
        this.scrollTimer = setTimeout(() => {
          this.isScrolling = false;
        }, 140);
      },
      { passive: true }
    );
    document.addEventListener('visibilitychange', () => {
      this.isTabHidden = document.hidden;
    });
    this.initParticles();
    this.animate();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = this.canvas.offsetWidth;
    this.h = this.canvas.offsetHeight;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.cardPoints = this.getCardShapePoints();
    this.skillsPoints = this.getSkillsShapePoints();
    this.experiencePoints = this.getExperienceShapePoints();
    this.overviewPoints = this.getOverviewShapePoints();
    this.aboutPoints = this.getAboutShapePoints();
    this.contactPoints = this.getContactShapePoints();
    if (this.particles.length) {
      this.particles.forEach((p, i) => {
        p.x = Math.max(0, Math.min(this.w, p.x));
        p.y = Math.max(0, Math.min(this.h, p.y));
        if (this.currentSection === 'contact' && this.contactPoints.length) {
          const pt = this.contactPoints[i % this.contactPoints.length];
          p.tx = pt.x;
          p.ty = pt.y;
          p.baseTx = pt.x;
          p.baseTy = pt.y;
        }
        if (this.currentSection === 'overview' && this.overviewPoints.length) {
          const pt = this.overviewPoints[i % this.overviewPoints.length];
          p.tx = pt.x;
          p.ty = pt.y;
        }
        if (this.currentSection === 'about' && this.aboutPoints.length) {
          const pt = this.aboutPoints[i % this.aboutPoints.length];
          p.tx = pt.x;
          p.ty = pt.y;
        }
        if (this.currentSection === 'skills' && this.skillsPoints.length) {
          const pt = this.skillsPoints[i % this.skillsPoints.length];
          p.tx = pt.x;
          p.ty = pt.y;
        }
        if (this.currentSection === 'experience' && this.experiencePoints.length) {
          const pt = this.experiencePoints[i % this.experiencePoints.length];
          p.tx = pt.x;
          p.ty = pt.y;
        }
      });
    }
  }

  getCardShapePoints() {
    const pts = [];
    const cx = this.w / 2;
    const cy = this.h / 2;
    const cardW = Math.min(320, this.w * 0.75);
    const cardH = Math.min(200, this.h * 0.4);
    const step = 14;
    for (let x = -cardW / 2; x <= cardW / 2; x += step) {
      for (let y = -cardH / 2; y <= cardH / 2; y += step) {
        pts.push({ x: cx + x, y: cy + y });
      }
    }
    return pts;
  }

  getSkillsShapePoints() {
    const pts = [];
    const cx = this.w / 2;
    const cy = this.h / 2;
    const width = Math.min(260, this.w * 0.5);
    const height = Math.min(300, this.h * 0.55);
    const stroke = Math.max(24, height * this.shapeSettings.sStrokeScale);
    const step = 6;

    const amp = width * this.shapeSettings.sAmplitude;
    const halfHeight = height * 0.5;
    const capRadius = stroke * this.shapeSettings.sCapScale;

    for (let t = 0; t <= 1; t += 0.015) {
      const angle = Math.PI * 2 * t;
      const x = cx - amp * Math.sin(angle);
      const y = cy + (t - 0.5) * height;

      const dx = amp * Math.cos(angle) * Math.PI * 2;
      const dy = height;
      const len = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
      const nx = -dy / len;
      const ny = dx / len;

      for (let d = -stroke / 2; d <= stroke / 2; d += step) {
        const px = x + nx * d;
        const py = y + ny * d;
        if (py >= cy - halfHeight && py <= cy + halfHeight) {
          pts.push({ x: px, y: py });
        }
      }
    }

    const addCirclePoints = (centerX, centerY, radius) => {
      for (let r = radius * 0.5; r <= radius; r += step) {
        for (let a = 0; a <= Math.PI * 2; a += 0.2) {
          pts.push({ x: centerX + Math.cos(a) * r, y: centerY + Math.sin(a) * r });
        }
      }
    };

    addCirclePoints(cx, cy - halfHeight, capRadius);
    addCirclePoints(cx, cy + halfHeight, capRadius);

    return pts;
  }

  getExperienceShapePoints() {
    const pts = [];
    const cx = this.w / 2;
    const cy = this.h / 2;
    const boxH = Math.min(250, this.h * 0.42);
    const boxW = Math.min(240, this.w * 0.42);
    const thickness = Math.max(18, boxH * this.shapeSettings.eThicknessScale * 0.62);
    const step = 6;

    const left = cx - boxW / 2;
    const top = cy - boxH / 2;
    const bottom = top + boxH;

    const topY = top + thickness * 0.6;
    const midY = cy;
    const bottomY = bottom - thickness * 0.6;

    const topX2 = left + boxW;
    const midX2 = left + boxW * 0.6;
    const bottomX2 = left + boxW;

    const addRectPoints = (x1, y1, x2, y2) => {
      for (let py = y1; py <= y2; py += step) {
        for (let px = x1; px <= x2; px += step) {
          pts.push({ x: px, y: py });
        }
      }
    };

    addRectPoints(left, top, left + thickness, bottom);
    addRectPoints(left, topY - thickness / 2, topX2, topY + thickness / 2);
    addRectPoints(left, midY - thickness / 2, midX2, midY + thickness / 2);
    addRectPoints(left, bottomY - thickness / 2, bottomX2, bottomY + thickness / 2);

    return pts;
  }

  getOverviewShapePoints() {
    const pts = [];
    const cx = this.w / 2;
    const cy = this.h / 2;
    const height = Math.min(300, this.h * 0.55);
    const width = Math.min(240, this.w * 0.45);
    const stroke = Math.max(26, height * 0.2);
    const step = 6;

    const stemX = cx - width * 0.45;
    const stemY = cy - height * 0.48;
    const stemW = stroke;
    const stemH = height * 0.96;

    const bowlW = width * 0.62;
    const bowlH = height * 0.52;
    const bowlX = stemX + stemW - stroke * 0.15;
    const bowlY = stemY + stroke * 0.1;
    const radius = Math.min(bowlH, bowlW) * 0.5;

    const addRoundedRectPoints = (x, y, w, h, r) => {
      const rad = Math.max(0, Math.min(r, w / 2, h / 2));
      const innerX1 = x + rad;
      const innerY1 = y + rad;
      const innerX2 = x + w - rad;
      const innerY2 = y + h - rad;

      for (let py = y; py <= y + h; py += step) {
        for (let px = x; px <= x + w; px += step) {
          const inCore = px >= innerX1 && px <= innerX2 && py >= innerY1 && py <= innerY2;
          if (inCore) {
            pts.push({ x: px, y: py });
            continue;
          }

          const dx = px - Math.min(Math.max(px, innerX1), innerX2);
          const dy = py - Math.min(Math.max(py, innerY1), innerY2);
          if (dx * dx + dy * dy <= rad * rad) {
            pts.push({ x: px, y: py });
          }
        }
      }
    };

    addRoundedRectPoints(stemX, stemY, stemW, stemH, stemW * 0.3);
    addRoundedRectPoints(bowlX, bowlY, bowlW, bowlH, radius);

    return pts;
  }

  getAboutShapePoints() {
    const pts = [];
    const cx = this.w / 2;
    const cy = this.h / 2;
    const height = Math.min(300, this.h * 0.55);
    const width = Math.min(240, this.w * 0.45);
    const stroke = Math.max(24, height * this.shapeSettings.aStrokeScale);
    const step = 6;

    const topY = cy - height * 0.5;
    const bottomY = cy + height * 0.5;
    const leftX = cx - width * 0.5;
    const rightX = cx + width * 0.5;
    const crossbarY = cy + height * 0.05;

    for (let y = topY; y <= bottomY; y += step) {
      const t = (bottomY - y) / (bottomY - topY);
      const xLeft = leftX + (cx - leftX) * t;
      const xRight = rightX - (rightX - cx) * t;

      for (let o = -stroke * 0.5; o <= stroke * 0.5; o += step) {
        pts.push({ x: xLeft + o, y });
        pts.push({ x: xRight + o, y });
      }
    }

    const crossWidth = width * 0.55;
    for (let x = cx - crossWidth * 0.5; x <= cx + crossWidth * 0.5; x += step) {
      for (let y = crossbarY - stroke * 0.45; y <= crossbarY + stroke * 0.45; y += step) {
        pts.push({ x, y });
      }
    }

    return pts;
  }

  getContactShapePoints() {
    const pts = [];
    const cx = this.w / 2;
    const cy = this.h / 2;
    const height = Math.min(280, this.h * 0.5);
    const width = Math.min(220, this.w * 0.4);
    const step = 6;

    const palmW = width * 0.46;
    const palmH = height * 0.36;
    const palmX = cx - palmW * 0.5;
    const palmY = cy + height * 0.05;

    const fingerW = palmW * 0.22;
    const fingerH = height * 0.36;
    const gap = fingerW * 0.12;
    const fingersY = palmY - fingerH + step;

    const thumbW = palmW * 0.35;
    const thumbH = palmH * 0.5;
    const thumbX = palmX - thumbW * 0.35;
    const thumbY = palmY + palmH * 0.32;

    const addRoundedRectPoints = (x, y, w, h, r) => {
      const rad = Math.max(0, Math.min(r, w / 2, h / 2));
      const innerX1 = x + rad;
      const innerY1 = y + rad;
      const innerX2 = x + w - rad;
      const innerY2 = y + h - rad;

      for (let py = y; py <= y + h; py += step) {
        for (let px = x; px <= x + w; px += step) {
          const inCore = px >= innerX1 && px <= innerX2 && py >= innerY1 && py <= innerY2;
          if (inCore) {
            pts.push({ x: px, y: py });
            continue;
          }

          const dx = px - Math.min(Math.max(px, innerX1), innerX2);
          const dy = py - Math.min(Math.max(py, innerY1), innerY2);
          if (dx * dx + dy * dy <= rad * rad) {
            pts.push({ x: px, y: py });
          }
        }
      }
    };

    addRoundedRectPoints(palmX, palmY, palmW, palmH, palmW * 0.18);

    for (let i = 0; i < 4; i++) {
      const fx = palmX + i * (fingerW + gap);
      addRoundedRectPoints(fx, fingersY, fingerW, fingerH, fingerW * 0.45);
    }

    addRoundedRectPoints(thumbX, thumbY, thumbW, thumbH, thumbW * 0.5);

    this.contactPivot = {
      x: cx,
      y: palmY + palmH * 0.95,
    };

    return pts;
  }

  setShapeSettings(nextSettings) {
    if (!nextSettings) return;
    this.shapeSettings = { ...this.shapeSettings, ...nextSettings };
    this.skillsPoints = this.getSkillsShapePoints();
    this.experiencePoints = this.getExperienceShapePoints();
    this.overviewPoints = this.getOverviewShapePoints();
    this.aboutPoints = this.getAboutShapePoints();
    this.contactPoints = this.getContactShapePoints();

    if (this.currentSection === 'overview' && this.overviewPoints.length) {
      this.targetFormProgress = 1;
      this.particles.forEach((p, i) => {
        const pt = this.overviewPoints[i % this.overviewPoints.length];
        p.tx = pt.x;
        p.ty = pt.y;
      });
    }

    if (this.currentSection === 'about' && this.aboutPoints.length) {
      this.targetFormProgress = 1;
      this.particles.forEach((p, i) => {
        const pt = this.aboutPoints[i % this.aboutPoints.length];
        p.tx = pt.x;
        p.ty = pt.y;
      });
    }

    if (this.currentSection === 'contact' && this.contactPoints.length) {
      this.targetFormProgress = 1;
      this.particles.forEach((p, i) => {
        const pt = this.contactPoints[i % this.contactPoints.length];
        p.tx = pt.x;
        p.ty = pt.y;
        p.baseTx = pt.x;
        p.baseTy = pt.y;
      });
    }

    if (this.currentSection === 'skills' && this.skillsPoints.length) {
      this.targetFormProgress = 1;
      this.particles.forEach((p, i) => {
        const pt = this.skillsPoints[i % this.skillsPoints.length];
        p.tx = pt.x;
        p.ty = pt.y;
      });
    }

    if (this.currentSection === 'experience' && this.experiencePoints.length) {
      this.targetFormProgress = 1;
      this.particles.forEach((p, i) => {
        const pt = this.experiencePoints[i % this.experiencePoints.length];
        p.tx = pt.x;
        p.ty = pt.y;
      });
    }
  }

  setSection(section) {
    this.currentSection = section;
    if (section === 'overview' && this.overviewPoints.length) {
      this.targetFormProgress = 1;
      this.formStrength = 0.06;
      this.particles.forEach((p, i) => {
        const pt = this.overviewPoints[i % this.overviewPoints.length];
        p.tx = pt.x;
        p.ty = pt.y;
      });
    } else if (section === 'about' && this.aboutPoints.length) {
      this.targetFormProgress = 1;
      this.formStrength = 0.055;
      this.particles.forEach((p, i) => {
        const pt = this.aboutPoints[i % this.aboutPoints.length];
        p.tx = pt.x;
        p.ty = pt.y;
      });
    } else if (section === 'contact' && this.contactPoints.length) {
      this.targetFormProgress = 1;
      this.formStrength = 0.06;
      this.particles.forEach((p, i) => {
        const pt = this.contactPoints[i % this.contactPoints.length];
        p.tx = pt.x;
        p.ty = pt.y;
        p.baseTx = pt.x;
        p.baseTy = pt.y;
      });
    } else if (section === 'skills' && this.skillsPoints.length) {
      this.targetFormProgress = 1;
      this.formStrength = 0.055;
      this.particles.forEach((p, i) => {
        const pt = this.skillsPoints[i % this.skillsPoints.length];
        p.tx = pt.x;
        p.ty = pt.y;
      });
    } else if (section === 'experience' && this.experiencePoints.length) {
      this.targetFormProgress = 1;
      this.formStrength = 0.065;
      this.particles.forEach((p, i) => {
        const pt = this.experiencePoints[i % this.experiencePoints.length];
        p.tx = pt.x;
        p.ty = pt.y;
      });
    } else {
      this.targetFormProgress = 0;
      this.formStrength = 0.02;
      const centerX = this.w * 0.5;
      const centerY = this.h * 0.5;
      const xMin = -this.w * this.freeScatterOverscan;
      const xMax = this.w * (1 + this.freeScatterOverscan);
      const yMin = -this.h * this.freeScatterOverscan;
      const yMax = this.h * (1 + this.freeScatterOverscan);
      this.particles.forEach((p) => {
        p.tx = xMin + Math.random() * (xMax - xMin);
        p.ty = yMin + Math.random() * (yMax - yMin);

        const dx = p.x - centerX;
        const dy = p.y - centerY;
        const dist = Math.max(8, Math.sqrt(dx * dx + dy * dy));
        const outwardX = dx / dist;
        const outwardY = dy / dist;
        p.vx = outwardX * this.freeDispersionBurst + (Math.random() - 0.5) * 1.6;
        p.vy = outwardY * this.freeDispersionBurst + (Math.random() - 0.5) * 1.6;
      });
    }
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        tx: Math.random() * this.w,
        ty: Math.random() * this.h,
        radius: Math.random() * 1 + 0.6,
        opacity: 0.4 + Math.random() * 0.5,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 1.8 + Math.random() * 2.4,
        twinkleDepth: 0.6 + Math.random() * 0.3,
        delay: Math.random() * 0.3,
      });
    }
  }

  animate(time) {
    if (!this.ctx || !this.w || !this.h) return;

    if (this.isTabHidden) {
      this.animationId = requestAnimationFrame(this.animate);
      return;
    }

    if (this.isScrolling) {
      this.scrollFrameToggle = !this.scrollFrameToggle;
      if (!this.scrollFrameToggle) {
        this.animationId = requestAnimationFrame(this.animate);
        return;
      }
    }

    this.ctx.clearRect(0, 0, this.w, this.h);

    const formLerp = this.targetFormProgress < this.formProgress ? 0.08 : 0.028;
    this.formProgress += (this.targetFormProgress - this.formProgress) * formLerp;

    const cx = this.cursorX;
    const cy = this.cursorY;
    const repelRadiusSq = this.repelRadius * this.repelRadius;

    const waveAngle = this.currentSection === 'contact'
      ? Math.sin((time || 0) * 0.002) * 0.18
      : 0;
    const waveCos = Math.cos(waveAngle);
    const waveSin = Math.sin(waveAngle);

    this.particles.forEach((p) => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const distSq = dx * dx + dy * dy;
      if (distSq < repelRadiusSq && distSq > 4) {
        const distToCursor = Math.sqrt(distSq);
        const force = (1 - distToCursor / this.repelRadius) * this.repelStrength;
        const nx = dx / distToCursor;
        const ny = dy / distToCursor;
        p.x += nx * force;
        p.y += ny * force;
      }
      let targetX = p.tx;
      let targetY = p.ty;
      if (this.currentSection === 'contact' && this.formProgress > 0.01 && p.baseTx !== undefined) {
        const baseX = p.baseTx;
        const baseY = p.baseTy;
        const pivotX = this.contactPivot.x;
        const pivotY = this.contactPivot.y;
        const relX = baseX - pivotX;
        const relY = baseY - pivotY;
        targetX = pivotX + relX * waveCos - relY * waveSin;
        targetY = pivotY + relX * waveSin + relY * waveCos;
      }

      const pull = this.formProgress * (0.5 + p.delay) * this.formStrength;
      p.x += (targetX - p.x) * pull + (1 - this.formProgress) * p.vx;
      p.y += (targetY - p.y) * pull + (1 - this.formProgress) * p.vy;
      if (this.formProgress < 0.01) {
        const minX = -this.w * this.freeScatterOverscan;
        const maxX = this.w * (1 + this.freeScatterOverscan);
        const minY = -this.h * this.freeScatterOverscan;
        const maxY = this.h * (1 + this.freeScatterOverscan);
        if (p.x < minX || p.x > maxX) p.vx *= -1;
        if (p.y < minY || p.y > maxY) p.vy *= -1;
        p.x = Math.max(minX, Math.min(maxX, p.x));
        p.y = Math.max(minY, Math.min(maxY, p.y));
      }
    });

    const maxLines = this.isScrolling ? 0 : 20;
    let linesDrawn = 0;
    const connDistSq = this.connectionDistance * this.connectionDistance;
    for (let i = 0; i < this.particles.length && linesDrawn < maxLines; i++) {
      for (let j = i + 1; j < this.particles.length && linesDrawn < maxLines; j += this.connectionStride) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        if (dx * dx + dy * dy < connDistSq) {
          const distRatio = (dx * dx + dy * dy) / connDistSq;
          const alpha = (1 - distRatio) * 0.1 * (0.5 + this.formProgress * 0.5);
          this.ctx.strokeStyle = `rgba(94, 234, 212, ${alpha})`;
          this.ctx.lineWidth = 0.6;
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.stroke();
          linesDrawn++;
        }
      }
    }

    const glowBoost = this.currentSection === 'contact' ? 0.25 * this.formProgress : 0;
    const twinkleTime = (time || 0) * 0.001;
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = 'rgba(226, 232, 240, 0.45)';
    this.particles.forEach((p) => {
      this.ctx.beginPath();
      const baseRadius = this.currentSection === 'contact'
        ? p.radius * (1 + 0.35 * this.formProgress)
        : p.radius;
      const wave = 0.5 + 0.5 * Math.sin(twinkleTime * p.twinkleSpeed + p.twinklePhase);
      const sparkle = 0.5 + 0.5 * Math.sin(twinkleTime * (p.twinkleSpeed * 2.2) + p.twinklePhase * 1.7);
      const twinkle = (1 - p.twinkleDepth) + p.twinkleDepth * (wave * 0.78 + sparkle * 0.22);
      const opacity = Math.max(0.12, Math.min(1, (p.opacity + glowBoost) * twinkle));
      const radius = baseRadius * (0.82 + wave * 0.38);
      this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(226, 232, 240, ${opacity})`;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, Math.max(0.5, radius * 0.45), 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, opacity + 0.2)})`;
      this.ctx.fill();
    });
    this.ctx.shadowBlur = 0;

    this.animationId = requestAnimationFrame(this.animate);
  }
}

function initScrollPerformanceMode() {
  let scrollTimer = null;
  const activate = () => {
    if (!document.body) return;
    document.body.classList.add('is-scrolling');
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      document.body.classList.remove('is-scrolling');
    }, 140);
  };

  window.addEventListener('scroll', activate, { passive: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollPerformanceMode);
} else {
  initScrollPerformanceMode();
}

// ===== END CURSOR REPEL EFFECT =====

function initParticleShapeControls() {
  const controls = [
    { id: 'shape-s-amplitude', key: 'sAmplitude', def: 0.46 },
    { id: 'shape-s-stroke', key: 'sStrokeScale', def: 0.18 },
    { id: 'shape-s-cap', key: 'sCapScale', def: 0.5 },
    { id: 'shape-e-thickness', key: 'eThicknessScale', def: 0.28 },
    { id: 'shape-e-spine', key: 'eSpineRatio', def: 1.1 },
    { id: 'shape-a-stroke', key: 'aStrokeScale', def: 0.2 },
  ];

  const stored = {};
  controls.forEach((control) => {
    const value = localStorage.getItem(control.id);
    if (value !== null && !Number.isNaN(Number(value))) {
      stored[control.key] = Number(value);
    }
  });

  if (particleBackgroundInstance && particleBackgroundInstance.setShapeSettings) {
    particleBackgroundInstance.setShapeSettings(stored);
  }

  controls.forEach((control) => {
    const input = document.getElementById(control.id);
    const output = document.getElementById(`${control.id}-value`);
    if (!input) return;

    const savedValue = localStorage.getItem(control.id);
    const initialValue = savedValue !== null && !Number.isNaN(Number(savedValue))
      ? Number(savedValue)
      : control.def;
    input.value = String(initialValue);
    if (output) output.textContent = Number(initialValue).toFixed(2);

    input.addEventListener('input', () => {
      const val = Number(input.value);
      localStorage.setItem(control.id, String(val));
      if (output) output.textContent = val.toFixed(2);
      if (particleBackgroundInstance && particleBackgroundInstance.setShapeSettings) {
        particleBackgroundInstance.setShapeSettings({ [control.key]: val });
      }
    });
  });

  const resetBtn = document.getElementById('shape-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      controls.forEach((control) => {
        localStorage.removeItem(control.id);
        const input = document.getElementById(control.id);
        const output = document.getElementById(`${control.id}-value`);
        if (input) input.value = String(control.def);
        if (output) output.textContent = Number(control.def).toFixed(2);
      });
      if (particleBackgroundInstance && particleBackgroundInstance.setShapeSettings) {
        const defaults = controls.reduce((acc, control) => {
          acc[control.key] = control.def;
          return acc;
        }, {});
        particleBackgroundInstance.setShapeSettings(defaults);
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initParticleShapeControls);
} else {
  initParticleShapeControls();
}