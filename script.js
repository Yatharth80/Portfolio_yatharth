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
