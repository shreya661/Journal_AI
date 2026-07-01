// ===============================
// Theme Toggle
// ===============================
const themeToggle = document.getElementById('themeIcon');
const themeBtn = document.getElementById('themeToggle');
const html = document.documentElement;

const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    html.setAttribute('data-theme', 'dark');
    themeToggle.textContent = '☀️';
}

themeBtn.addEventListener('click', () => {
    const isDark = html.getAttribute('data-theme') === 'dark';
    if (isDark) {
        html.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        themeToggle.textContent = '🌙';
    } else {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeToggle.textContent = '☀️';
    }
});


// ===============================
// Elements & State
// ===============================
const textarea = document.getElementById("journalInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const moodAnalysis = document.getElementById("moodAnalysis");
const moodEmoji = document.getElementById("moodEmoji");
const moodTitle = document.getElementById("moodTitle");
const moodDescription = document.getElementById("moodDescription");
const moodTags = document.getElementById("moodTags");
const journalGrid = document.getElementById("journalGrid");
const charCount = document.getElementById("charCount");

const API_BASE = "http://127.0.0.1:8000";
let allJournals = []; // Global state for searching/filtering


// ===============================
// Toast Notification
// ===============================
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2800);
}


// ===============================
// Writing Goal (Word Counter)
// ===============================
const DAILY_WORD_GOAL = 30;
if (textarea) {
    textarea.addEventListener("input", () => {
        const text = textarea.value;
        charCount.textContent = `${text.length} character${text.length !== 1 ? 's' : ''}`;
        
        // Word Goal
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const progress = Math.min((words / DAILY_WORD_GOAL) * 100, 100);
        
        const goalFill = document.getElementById('goalBarFill');
        const goalWordCount = document.getElementById('goalWordCount');
        const goalStatus = document.getElementById('goalStatus');
        
        if (goalFill && goalWordCount && goalStatus) {
            goalFill.style.width = `${progress}%`;
            goalWordCount.textContent = `${words} / ${DAILY_WORD_GOAL} words`;
            goalStatus.textContent = `${Math.round(progress)}%`;
            if (progress >= 100) {
                goalFill.style.background = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
                goalStatus.style.color = "#10b981";
            } else {
                goalFill.style.background = "";
                goalStatus.style.color = "";
            }
        }
    });
}


// ===============================
// Analyze & Save
// ===============================
if (analyzeBtn) {
    analyzeBtn.addEventListener("click", saveJournal);
}

async function saveJournal() {
    const entry = textarea.value;

    if (!entry.trim()) {
        textarea.focus();
        textarea.style.borderColor = '#ef4444';
        setTimeout(() => { textarea.style.borderColor = ''; }, 2000);
        return;
    }

    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<span class="btn-content"><span class="sparkle">⏳</span> Analyzing...</span>';

    try {
        const response = await fetch(`${API_BASE}/journal`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entry: entry })
        });

        if (!response.ok) {
            throw new Error("Could not save journal.");
        }

        const data = await response.json();

        // Show mood analysis section
        moodAnalysis.classList.add("active");

        const moodWord = extractMoodWord(data.analysis);
        moodEmoji.textContent = getEmoji(moodWord);
        moodTitle.textContent = getMoodTitle(moodWord);
        moodDescription.textContent = data.suggestion || getMoodDescription(moodWord);
        moodTags.innerHTML = getMoodTagsHTML(moodWord);

        // Show AI comfort advice card if mood is negative
        const adviceCard = document.getElementById('aiAdviceCard');
        const adviceText = document.getElementById('aiAdviceText');
        if (data.ai_advice && adviceCard && adviceText) {
            adviceText.textContent = data.ai_advice;
            adviceCard.style.display = 'block';
            adviceCard.style.animation = 'none';
            adviceCard.offsetHeight; // reflow
            adviceCard.style.animation = '';
        } else if (adviceCard) {
            adviceCard.style.display = 'none';
        }

        moodAnalysis.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Clear input
        textarea.value = "";
        if (charCount) charCount.textContent = "0 characters";
        textarea.dispatchEvent(new Event('input')); // reset goal

        showToast("✨ Journal saved & analyzed!", "success");

        // Reload everything
        loadJournals();
        loadStreak();
        loadWeeklySummary();

    } catch (error) {
        console.error(error);
        showToast("❌ Could not connect to backend", "danger");
    }

    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = '<span class="btn-content"><span class="sparkle">✨</span> Analyze & Save</span>';
}


