const statusEl = document.getElementById("status");
const quizEl = document.getElementById("quiz");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");
const resultEl = document.getElementById("result");
const poolCountEl = document.getElementById("poolCount");
const progressCountEl = document.getElementById("progressCount");

let allQuestions = [];
let currentQuestions = [];
let answers = {};

function normalizeQuestion(raw, index) {
  const questionText = raw?.question || raw?.text || raw?.prompt;
  if (!questionText) return null;

  let options = null;
  if (raw?.options && typeof raw.options === "object" && !Array.isArray(raw.options)) {
    options = raw.options;
  } else if (Array.isArray(raw?.choices)) {
    options = {};
    raw.choices.forEach((choice, i) => {
      if (typeof choice === "string") {
        const key = String.fromCharCode(65 + i);
        options[key] = choice;
        return;
      }
      const key = choice?.key || choice?.id || String.fromCharCode(65 + i);
      const value = choice?.text || choice?.label || choice?.option;
      if (value) options[key] = value;
    });
  }

  const hasOptions = options && Object.keys(options).length > 0;
  if (!hasOptions) return null;

  let correct = raw?.correct || raw?.answer || raw?.correctAnswer;
  if (!correct && Array.isArray(raw?.choices)) {
    const selected = raw.choices.find(c => c?.isCorrect === true);
    if (selected) {
      correct = selected.key || selected.id;
    }
  }
  if (!correct) return null;

  return {
    id: raw?.id ?? `q-${index + 1}`,
    question: String(questionText),
    options,
    correct: String(correct).trim()
  };
}

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

function updateProgress() {
  const answered = currentQuestions.filter(q => answers[q.id]).length;
  progressCountEl.textContent = `Answered: ${answered}/${currentQuestions.length}`;
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
  updateProgress();
  updateSubmitState();
}

function resetQuiz() {
  answers = {};
  currentQuestions = pickRandomQuestions(allQuestions, 10);
  resultEl.textContent = "";
  resultEl.classList.add("hidden");
  resultEl.classList.remove("score");
  renderQuestions();
}

function submitQuiz() {
  if (!currentQuestions.length) return;

  let score = 0;
  currentQuestions.forEach(q => {
    if (answers[q.id] === q.correct) score += 1;
  });

  const percent = Math.round((score / currentQuestions.length) * 100);
  resultEl.textContent = `Score: ${score} / ${currentQuestions.length} (${percent}%)`;
  resultEl.classList.remove("hidden");
  resultEl.classList.add("score");
}

async function init() {
  try {
    const candidateUrls = ["./questions.json", "../backend/questions.json"];
    let payload = null;
    let loadedUrl = "";
    let lastError = null;

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        payload = await res.json();
        loadedUrl = url;
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!payload) {
      throw lastError || new Error("Cannot fetch questions");
    }

    let rawQuestions = payload;
    if (!Array.isArray(rawQuestions)) {
      rawQuestions =
        rawQuestions?.questions ||
        rawQuestions?.items ||
        rawQuestions?.data ||
        [];
    }
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      throw new Error("questions payload is empty or invalid");
    }

    allQuestions = rawQuestions
      .map((q, i) => normalizeQuestion(q, i))
      .filter(Boolean);
    if (allQuestions.length === 0) {
      throw new Error("No valid question after parsing format");
    }
    poolCountEl.textContent = `Question bank: ${allQuestions.length}`;
    statusEl.textContent = `Loaded ${allQuestions.length} questions from ${loadedUrl}.`;
    resetQuiz();
  } catch (err) {
    statusEl.textContent = `Cannot load questions: ${err.message}`;
    submitBtn.disabled = true;
  }
}

submitBtn.addEventListener("click", submitQuiz);
resetBtn.addEventListener("click", resetQuiz);

init();
