/* CHICKEN LIFE CYCLE MISSION */

/* -------- STATE -------- */
const AppState = {
    step: 0,               // 0 = home, 1 = intro, 2..6 = stages, 7 = complete
    totalStages: 5,        // for progress bar
    recognition: null,
    isListening: false,
    currentScreenId: 'home-screen'
};

/* -------- DOM -------- */
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

const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

const buttons = {
    start: document.getElementById('start-btn'),
    restart: document.getElementById('restart-btn'),
    introMic: document.getElementById('intro-mic-btn'),
    stage1Mic: document.getElementById('stage1-mic-btn'),
    stage2Mic: document.getElementById('stage2-mic-btn'),
    stage3Mic: document.getElementById('stage3-mic-btn'),
    stage4Mic: document.getElementById('stage4-mic-btn'),
    stage5Mic: document.getElementById('stage5-mic-btn')
};

const feedback = {
    intro: document.getElementById('intro-feedback'),
    stage1: document.getElementById('stage1-feedback'),
    stage2: document.getElementById('stage2-feedback'),
    stage3: document.getElementById('stage3-feedback'),
    stage4: document.getElementById('stage4-feedback'),
    stage5: document.getElementById('stage5-feedback')
};

/* -------- SOUND -------- */
const SoundFX = {
    ctx: null,
    init() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    },
    tone(f, d, type = 'sine', delay = 0) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = f;
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        const t = this.ctx.currentTime + delay;
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + d);
        osc.start(t);
        osc.stop(t + d);
    },
    correct() {
        this.tone(523, 0.12);
        this.tone(659, 0.12, 'sine', 0.12);
        this.tone(784, 0.18, 'sine', 0.24);
    },
    wrong() {
        this.tone(200, 0.3, 'sawtooth');
    },
    complete() {
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, 'triangle', i * 0.18));
    }
};

/* -------- WEB SPEECH -------- */
function setupRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert('Please use Chrome or Edge for voice recognition.');
        return null;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => { AppState.isListening = true; };
    rec.onend = () => {
        AppState.isListening = false;
        document.querySelectorAll('.mic-btn').forEach(b => b.classList.remove('listening'));
    };
    rec.onerror = () => {
        const fb = getCurrentFeedback();
        if (fb) {
            fb.textContent = "I didn't hear that.";
            fb.className = 'feedback error';
        }
    };
    rec.onresult = (e) => {
        const text = e.results[0][0].transcript.toLowerCase().trim();
        handleVoice(text);
    };
    return rec;
}

/* -------- HELPERS -------- */
function showScreen(id) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[id].classList.add('active');
    AppState.currentScreenId = id;

    const fb = getCurrentFeedback();
    if (fb) {
        fb.textContent = '';
        fb.className = 'feedback';
    }
}

function updateProgress() {
    const completed = Math.min(AppState.step - 1, AppState.totalStages); // stages only
    const percent = (completed / AppState.totalStages) * 100;
    progressFill.style.width = `${percent}%`;
    progressText.textContent = `${completed}/${AppState.totalStages}`;
}

function getCurrentFeedback() {
    switch (AppState.currentScreenId) {
        case 'intro-screen': return feedback.intro;
        case 'stage1-screen': return feedback.stage1;
        case 'stage2-screen': return feedback.stage2;
        case 'stage3-screen': return feedback.stage3;
        case 'stage4-screen': return feedback.stage4;
        case 'stage5-screen': return feedback.stage5;
        default: return null;
    }
}

function getCurrentMicButton() {
    switch (AppState.currentScreenId) {
        case 'intro-screen': return buttons.introMic;
        case 'stage1-screen': return buttons.stage1Mic;
        case 'stage2-screen': return buttons.stage2Mic;
        case 'stage3-screen': return buttons.stage3Mic;
        case 'stage4-screen': return buttons.stage4Mic;
        case 'stage5-screen': return buttons.stage5Mic;
        default: return null;
    }
}

