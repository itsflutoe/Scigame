// Chicken Life Cycle Mission

const state = {
  step: 0,                  // 0 = home, 1 = intro, 2..6 stages, 7 complete
  totalStages: 5,
  recognition: null,
  isListening: false,
  currentScreen: 'home-screen'
};

// Screens
const screens = {
  'home-screen': document.getElementById('home-screen'),
  'intro-screen': document.getElementById('intro-screen'),
  'stage1-screen': document.getElementById('stage1-screen'),
  'stage2-screen': document.getElementById('stage2-screen'),
  'stage3-screen': document.getElementById('stage3-screen'),
  'stage4-screen': document.getElementById('stage4-screen'),
  'stage5-screen': document.getElementById('stage5-screen'),
  'complete-screen': document.getElementById('complete-screen')
};

// Progress
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

// Buttons
const btnStart    = document.getElementById('start-btn');
const btnRestart  = document.getElementById('restart-btn');
const btnIntroMic = document.getElementById('intro-mic-btn');
const btnStage1   = document.getElementById('stage1-mic-btn');
const btnStage2   = document.getElementById('stage2-mic-btn');
const btnStage3   = document.getElementById('stage3-mic-btn');
const btnStage4   = document.getElementById('stage4-mic-btn');
const btnStage5   = document.getElementById('stage5-mic-btn');

// Feedback
const fbIntro  = document.getElementById('intro-feedback');
const fb1      = document.getElementById('stage1-feedback');
const fb2      = document.getElementById('stage2-feedback');
const fb3      = document.getElementById('stage3-feedback');
const fb4      = document.getElementById('stage4-feedback');
const fb5      = document.getElementById('stage5-feedback');

function showScreen(id) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[id].classList.add('active');
  state.currentScreen = id;
  const fb = getCurrentFeedback();
  if (fb) {
    fb.textContent = '';
    fb.className = 'feedback';
  }
}

function getCurrentFeedback() {
  switch (state.currentScreen) {
    case 'intro-screen': return fbIntro;
    case 'stage1-screen': return fb1;
    case 'stage2-screen': return fb2;
    case 'stage3-screen': return fb3;
    case 'stage4-screen': return fb4;
    case 'stage5-screen': return fb5;
    default: return null;
  }
}

function updateProgress() {
  const completedStages = Math.max(0, Math.min(state.step - 1, state.totalStages));
  const percent = (completedStages / state.totalStages) * 100;
  progressFill.style.width = `${percent}%`;
  progressText.textContent = `${completedStages}/${state.totalStages}`;
}

function nextStep() {
  state.step++;
  updateProgress();

  switch (state.step) {
    case 1: showScreen('intro-screen'); break;
    case 2: showScreen('stage1-screen'); break;
    case 3: showScreen('stage2-screen'); revealStage('stage2-screen','embryo'); break;
    case 4: showScreen('stage3-screen'); revealStage('stage3-screen','hatching'); break;
    case 5: showScreen('stage4-screen'); revealStage('stage4-screen','chick'); break;
    case 6: showScreen('stage5-screen'); revealStage('stage5-screen','chicken'); break;
    case 7: completeMission(); break;
  }
}

function revealStage(screenId, stageName) {
  const item = document.querySelector(`#${screenId} .stage-item[data-stage="${stageName}"]`);
  if (item) {
    item.classList.remove('hidden');
    item.classList.add('visible');
  }
}

function animateStage() {
  const selector = `#${state.currentScreen} .stage-item.visible:last-of-type`;
  const item = document.querySelector(selector);
  if (item) {
    item.classList.add('animate');
    setTimeout(() => item.classList.remove('animate'), 800);
  }
}

// Web Speech
function setupRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('SpeechRecognition not supported. Use Chrome or Edge.');
    return null;
  }
  const rec = new SpeechRecognition();
  rec.lang = 'en-US';
  rec.continuous = false;
  rec.interimResults = false;

  rec.onstart = () => { state.isListening = true; };
  rec.onend = () => {
    state.isListening = false;
    document.querySelectorAll('.mic-btn').forEach(b => b.classList.remove('listening'));
  };
  rec.onerror = () => {
    const fb = getCurrentFeedback();
    if (fb) {
      fb.textContent = "I didn't hear that.";
      fb.className = 'feedback error';
    }
  };
  rec.onresult = (event) => {
    const text = event.results[0][0].transcript.toLowerCase().trim();
    handleVoice(text);
  };
  return rec;
}

