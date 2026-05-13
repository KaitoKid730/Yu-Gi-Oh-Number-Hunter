const API_BASE = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';

let state = {
  cards: [],
  mode: 'EASY',
  isEndless: false,
  askedIds: new Set(),
  score: 0,
  questionCount: 0,
  currentQuestion: null,
  gameStarted: false,
  gameOver: false,
  feedback: null
};

// Utilities
function extractNumber(name) {
  const match = name.match(/Number (?:C)?(\d+)/i);
  return match ? match[1] : null;
}

function extractSuffix(name) {
  if (name.includes(':')) return name.split(':')[1].trim();
  return name.replace(/Number (?:C)?\d+\s*/i, '').trim();
}

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

// Logic
async function initGame() {
  const loadingEl = document.getElementById('loading');
  try {
    const response = await fetch(`${API_BASE}?type=XYZ%20Monster`);
    const data = await response.json();
    state.cards = data.data.filter(card => 
      card.name.toLowerCase().startsWith('number ') || 
      card.name.toLowerCase().includes('number c')
    );
    loadingEl.classList.add('hidden');
    render();
  } catch (err) {
    console.error(err);
    loadingEl.innerText = "Error loading deck. Refresh?";
  }
}

function startGame(mode, isEndless = false) {
  state.mode = mode;
  state.isEndless = isEndless;
  state.score = 0;
  state.questionCount = 0;
  state.gameStarted = true;
  state.gameOver = false;
  state.askedIds = new Set();
  generateQuestion();
}

function generateQuestion() {
  if (state.cards.length < 4) return;
  
  // Prevent duplicate questions
  let availableCards = state.cards.filter(c => !state.askedIds.has(c.id));
  if (availableCards.length === 0) {
    state.askedIds = new Set();
    availableCards = state.cards;
  }

  const randomIndex = Math.floor(Math.random() * availableCards.length);
  const correctCard = availableCards[randomIndex];
  state.askedIds.add(correctCard.id);

  let options = [];

  if (state.mode !== 'HARD') {
    const correctValue = state.mode === 'EASY' ? correctCard.name : extractSuffix(correctCard.name);
    const namesSet = new Set();
    namesSet.add(correctValue);

    // Filter cards to find distracting answers that result in unique display values
    const distractingPool = shuffle([...state.cards]).filter(c => c.id !== correctCard.id);
    
    for (const card of distractingPool) {
      if (namesSet.size >= 4) break;
      const val = state.mode === 'EASY' ? card.name : extractSuffix(card.name);
      namesSet.add(val);
    }

    options = shuffle(Array.from(namesSet));
    
    state.currentQuestion = {
      correctCard,
      options,
      correctNumber: extractNumber(correctCard.name)
    };
  } else {
    state.currentQuestion = {
      correctCard,
      options: [],
      correctNumber: extractNumber(correctCard.name)
    };
  }
  
  state.feedback = null;
  render();
}

function handleAnswer(answer) {
  if (state.feedback) return;

  let isCorrect = false;
  let message = '';
  const correctCard = state.currentQuestion.correctCard;

  if (state.mode === 'HARD') {
    isCorrect = answer.trim() === state.currentQuestion.correctNumber;
    message = isCorrect ? 'Perfect Recall!' : `Wrong! It was No. ${state.currentQuestion.correctNumber}`;
  } else {
    const correctValue = state.mode === 'EASY' ? correctCard.name : extractSuffix(correctCard.name);
    isCorrect = (answer === correctValue);
    message = isCorrect ? 'Bullseye!' : 'Not that one.';
  }

  if (isCorrect) state.score++;
  state.questionCount++;
  state.feedback = { isCorrect, message, userAnswer: answer };

  render();

  if (!state.isEndless && state.questionCount >= 10) {
    setTimeout(() => {
      state.gameOver = true;
      render();
    }, 1500);
  }
}

function nextQuestion() {
  generateQuestion();
}

function resetGame() {
  state.gameStarted = false;
  state.gameOver = false;
  state.score = 0;
  state.questionCount = 0;
  state.askedIds = new Set();
  render();
}

function toggleEndless() {
  state.isEndless = !state.isEndless;
  render();
}

