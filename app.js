const app = document.getElementById('app');

const TOPICS = [
  { name: 'אמונה וזהות יהודית', test: id => id >= 1 && id <= 13 },
  { name: 'תנ״ך ותורה שבעל פה', test: id => id >= 14 && id <= 39 },
  { name: 'הלכה וארון הספרים', test: id => id >= 40 && id <= 50 },
  { name: 'הלוח וחגי תשרי–אדר', test: id => id >= 51 && id <= 75 },
  { name: 'פסח ומועדי ניסן–אלול', test: id => id >= 76 && id <= 100 },
  { name: 'תפילה ובית הכנסת', test: id => id >= 101 && id <= 125 },
  { name: 'שבת וכשרות', test: id => id >= 126 && id <= 143 },
  { name: 'תשמישי קדושה', test: id => id >= 144 && id <= 150 },
];

const letters = ['א', 'ב', 'ג', 'ד'];
let allQuestions = [];
let session = [];
let currentIndex = 0;
let answers = new Map();
let selectedMode = 'ordered';
let selectedLength = 150;

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const shuffled = values => {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const topicFor = id => TOPICS.find(topic => topic.test(id))?.name || 'יהדות';

function balancedSelection(limit) {
  if (limit >= allQuestions.length) return [...allQuestions];
  const buckets = TOPICS.map(topic => shuffled(allQuestions.filter(q => topic.test(q.id))));
  const chosen = [];
  while (chosen.length < limit && buckets.some(bucket => bucket.length)) {
    for (const bucket of buckets) {
      if (bucket.length && chosen.length < limit) chosen.push(bucket.shift());
    }
  }
  return chosen;
}

function stats() {
  try {
    return JSON.parse(localStorage.getItem('judaismQuizStats')) || { attempts: 0, best: 0, answered: 0 };
  } catch {
    return { attempts: 0, best: 0, answered: 0 };
  }
}

function saveStats(score) {
  const previous = stats();
  const next = {
    attempts: previous.attempts + 1,
    best: Math.max(previous.best, score),
    answered: previous.answered + answers.size,
  };
  localStorage.setItem('judaismQuizStats', JSON.stringify(next));
}

function renderLanding() {
  const saved = stats();
  app.innerHTML = `
    <main class="landing">
      <div class="hero-photo" role="img" aria-label="איור של ספר פתוח, אור וארון ספרים יהודי"></div>
      <div class="hero-tint"></div><div class="hero-vignette"></div><div class="page-lines" aria-hidden="true"></div>
      <div class="landing-inner">
        <section class="title-card">
          <div class="atlas-kicker"><span class="map-mark" aria-hidden="true"><i></i></span> בית מדרש אינטראקטיבי</div>
          <h1>מסע בארון הספרים</h1>
          <p>אמונה · מקורות · מועדים · תפילה · אורח חיים</p>
        </section>
        <aside class="credit-card">
          <b>יצירה והפקה · כפיר משה יעקובי</b>
          <small>מבחן חזרה המבוסס אך ורק על מחברות הקורס</small>
        </aside>
        <div class="landing-spacer"></div>
        <section class="mode-card" aria-labelledby="mode-title">
          <h2 id="mode-title">איך תרצו לתרגל?</h2>
          <div class="mode-grid">
            <button class="mode-btn" data-mode="mixed"><span>⤨ מעורבב</span><small>שאלות ונושאים בסדר אקראי</small></button>
            <button class="mode-btn selected" data-mode="ordered"><span>☷ לפי נושאים</span><small>מהאמונה ועד אורח החיים היהודי</small></button>
          </div>
          <div class="length-row" aria-label="אורך התרגול">
            <button class="length-btn" data-length="25">25 · קצר</button>
            <button class="length-btn" data-length="50">50 · בינוני</button>
            <button class="length-btn selected" data-length="150">150 · מלא</button>
          </div>
          <button class="primary-btn" id="start-btn">התחל לתרגל ←</button>
          <p class="landing-meta">${allQuestions.length} שאלות · משוב והסבר אחרי כל תשובה · מקור מצוין לכל שאלה</p>
        </section>
        <div class="history-line">${saved.attempts ? `ניסיונות קודמים: ${saved.attempts} · שיא: ${saved.best}% · ${saved.answered} תשובות` : 'מוכנים לצאת לדרך?'}</div>
      </div>
    </main>`;

  app.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    selectedMode = button.dataset.mode;
    app.querySelectorAll('[data-mode]').forEach(item => item.classList.toggle('selected', item === button));
  }));
  app.querySelectorAll('[data-length]').forEach(button => button.addEventListener('click', () => {
    selectedLength = Number(button.dataset.length);
    app.querySelectorAll('[data-length]').forEach(item => item.classList.toggle('selected', item === button));
  }));
  document.getElementById('start-btn').addEventListener('click', startQuiz);
}

