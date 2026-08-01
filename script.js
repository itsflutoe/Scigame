// ==========================
// ELEMENTS
// ==========================

const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");
const completeScreen = document.getElementById("completeScreen");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const micBtn = document.getElementById("micBtn");

const question = document.getElementById("question");
const feedback = document.getElementById("feedback");
const heardText = document.getElementById("heardText");
const heardBox = document.getElementById("heardBox");

const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

const stageImage = document.getElementById("stageImage");
const stageName = document.getElementById("stageName");
const currentStageBox = document.getElementById("currentStageBox");

// ==========================
// STAGES DATA
// ==========================

const stages = [
    {
        question: "What is the first stage?",
        answers: ["egg", "eggs", "eg", "egg stage"],
        name: "E__",
        fullName: "Eggs",
        emoji: "🥚",
        image: "images/egg.png"
    },
    {
        question: "What comes after Eggs?",
        answers: ["embryo", "embryos", "embrio", "embroyo", "inbryo", "embryo stage"],
        name: "Em__yo",
        fullName: "Embryo",
        emoji: "🧬",
        image: "images/embryo.png"
    },
    {
        question: "What comes after Embryo?",
        answers: [
            "hatch", "hatching", "hatches", "haching", "hashing", "hatcing",
            "hatchling", "atching", "hachin", "hatchin", "hatshing", "hatchingg",
            "hatch stage", "hatching stage"
        ],
        name: "Hat__i_g",
        fullName: "Hatching",
        emoji: "🐣",
        image: "images/hatching.png"
    },
    {
        question: "What comes after Hatching?",
        answers: ["chick", "chicks", "chic", "chik", "baby chick", "little chick", "chick", "tick", "sisiw", "lick"],
        name: "Ch__k",
        fullName: "Chick",
        emoji: "🐥",
        image: "images/chick.webp"
    },
    {
        question: "What is the final stage?",
        answers: ["chicken", "chickens", "chiken", "chikken", "hen", "rooster", "adult"],
        name: "C__c_en",
        fullName: "Chicken",
        emoji: "🐔",
        image: "images/chicken.png"
    }
];

let currentStage = 0;
let isListening = false;
let micPermissionGranted = false;

// ==========================
// SCREEN HELPERS
// ==========================

function showScreen(screen) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    screen.classList.add("active");
}

// ==========================
// PROGRESS
// ==========================

function updateProgress() {
    const percent = (currentStage / stages.length) * 100;
    progressFill.style.width = percent + "%";
    progressText.textContent = `${currentStage} / ${stages.length}`;
}

// ==========================
// LOAD / SHOW CURRENT STAGE
// ==========================

function loadStage() {
    // Clear previous feedback and heard text
    feedback.textContent = "";
    feedback.className = "";
    clearHeard();

    const stage = stages[currentStage];

    question.textContent = stage.question;

    // Update the single middle card (uses real image if available, falls back to emoji)
    if (stage.image) {
        stageImage.innerHTML = `<img src="${stage.image}" alt="${stage.name}" class="stage-img" onerror="this.parentElement.textContent='${stage.emoji}'">`;
    } else {
        stageImage.textContent = stage.emoji;
    }
    stageName.textContent = stage.name;

    // Small animation
    currentStageBox.classList.remove("changing");
}

function clearHeard() {
    heardText.textContent = "—";
    heardBox.classList.remove("active");
}

// ==========================
// REQUEST MIC PERMISSION (only once)
// ==========================

async function requestMicPermission() {
    if (micPermissionGranted) return true;

    // Only request if the API exists
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // We only needed the permission prompt — stop the stream right away
        stream.getTracks().forEach(track => track.stop());
        micPermissionGranted = true;
        return true;
    } catch (err) {
        console.warn("Mic permission issue:", err.name);
        return false;
    }
}