// ===============================
// Load Journals & Render
// ===============================
async function loadJournals() {
    try {
        const response = await fetch(`${API_BASE}/journal`);
        allJournals = await response.json();
        
        renderJournals(allJournals);
        renderMoodChart(allJournals);
        renderCalendar(allJournals);
    } catch (error) {
        console.error("Failed to load journals:", error);
    }
}

function renderJournals(journals) {
    if (!journalGrid) return;
    journalGrid.innerHTML = "";

    if (journals.length === 0) {
        journalGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <p>No journal entries found.</p>
            </div>
        `;
        document.getElementById("countBadge").textContent = "0 entries";
        return;
    }

    journals.forEach((journal) => {
        const date = journal.created_at ? new Date(journal.created_at) : null;
        const day = date ? date.getDate() : "—";
        const monthYear = date
            ? date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
            : "";
        const time = date
            ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
            : "";

        const moodWord = extractMoodWord(journal.mood);
        const emoji = getEmoji(moodWord);
        const moodLabel = moodWord.charAt(0).toUpperCase() + moodWord.slice(1);
        const tags = getMoodRelatedTags(moodWord);
        const isPinned = journal.is_pinned || false;
        const fullDate = date ? date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';

        const card = document.createElement('article');
        card.className = `journal-entry-card${isPinned ? ' pinned' : ''}`;
        card.id = `card-${journal.id}`;

        card.innerHTML = `
            <div class="entry-header">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div class="entry-date">
                        <span class="day">${day}</span>
                        <span class="month-year">${monthYear}</span>
                    </div>
                    ${time ? `<span class="entry-time">🕐 ${time}</span>` : ''}
                    ${isPinned ? `<span class="pin-indicator">📌 Pinned</span>` : ''}
                </div>
                <div class="entry-mood">
                    <span class="emoji">${emoji}</span>
                    <span>${moodLabel}</span>
                </div>
            </div>

            <p class="entry-text" id="text-${journal.id}" onclick="toggleExpand(${journal.id})">
                ${escapeHTML(journal.entry)}
            </p>

            <!-- Inline Expanded View -->
            <div class="entry-expanded" id="expanded-${journal.id}">
                <div class="expanded-content">
                    <div class="expanded-full-text">${escapeHTML(journal.entry)}</div>
                    <div class="expanded-meta">
                        <span>📅 ${fullDate}</span>
                        <span>🕐 ${time}</span>
                        <span>${emoji} ${moodLabel}</span>
                    </div>
                    ${journal.ai_advice ? `
                    <div class="entry-advice">
                        <div class="entry-advice-header">
                            <span>💝 AI Comfort & Advice</span>
                        </div>
                        <p>${escapeHTML(journal.ai_advice)}</p>
                    </div>` : ''}
                </div>
            </div>

            <!-- Inline Edit Section -->
            <div class="entry-edit-section" id="edit-section-${journal.id}">
                <div class="edit-container">
                    <div class="edit-label">✏️ Edit Journal Entry</div>
                    <textarea class="edit-textarea" id="edit-textarea-${journal.id}">${escapeHTML(journal.entry)}</textarea>
                    <div class="edit-actions">
                        <button class="edit-btn edit-btn-cancel" onclick="closeEdit(${journal.id})">
                            Cancel
                        </button>
                        <button class="edit-btn edit-btn-save" onclick="saveEdit(${journal.id})">
                            💾 Save Changes
                        </button>
                    </div>
                </div>
            </div>

            <!-- Delete Confirmation -->
            <div class="delete-confirm" id="delete-confirm-${journal.id}">
                <div class="delete-confirm-box">
                    <div class="delete-confirm-text">
                        <span class="icon">⚠️</span>
                        <p>Delete this entry permanently?</p>
                    </div>
                    <div class="delete-confirm-actions">
                        <button class="delete-btn-no" onclick="closeDeleteConfirm(${journal.id})">Keep</button>
                        <button class="delete-btn-yes" onclick="confirmDelete(${journal.id})">🗑️ Delete</button>
                    </div>
                </div>
            </div>

            <div class="entry-footer">
                <div class="entry-tags">
                    ${tags.map(tag => `<span class="entry-tag">${tag}</span>`).join('')}
                    ${journal.ai_advice ? `<span class="entry-tag advice-pill" onclick="toggleExpand(${journal.id})" title="AI has comfort advice — click to read" style="background:rgba(245,158,11,0.1);color:#f59e0b;border:1px solid rgba(245,158,11,0.2);cursor:pointer;">💝 AI Advice</span>` : ''}
                </div>

                <div class="entry-actions">
                    <button class="entry-action-btn btn-expand" data-tooltip="Expand" onclick="toggleExpand(${journal.id})">
                        📖
                    </button>
                    <button class="entry-action-btn btn-edit" data-tooltip="Edit" onclick="openEdit(${journal.id})">
                        ✏️
                    </button>
                    <button class="entry-action-btn btn-pin ${isPinned ? 'active' : ''}" data-tooltip="${isPinned ? 'Unpin' : 'Pin'}" onclick="togglePin(${journal.id})">
                        📌
                    </button>
                    <button class="entry-action-btn btn-delete" data-tooltip="Delete" onclick="openDeleteConfirm(${journal.id})">
                        🗑️
                    </button>
                </div>
            </div>
        `;
        journalGrid.appendChild(card);
    });

    const badge = document.getElementById("countBadge");
    if (badge) {
        const pinnedCount = journals.filter(j => j.is_pinned).length;
        let text = `${journals.length} entr${journals.length === 1 ? 'y' : 'ies'}`;
        if (pinnedCount > 0) text += ` · ${pinnedCount} pinned`;
        badge.textContent = text;
    }
}


// ===============================
// Search & Filter
// ===============================
const searchInput = document.getElementById("searchInput");
const moodFilterSelect = document.getElementById("moodFilterSelect");

function applyFilters() {
    const query = searchInput.value.toLowerCase();
    const moodFilter = moodFilterSelect.value.toLowerCase();

    const filtered = allJournals.filter(j => {
        const textMatch = j.entry.toLowerCase().includes(query);
        const entryMood = extractMoodWord(j.mood).toLowerCase();
        const moodMatch = moodFilter === "all" || entryMood.includes(moodFilter);
        return textMatch && moodMatch;
    });

    renderJournals(filtered);
}

if (searchInput) searchInput.addEventListener("input", applyFilters);
if (moodFilterSelect) moodFilterSelect.addEventListener("change", applyFilters);


// ===============================
// Export to TXT
// ===============================
const exportBtn = document.getElementById("exportBtn");
if (exportBtn) {
    exportBtn.addEventListener("click", () => {
        if (allJournals.length === 0) {
            showToast("No entries to export", "info");
            return;
        }
        
        let txt = "AI Journal Export\n==================\n\n";
        allJournals.forEach(j => {
            const date = new Date(j.created_at).toLocaleString();
            txt += `Date: ${date}\nMood: ${j.mood}\nEntry:\n${j.entry}\n`;
            if (j.ai_advice) txt += `\nAI Advice: ${j.ai_advice}\n`;
            txt += `\n------------------\n\n`;
        });
        
        const blob = new Blob([txt], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AI_Journal_Export_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("📥 Journals exported successfully", "success");
    });
}




// ===============================
// Streak & Weekly Summary
// ===============================
async function loadStreak() {
    try {
        const response = await fetch(`${API_BASE}/streak`);
        const data = await response.json();
        const streakEl = document.getElementById('streakCount');
        const streakSubEl = document.getElementById('streakSub');
        
        if (streakEl && streakSubEl) {
            streakEl.textContent = data.streak;
            if (data.streak > 3) {
                streakSubEl.textContent = "You're on fire! Keep it going.";
            } else if (data.streak > 0) {
                streakSubEl.textContent = "Great job building the habit.";
            } else {
                streakSubEl.textContent = "Start your streak today!";
            }
        }
    } catch (e) {
        console.error("Failed to load streak", e);
    }
}

async function loadWeeklySummary() {
    try {
        const response = await fetch(`${API_BASE}/weekly-summary`);
        const data = await response.json();
        const weeklyCard = document.getElementById('weeklySummaryCard');
        
        if (!weeklyCard) return;

        if (data.week_count > 0) {
            weeklyCard.style.display = "block";
            document.getElementById('weeklyCount').textContent = data.week_count;
            document.getElementById('weeklyTopMood').textContent = data.top_mood;
            document.getElementById('weeklyTopMoodEmoji').textContent = getEmoji(data.top_mood);
            document.getElementById('weeklyActiveDay').textContent = data.most_active_day;
        } else {
            weeklyCard.style.display = "none";
        }
    } catch (e) {
        console.error("Failed to load weekly summary", e);
    }
}


// ===============================
// Render Mood Chart
// ===============================
function renderMoodChart(journals) {
    const chartCard = document.getElementById("moodChartCard");
    const chartBars = document.getElementById("moodChartBars");
    if (!chartCard || !chartBars) return;

    if (journals.length === 0) {
        chartCard.style.display = "none";
        return;
    }
    
    chartCard.style.display = "block";
    chartBars.innerHTML = "";

    const counts = {};
    journals.forEach(j => {
        const m = extractMoodWord(j.mood);
        counts[m] = (counts[m] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(counts));
    const categories = Object.keys(counts).sort((a,b) => counts[b] - counts[a]).slice(0, 7); // top 7

    categories.forEach(cat => {
        const h = (counts[cat] / maxCount) * 100;
        const color = getMoodColor(cat);
        const group = document.createElement("div");
        group.className = "chart-bar-group";
        group.innerHTML = `
            <div class="chart-bar-count">${counts[cat]}</div>
            <div class="chart-bar" style="height: ${h}%; background: ${color}"></div>
            <div class="chart-bar-label">${getEmoji(cat)}</div>
        `;
        chartBars.appendChild(group);
    });
}


// ===============================
// Render Mood Calendar
// ===============================
function renderCalendar(journals) {
    const calCard = document.getElementById("moodCalendarCard");
    const calGrid = document.getElementById("calendarGrid");
    const calMonthYear = document.getElementById("calMonthYear");
    
    if (!calCard || !calGrid) return;
    if (journals.length === 0) {
        calCard.style.display = "none";
        return;
    }
    calCard.style.display = "block";
    
    const now = new Date();
    calMonthYear.textContent = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Map dates to moods
    const dateMoods = {};
    journals.forEach(j => {
        const d = new Date(j.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        // take latest mood of the day
        if (!dateMoods[key]) {
            dateMoods[key] = extractMoodWord(j.mood);
        }
    });

    calGrid.innerHTML = "";
    
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

    // blanks
    for (let i = 0; i < firstDay; i++) {
        calGrid.innerHTML += `<div class="cal-day empty"></div>`;
    }

    // days
    for (let day = 1; day <= daysInMonth; day++) {
        const key = `${now.getFullYear()}-${now.getMonth()}-${day}`;
        let moodClass = "no-entry";
        let title = "No entry";
        
        if (dateMoods[key]) {
            const m = dateMoods[key];
            moodClass = getMoodCSSClass(m);
            title = `${m} ${getEmoji(m)}`;
        }

        const isToday = key === todayKey ? "today" : "";
        
        calGrid.innerHTML += `<div class="cal-day ${moodClass} ${isToday}" title="${title}">${day}</div>`;
    }
}

function getMoodColor(mood) {
    mood = mood.toLowerCase();
    if (mood.includes("happy")) return "#10b981";
    if (mood.includes("calm")) return "#3b82f6";
    if (mood.includes("stress")) return "#dc2626";
    if (mood.includes("angry")) return "#b91c1c";
    if (mood.includes("anxious")) return "#7c3aed";
    if (mood.includes("sad")) return "#6b7280";
    if (mood.includes("motivat")) return "#dc2626";
    if (mood.includes("excit")) return "#d97706";
    return "var(--accent-purple)";
}

function getMoodCSSClass(mood) {
    mood = mood.toLowerCase();
    if (mood.includes("happy") || mood.includes("content")) return "mood-happy";
    if (mood.includes("calm")) return "mood-calm";
    if (mood.includes("stress")) return "mood-stressed";
    if (mood.includes("angry")) return "mood-angry";
    if (mood.includes("anxious")) return "mood-anxious";
    if (mood.includes("sad") || mood.includes("lonely") || mood.includes("tired")) return "mood-sad";
    if (mood.includes("motivat") || mood.includes("proud")) return "mood-motivated";
    if (mood.includes("excit")) return "mood-excited";
    if (mood.includes("reflect")) return "mood-reflective";
    return "mood-other";
}


// ===============================
// Card Actions (Expand, Edit, Delete, Pin)
// ===============================
function toggleExpand(id) {
    const expanded = document.getElementById(`expanded-${id}`);
    const textEl = document.getElementById(`text-${id}`);
    closeEdit(id);
    closeDeleteConfirm(id);

    if (expanded.classList.contains('open')) {
        expanded.classList.remove('open');
        textEl.classList.remove('expanded');
    } else {
        expanded.classList.add('open');
        textEl.classList.add('expanded');
    }
}

function openEdit(id) {
    const expanded = document.getElementById(`expanded-${id}`);
    const textEl = document.getElementById(`text-${id}`);
    if (expanded) {
        expanded.classList.remove('open');
        textEl.classList.remove('expanded');
    }
    closeDeleteConfirm(id);
    const editSection = document.getElementById(`edit-section-${id}`);
    editSection.classList.add('open');
    setTimeout(() => {
        const editTextarea = document.getElementById(`edit-textarea-${id}`);
        if (editTextarea) {
            editTextarea.focus();
            editTextarea.setSelectionRange(editTextarea.value.length, editTextarea.value.length);
        }
    }, 300);
}

function closeEdit(id) {
    const editSection = document.getElementById(`edit-section-${id}`);
    if (editSection) editSection.classList.remove('open');
}

async function saveEdit(id) {
    const editTextarea = document.getElementById(`edit-textarea-${id}`);
    const newEntry = editTextarea.value.trim();
    if (!newEntry) {
        editTextarea.style.borderColor = '#ef4444';
        setTimeout(() => { editTextarea.style.borderColor = ''; }, 2000);
        return;
    }
    const saveBtn = editTextarea.parentElement.querySelector('.edit-btn-save');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '⏳ Saving...';
    saveBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/journal/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entry: newEntry })
        });
        if (!response.ok) throw new Error("Update failed");
        showToast("✅ Entry updated successfully!", "success");
        loadJournals(); // reloads UI
        loadStreak();
        loadWeeklySummary();
    } catch (error) {
        console.error(error);
        showToast("❌ Failed to update entry", "danger");
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

function openDeleteConfirm(id) {
    const expanded = document.getElementById(`expanded-${id}`);
    const textEl = document.getElementById(`text-${id}`);
    if (expanded) {
        expanded.classList.remove('open');
        textEl.classList.remove('expanded');
    }
    closeEdit(id);
    const confirmEl = document.getElementById(`delete-confirm-${id}`);
    confirmEl.classList.add('open');
}

function closeDeleteConfirm(id) {
    const confirmEl = document.getElementById(`delete-confirm-${id}`);
    if (confirmEl) confirmEl.classList.remove('open');
}

async function confirmDelete(id) {
    try {
        const card = document.getElementById(`card-${id}`);
        card.classList.add('card-removing');

        const response = await fetch(`${API_BASE}/journal/${id}`, {
            method: "DELETE"
        });
        if (!response.ok) throw new Error("Delete failed");

        setTimeout(() => {
            showToast("🗑️ Entry deleted", "danger");
            loadJournals();
            loadStreak();
            loadWeeklySummary();
        }, 500);
    } catch (error) {
        console.error(error);
        showToast("❌ Failed to delete entry", "danger");
        const card = document.getElementById(`card-${id}`);
        if (card) card.classList.remove('card-removing');
    }
}

async function togglePin(id) {
    try {
        const response = await fetch(`${API_BASE}/journal/${id}/pin`, {
            method: "PATCH"
        });
        if (!response.ok) throw new Error("Pin toggle failed");
        const data = await response.json();
        showToast(data.is_pinned ? "📌 Entry pinned to top!" : "📌 Entry unpinned", "info");
        loadJournals();
    } catch (error) {
        console.error(error);
        showToast("❌ Failed to update pin", "danger");
    }
}


// ===============================
// Basic Helpers
// ===============================
function extractMoodWord(mood) {
    if (!mood) return "neutral";
    return mood.replace(/[\u{1F600}-\u{1F9FF}]/gu, '').trim().toLowerCase();
}

function getEmoji(mood) {
    if (!mood) return "💜";
    mood = mood.toLowerCase();
    if (mood.includes("sad")) return "😔";
    if (mood.includes("happy")) return "😊";
    if (mood.includes("stress")) return "😰";
    if (mood.includes("calm")) return "😌";
    if (mood.includes("angry")) return "😡";
    if (mood.includes("motivated")) return "🔥";
    if (mood.includes("excited")) return "🤩";
    if (mood.includes("reflective")) return "🤔";
    if (mood.includes("anxious")) return "😟";
    if (mood.includes("grateful")) return "🤗";
    if (mood.includes("hopeful")) return "🌟";
    if (mood.includes("lonely")) return "😞";
    if (mood.includes("content")) return "😊";
    if (mood.includes("optimistic")) return "😊";
    if (mood.includes("tired")) return "😴";
    if (mood.includes("confused")) return "😕";
    if (mood.includes("proud")) return "💪";
    if (mood.includes("loved")) return "🥰";
    return "💜";
}

function getMoodTitle(mood) {
    if (!mood) return "Mood Analyzed";
    mood = mood.toLowerCase();
    if (mood.includes("sad")) return "Sad & Reflective";
    if (mood.includes("happy")) return "Positive & Optimistic";
    if (mood.includes("stress")) return "Stressed & Overwhelmed";
    if (mood.includes("calm")) return "Calm & Centered";
    if (mood.includes("angry")) return "Frustrated & Intense";
    if (mood.includes("motivated")) return "Motivated & Driven";
    if (mood.includes("excited")) return "Excited & Energetic";
    if (mood.includes("reflective")) return "Thoughtful & Reflective";
    if (mood.includes("anxious")) return "Anxious & Uneasy";
    if (mood.includes("grateful")) return "Grateful & Warm";
    if (mood.includes("hopeful")) return "Hopeful & Bright";
    if (mood.includes("lonely")) return "Lonely & Withdrawn";
    if (mood.includes("content")) return "Content & Peaceful";
    if (mood.includes("tired")) return "Tired & Drained";
    if (mood.includes("proud")) return "Proud & Accomplished";
    if (mood.includes("loved")) return "Loved & Connected";
    return mood.charAt(0).toUpperCase() + mood.slice(1);
}

function getMoodDescription(mood) {
    if (!mood) return "Thank you for sharing your thoughts today 💜";
    mood = mood.toLowerCase();
    if (mood.includes("sad")) return "Your writing carries a weight of sadness. It's okay to feel this way — acknowledging your emotions is the first step toward healing.";
    if (mood.includes("happy")) return "Your journal reflects a sense of hope and contentment. You seem to be in a good place emotionally, finding joy in everyday moments.";
    if (mood.includes("stress")) return "There's tension in your words. Consider taking a break, practicing deep breathing, or stepping away to recharge.";
    if (mood.includes("calm")) return "Your writing shows a peaceful state of mind. You appear grounded and in touch with your inner self, embracing tranquility.";
    if (mood.includes("angry")) return "Your entry shows frustration. Channel that energy into something constructive — sometimes anger reveals what matters most to us.";
    if (mood.includes("motivated")) return "There's a strong sense of determination in your words. You are focused on your goals and ready to take on challenges.";
    if (mood.includes("excited")) return "Your enthusiasm is contagious! You're clearly looking forward to something meaningful. Ride that wave of positive energy.";
    if (mood.includes("reflective")) return "You're in a thoughtful space, processing experiences deeply. Self-reflection is a powerful tool for personal growth.";
    if (mood.includes("anxious")) return "Your words hint at worry. Remember to ground yourself in the present moment — most fears don't come to pass.";
    if (mood.includes("grateful")) return "Your entry radiates appreciation for the people and experiences in your life. Gratitude nurtures wellbeing.";
    if (mood.includes("lonely")) return "Feeling alone can be tough. Reach out to someone you trust, or write more — journaling itself can be a comforting companion.";
    if (mood.includes("tired")) return "Rest is not a luxury, it's a necessity. Give yourself permission to slow down and recharge.";
    if (mood.includes("proud")) return "You should be proud! Recognizing your achievements, big or small, fuels continued growth.";
    return "Thank you for sharing your thoughts today 💜";
}

function getMoodTagsHTML(mood) {
    const tags = getMoodRelatedTags(mood);
    return tags.map(tag => `<span class="mood-tag">${tag}</span>`).join('');
}

function getMoodRelatedTags(mood) {
    if (!mood) return ["Reflection"];
    mood = mood.toLowerCase();
    if (mood.includes("sad")) return ["Sadness", "Healing", "Vulnerability"];
    if (mood.includes("happy")) return ["Gratitude", "Hope", "Contentment"];
    if (mood.includes("stress")) return ["Tension", "Pressure", "Coping"];
    if (mood.includes("calm")) return ["Peace", "Mindfulness", "Balance"];
    if (mood.includes("angry")) return ["Frustration", "Passion", "Boundaries"];
    if (mood.includes("motivated")) return ["Ambition", "Focus", "Energy"];
    if (mood.includes("excited")) return ["Joy", "Anticipation", "Enthusiasm"];
    if (mood.includes("reflective")) return ["Growth", "Introspection", "Wisdom"];
    if (mood.includes("anxious")) return ["Worry", "Uncertainty", "Awareness"];
    if (mood.includes("grateful")) return ["Appreciation", "Love", "Connection"];
    if (mood.includes("lonely")) return ["Solitude", "Longing", "Self-care"];
    if (mood.includes("tired")) return ["Rest", "Recovery", "Patience"];
    if (mood.includes("proud")) return ["Achievement", "Confidence", "Growth"];
    return ["Reflection", "Awareness"];
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}


// ===============================
// Initial Load
// ===============================
loadJournals();
loadStreak();
loadWeeklySummary();