function startQuiz() {
  const picked = selectedMode === 'mixed'
    ? shuffled(allQuestions).slice(0, selectedLength)
    : balancedSelection(selectedLength).sort((a, b) => a.id - b.id);

  session = picked.map(question => ({
    ...question,
    options: shuffled([question.correct, ...question.distractors]),
  }));
  currentIndex = 0;
  answers = new Map();
  renderQuestion();
  window.scrollTo(0, 0);
}

function renderQuestion() {
  const question = session[currentIndex];
  const answer = answers.get(question.id);
  const score = [...answers.values()].filter(item => item.correct).length;
  const progress = ((currentIndex + 1) / session.length) * 100;

  const options = question.options.map((option, index) => {
    let state = '';
    if (answer) {
      if (option === question.correct) state = 'correct';
      else if (option === answer.choice) state = 'wrong';
      else state = 'faded';
    }
    return `<button class="answer-btn ${state}" data-answer="${escapeHtml(option)}" ${answer ? 'disabled' : ''}>
      <span class="answer-letter">${letters[index]}</span>
      <span>${escapeHtml(option)}</span>
    </button>`;
  }).join('');

  const feedback = answer ? `
    <section class="feedback ${answer.correct ? 'good' : 'bad'}">
      <div class="feedback-title">${answer.correct ? 'נכון! 🎉' : 'לא נכון'}</div>
      ${answer.correct ? '' : `<p><b>התשובה הנכונה:</b> ${escapeHtml(question.correct)}</p>`}
      <p>${escapeHtml(question.explanation)}</p>
      <details class="source-details">
        <summary>הצג מקור במחברות הקורס</summary>
        <p>${escapeHtml(question.source)}</p>
      </details>
    </section>` : '';

  app.innerHTML = `
    <div class="quiz-page">
      <header class="topbar">
        <div class="topbar-inner">
          <button class="exit-btn" id="exit-btn" aria-label="יציאה">✕</button>
          <div class="progress-wrap">
            <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
            <div class="progress-labels"><span>${currentIndex + 1} / ${session.length}</span><span>${answers.size} נענו</span></div>
          </div>
          <div class="score-chip">${score} ✓</div>
        </div>
      </header>
      <main class="quiz-main">
        <div class="question-meta"><span class="category-chip">${escapeHtml(question.category)}</span><span class="question-id">שאלה #${question.id}</span></div>
        <article class="question-card">
          <div class="topic-label">${escapeHtml(topicFor(question.id))}</div>
          <h2>${escapeHtml(question.question)}</h2>
        </article>
        <section class="answers" aria-label="תשובות">${options}</section>
        ${feedback}
        <nav class="nav-row" aria-label="ניווט בשאלות">
          <button class="nav-btn" id="prev-btn" ${currentIndex === 0 ? 'disabled' : ''}>→ קודם</button>
          <button class="nav-btn next" id="next-btn" ${answer ? '' : 'disabled'}>${currentIndex === session.length - 1 ? 'סיום וקבלת ציון' : 'השאלה הבאה ←'}</button>
        </nav>
      </main>
    </div>`;

  app.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => chooseAnswer(button.dataset.answer)));
  document.getElementById('exit-btn').addEventListener('click', () => {
    if (answers.size && !confirm('לצאת מהתרגול? ההתקדמות בניסיון הנוכחי תימחק.')) return;
    renderLanding();
  });
  document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentIndex > 0) { currentIndex -= 1; renderQuestion(); window.scrollTo(0, 0); }
  });
  document.getElementById('next-btn').addEventListener('click', () => {
    if (!answers.has(question.id)) return;
    if (currentIndex === session.length - 1) renderResults();
    else { currentIndex += 1; renderQuestion(); window.scrollTo(0, 0); }
  });
}

