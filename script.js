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
    }
    // Skills section will be added in next feature
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

// Simple view switching between Home and Overview
const homeScreen = document.getElementById('home-screen');
const overviewScreen = document.getElementById('overview-screen');
const navHome = document.querySelector('.nav-home');
const navOverview = document.querySelector('.nav-overview');

function showHome() {
  if (homeScreen && overviewScreen) {
    homeScreen.style.display = 'flex';
    overviewScreen.style.display = 'none';
  }
  if (navHome && navOverview) {
    navHome.classList.add('active');
    navOverview.classList.remove('active');
  }
}

function showOverview() {
  if (homeScreen && overviewScreen) {
    homeScreen.style.display = 'none';
    overviewScreen.style.display = 'flex';
  }
  if (navHome && navOverview) {
    navOverview.classList.add('active');
    navHome.classList.remove('active');
  }
  swiper.update();
  
  // Hide the hint when user clicks overview
  hideOverviewHint();
}

// Hide overview hint function
function hideOverviewHint() {
  const hint = document.getElementById('overview-hint');
  if (hint) {
    hint.classList.add('hidden');
  }
}

if (navHome) {
  navHome.addEventListener('click', showHome);
}

if (navOverview) {
  navOverview.addEventListener('click', showOverview);
}

// Auto-hide hint after 8 seconds
setTimeout(() => {
  hideOverviewHint();
}, 8000);

// Start on Home (intro) by default
showHome();

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