// ==========================
// SPEECH RECOGNITION SETUP
// ==========================

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;

    recognition.onstart = () => {
        isListening = true;
        micBtn.classList.add("listening");
        feedback.textContent = "Listening...";
        feedback.className = "";
    };

    recognition.onend = () => {
        isListening = false;
        micBtn.classList.remove("listening");
    };

    recognition.onerror = (event) => {
        isListening = false;
        micBtn.classList.remove("listening");

        // Clear the heard box on error
        clearHeard();

        if (event.error === "not-allowed") {
            feedback.textContent = "❌ Please allow microphone access";
            feedback.className = "error";
        } else if (event.error === "no-speech") {
            feedback.textContent = "❌ I didn't hear anything. Try again!";
            feedback.className = "error";
        } else if (event.error === "aborted") {
            // User or code stopped it — ignore
            feedback.textContent = "";
        } else {
            feedback.textContent = "❌ Try again";
            feedback.className = "error";
        }
    };

    recognition.onresult = (event) => {
        // Collect all alternatives (not just the top one)
        const alternatives = [];
        const result = event.results[0];

        for (let i = 0; i < result.length; i++) {
            alternatives.push(result[i].transcript.trim());
        }

        // Show the top result
        const topSpeech = alternatives[0] || "";
        heardText.textContent = topSpeech;
        heardBox.classList.add("active");

        checkAnswer(alternatives);
    };
}

// ==========================
// START GAME
// ==========================

startBtn.addEventListener("click", async () => {
    // Request permission only if we don't already have it
    await requestMicPermission();

    currentStage = 0;
    updateProgress();
    loadStage();
    showScreen(gameScreen);
});

// ==========================
// RESTART
// ==========================

restartBtn.addEventListener("click", () => {
    currentStage = 0;
    updateProgress();
    showScreen(homeScreen);
});

// ==========================
// MICROPHONE BUTTON
// ==========================

micBtn.addEventListener("click", async () => {
    if (!recognition) {
        alert("Speech recognition is not supported.\nPlease use Google Chrome or Microsoft Edge.");
        return;
    }

    // If already listening → stop it
    if (isListening) {
        try {
            recognition.stop();
        } catch (e) {}
        return;
    }

    // Make sure we have permission (only prompts if not granted yet)
    const ok = await requestMicPermission();
    if (!ok) {
        feedback.textContent = "❌ Microphone permission is required";
        feedback.className = "error";
        return;
    }

    // Clear previous heard text before new attempt
    clearHeard();
    feedback.textContent = "";
    feedback.className = "";

    try {
        recognition.start();
    } catch (err) {
        // Sometimes the engine is still in a bad state — recreate it
        console.warn("Start failed, recreating recognition...", err);
        recreateRecognition();
        try {
            recognition.start();
        } catch (e2) {
            feedback.textContent = "❌ Please try again";
            feedback.className = "error";
        }
    }
});

// Helper: fully recreate the recognition object if it gets stuck
function recreateRecognition() {
    if (!SpeechRecognition) return;

    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;

    recognition.onstart = () => {
        isListening = true;
        micBtn.classList.add("listening");
        feedback.textContent = "Listening...";
        feedback.className = "";
    };

    recognition.onend = () => {
        isListening = false;
        micBtn.classList.remove("listening");
    };

    recognition.onerror = (event) => {
        isListening = false;
        micBtn.classList.remove("listening");
        clearHeard();

        if (event.error === "not-allowed") {
            feedback.textContent = "❌ Please allow microphone access";
            feedback.className = "error";
        } else if (event.error === "no-speech") {
            feedback.textContent = "❌ I didn't hear anything. Try again!";
            feedback.className = "error";
        } else if (event.error !== "aborted") {
            feedback.textContent = "❌ Try again";
            feedback.className = "error";
        }
    };

    recognition.onresult = (event) => {
        // Collect all alternatives
        const alternatives = [];
        const result = event.results[0];

        for (let i = 0; i < result.length; i++) {
            alternatives.push(result[i].transcript.trim());
        }

        const topSpeech = alternatives[0] || "";
        heardText.textContent = topSpeech;
        heardBox.classList.add("active");

        checkAnswer(alternatives);
    };
}

// ==========================
// SPACEBAR SHORTCUT
// ==========================

