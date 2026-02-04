// Global reference for particle background (section-driven shape formation)
let particleBackgroundInstance = null;

// ===== SOUND MANAGER WITH AUDIO VISUALIZER =====
class SoundManager {
  constructor() {
    this.isMuted = false;
    this.isPlaying = false;
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

  updateUI() {
    if (this.toggle) {
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
    this.soundManager.playSound('click');
  }

  close() {
    this.menuOverlay.classList.remove('open');
    this.menuToggle.classList.remove('active');
  }

  handleMenuItemClick(e) {
    const section = e.target.getAttribute('data-section');
    this.close();
    this.soundManager.playSound('click');
    
    // Handle section switching
    if (section === 'home') {
      showHome();
    } else if (section === 'overview') {
      showOverview();
    } else if (section === 'skills') {
      showSkills();
    }
  }
}

// Initialize sound and menu
let soundManager;
let menuManager;
let fluidCursorManager;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    soundManager = new SoundManager();
    menuManager = new MenuManager(soundManager);
    fluidCursorManager = new FluidCursorManager();
  });
} else {
  soundManager = new SoundManager();
  menuManager = new MenuManager(soundManager);
  fluidCursorManager = new FluidCursorManager();
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
    this.charVelocities = {};
    this.attractRadius = 150;      // How far cursor attracts
    this.repelRadius = 80;         // How far before hard repel
    this.nameRepelRadius = 100;
    this.friction = 0.15;          // Higher = more gooey/sticky
    this.init();
  }

  init() {
    // Track all text and interactive elements for magnetic effect
    this.magneticElements = document.querySelectorAll(
      'h1, h2, h3, p, .role-text, .hello-text, .sub-text, .project-link, .cv-button, .contact-link'
    );

    // Convert name text to individual characters
    this.setupNameCharacters();

    document.addEventListener('mousemove', (e) => {
      this.prevMouseX = this.mouseX;
      this.prevMouseY = this.mouseY;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.updateMagneticElements();
      this.updateNameCharacters();
      this.createWaveRipple(e.clientX, e.clientY);
    });

    document.addEventListener('mouseleave', () => {
      this.resetElements();
      this.resetNameCharacters();
    });
  }

  setupNameCharacters() {
    const nameEl = document.getElementById('name-text');
    if (!nameEl) return;

    const text = nameEl.textContent;
    nameEl.innerHTML = '';

    // Wrap each character (including spaces)
    text.split('').forEach((char, index) => {
      const span = document.createElement('span');
      span.className = 'name-char';
      span.textContent = char;
      span.style.marginRight = char === ' ' ? '0.3em' : '0';
      span.dataset.index = index;
      nameEl.appendChild(span);
      
      // Initialize velocity for each character
      this.charVelocities[index] = { x: 0, y: 0 };
    });

    this.nameChars = document.querySelectorAll('.name-char');
  }

  updateNameCharacters() {
    this.nameChars.forEach((char, index) => {
      const rect = char.getBoundingClientRect();
      const charCenterX = rect.left + rect.width / 2;
      const charCenterY = rect.top + rect.height / 2;

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
      this.charVelocities[index].x += (targetX - this.charVelocities[index].x) * this.friction;
      this.charVelocities[index].y += (targetY - this.charVelocities[index].y) * this.friction;

      char.style.transform = `translate(${this.charVelocities[index].x}px, ${this.charVelocities[index].y}px) rotate(${rotation}deg)`;
    });
  }

  resetNameCharacters() {
    this.nameChars.forEach((char, index) => {
      // Slow decay to original position (gooey snap back)
      this.charVelocities[index].x *= 0.92;
      this.charVelocities[index].y *= 0.92;

      if (Math.abs(this.charVelocities[index].x) < 0.1 && Math.abs(this.charVelocities[index].y) < 0.1) {
        char.style.transform = 'translate(0, 0) rotate(0deg)';
        this.charVelocities[index] = { x: 0, y: 0 };
      } else {
        char.style.transform = `translate(${this.charVelocities[index].x}px, ${this.charVelocities[index].y}px)`;
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
    this.mouseX = 0;
    this.mouseY = 0;
    this.trailX = 0;
    this.trailY = 0;
    this.isActive = false;
    this.init();
  }

  init() {
    // Create cursor element
    this.cursor = document.createElement('div');
    this.cursor.classList.add('cursor');
    document.body.appendChild(this.cursor);

    // Track mouse movement
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    
    // Detect interactive elements
    this.attachInteractiveListeners();
    
    // Animate cursor
    this.animate();
  }

  onMouseMove(e) {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
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

  createTrail() {
    const trail = document.createElement('div');
    trail.classList.add('cursor-trail');
    trail.style.left = this.trailX + 'px';
    trail.style.top = this.trailY + 'px';
    document.body.appendChild(trail);

    // Fade out and remove trail
    setTimeout(() => {
      trail.style.opacity = '0';
      trail.style.transition = 'opacity 0.6s ease';
      setTimeout(() => trail.remove(), 600);
    }, 0);
  }

  animate() {
    // Smoothly follow cursor with enhanced easing for fluid effect
    this.trailX += (this.mouseX - this.trailX) * 0.25;
    this.trailY += (this.mouseY - this.trailY) * 0.25;

    this.cursor.style.left = this.trailX + 'px';
    this.cursor.style.top = this.trailY + 'px';

    // Create more frequent trail particles for denser effect
    if (Math.random() > 0.6) {
      this.createTrail();
    }

    requestAnimationFrame(() => this.animate());
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


// ===== END CUSTOM CURSOR =====

// ===== 3D PARALLAX PORTRAIT EFFECT =====
class Portrait3DManager {
  constructor() {
    this.profilePhotoWrapper = document.querySelector('.profile-photo-wrapper');
    this.mouseX = window.innerWidth / 2;
    this.mouseY = window.innerHeight / 2;
    this.maxRotation = 25;
    this.maxTilt = 20;
    this.depthZ = 0;
    this.targetRotX = 0;
    this.targetRotY = 0;
    this.currentRotX = 0;
    this.currentRotY = 0;
    this.isHovering = false;
    this.init();
  }

  init() {
    if (!this.profilePhotoWrapper) return;

    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.updatePortrait();
    });

    document.addEventListener('mouseleave', () => {
      this.resetPortrait();
      this.isHovering = false;
    });

    this.profilePhotoWrapper.addEventListener('mouseenter', () => {
      this.profilePhotoWrapper.classList.add('active');
      this.isHovering = true;
    });

    this.profilePhotoWrapper.addEventListener('mouseleave', () => {
      this.profilePhotoWrapper.classList.remove('active');
      this.isHovering = false;
    });

    this.animatePortrait();
  }

  updatePortrait() {
    if (!this.profilePhotoWrapper) return;

    const rect = this.profilePhotoWrapper.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const distX = this.mouseX - centerX;
    const distY = this.mouseY - centerY;
    const distance = Math.sqrt(distX * distX + distY * distY);

    this.targetRotY = (distX / window.innerWidth) * this.maxRotation;
    this.targetRotX = -(distY / window.innerHeight) * this.maxRotation;

    const maxDist = Math.max(window.innerWidth, window.innerHeight) / 2;
    const proximityRatio = Math.max(0, 1 - (distance / maxDist));
    this.depthZ = proximityRatio * 50;
  }

  animatePortrait() {
    this.currentRotX += (this.targetRotX - this.currentRotX) * 0.12;
    this.currentRotY += (this.targetRotY - this.currentRotY) * 0.12;

    if (!this.profilePhotoWrapper) return;

    const scale = this.isHovering ? 1.12 : 1;
    
    this.profilePhotoWrapper.style.transform = `
      perspective(1500px)
      rotateX(${this.currentRotX}deg)
      rotateY(${this.currentRotY}deg)
      scale(${scale})
      translateZ(${this.depthZ}px)
    `;

    requestAnimationFrame(() => this.animatePortrait());
  }

  resetPortrait() {
    if (!this.profilePhotoWrapper) return;
    
    this.targetRotX = 0;
    this.targetRotY = 0;
    this.depthZ = 0;
  }
}

// Initialize 3D portrait when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new Portrait3DManager();
  });
} else {
  new Portrait3DManager();
}

