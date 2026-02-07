const statusEl = document.getElementById("status");
const quizEl = document.getElementById("quiz");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");
const resultEl = document.getElementById("result");

let allQuestions = [];
let currentQuestions = [];
let answers = {};

function pickRandomQuestions(items, count) {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

function updateSubmitState() {
  submitBtn.disabled = currentQuestions.length === 0;
}

function renderQuestions() {
  quizEl.innerHTML = "";

  currentQuestions.forEach((q, index) => {
    const wrapper = document.createElement("article");
    wrapper.className = "question";

    const title = document.createElement("h3");
    title.textContent = `${index + 1}. ${q.question}`;
    wrapper.appendChild(title);

    const options = document.createElement("div");
    options.className = "options";

    Object.entries(q.options).forEach(([key, value]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option";
      if (answers[q.id] === key) btn.classList.add("selected");
      btn.textContent = `${key}. ${value}`;
      btn.addEventListener("click", () => {
        answers[q.id] = key;
        renderQuestions();
      });
      options.appendChild(btn);
    });

    wrapper.appendChild(options);
    quizEl.appendChild(wrapper);
  });

  quizEl.classList.remove("hidden");
  statusEl.textContent = `Loaded ${currentQuestions.length} random questions.`;
  updateSubmitState();
}

function resetQuiz() {
  answers = {};
  currentQuestions = pickRandomQuestions(allQuestions, 10);
  resultEl.textContent = "";
  renderQuestions();
}

function submitQuiz() {
  if (!currentQuestions.length) return;

  let score = 0;
  currentQuestions.forEach(q => {
    if (answers[q.id] === q.correct) score += 1;
  });

  resultEl.textContent = `Score: ${score} / ${currentQuestions.length}`;
}

async function init() {
  try {
    const res = await fetch("./questions.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allQuestions = await res.json();
    if (!Array.isArray(allQuestions) || allQuestions.length === 0) {
      throw new Error("questions.json is empty or invalid");
    }
    resetQuiz();
  } catch (err) {
    statusEl.textContent = `Cannot load questions: ${err.message}`;
    submitBtn.disabled = true;
  }
}

submitBtn.addEventListener("click", submitQuiz);
resetBtn.addEventListener("click", resetQuiz);

init();