function startListening() {
  if (!state.recognition || state.isListening) return;
  const btn = getCurrentMicButton();
  if (btn) btn.classList.add('listening');
  try {
    state.recognition.start();
  } catch (e) {
    state.isListening = false;
    if (btn) btn.classList.remove('listening');
  }
}

function getCurrentMicButton() {
  switch (state.currentScreen) {
    case 'intro-screen': return btnIntroMic;
    case 'stage1-screen': return btnStage1;
    case 'stage2-screen': return btnStage2;
    case 'stage3-screen': return btnStage3;
    case 'stage4-screen': return btnStage4;
    case 'stage5-screen': return btnStage5;
    default: return null;
  }
}

function handleVoice(text) {
  const fb = getCurrentFeedback();
  if (!fb) return;

  let ok = false;

  switch (state.currentScreen) {
    case 'intro-screen':
      ok = text === 'chicken' || text === 'a chicken';
      break;
    case 'stage1-screen':
      ok = text === 'eggs' || text === 'egg';
      break;
    case 'stage2-screen':
      ok = text === 'embryo';
      break;
    case 'stage3-screen':
      ok = text === 'hatching' || text === 'hatching stage';
      break;
    case 'stage4-screen':
      ok = text === 'chick' || text === 'chicks';
      break;
    case 'stage5-screen':
      ok = text === 'chicken' || text === 'adult chicken';
      break;
  }

  if (ok) {
    fb.textContent = '✅ Correct!';
    fb.className = 'feedback success';
    animateStage();
    setTimeout(nextStep, 1200);
  } else {
    fb.textContent = 'Try Again!';
    fb.className = 'feedback error';
    setTimeout(startListening, 1000);
  }
}

function completeMission() {
  showScreen('complete-screen');
  spawnConfetti();
}

function spawnConfetti() {
  const container = document.getElementById('confetti-container');
  const colors = ['#FFD700','#FF6B6B','#4ECDC4','#95E1D3','#FFE66D'];
  for (let i = 0; i < 80; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = `${Math.random()*100}%`;
    c.style.backgroundColor = colors[Math.floor(Math.random()*colors.length)];
    c.style.animationDuration = `${Math.random()*3+2}s`;
    c.style.animationDelay = `${Math.random()*1.5}s`;
    if (Math.random()>0.5) c.style.borderRadius = '50%';
    container.appendChild(c);
    setTimeout(()=>c.remove(),6000);
  }
}

function restart() {
  state.step = 0;
  progressFill.style.width = '0%';
  progressText.textContent = '0/5';
  document.getElementById('confetti-container').innerHTML = '';
  document.querySelectorAll('.stage-item').forEach(item => {
    if (item.dataset.stage === 'eggs') {
      item.classList.add('visible');
      item.classList.remove('hidden');
    } else {
      item.classList.remove('visible');
      item.classList.add('hidden');
    }
  });
  showScreen('home-screen');
}

function setupEvents() {
  btnStart.addEventListener('click', () => {
    state.recognition = setupRecognition();
    nextStep(); // go to intro
  });

  btnRestart.addEventListener('click', restart);

  btnIntroMic.addEventListener('click', startListening);
  btnStage1.addEventListener('click', startListening);
  btnStage2.addEventListener('click', startListening);
  btnStage3.addEventListener('click', startListening);
  btnStage4.addEventListener('click', startListening);
  btnStage5.addEventListener('click', startListening);

  document.addEventListener('keydown', e => {
    if (e.code === 'Space' &&
        state.currentScreen !== 'home-screen' &&
        state.currentScreen !== 'complete-screen') {
      e.preventDefault();
      startListening();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupEvents();
  updateProgress();
  console.log('Chicken mission ready');
});
