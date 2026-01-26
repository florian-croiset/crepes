// ==========================================
// Configuration Supabase
// ==========================================
const SUPABASE_URL = 'https://upzfptvgejorgvylcgmh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwemZwdHZnZWpvcmd2eWxjZ21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NTEwODIsImV4cCI6MjA4NTAyNzA4Mn0.6McRNtHBWeO7vcKlojPO6sjwa8_otT7v3lMcprrdopw';

// Initialisation du client Supabase
const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// État de l'application
// ==========================================
const appState = {
    currentUser: null,
    participants: [],
    settings: {
        num_plates: 2,
        is_closed: false,
        total_cost: 0
    },
    previousRank: null,
    priorityReminderInterval: null
};

// ==========================================
// Éléments DOM
// ==========================================
const elements = {
    // Écrans
    loginScreen: document.getElementById('login-screen'),
    mainScreen: document.getElementById('main-screen'),
    
    // Login
    loginForm: document.getElementById('login-form'),
    usernameInput: document.getElementById('username-input'),
    codeInput: document.getElementById('code-input'),
    loginError: document.getElementById('login-error'),
    
    // Header
    currentUsername: document.getElementById('current-username'),
    logoutBtn: document.getElementById('logout-btn'),
    
    // Status
    sessionStatus: document.getElementById('session-status'),
    userStatusCard: document.getElementById('user-status-card'),
    priorityBadge: document.getElementById('priority-badge'),
    userRank: document.getElementById('user-rank'),
    userCrepes: document.getElementById('user-crepes'),
    activePlates: document.getElementById('active-plates'),
    addCrepeBtn: document.getElementById('add-crepe-btn'),
    skipTurnBtn: document.getElementById('skip-turn-btn'),
    
    // Queue
    queueList: document.getElementById('queue-list'),
    
    // Admin
    adminPanel: document.getElementById('admin-panel'),
    platesInput: document.getElementById('plates-input'),
    updatePlatesBtn: document.getElementById('update-plates-btn'),
    costInput: document.getElementById('cost-input'),
    updateCostBtn: document.getElementById('update-cost-btn'),
    adminParticipantsList: document.getElementById('admin-participants-list'),
    closeSessionBtn: document.getElementById('close-session-btn'),
    reopenSessionBtn: document.getElementById('reopen-session-btn'),
    
    // Modal
    closeModal: document.getElementById('close-modal'),
    finalResults: document.getElementById('final-results'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    
    // Toast
    toast: document.getElementById('toast')
};

// ==========================================
// Fonctions utilitaires
// ==========================================

/**
 * Affiche un message toast
 */
function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

/**
 * Calcule le rang d'un participant dans la file
 */
function calculateRank(participant, allParticipants) {
    // Tri par crepe_count (croissant), puis par last_eaten_at (le plus ancien en premier)
    const sorted = [...allParticipants].sort((a, b) => {
        if (a.crepe_count !== b.crepe_count) {
            return a.crepe_count - b.crepe_count;
        }
        return new Date(a.last_eaten_at) - new Date(b.last_eaten_at);
    });
    
    return sorted.findIndex(p => p.id === participant.id) + 1;
}

/**
 * Vérifie si un participant est dans le top P (prioritaire)
 */
function isPriority(rank, numPlates) {
    return rank <= numPlates;
}

/**
 * Déclenche une vibration et une animation pour alerter l'utilisateur
 */
function triggerPriorityAlert() {
    // Vibration (si supporté)
    if ('vibrate' in navigator) {
        navigator.vibrate(200);
    }
    
    // Animation visuelle
    elements.userStatusCard.classList.add('priority');
    
    showToast('🎉 Tu es maintenant PRIORITAIRE !');
}

/**
 * Formatte une date ISO en heure locale
 */
function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ==========================================
// Fonctions de rendu
// ==========================================

/**
 * Met à jour l'affichage du statut utilisateur
 */
function updateUserStatus() {
    if (!appState.currentUser) return;
    
    const currentUserData = appState.participants.find(p => p.id === appState.currentUser.id);
    if (!currentUserData) return;
    
    const rank = calculateRank(currentUserData, appState.participants);
    const isPriorityStatus = isPriority(rank, appState.settings.num_plates);
    
    // Vérifier si le rang a changé et si on entre dans le top P
    if (appState.previousRank !== null && 
        appState.previousRank > appState.settings.num_plates && 
        rank <= appState.settings.num_plates) {
        triggerPriorityAlert();
    }
    
    appState.previousRank = rank;
    
    // Gérer les vibrations récurrentes
    if (isPriorityStatus && !appState.settings.is_closed) {
        // Démarrer les vibrations toutes les minutes si pas déjà actif
        if (!appState.priorityReminderInterval) {
            appState.priorityReminderInterval = setInterval(() => {
                if ('vibrate' in navigator) {
                    navigator.vibrate([200, 100, 200]); // Pattern: vibrer-pause-vibrer
                }
            }, 60000); // Toutes les 60 secondes
        }
    } else {
        // Arrêter les vibrations si plus prioritaire
        if (appState.priorityReminderInterval) {
            clearInterval(appState.priorityReminderInterval);
            appState.priorityReminderInterval = null;
        }
    }
    
    // Mise à jour de l'affichage
    elements.userRank.textContent = `${rank}${getRankSuffix(rank)}`;
    elements.userCrepes.textContent = currentUserData.crepe_count;
    elements.activePlates.textContent = appState.settings.num_plates;
    
    // Badge de priorité
    if (isPriorityStatus) {
        elements.priorityBadge.textContent = '⚡ PRIORITAIRE';
        elements.priorityBadge.className = 'status-badge priority';
        elements.userStatusCard.classList.add('priority');
    } else {
        elements.priorityBadge.textContent = `En attente`;
        elements.priorityBadge.className = 'status-badge waiting';
        elements.userStatusCard.classList.remove('priority');
    }
}

/**
 * Obtient le suffixe de rang (er, ème)
 */
function getRankSuffix(rank) {
    return rank === 1 ? 'er' : 'ème';
}

/**
 * Met à jour l'affichage de la file d'attente
 */
function updateQueueDisplay() {
    // Tri des participants
    const sorted = [...appState.participants].sort((a, b) => {
        if (a.crepe_count !== b.crepe_count) {
            return a.crepe_count - b.crepe_count;
        }
        return new Date(a.last_eaten_at) - new Date(b.last_eaten_at);
    });
    
    elements.queueList.innerHTML = '';
    
    sorted.forEach((participant, index) => {
        const rank = index + 1;
        const isPriorityStatus = isPriority(rank, appState.settings.num_plates);
        const isCurrentUser = appState.currentUser && participant.id === appState.currentUser.id;
        
        const queueItem = document.createElement('div');
        queueItem.className = 'queue-item';
        
        if (isPriorityStatus) queueItem.classList.add('priority');
        if (isCurrentUser) queueItem.classList.add('current-user');
        
        queueItem.innerHTML = `
            <div class="queue-item-info">
                <span class="queue-rank">#${rank}</span>
                <div>
                    <div class="queue-username">
                        ${participant.username}
                        ${participant.is_admin ? '🔧' : ''}
                        ${isCurrentUser ? '(Toi)' : ''}
                    </div>
                    <div class="queue-crepes">🥞 ${participant.crepe_count} crêpe${participant.crepe_count > 1 ? 's' : ''}</div>
                </div>
            </div>
            ${isPriorityStatus ? '<span class="status-badge priority">⚡ PRIORITAIRE</span>' : ''}
        `;
        
        elements.queueList.appendChild(queueItem);
    });
}

/**
 * Met à jour l'affichage du panneau admin
 */
function updateAdminPanel() {
    if (!appState.currentUser || !appState.currentUser.is_admin) {
        elements.adminPanel.classList.remove('active');
        document.body.classList.remove('admin-user');
        return;
    }
    
    // Marquer le body comme admin pour le CSS
    document.body.classList.add('admin-user');
    
    elements.adminPanel.classList.add('active');
    elements.platesInput.value = appState.settings.num_plates;
    elements.costInput.value = appState.settings.total_cost;
    
    // Liste des participants pour l'admin
    elements.adminParticipantsList.innerHTML = '';
    
    appState.participants.forEach(participant => {
        const item = document.createElement('div');
        item.className = 'admin-participant-item';
        
        item.innerHTML = `
            <span class="admin-participant-name">
                ${participant.username} ${participant.is_admin ? '🔧' : ''}
            </span>
            <div class="admin-controls">
                <button class="btn-decrement" data-id="${participant.id}">-</button>
                <span>${participant.crepe_count}</span>
                <button class="btn-increment" data-id="${participant.id}">+</button>
            </div>
        `;
        
        elements.adminParticipantsList.appendChild(item);
    });
    
    // Écouteurs pour les boutons +/-
    document.querySelectorAll('.btn-increment').forEach(btn => {
        btn.addEventListener('click', () => incrementCrepes(btn.dataset.id));
    });
    
    document.querySelectorAll('.btn-decrement').forEach(btn => {
        btn.addEventListener('click', () => decrementCrepes(btn.dataset.id));
    });
}

/**
 * Affiche le statut de la session
 */
function updateSessionStatus() {
    if (appState.settings.is_closed) {
        elements.sessionStatus.textContent = '🔒 La session est clôturée';
        elements.sessionStatus.classList.add('active');
        elements.addCrepeBtn.disabled = true;
        elements.skipTurnBtn.disabled = true;
        
        // Admin : afficher le bouton de réouverture
        if (appState.currentUser && appState.currentUser.is_admin) {
            elements.closeSessionBtn.style.display = 'none';
            elements.reopenSessionBtn.style.display = 'block';
        }
    } else {
        elements.sessionStatus.classList.remove('active');
        elements.addCrepeBtn.disabled = false;
        elements.skipTurnBtn.disabled = false;
        
        // Admin : afficher le bouton de clôture
        if (appState.currentUser && appState.currentUser.is_admin) {
            elements.closeSessionBtn.style.display = 'block';
            elements.reopenSessionBtn.style.display = 'none';
        }
    }
}

// ==========================================
// Fonctions de base de données
// ==========================================

/**
 * Connexion utilisateur
 */
async function login(username, code) {
    try {
        const { data, error } = await supabaseClient
            .from('participants')
            .select('*')
            .eq('username', username)
            .eq('code', code)
            .single();
        
        if (error || !data) {
            elements.loginError.textContent = '❌ Identifiants incorrects';
            return false;
        }
        
        appState.currentUser = data;
        elements.currentUsername.textContent = username;
        
        // Basculer vers l'écran principal
        elements.loginScreen.classList.remove('active');
        elements.mainScreen.classList.add('active');
        
        // Charger les données initiales
        await loadInitialData();
        
        // S'abonner aux changements temps réel
        subscribeToRealtimeUpdates();
        
        showToast('✅ Connexion réussie !');
        return true;
        
    } catch (err) {
        console.error('Erreur de connexion:', err);
        elements.loginError.textContent = '❌ Erreur de connexion';
        return false;
    }
}

/**
 * Charge les données initiales
 */
async function loadInitialData() {
    try {
        // Charger tous les participants
        const { data: participants, error: participantsError } = await supabaseClient
            .from('participants')
            .select('*');
        
        if (participantsError) throw participantsError;
        appState.participants = participants || [];
        
        // Charger les paramètres
        const { data: settings, error: settingsError } = await supabaseClient
            .from('settings')
            .select('*')
            .eq('id', 1)
            .single();
        
        if (settingsError) throw settingsError;
        if (settings) {
            appState.settings = settings;
        }
        
        // Mettre à jour l'affichage
        updateUI();
        
        // Vérifier si la session est clôturée
        if (appState.settings.is_closed) {
            showCloseModal();
        }
        
    } catch (err) {
        console.error('Erreur de chargement des données:', err);
        showToast('❌ Erreur de chargement des données');
    }
}

/**
 * S'abonner aux mises à jour temps réel
 */
function subscribeToRealtimeUpdates() {
    // Abonnement aux changements de participants
    supabaseClient
        .channel('participants-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'participants' }, 
            (payload) => {
                handleParticipantChange(payload);
            }
        )
        .subscribe();
    
    // Abonnement aux changements de settings
    supabaseClient
        .channel('settings-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'settings' }, 
            (payload) => {
                handleSettingsChange(payload);
            }
        )
        .subscribe();
}

/**
 * Gère les changements de participants
 */
function handleParticipantChange(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    if (eventType === 'INSERT') {
        appState.participants.push(newRecord);
    } else if (eventType === 'UPDATE') {
        const index = appState.participants.findIndex(p => p.id === newRecord.id);
        if (index !== -1) {
            appState.participants[index] = newRecord;
            
            // Mettre à jour l'utilisateur actuel si c'est lui
            if (appState.currentUser && appState.currentUser.id === newRecord.id) {
                appState.currentUser = newRecord;
            }
        }
    } else if (eventType === 'DELETE') {
        appState.participants = appState.participants.filter(p => p.id !== oldRecord.id);
    }
    
    updateUI();
}

/**
 * Gère les changements de paramètres
 */
function handleSettingsChange(payload) {
    const { new: newSettings } = payload;
    appState.settings = newSettings;
    
    updateUI();
    
    // Si la session vient d'être clôturée
    if (newSettings.is_closed) {
        showCloseModal();
    }
}

/**
 * Passer son tour
 */
async function skipTurn() {
    if (!appState.currentUser) return;
    
    try {
        const { error } = await supabaseClient
            .from('participants')
            .update({ 
                last_eaten_at: new Date().toISOString()
            })
            .eq('id', appState.currentUser.id);
        
        if (error) throw error;
        
        showToast('⏭️ Tour passé ! Tu es replacé dans la file.');
        
    } catch (err) {
        console.error('Erreur lors du passage de tour:', err);
        showToast('❌ Erreur lors du passage de tour');
    }
}

/**
 * Ajouter une crêpe à son compteur
 */
async function addOwnCrepe() {
    if (!appState.currentUser) return;
    
    try {
        const { error } = await supabaseClient
            .from('participants')
            .update({ 
                crepe_count: appState.currentUser.crepe_count + 1,
                last_eaten_at: new Date().toISOString()
            })
            .eq('id', appState.currentUser.id);
        
        if (error) throw error;
        
        showToast('🥞 Crêpe ajoutée ! Bon appétit !');
        
    } catch (err) {
        console.error('Erreur lors de l\'ajout de crêpe:', err);
        showToast('❌ Erreur lors de l\'ajout de crêpe');
    }
}

/**
 * Mettre à jour le nombre de plaques (admin)
 */
async function updatePlates() {
    const numPlates = parseInt(elements.platesInput.value);
    
    if (numPlates < 1 || numPlates > 10) {
        showToast('❌ Le nombre de plaques doit être entre 1 et 10');
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('settings')
            .update({ num_plates: numPlates })
            .eq('id', 1);
        
        if (error) throw error;
        
        showToast('✅ Nombre de plaques mis à jour');
        
    } catch (err) {
        console.error('Erreur de mise à jour:', err);
        showToast('❌ Erreur de mise à jour');
    }
}

/**
 * Mettre à jour le coût total (admin)
 */
async function updateCost() {
    const totalCost = parseFloat(elements.costInput.value);
    
    if (totalCost < 0) {
        showToast('❌ Le coût ne peut pas être négatif');
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('settings')
            .update({ total_cost: totalCost })
            .eq('id', 1);
        
        if (error) throw error;
        
        showToast('✅ Coût total mis à jour');
        
    } catch (err) {
        console.error('Erreur de mise à jour:', err);
        showToast('❌ Erreur de mise à jour');
    }
}

/**
 * Incrémenter les crêpes d'un participant (admin)
 */
async function incrementCrepes(participantId) {
    const participant = appState.participants.find(p => p.id === participantId);
    if (!participant) return;
    
    try {
        const { error } = await supabaseClient
            .from('participants')
            .update({ 
                crepe_count: participant.crepe_count + 1,
                last_eaten_at: new Date().toISOString()
            })
            .eq('id', participantId);
        
        if (error) throw error;
        
    } catch (err) {
        console.error('Erreur d\'incrémentation:', err);
        showToast('❌ Erreur lors de l\'incrémentation');
    }
}

/**
 * Décrémenter les crêpes d'un participant (admin)
 */
async function decrementCrepes(participantId) {
    const participant = appState.participants.find(p => p.id === participantId);
    if (!participant || participant.crepe_count <= 0) return;
    
    try {
        const { error } = await supabaseClient
            .from('participants')
            .update({ 
                crepe_count: participant.crepe_count - 1
            })
            .eq('id', participantId);
        
        if (error) throw error;
        
    } catch (err) {
        console.error('Erreur de décrémentation:', err);
        showToast('❌ Erreur lors de la décrémentation');
    }
}

/**
 * Clôturer la session (admin)
 */
async function closeSession() {
    if (!confirm('Êtes-vous sûr de vouloir clôturer la session ? Cette action est irréversible.')) {
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('settings')
            .update({ is_closed: true })
            .eq('id', 1);
        
        if (error) throw error;
        
    } catch (err) {
        console.error('Erreur de clôture:', err);
        showToast('❌ Erreur lors de la clôture');
    }
}

/**
 * Rouvrir la session (admin)
 */
async function reopenSession() {
    if (!confirm('Voulez-vous rouvrir la session ? Les participants pourront à nouveau manger des crêpes.')) {
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('settings')
            .update({ is_closed: false })
            .eq('id', 1);
        
        if (error) throw error;
        
        showToast('✅ Session rouverte !');
        
    } catch (err) {
        console.error('Erreur de réouverture:', err);
        showToast('❌ Erreur lors de la réouverture');
    }
}

/**
 * Affiche le modal de clôture avec les résultats
 */
function showCloseModal() {
    const totalCrepes = appState.participants.reduce((sum, p) => sum + p.crepe_count, 0);
    const costPerCrepe = totalCrepes > 0 ? appState.settings.total_cost / totalCrepes : 0;
    
    elements.finalResults.innerHTML = '';
    
    // Trier par nombre de crêpes (décroissant)
    const sorted = [...appState.participants].sort((a, b) => b.crepe_count - a.crepe_count);
    
    sorted.forEach(participant => {
        const cost = (participant.crepe_count * costPerCrepe).toFixed(2);
        
        const item = document.createElement('div');
        item.className = 'result-item';
        
        item.innerHTML = `
            <div>
                <div class="result-name">${participant.username}</div>
                <div style="color: var(--text-secondary); font-size: 0.9rem;">
                    ${participant.crepe_count} crêpe${participant.crepe_count > 1 ? 's' : ''}
                </div>
            </div>
            <div class="result-cost">${cost} €</div>
        `;
        
        elements.finalResults.appendChild(item);
    });
    
    // Afficher le total
    const totalItem = document.createElement('div');
    totalItem.className = 'result-item';
    totalItem.style.borderTop = '2px solid var(--accent-primary)';
    totalItem.style.marginTop = '15px';
    totalItem.style.paddingTop = '15px';
    
    totalItem.innerHTML = `
        <div class="result-name" style="font-size: 1.2rem;">TOTAL</div>
        <div class="result-cost" style="font-size: 1.3rem;">${appState.settings.total_cost.toFixed(2)} €</div>
    `;
    
    elements.finalResults.appendChild(totalItem);
    
    elements.closeModal.classList.add('active');
}

/**
 * Met à jour toute l'interface
 */
function updateUI() {
    updateUserStatus();
    updateQueueDisplay();
    updateAdminPanel();
    updateSessionStatus();
}

/**
 * Déconnexion
 */
function logout() {
    appState.currentUser = null;
    appState.participants = [];
    appState.previousRank = null;
    
    elements.loginScreen.classList.add('active');
    elements.mainScreen.classList.remove('active');
    
    elements.usernameInput.value = '';
    elements.codeInput.value = '';
    elements.loginError.textContent = '';
}

// ==========================================
// Événements
// ==========================================

// Connexion
elements.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // EMPÊCHE le rechargement de la page
    e.stopPropagation(); // Empêche la propagation de l'événement
    
    const username = elements.usernameInput.value.trim();
    const code = elements.codeInput.value.trim();
    
    if (!username || !code) {
        elements.loginError.textContent = '❌ Veuillez remplir tous les champs';
        return false; // Important : retourne false
    }
    
    await login(username, code);
    return false; // Important : retourne false
});

// Déconnexion
elements.logoutBtn.addEventListener('click', logout);

// Ajouter une crêpe
elements.addCrepeBtn.addEventListener('click', addOwnCrepe);

// Passer son tour
elements.skipTurnBtn.addEventListener('click', skipTurn);

// Admin - Mise à jour des plaques
elements.updatePlatesBtn.addEventListener('click', updatePlates);

// Admin - Mise à jour du coût
elements.updateCostBtn.addEventListener('click', updateCost);

// Admin - Clôture de session
elements.closeSessionBtn.addEventListener('click', closeSession);

// Admin - Réouverture de session
elements.reopenSessionBtn.addEventListener('click', reopenSession);

// Fermer le modal
elements.closeModalBtn.addEventListener('click', () => {
    elements.closeModal.classList.remove('active');
});

// ==========================================
// Initialisation
// ==========================================

// Vérifier que Supabase est configuré
if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.error('⚠️ ATTENTION: Veuillez configurer vos clés Supabase dans app.js');
    showToast('⚠️ Configuration Supabase requise');
}

console.log('🥞 Crêpe-Master initialisé');