// Rendering
function render() {
  const container = document.getElementById('game-container');
  const scoreBoard = document.getElementById('scoreboard');
  
  // Update Header/Score
  if (state.gameStarted && !state.gameOver) {
    scoreBoard.innerHTML = `
      <div class="flex items-center gap-2 font-bold uppercase slide-in">
        <span class="bg-[#1040C0] text-white px-3 py-1 bauhaus-border-thin">Score: ${state.score}</span>
        <span class="bg-[#F0C020] px-3 py-1 bauhaus-border-thin">${state.questionCount}${state.isEndless ? '' : '/10'}</span>
        ${state.isEndless ? '<span class="text-[10px] bg-black text-white px-2 py-1 bauhaus-border-thin">ENDLESS</span>' : ''}
      </div>
    `;
    document.getElementById('reset-header-btn').classList.remove('hidden');
  } else {
    scoreBoard.innerHTML = '';
    document.getElementById('reset-header-btn').classList.add('hidden');
  }

  if (!state.gameStarted) {
    container.innerHTML = renderStartScreen();
  } else if (state.gameOver) {
    container.innerHTML = renderGameOverScreen();
  } else {
    container.innerHTML = renderQuizScreen();
  }
  
  // Focus hard input if present
  const hardInput = document.getElementById('hard-input');
  if (hardInput && !state.feedback) {
    hardInput.focus();
  }

  // Re-initialize Lucide icons for new content
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function renderStartScreen() {
  return `
    <div class="flex flex-col gap-8 fade-in">
      <div class="flex flex-col gap-4 text-center">
        <h1 class="text-6xl sm:text-8xl font-black uppercase leading-[0.9] tracking-tighter">
          Identify <br />
          <span class="text-white bg-[#121212] px-4 block sm:inline-block mt-2">The Numbers</span>
        </h1>
        <p class="text-xl font-medium max-w-xl mx-auto mt-4">
          Test your knowledge of Yu-Gi-Oh! Number XYZ monsters in this Bauhas-themed challenge.
        </p>

        <!-- Endless Toggle -->
        <div class="flex justify-center items-center gap-4 mt-4">
          <span class="font-bold uppercase text-sm">Mode: Standard</span>
          <button onclick="toggleEndless()" class="relative w-16 h-8 bauhaus-border bg-white transition-colors">
            <div class="absolute top-0 bottom-0 transition-all w-1/2 ${state.isEndless ? 'translate-x-full bg-[#1040C0]' : 'bg-[#D02020]'}"></div>
          </button>
          <span class="font-bold uppercase text-sm">Mode: Endless</span>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        ${renderModeCard('EASY', 'bg-[#1040C0]', 'Eye', 'Identify the full monster name from four choices.')}
        ${renderModeCard('MEDIUM', 'bg-[#D02020]', 'Search', 'Names are split. Identify the unique monster title.')}
        ${renderModeCard('HARD', 'bg-[#F0C020]', 'Hash', 'The numbers are missing. Type the correct Number ID.')}
      </div>
    </div>
  `;
}

function renderModeCard(mode, color, icon, desc) {
  return `
    <div class="relative bauhaus-border bauhaus-shadow p-6 bg-white flex flex-col gap-4">
      <div class="absolute top-2 right-2">
        <div class="w-4 h-4 rounded-full border-2 border-black ${color}"></div>
      </div>
      <div class="flex items-center gap-2 font-black uppercase ${color.replace('bg-', 'text-')}">
         <i data-lucide="${icon.toLowerCase()}"></i>
         <h3>${mode} Mode</h3>
      </div>
      <p class="text-sm font-medium">${desc}</p>
      <button onclick="startGame('${mode}', ${state.isEndless})" class="mt-auto px-6 py-3 font-bold uppercase tracking-widest bauhaus-border shadow-bauhaus-sm bauhaus-button-active ${color} ${color === 'bg-[#F0C020]' ? 'text-black' : 'text-white'}">
        Start
      </button>
    </div>
  `;
}

function renderQuizScreen() {
  const q = state.currentQuestion;
  const isHard = state.mode === 'HARD';
  const hasFeedback = !!state.feedback;
  
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 slide-in items-start">
      <!-- Image Section -->
      <div class="relative group aspect-square w-full max-w-[400px] mx-auto md:mx-0">
        <div class="absolute inset-0 bg-[#1040C0] bauhaus-border -rotate-3 z-0"></div>
        <div class="relative z-10 p-2 bg-white bauhaus-border bauhaus-shadow overflow-hidden w-full h-full">
          <img src="${q.correctCard.card_images[0].image_url_cropped}" 
               class="w-full h-full object-cover" 
               referrerpolicy="no-referrer">
          
          <!-- Mask Visibility logic -->
          ${state.mode !== 'EASY' ? `
            <div class="absolute top-4 left-4 bg-[#121212] text-white px-3 py-1 font-black text-xl uppercase italic z-20">
              ${hasFeedback ? `No. ${q.correctNumber}` : 'Classified'}
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Logic Section -->
      <div class="flex flex-col gap-6">
        <div>
          <span class="text-xs font-black uppercase tracking-widest text-gray-500">Mode: ${state.mode}${state.isEndless ? ' (Endless)' : ''}</span>
          <h2 class="text-4xl font-black uppercase leading-tight">
            ${isHard ? "Which number is this?" : "Identify the monster"}
          </h2>
        </div>

        ${isHard ? `
          <div class="flex flex-col gap-4">
            <div class="flex gap-2 relative">
              <span class="text-4xl font-black self-center">No.</span>
              ${hasFeedback ? `
                <div class="w-full text-4xl font-black bauhaus-border p-4 ${state.feedback.isCorrect ? 'bg-[#F0C020]' : 'bg-[#D02020] text-white'} flex items-center">
                  ${q.correctNumber}
                </div>
              ` : `
                <input type="text" id="hard-input" 
                       class="w-full text-4xl font-black bauhaus-border p-4 bg-white focus:outline-none focus:bg-[#F0C020]" 
                       placeholder="???" 
                       onkeydown="if(event.key === 'Enter') handleAnswer(this.value)">
              `}
            </div>
            ${!hasFeedback ? `
              <button onclick="handleAnswer(document.getElementById('hard-input').value)" 
                      class="px-6 py-3 font-bold uppercase tracking-widest bauhaus-border shadow-bauhaus-sm bauhaus-button-active bg-[#F0C020]">
                Submit
              </button>
            ` : ''}
          </div>
        ` : `
          <div class="grid grid-cols-1 gap-3">
            ${q.options.map((opt, i) => {
              const correctValue = state.mode === 'EASY' ? q.correctCard.name : extractSuffix(q.correctCard.name);
              const isCorrect = opt === correctValue;
              let classes = "bg-white";
              if (hasFeedback) {
                if (isCorrect) classes = "bg-[#F0C020] scale-105 z-20";
                else if (opt === state.feedback.userAnswer) classes = "bg-[#D02020] text-white";
                else classes = "opacity-50";
              }
              return `
                <button onclick="handleAnswer('${opt.replace(/'/g, "\\'")}')" 
                        ${hasFeedback ? 'disabled' : ''}
                        class="text-left p-4 font-bold uppercase bauhaus-border transition-all ${classes} ${!hasFeedback ? 'hover:bg-[#1040C0] hover:text-white hover:translate-x-2' : ''}">
                  <span class="inline-block w-8 font-black">${i + 1}.</span> ${opt}
                </button>
              `;
            }).join('')}
          </div>
        `}

        ${hasFeedback ? `
          <div class="p-6 bauhaus-border ${state.feedback.isCorrect ? 'bg-[#1040C0]' : 'bg-[#D02020]'} text-white fade-in">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-3">
                 ${state.feedback.isCorrect ? '<i data-lucide="zap"></i>' : '<i data-lucide="eye-off"></i>'}
                <h4 class="text-2xl font-black uppercase">${state.feedback.message}</h4>
              </div>
              <button onclick="nextQuestion()" class="bg-white text-[#121212] w-12 h-12 bauhaus-border flex items-center justify-center hover:bg-[#F0C020] transition-colors">
                <i data-lucide="chevron-right"></i>
              </button>
            </div>
            ${!state.feedback.isCorrect ? `
               <p class="mt-4 text-xs font-bold uppercase leading-tight opacity-70">
                 Correct Designation: ${q.correctCard.name}
               </p>
            ` : ''}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderGameOverScreen() {
  return `
    <div class="flex flex-col items-center gap-8 py-12 fade-in">
      <div class="w-48 h-48 bg-[#F0C020] bauhaus-border rounded-full flex items-center justify-center bauhaus-shadow">
        <i data-lucide="trophy" size="100"></i>
      </div>
      <div class="text-center">
        <h2 class="text-6xl font-black uppercase italic">Final Report</h2>
        <div class="mt-4 flex gap-4 justify-center">
          <div class="bauhaus-border p-4 bg-white">
            <p class="text-xs font-bold uppercase text-gray-500">Total Score</p>
            <p class="text-5xl font-black">${state.score}</p>
          </div>
          <div class="bauhaus-border p-4 bg-[#1040C0] text-white">
            <p class="text-xs font-bold uppercase text-blue-200">Accuracy</p>
            <p class="text-5xl font-black">${Math.round((state.score / 10) * 100)}%</p>
          </div>
        </div>
      </div>
      <button onclick="resetGame()" class="px-6 py-3 font-bold uppercase tracking-widest bauhaus-border shadow-bauhaus-sm bauhaus-button-active bg-[#D02020] text-white flex items-center gap-2">
        <i data-lucide="rotate-ccw"></i> Try Again
      </button>
    </div>
  `;
}

// Global Exports
window.startGame = startGame;
window.handleAnswer = handleAnswer;
window.nextQuestion = nextQuestion;
window.resetGame = resetGame;
window.toggleEndless = toggleEndless;

// Initial Call
initGame();
