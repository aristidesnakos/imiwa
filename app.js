// Application state
let detectedKanjiList = [];
let currentQuiz = null;
let currentQuestionIndex = 0;
let quizResults = {
    known: [],
    unknown: [],
    score: 0
};

// DOM Elements
const uploadSection = document.getElementById('upload-section');
const detectionSection = document.getElementById('detection-section');
const quizSection = document.getElementById('quiz-section');
const resultsSection = document.getElementById('results-section');

const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const manualKanji = document.getElementById('manualKanji');
const processManualBtn = document.getElementById('processManualBtn');

const detectedKanjiEl = document.getElementById('detectedKanji');
const startQuizBtn = document.getElementById('startQuizBtn');

const questionNumber = document.getElementById('questionNumber');
const totalQuestions = document.getElementById('totalQuestions');
const currentKanjiEl = document.getElementById('currentKanji');
const questionText = document.getElementById('questionText');
const optionsContainer = document.getElementById('optionsContainer');
const submitAnswerBtn = document.getElementById('submitAnswerBtn');
const skipBtn = document.getElementById('skipBtn');
const feedback = document.getElementById('feedback');

const finalScore = document.getElementById('finalScore');
const totalScore = document.getElementById('totalScore');
const scorePercentage = document.getElementById('scorePercentage');
const knownKanjiEl = document.getElementById('knownKanji');
const unknownKanjiEl = document.getElementById('unknownKanji');
const restartBtn = document.getElementById('restartBtn');

// Event Listeners
imageInput.addEventListener('change', handleImageUpload);
processManualBtn.addEventListener('click', handleManualInput);
startQuizBtn.addEventListener('click', startQuiz);
submitAnswerBtn.addEventListener('click', submitAnswer);
skipBtn.addEventListener('click', skipQuestion);
restartBtn.addEventListener('click', restart);

// Initialize
showSection('upload-section');

// Handle image upload
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        imagePreview.innerHTML = `
            <img src="${e.target.result}" alt="Uploaded image">
            <p style="margin-top: 15px; color: #666;">
                📝 Image uploaded! Please enter kanji manually below or use OCR (coming soon).
            </p>
        `;
    };
    reader.readAsDataURL(file);
}

// Handle manual kanji input
function handleManualInput() {
    const text = manualKanji.value.trim();
    if (!text) {
        alert('Please enter some kanji characters');
        return;
    }

    const extractedKanji = extractKanji(text);
    
    if (extractedKanji.length === 0) {
        alert('No kanji characters found in the input');
        return;
    }

    detectedKanjiList = extractedKanji;
    displayDetectedKanji();
    showSection('detection-section');
}

// Display detected kanji
function displayDetectedKanji() {
    detectedKanjiEl.innerHTML = '';
    
    if (detectedKanjiList.length === 0) {
        detectedKanjiEl.innerHTML = '<p>No kanji detected. Please try again.</p>';
        return;
    }

    detectedKanjiList.forEach(kanjiInfo => {
        const kanjiItem = document.createElement('div');
        kanjiItem.className = 'kanji-item';
        kanjiItem.textContent = kanjiInfo.kanji;
        kanjiItem.title = `${kanjiInfo.meanings.join(', ')} (${kanjiInfo.reading})`;
        detectedKanjiEl.appendChild(kanjiItem);
    });

    const message = document.createElement('p');
    message.style.marginTop = '20px';
    message.style.textAlign = 'center';
    message.style.color = '#666';
    message.innerHTML = `Found <strong>${detectedKanjiList.length}</strong> kanji characters. Ready to start the quiz?`;
    detectedKanjiEl.appendChild(message);
}

// Start quiz
function startQuiz() {
    if (detectedKanjiList.length === 0) {
        alert('No kanji detected. Please upload an image or enter kanji manually.');
        return;
    }

    // Shuffle the kanji list for the quiz
    currentQuiz = [...detectedKanjiList].sort(() => Math.random() - 0.5);
    currentQuestionIndex = 0;
    quizResults = {
        known: [],
        unknown: [],
        score: 0
    };

    totalQuestions.textContent = currentQuiz.length;
    showSection('quiz-section');
    displayQuestion();
}

// Display current question
function displayQuestion() {
    if (currentQuestionIndex >= currentQuiz.length) {
        showResults();
        return;
    }

    const currentKanjiInfo = currentQuiz[currentQuestionIndex];
    questionNumber.textContent = `Question ${currentQuestionIndex + 1}`;
    currentKanjiEl.textContent = currentKanjiInfo.kanji;
    questionText.textContent = 'What does this kanji mean?';

    // Generate options
    const correctAnswer = currentKanjiInfo.meanings[0];
    const wrongAnswers = getRandomWrongAnswers(correctAnswer, 3);
    const allOptions = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);

    optionsContainer.innerHTML = '';
    allOptions.forEach(option => {
        const optionEl = document.createElement('div');
        optionEl.className = 'option';
        optionEl.textContent = option;
        optionEl.dataset.answer = option;
        optionEl.addEventListener('click', selectOption);
        optionsContainer.appendChild(optionEl);
    });

    feedback.classList.add('hidden');
    submitAnswerBtn.disabled = false;
    submitAnswerBtn.textContent = 'Submit Answer';
}

