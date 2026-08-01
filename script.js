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
        answers: ["egg", "eggs", "eg", "an egg", "the egg", "egg stage"],
        name: "Eggs",
        emoji: "🥚"
        // later: image: "images/egg.png"
    },
    {
        question: "What comes after Eggs?",
        answers: ["embryo", "embryos", "embrio", "embroyo", "inbryo", "the embryo"],
        name: "Embryo",
        emoji: "🧬"
    },
    {
        question: "What comes after Embryo?",
        answers: ["hatching", "hatch", "hatches", "haching", "hashing", "hatcing", "hatchling", "the hatching"],
        name: "Hatching",
        emoji: "🐣"
    },
    {
        question: "What comes after Hatching?",
        answers: ["chick", "chicks", "chic", "chik", "baby chick", "baby chicken", "little chick", "the chick"],
        name: "Chick",
        emoji: "🐥"
    },
    {
        question: "What is the final stage?",
        answers: ["chicken", "chickens", "chiken", "chikken", "adult chicken", "hen", "rooster", "the chicken", "adult"],
        name: "Chicken",
        emoji: "🐔"
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

    // Update the single middle card
    stageImage.textContent = stage.emoji;
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
// SMART TEXT CLEANING
// ==========================

function cleanSpeech(text) {
    return text
        .toLowerCase()
        .replace(/[.,!?'"]/g, "")
        .replace(/\b(the|a|an|is|it's|its|um|uh|like|so|just|my|this|that)\b/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

// ==========================
// CHECK ANSWER (improved)
// ==========================

function checkAnswer(alternatives) {
    // alternatives = array of possible transcripts from the speech engine
    if (!Array.isArray(alternatives)) {
        alternatives = [alternatives];
    }

    const stage = stages[currentStage];
    let matched = false;
    let bestHeard = alternatives[0] || "";

    // Check every alternative against every accepted answer
    for (const raw of alternatives) {
        const cleaned = cleanSpeech(raw);

        for (const answer of stage.answers) {
            if (cleaned.includes(answer) || answer.includes(cleaned) && cleaned.length > 2) {
                matched = true;
                bestHeard = raw;
                break;
            }
        }
        if (matched) break;
    }

    // Update the "I heard" box with the best match we found
    heardText.textContent = bestHeard;
    heardBox.classList.add("active");

    if (matched) {
        feedback.textContent = "✅ Correct!";
        feedback.className = "success";

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
        // Wrong answer
        feedback.textContent = "❌ Try Again";
        feedback.className = "error";

        // Clear the heard text after a short moment
        setTimeout(() => {
            clearHeard();
        }, 900);
    }
}

// ==========================
// FINISH
// ==========================

function finishMission() {
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