/* -------- VOICE HANDLING -------- */
function handleVoice(text) {
    const fb = getCurrentFeedback();
    if (!fb) return;

    let ok = false;

    switch (AppState.currentScreenId) {
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
        SoundFX.correct();
        animateVisibleStage();
        setTimeout(nextStep, 1200);
    } else {
        fb.textContent = 'Try Again!';
        fb.className = 'feedback error';
        SoundFX.wrong();
        setTimeout(startListening, 1000);
    }
}

function animateVisibleStage() {
    const sel = `#${AppState.currentScreenId} .stage-item.visible:last-of-type`;
    const item = document.querySelector(sel);
    if (item) {
        item.classList.add('animate');
        setTimeout(() => item.classList.remove('animate'), 800);
    }
}

/* -------- FLOW -------- */
function nextStep() {
    AppState.step += 1;

    // update progress (after intro and each correct stage)
    updateProgress();

    switch (AppState.step) {
        case 1: // from home -> intro
            showScreen('intro-screen');
            break;
        case 2:
            showScreen('stage1-screen');
            break;
        case 3:
            showScreen('stage2-screen');
            revealStage('stage2-screen', 'embryo');
            break;
        case 4:
            showScreen('stage3-screen');
            revealStage('stage3-screen', 'hatching');
            break;
        case 5:
            showScreen('stage4-screen');
            revealStage('stage4-screen', 'chick');
            break;
        case 6:
            showScreen('stage5-screen');
            revealStage('stage5-screen', 'chicken');
            break;
        case 7:
            completeMission();
            break;
    }
}

function revealStage(screenId, stageName) {
    const item = document.querySelector(`#${screenId} .stage-item[data-stage="${stageName}"]`);
    if (item) {
        item.classList.remove('hidden');
        item.classList.add('visible');
    }
}

/* -------- LISTENING -------- */
function startListening() {
    if (!AppState.recognition || AppState.isListening) return;
    const mic = getCurrentMicButton();
    if (mic) mic.classList.add('listening');
    try {
        AppState.recognition.start();
    } catch (e) {
        AppState.isListening = false;
        if (mic) mic.classList.remove('listening');
    }
}

/* -------- COMPLETE -------- */
function completeMission() {
    showScreen('complete-screen');
    SoundFX.complete();
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

/* -------- RESTART -------- */
function restart() {
    AppState.step = 0;
    AppState.currentScreenId = 'home-screen';
    progressFill.style.width = '0%';
    progressText.textContent = '0/5';

    // reset visibility
    document.querySelectorAll('.stage-item').forEach(item => {
        const s = item.dataset.stage;
        if (s === 'eggs') {
            item.classList.add('visible');
            item.classList.remove('hidden');
        } else {
            item.classList.remove('visible');
            item.classList.add('hidden');
        }
    });

    document.getElementById('confetti-container').innerHTML = '';
    showScreen('home-screen');
}

/* -------- EVENTS & INIT -------- */
function setupEvents() {
    buttons.start.addEventListener('click', () => {
        SoundFX.init();
        nextStep(); // go to intro-screen
    });
    buttons.restart.addEventListener('click', restart);
    buttons.introMic.addEventListener('click', startListening);
    buttons.stage1Mic.addEventListener('click', startListening);
    buttons.stage2Mic.addEventListener('click', startListening);
    buttons.stage3Mic.addEventListener('click', startListening);
    buttons.stage4Mic.addEventListener('click', startListening);
    buttons.stage5Mic.addEventListener('click', startListening);

    document.addEventListener('keydown', e => {
        if (e.code === 'Space' &&
            AppState.currentScreenId !== 'home-screen' &&
            AppState.currentScreenId !== 'complete-screen') {
            e.preventDefault();
            startListening();
        }
    });
}

function init() {
    AppState.recognition = setupRecognition();
    setupEvents();
    updateProgress(); // 0/5
}

document.addEventListener('DOMContentLoaded', init);