// ===== END 3D PARALLAX PORTRAIT =====

const swiper = new Swiper('.swiper', {
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

// Scroll-based sections: Home, Overview, Skills (all visible, scroll to move between)
let homeScreen, overviewScreen, skillsScreen, navHome, navOverview, navSkills;

function getSectionEls() {
  homeScreen = document.getElementById('home-screen');
  overviewScreen = document.getElementById('overview-screen');
  skillsScreen = document.getElementById('skills-screen');
  navHome = document.querySelector('.nav-home');
  navOverview = document.querySelector('.nav-overview');
  navSkills = document.querySelector('.nav-skills');
}

function setActiveNav(section) {
  if (!navHome || !navOverview || !navSkills) return;
  navHome.classList.toggle('active', section === 'home');
  navOverview.classList.toggle('active', section === 'overview');
  navSkills.classList.toggle('active', section === 'skills');
  if (particleBackgroundInstance) particleBackgroundInstance.setSection(section);
}

function scrollToSection(section) {
  const el = section === 'home' ? homeScreen : section === 'overview' ? overviewScreen : skillsScreen;
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

function showHome() {
  scrollToSection('home');
}

function showOverview() {
  scrollToSection('overview');
}

function showSkills() {
  scrollToSection('skills');
}

// Intersection Observer: update nav + particles when user scrolls (pick section with max visibility)
let sectionRatios = { home: 0, overview: 0, skills: 0 };

function initSectionObserver() {
  getSectionEls();
  const sections = [
    { id: 'home-screen', section: 'home' },
    { id: 'overview-screen', section: 'overview' },
    { id: 'skills-screen', section: 'skills' },
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
      const best = Object.entries(sectionRatios).reduce((a, b) => (a[1] >= b[1] ? a : b), ['home', 0]);
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
  if (navHome) navHome.addEventListener('click', showHome);
  if (navOverview) navOverview.addEventListener('click', showOverview);
  if (navSkills) navSkills.addEventListener('click', showSkills);

  const portfolioTreeEl = document.getElementById('portfolio-tree');
  if (portfolioTreeEl) portfolioTreeEl.addEventListener('click', () => showOverview());

  setTimeout(hideOverviewHint, 8000);
  initSectionObserver();
  setActiveNav('home');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollSectionListeners);
} else {
  initScrollSectionListeners();
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
    caseStudyLink: '#',
  },
};

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
  return document.querySelectorAll('.swiper-wrapper .swiper-slide').length;
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
    new CursorRepelEffect();
    particleBackgroundInstance = new ParticleBackground();
    if (particleBackgroundInstance) particleBackgroundInstance.setSection('home');
  });
} else {
  new CursorRepelEffect();
  particleBackgroundInstance = new ParticleBackground();
  if (particleBackgroundInstance) particleBackgroundInstance.setSection('home');
}

