// Global state
let currentCoach = null;
let sessions = [];
let coaches = [];

// DOM elements
const coachSelect = document.getElementById('coachSelect');
const mainContent = document.getElementById('mainContent');
const addSessionForm = document.getElementById('addSessionForm');
const sessionsList = document.getElementById('sessionsList');
const historyFilter = document.getElementById('historyFilter');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const toastContainer = document.getElementById('toastContainer');

// API base URL
const API_BASE = '/api';

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// Initialize the application
async function initializeApp() {
    await loadCoaches();
    setDefaultDate();
}

// Setup event listeners
function setupEventListeners() {
    // Coach selection
    coachSelect.addEventListener('change', handleCoachChange);
    
    // Session form
    addSessionForm.addEventListener('submit', handleAddSession);
    
    // History controls
    historyFilter.addEventListener('change', filterSessions);
    clearHistoryBtn.addEventListener('click', handleClearHistory);
}

// API utility functions
async function apiRequest(endpoint, options = {}) {
    showLoading();
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        showToast(error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

// Loading indicator functions
function showLoading() {
    loadingIndicator.classList.remove('hidden');
}

function hideLoading() {
    loadingIndicator.classList.add('hidden');
}

// Toast notification functions
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Load coaches from API
async function loadCoaches() {
    try {
        coaches = await apiRequest('/coaches');
        updateCoachSelect();
    } catch (error) {
        console.error('Failed to load coaches:', error);
    }
}

// Update coach select dropdown
function updateCoachSelect() {
    coachSelect.innerHTML = '<option value="">Sélectionnez un Coach</option>';
    
    coaches.forEach(coach => {
        const option = document.createElement('option');
        option.value = coach.id;
        option.textContent = coach.name;
        coachSelect.appendChild(option);
    });
}

// Handle coach selection change
async function handleCoachChange() {
    const coachId = coachSelect.value;
    
    if (!coachId || coachId === 'undefined' || coachId === '') {
        mainContent.classList.add('hidden');
        currentCoach = null;
        return;
    }
    
    currentCoach = coaches.find(coach => coach.id === coachId);
    if (!currentCoach) {
        console.error('Coach not found:', coachId);
        return;
    }
    
    mainContent.classList.remove('hidden');
    await loadCoachData(coachId);
}

// Load coach data (progress and sessions)
async function loadCoachData(coachId) {
    try {
        const [progress, sessionsData] = await Promise.all([
            apiRequest(`/coaches/${coachId}/progress`),
            apiRequest(`/coaches/${coachId}/sessions`)
        ]);
        
        sessions = sessionsData;
        updateProgressDisplay(progress);
        displaySessions();
    } catch (error) {
        console.error('Failed to load coach data:', error);
    }
}

// Update progress display
function updateProgressDisplay(progress) {
    // Update each equipment type
    Object.keys(progress).forEach(equipment => {
        const equipmentData = progress[equipment];
        
        // Update practice progress
        const practiceHours = document.getElementById(`${equipment}PracticeHours`);
        const practiceProgress = document.getElementById(`${equipment}PracticeProgress`);
        
        if (practiceHours) practiceHours.textContent = equipmentData.practice;
        if (practiceProgress) {
            practiceProgress.style.width = `${equipmentData.practicePercentage}%`;
        }
        
        // Update observation progress
        const observationHours = document.getElementById(`${equipment}ObservationHours`);
        const observationProgress = document.getElementById(`${equipment}ObservationProgress`);
        
        if (observationHours) observationHours.textContent = equipmentData.observation;
        if (observationProgress) {
            observationProgress.style.width = `${equipmentData.observationPercentage}%`;
        }
        
        // Update total hours
        const totalHours = document.getElementById(`${equipment}TotalHours`);
        if (totalHours) totalHours.textContent = equipmentData.total;
    });
}

// Display sessions
function displaySessions() {
    const filter = historyFilter.value;
    let filteredSessions = sessions;
    
    if (filter !== 'all') {
        filteredSessions = sessions.filter(session => session.equipment === filter);
    }
    
    if (filteredSessions.length === 0) {
        sessionsList.innerHTML = `
            <div class="empty-state">
                <h3>Aucune séance trouvée</h3>
                <p>Ajoutez votre première séance d'entraînement pour commencer !</p>
            </div>
        `;
        return;
    }
    
    // Equipment name translations
    const equipmentTranslations = {
        'reformer': 'Reformer',
        'mat': 'Tapis',
        'chair': 'Chaise'
    };
    
    sessionsList.innerHTML = filteredSessions.map(session => `
        <div class="session-item">
            <div class="session-details">
                <div class="session-date">${formatDate(session.date)}</div>
                <div class="session-info">
                    <span class="session-equipment">${equipmentTranslations[session.equipment] || session.equipment}</span>
                    <span class="session-type ${session.type}">${session.type === 'practice' ? 'Pratique' : 'Observation'}</span>
                </div>
            </div>
            <div class="session-hours">${session.hours}h</div>
            <div class="session-actions">
                <button class="btn-small btn-delete" onclick="deleteSession(${session.id})">
                    Supprimer
                </button>
            </div>
        </div>
    `).join('');
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Filter sessions
function filterSessions() {
    displaySessions();
}


// Handle add session form submission
async function handleAddSession(event) {
    event.preventDefault();
    
    if (!currentCoach) {
        showToast('Veuillez d\'abord sélectionner un coach', 'error');
        return;
    }
    
    const formData = new FormData(addSessionForm);
    const sessionData = {
        date: document.getElementById('sessionDate').value,
        equipment: document.getElementById('sessionEquipment').value,
        type: document.getElementById('sessionType').value,
        hours: parseFloat(document.getElementById('sessionHours').value)
    };
    
    // Validation
    if (!sessionData.date || !sessionData.equipment || !sessionData.type || !sessionData.hours) {
        showToast('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    if (sessionData.hours <= 0 || sessionData.hours > 24) {
        showToast('Les heures doivent être entre 0.5 et 24', 'error');
        return;
    }
    
    try {
        await apiRequest(`/coaches/${currentCoach.id}/sessions`, {
            method: 'POST',
            body: JSON.stringify(sessionData)
        });
        
        showToast('Séance ajoutée avec succès !');
        addSessionForm.reset();
        setDefaultDate();
        
        // Reload coach data
        await loadCoachData(currentCoach.id);
    } catch (error) {
        console.error('Failed to add session:', error);
    }
}

// Delete session
async function deleteSession(sessionId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette séance ?')) {
        return;
    }
    
    try {
        await apiRequest(`/sessions/${sessionId}`, {
            method: 'DELETE'
        });
        
        showToast('Séance supprimée avec succès !');
        
        // Reload coach data
        await loadCoachData(currentCoach.id);
    } catch (error) {
        console.error('Failed to delete session:', error);
    }
}

// Handle clear history
async function handleClearHistory() {
    if (!currentCoach) {
        showToast('Veuillez d\'abord sélectionner un coach', 'error');
        return;
    }
    
    if (!confirm(`Êtes-vous sûr de vouloir effacer tout l'historique d'entraînement pour ${currentCoach.name} ? Cette action ne peut pas être annulée.`)) {
        return;
    }
    
    try {
        await apiRequest(`/coaches/${currentCoach.id}/sessions`, {
            method: 'DELETE'
        });
        
        showToast('Tout l\'historique a été effacé avec succès !');
        
        // Reload coach data
        await loadCoachData(currentCoach.id);
    } catch (error) {
        console.error('Failed to clear history:', error);
    }
}

// Set default date to today
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('sessionDate').value = today;
}

// Health check function (for debugging)
async function healthCheck() {
    try {
        const health = await apiRequest('/health');
        console.log('Health check:', health);
        return health;
    } catch (error) {
        console.error('Health check failed:', error);
        return null;
    }
}

// Export functions for debugging (if needed)
window.coachTracker = {
    healthCheck,
    loadCoaches,
    loadCoachData,
    currentCoach,
    coaches,
    sessions
};