function chooseAnswer(choice) {
  const question = session[currentIndex];
  if (answers.has(question.id)) return;
  answers.set(question.id, { choice, correct: choice === question.correct });
  renderQuestion();
}

function renderResults() {
  const correct = [...answers.values()].filter(answer => answer.correct).length;
  const total = session.length;
  const score = Math.round((correct / total) * 100);
  saveStats(score);

  const breakdown = TOPICS.map(topic => {
    const inTopic = session.filter(q => topic.test(q.id));
    if (!inTopic.length) return null;
    const good = inTopic.filter(q => answers.get(q.id)?.correct).length;
    return { name: topic.name, good, total: inTopic.length, pct: Math.round((good / inTopic.length) * 100) };
  }).filter(Boolean);

  const wrong = session.filter(question => !answers.get(question.id)?.correct);
  const rows = breakdown.map(row => `
    <div class="topic-row">
      <span>${escapeHtml(row.name)}</span>
      <div class="mini-track"><i style="width:${row.pct}%"></i></div>
      <b>${row.good}/${row.total}</b>
    </div>`).join('');

  const review = wrong.map(question => `
    <details>
      <summary>#${question.id} · ${escapeHtml(question.question)}</summary>
      <p><b>התשובה הנכונה:</b> ${escapeHtml(question.correct)}</p>
      <p>${escapeHtml(question.explanation)}</p>
      <p class="source-details"><b>מקור:</b> ${escapeHtml(question.source)}</p>
    </details>`).join('');

  app.innerHTML = `
    <main class="results-page">
      <div class="results-main">
        <section class="results-card">
          <div class="results-head">
            <div aria-hidden="true">✦ ✦ ✦</div>
            <h1>${score >= 90 ? 'שליטה מצוינת בחומר!' : score >= 75 ? 'עבודה יפה!' : score >= 60 ? 'בדרך הנכונה' : 'ממשיכים ללמוד'}</h1>
            <div class="score-ring" style="--score-angle:${score * 3.6}deg"><strong>${score}%</strong><span>הציון שלך</span></div>
          </div>
          <div class="stat-grid">
            <div class="stat"><b>${correct}</b><span>נכונות</span></div>
            <div class="stat"><b>${wrong.length}</b><span>לחזרה</span></div>
            <div class="stat"><b>${total}</b><span>שאלות</span></div>
          </div>
          <section class="topic-results"><h2>תוצאות לפי נושא</h2>${rows}</section>
          ${wrong.length ? `<h2 class="review-title">השאלות שכדאי לחזור עליהן</h2><div class="review-list">${review}</div>` : '<h2>כל הכבוד — הכול נכון!</h2>'}
          <div class="result-actions">
            ${wrong.length ? '<button class="primary-btn" id="retry-wrong">תרגול הטעויות</button>' : ''}
            <button class="secondary-btn" id="retry-all">תרגול נוסף</button>
            <button class="secondary-btn home" id="home-btn">חזרה למסך הבית</button>
          </div>
        </section>
      </div>
    </main>`;

  document.getElementById('retry-wrong')?.addEventListener('click', () => {
    session = shuffled(wrong).map(q => ({ ...q, options: shuffled([q.correct, ...q.distractors]) }));
    answers = new Map(); currentIndex = 0; renderQuestion(); window.scrollTo(0, 0);
  });
  document.getElementById('retry-all').addEventListener('click', startQuiz);
  document.getElementById('home-btn').addEventListener('click', renderLanding);
  window.scrollTo(0, 0);
}

document.addEventListener('keydown', event => {
  if (!document.querySelector('.quiz-page')) return;
  if (/^[1-4]$/.test(event.key)) {
    const button = app.querySelectorAll('[data-answer]')[Number(event.key) - 1];
    if (button && !button.disabled) button.click();
  }
  if (event.key === 'ArrowLeft') document.getElementById('next-btn')?.click();
  if (event.key === 'ArrowRight') document.getElementById('prev-btn')?.click();
});

fetch('questions.json?v=q6-20260902')
  .then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then(data => {
    allQuestions = data;
    if (allQuestions.length !== 150) throw new Error('מאגר השאלות אינו שלם');
    renderLanding();
  })
  .catch(error => {
    console.error(error);
    app.innerHTML = '<main class="fatal"><h1>לא הצלחנו לטעון את השאלות</h1><p>רעננו את העמוד ונסו שוב.</p></main>';
  });