// Get random wrong answers
function getRandomWrongAnswers(correctAnswer, count) {
    const allMeanings = kanjiDatabase
        .flatMap(k => k.meanings)
        .filter(m => m !== correctAnswer);
    
    const uniqueMeanings = [...new Set(allMeanings)];
    const shuffled = uniqueMeanings.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// Select option
function selectOption(event) {
    const options = optionsContainer.querySelectorAll('.option');
    options.forEach(opt => opt.classList.remove('selected'));
    event.target.classList.add('selected');
}

// Submit answer
function submitAnswer() {
    const selectedOption = optionsContainer.querySelector('.option.selected');
    if (!selectedOption) {
        alert('Please select an answer');
        return;
    }

    const currentKanjiInfo = currentQuiz[currentQuestionIndex];
    const userAnswer = selectedOption.dataset.answer;
    const isCorrect = currentKanjiInfo.meanings.includes(userAnswer);

    // Show feedback
    const options = optionsContainer.querySelectorAll('.option');
    options.forEach(opt => {
        const answer = opt.dataset.answer;
        if (currentKanjiInfo.meanings.includes(answer)) {
            opt.classList.add('correct');
        } else if (opt === selectedOption && !isCorrect) {
            opt.classList.add('incorrect');
        }
        opt.style.pointerEvents = 'none';
    });

    feedback.classList.remove('hidden');
    if (isCorrect) {
        feedback.className = 'feedback correct';
        feedback.innerHTML = `✓ Correct! ${currentKanjiInfo.kanji} means "${currentKanjiInfo.meanings.join(', ')}"<br>Reading: ${currentKanjiInfo.reading}`;
        quizResults.known.push(currentKanjiInfo);
        quizResults.score++;
    } else {
        feedback.className = 'feedback incorrect';
        feedback.innerHTML = `✗ Incorrect. ${currentKanjiInfo.kanji} means "${currentKanjiInfo.meanings.join(', ')}"<br>Reading: ${currentKanjiInfo.reading}`;
        quizResults.unknown.push(currentKanjiInfo);
    }

    submitAnswerBtn.textContent = 'Next Question';
    submitAnswerBtn.disabled = false;
    submitAnswerBtn.onclick = nextQuestion;
}

// Skip question
function skipQuestion() {
    const currentKanjiInfo = currentQuiz[currentQuestionIndex];
    quizResults.unknown.push(currentKanjiInfo);
    
    feedback.classList.remove('hidden');
    feedback.className = 'feedback incorrect';
    feedback.innerHTML = `Skipped. ${currentKanjiInfo.kanji} means "${currentKanjiInfo.meanings.join(', ')}"<br>Reading: ${currentKanjiInfo.reading}`;
    
    setTimeout(nextQuestion, 1500);
}

// Next question
function nextQuestion() {
    currentQuestionIndex++;
    submitAnswerBtn.onclick = submitAnswer;
    displayQuestion();
}

// Show results
function showResults() {
    finalScore.textContent = quizResults.score;
    totalScore.textContent = currentQuiz.length;
    
    const percentage = Math.round((quizResults.score / currentQuiz.length) * 100);
    scorePercentage.textContent = `${percentage}%`;
    
    // Display known kanji
    knownKanjiEl.innerHTML = '';
    if (quizResults.known.length === 0) {
        knownKanjiEl.innerHTML = '<p style="color: #666;">None yet - keep studying!</p>';
    } else {
        quizResults.known.forEach(kanjiInfo => {
            const badge = document.createElement('div');
            badge.className = 'kanji-badge known';
            badge.textContent = kanjiInfo.kanji;
            badge.title = `${kanjiInfo.meanings.join(', ')} (${kanjiInfo.reading})`;
            knownKanjiEl.appendChild(badge);
        });
    }
    
    // Display unknown kanji
    unknownKanjiEl.innerHTML = '';
    if (quizResults.unknown.length === 0) {
        unknownKanjiEl.innerHTML = '<p style="color: #666;">Perfect score! You know all these kanji!</p>';
    } else {
        quizResults.unknown.forEach(kanjiInfo => {
            const badge = document.createElement('div');
            badge.className = 'kanji-badge unknown';
            badge.textContent = kanjiInfo.kanji;
            badge.title = `${kanjiInfo.meanings.join(', ')} (${kanjiInfo.reading})`;
            unknownKanjiEl.appendChild(badge);
        });
    }
    
    showSection('results-section');
}

// Show section
function showSection(sectionId) {
    const sections = [uploadSection, detectionSection, quizSection, resultsSection];
    sections.forEach(section => section.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
}

// Restart
function restart() {
    detectedKanjiList = [];
    currentQuiz = null;
    currentQuestionIndex = 0;
    quizResults = { known: [], unknown: [], score: 0 };
    
    imageInput.value = '';
    imagePreview.innerHTML = '';
    manualKanji.value = '';
    
    showSection('upload-section');
}