document.addEventListener("keydown", e => {
    if (e.code === "Space" && gameScreen.classList.contains("active")) {
        e.preventDefault();
        micBtn.click();
    }
});

// ==========================
// VERY FORGIVING SPEECH MATCHING (for kids)
// ==========================

function cleanSpeech(text) {
    return text
        .toLowerCase()
        .replace(/[.,!?'"~\-]/g, "")
        .replace(/\b(the|a|an|is|it's|its|um|uh|like|so|just|my|this|that|and|or|to|for|of|in|on)\b/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

// Simple similarity check (how many characters match in order)
function looksSimilar(spoken, target) {
    if (!spoken || spoken.length < 2) return false;

    // Exact or includes
    if (spoken.includes(target) || target.includes(spoken)) return true;

    // For short words (egg, chick) allow if most letters match
    if (target.length <= 5) {
        let matches = 0;
        for (const char of target) {
            if (spoken.includes(char)) matches++;
        }
        // At least 70% of letters present
        return matches >= Math.ceil(target.length * 0.7);
    }

    // For longer words (hatching, embryo, chicken)
    // Check if the beginning sounds match
    const start = target.slice(0, 4);
    if (spoken.includes(start) || spoken.startsWith(start.slice(0, 3))) return true;

    // Or if many letters from the target appear
    let matches = 0;
    for (const char of target) {
        if (spoken.includes(char)) matches++;
    }
    return matches >= Math.ceil(target.length * 0.6);
}

function checkAnswer(alternatives) {
    if (!Array.isArray(alternatives)) {
        alternatives = [alternatives];
    }

    const stage = stages[currentStage];
    let matched = false;
    let bestHeard = alternatives[0] || "";

    for (const raw of alternatives) {
        const cleaned = cleanSpeech(raw);
        if (!cleaned) continue;

        for (const answer of stage.answers) {
            if (looksSimilar(cleaned, answer)) {
                matched = true;
                bestHeard = raw;
                break;
            }
        }
        if (matched) break;
    }

    // Show what was heard
    heardText.textContent = bestHeard;
    heardBox.classList.add("active");

if (matched) {
    feedback.textContent = "✅ Correct!";
    feedback.className = "success";

    // Reveal the full correct answer
    const stage = stages[currentStage];
    stageName.textContent = stage.fullName || stage.name;

    currentStageBox.classList.add("changing");

        setTimeout(() => {
            currentStage++;
            updateProgress();

            if (currentStage >= stages.length) {
                finishMission();
            } else {
                loadStage();
            }
        }, 900);

    } else {
        feedback.textContent = "❌ Try Again";
        feedback.className = "error";

        setTimeout(() => {
            clearHeard();
        }, 1000);
    }
}

// ==========================
// FINISH
// ==========================

function finishMission() {
    // Build the finished cycle with real images + full names
    const container = document.getElementById("finishedCycle");
    if (container) {
        let html = "";
        stages.forEach((stage, index) => {
            const label = stage.fullName || stage.name;
            html += `
                <div class="cycle-item">
                    <img src="${stage.image}" alt="${label}" onerror="this.outerHTML='<span style=font-size:32px>${stage.emoji}</span>'">
                    <span>${label}</span>
                </div>
            `;
            if (index < stages.length - 1) {
                html += `<div class="cycle-arrow">➜</div>`;
            }
        });
        container.innerHTML = html;
    }

    showScreen(completeScreen);
    launchConfetti();
}

// ==========================
// CONFETTI
// ==========================

function launchConfetti() {
    for (let i = 0; i < 90; i++) {
        const confetti = document.createElement("div");
        confetti.className = "confetti";
        confetti.style.left = Math.random() * 100 + "vw";
        confetti.style.animationDuration = (Math.random() * 2.5 + 1.8) + "s";
        confetti.style.background = `hsl(${Math.random() * 360}, 90%, 60%)`;
        confetti.style.width = (Math.random() * 8 + 6) + "px";
        confetti.style.height = confetti.style.width;
        document.body.appendChild(confetti);

        setTimeout(() => confetti.remove(), 4500);
    }
}

// ==========================
// STARTUP
// ==========================

updateProgress();