// ===== PARTICLE BACKGROUND – sand/fluid particles that form shapes by section =====
class ParticleBackground {
  constructor() {
    this.canvas = document.getElementById('particle-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.particles = [];
    this.particleCount = 100;
    this.connectionDistance = 90;
    this.animationId = null;
    this.currentSection = 'home';
    this.formProgress = 0;
    this.targetFormProgress = 0;
    this.cardPoints = [];
    this.skillsPoints = [];
    this.cursorX = -1e5;
    this.cursorY = -1e5;
    this.repelRadius = 140;
    this.repelStrength = 2.2;
    this.resize = this.resize.bind(this);
    this.animate = this.animate.bind(this);

    if (!this.canvas || !this.ctx) return;

    this.resize();
    window.addEventListener('resize', this.resize);
    document.addEventListener('mousemove', (e) => {
      this.cursorX = e.clientX;
      this.cursorY = e.clientY;
    });
    document.addEventListener('mouseleave', () => {
      this.cursorX = -1e5;
      this.cursorY = -1e5;
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
    if (this.particles.length) {
      this.particles.forEach((p, i) => {
        p.x = Math.max(0, Math.min(this.w, p.x));
        p.y = Math.max(0, Math.min(this.h, p.y));
        if (this.currentSection === 'overview' && this.cardPoints.length) {
          const pt = this.cardPoints[i % this.cardPoints.length];
          p.tx = pt.x;
          p.ty = pt.y;
        }
        if (this.currentSection === 'skills' && this.skillsPoints.length) {
          const pt = this.skillsPoints[i % this.skillsPoints.length];
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
    const barW = 28;
    const heights = [90, 130, 70];
    const gap = 36;
    for (let b = 0; b < 3; b++) {
      const bx = cx + (b - 1) * (barW + gap);
      const step = 10;
      for (let y = 0; y < heights[b]; y += step) {
        for (let x = -barW / 2; x <= barW / 2; x += step) {
          pts.push({ x: bx + x, y: cy + 60 - y });
        }
      }
    }
    return pts;
  }

  setSection(section) {
    this.currentSection = section;
    if (section === 'home') {
      this.targetFormProgress = 0;
      this.particles.forEach((p) => {
        p.tx = Math.random() * this.w;
        p.ty = Math.random() * this.h;
      });
    } else if (section === 'overview' && this.cardPoints.length) {
      this.targetFormProgress = 1;
      this.particles.forEach((p, i) => {
        const pt = this.cardPoints[i % this.cardPoints.length];
        p.tx = pt.x;
        p.ty = pt.y;
      });
    } else if (section === 'skills' && this.skillsPoints.length) {
      this.targetFormProgress = 1;
      this.particles.forEach((p, i) => {
        const pt = this.skillsPoints[i % this.skillsPoints.length];
        p.tx = pt.x;
        p.ty = pt.y;
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
        opacity: 0.2 + Math.random() * 0.4,
        delay: Math.random() * 0.3,
      });
    }
  }

  animate() {
    if (!this.ctx || !this.w || !this.h) return;

    this.ctx.clearRect(0, 0, this.w, this.h);

    const formLerp = 0.028;
    this.formProgress += (this.targetFormProgress - this.formProgress) * formLerp;

    const cx = this.cursorX;
    const cy = this.cursorY;

    this.particles.forEach((p) => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const distToCursor = Math.sqrt(dx * dx + dy * dy);
      if (distToCursor < this.repelRadius && distToCursor > 2) {
        const force = (1 - distToCursor / this.repelRadius) * this.repelStrength;
        const nx = dx / distToCursor;
        const ny = dy / distToCursor;
        p.x += nx * force;
        p.y += ny * force;
      }
      const pull = this.formProgress * (0.5 + p.delay) * 0.04;
      p.x += (p.tx - p.x) * pull + (1 - this.formProgress) * p.vx;
      p.y += (p.ty - p.y) * pull + (1 - this.formProgress) * p.vy;
      if (this.formProgress < 0.01) {
        if (p.x < 0 || p.x > this.w) p.vx *= -1;
        if (p.y < 0 || p.y > this.h) p.vy *= -1;
        p.x = Math.max(0, Math.min(this.w, p.x));
        p.y = Math.max(0, Math.min(this.h, p.y));
      }
    });

    const maxLines = 80;
    let linesDrawn = 0;
    const connDistSq = this.connectionDistance * this.connectionDistance;
    for (let i = 0; i < this.particles.length && linesDrawn < maxLines; i++) {
      for (let j = i + 1; j < this.particles.length && linesDrawn < maxLines; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        if (dx * dx + dy * dy < connDistSq) {
          const d = Math.sqrt(dx * dx + dy * dy);
          const alpha = (1 - d / this.connectionDistance) * 0.1 * (0.5 + this.formProgress * 0.5);
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

    this.particles.forEach((p) => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(94, 234, 212, ${p.opacity})`;
      this.ctx.fill();
    });

    this.animationId = requestAnimationFrame(this.animate);
  }
}

// ===== END CURSOR REPEL EFFECT =====
