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
    currentSession: null,
    currentUser: null,
    participants: [],
    settings: {
        num_plates: 2,
        is_closed: false,
        read_only: false,
        total_cost: 0
    },
    previousRank: null,
    priorityReminderInterval: null,
    lastCrepeAddTime: null
};

// ==========================================
// Éléments DOM
// ==========================================
const elements = {
    // Écrans
    sessionScreen: document.getElementById('session-screen'),
    loginScreen: document.getElementById('login-screen'),
    mainScreen: document.getElementById('main-screen'),
    
    // Session
    joinTab: document.getElementById('join-tab'),
    createTab: document.getElementById('create-tab'),
    joinSessionForm: document.getElementById('join-session-form'),
    createSessionForm: document.getElementById('create-session-form'),
    sessionCodeInput: document.getElementById('session-code-input'),
    newSessionName: document.getElementById('new-session-name'),
    newSessionCode: document.getElementById('new-session-code'),
    sessionError: document.getElementById('session-error'),
    createError: document.getElementById('create-error'),



    sessionsModal: document.getElementById('sessions-modal'),
    closeSessionsModal: document.getElementById('close-sessions-modal'),
    sessionsListTab: document.getElementById('sessions-list-tab'),
    currentSessionTab: document.getElementById('current-session-tab'),
    createSessionTab: document.getElementById('create-session-tab'),
    sessionsListContent: document.getElementById('sessions-list-content'),
    currentSessionContent: document.getElementById('current-session-content'),
    createSessionContent: document.getElementById('create-session-content'),
    allSessionsList: document.getElementById('all-sessions-list'),
    modalSessionName: document.getElementById('modal-session-name'),
    modalSessionCode: document.getElementById('modal-session-code'),
    modalParticipantsCount: document.getElementById('modal-participants-count'),
    modalTotalCrepes: document.getElementById('modal-total-crepes'),
    modalMembersList: document.getElementById('modal-members-list'),
    addMemberUsername: document.getElementById('add-member-username'),
    addMemberCode: document.getElementById('add-member-code'),
    addMemberBtn: document.getElementById('add-member-btn'),
    exportTicketBtn: document.getElementById('export-ticket-btn'),
    exportDetailedBtn: document.getElementById('export-detailed-btn'),
    duplicateSessionBtn: document.getElementById('duplicate-session-btn'),
    archiveSessionBtn: document.getElementById('archive-session-btn'),
    deleteSessionBtn: document.getElementById('delete-session-btn'),
    adminCreateSessionForm: document.getElementById('admin-create-session-form'),
    
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
    testVibrationBtn: document.getElementById('test-vibration-btn'),
    toggleReadonlyBtn: document.getElementById('toggle-readonly-btn'),
    
    // Modal
    closeModal: document.getElementById('close-modal'),
    finalResults: document.getElementById('final-results'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    exportPdfBtn: document.getElementById('export-pdf-btn'),
    
    // Toast
    toast: document.getElementById('toast')
};

// Ajouter dans la section "Fonctions"

/**
 * Ouvre la modal de gestion des sessions
 */
async function openSessionsModal() {
    if (!appState.currentUser?.is_admin) {
        showToast('❌ Accès réservé aux admins');
        return;
    }
    
    elements.sessionsModal.classList.add('active');
    await loadAllSessions();
    updateCurrentSessionTab();
}

/**
 * Charge toutes les sessions
 */
async function loadAllSessions() {
    try {
        const { data, error } = await supabaseClient
            .from('sessions')
            .select('*, participants(count)');
        
        if (error) throw error;
        
        elements.allSessionsList.innerHTML = '';
        
        data.forEach(session => {
            const card = document.createElement('div');
            card.className = 'session-card' + (session.id === appState.currentSession.id ? ' active' : '');
            
            const participantCount = session.participants?.[0]?.count || 0;
            
            card.innerHTML = `
                <h3>${session.session_name}</h3>
                <div class="session-code">${session.session_code}</div>
                <div class="session-stats">
                    <span>👥 ${participantCount} membre${participantCount > 1 ? 's' : ''}</span>
                    <span>${session.is_closed ? '🔒 Fermée' : '🟢 Active'}</span>
                </div>
                <div style="margin-top: 10px; font-size: 0.85rem; color: var(--text-secondary);">
                    Créée le ${new Date(session.created_at).toLocaleDateString('fr-FR')}
                </div>
            `;
            
            card.addEventListener('click', () => switchToSession(session));
            elements.allSessionsList.appendChild(card);
        });
        
    } catch (err) {
        console.error('Erreur chargement sessions:', err);
        showToast('❌ Erreur de chargement');
    }
}

/**
 * Met à jour l'onglet de la session actuelle
 */
function updateCurrentSessionTab() {
    elements.modalSessionName.textContent = appState.currentSession.session_name;
    elements.modalSessionCode.textContent = appState.currentSession.session_code;
    elements.modalParticipantsCount.textContent = appState.participants.length;
    
    const totalCrepes = appState.participants.reduce((sum, p) => sum + p.crepe_count, 0);
    elements.modalTotalCrepes.textContent = totalCrepes;
    
    updateMembersList();
}

/**
 * Met à jour la liste des membres
 */
function updateMembersList() {
    elements.modalMembersList.innerHTML = '';
    
    appState.participants.forEach(member => {
        const item = document.createElement('div');
        item.className = 'member-item';
        
        item.innerHTML = `
            <div class="member-info">
                <div class="member-name">
                    ${member.username}
                    ${member.is_admin ? ' 🔧' : ''}
                </div>
                <div class="member-stats">
                    🥞 ${member.crepe_count} crêpe${member.crepe_count > 1 ? 's' : ''}
                </div>
            </div>
            <div class="member-actions">
                <button class="btn-icon" onclick="toggleMemberAdmin('${member.id}')" title="Toggle Admin">
                    ${member.is_admin ? '👤' : '🔧'}
                </button>
                <button class="btn-icon" onclick="resetMemberCrepes('${member.id}')" title="Réinitialiser">
                    🔄
                </button>
                <button class="btn-icon" onclick="removeMember('${member.id}')" title="Retirer">
                    🗑️
                </button>
            </div>
        `;
        
        elements.modalMembersList.appendChild(item);
    });
}

/**
 * Ajoute un membre à la session
 */
async function addMemberToSession() {
    const username = elements.addMemberUsername.value.trim();
    const code = elements.addMemberCode.value.trim();
    
    if (!username || !code) {
        showToast('❌ Remplir tous les champs');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('participants')
            .insert({
                username: username,
                code: code,
                session_id: appState.currentSession.id,
                crepe_count: 0,
                is_admin: false
            })
            .select()
            .single();
        
        if (error) throw error;
        
        elements.addMemberUsername.value = '';
        elements.addMemberCode.value = '';
        showToast('✅ Membre ajouté');
        
    } catch (err) {
        console.error('Erreur ajout membre:', err);
        showToast('❌ Erreur: ' + err.message);
    }
}

/**
 * Toggle statut admin d'un membre
 */
async function toggleMemberAdmin(memberId) {
    try {
        const member = appState.participants.find(p => p.id === memberId);
        if (!member) return;
        
        const { error } = await supabaseClient
            .from('participants')
            .update({ is_admin: !member.is_admin })
            .eq('id', memberId);
        
        if (error) throw error;
        showToast(member.is_admin ? '👤 Admin retiré' : '🔧 Admin ajouté');
        
    } catch (err) {
        console.error('Erreur toggle admin:', err);
        showToast('❌ Erreur');
    }
}

/**
 * Réinitialise les crêpes d'un membre
 */
async function resetMemberCrepes(memberId) {
    if (!confirm('Réinitialiser le compteur de crêpes ?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('participants')
            .update({ 
                crepe_count: 0,
                last_eaten_at: new Date().toISOString()
            })
            .eq('id', memberId);
        
        if (error) throw error;
        showToast('🔄 Compteur réinitialisé');
        
    } catch (err) {
        console.error('Erreur reset:', err);
        showToast('❌ Erreur');
    }
}

/**
 * Retire un membre de la session
 */
async function removeMember(memberId) {
    if (!confirm('Retirer ce membre de la session ?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('participants')
            .delete()
            .eq('id', memberId);
        
        if (error) throw error;
        showToast('✅ Membre retiré');
        
    } catch (err) {
        console.error('Erreur suppression:', err);
        showToast('❌ Erreur');
    }
}

/**
 * Exporte un ticket de caisse
 */
function exportTicket() {
    const totalCrepes = appState.participants.reduce((sum, p) => sum + p.crepe_count, 0);
    const costPerCrepe = totalCrepes > 0 ? appState.settings.total_cost / totalCrepes : 0;
    
    let ticket = `
╔════════════════════════════════╗
║       CRÊPE-MASTER 🥞          ║
╚════════════════════════════════╝

Session: ${appState.currentSession.session_name}
Code: ${appState.currentSession.session_code}
Date: ${new Date().toLocaleDateString('fr-FR')}

────────────────────────────────
`;
    
    appState.participants
        .sort((a, b) => b.crepe_count - a.crepe_count)
        .forEach(p => {
            const cost = (p.crepe_count * costPerCrepe).toFixed(2);
            ticket += `\n${p.username.padEnd(20)} ${p.crepe_count.toString().padStart(3)} x ${costPerCrepe.toFixed(2)}€ = ${cost.padStart(6)}€`;
        });
    
    ticket += `
────────────────────────────────
TOTAL:                    ${appState.settings.total_cost.toFixed(2)}€

Prix unitaire: ${costPerCrepe.toFixed(2)}€
Total crêpes: ${totalCrepes}

Merci et à bientôt ! 🥞
`;
    
    const blob = new Blob([ticket], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${appState.currentSession.session_code}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('🧾 Ticket téléchargé');
}

/**
 * Exporte un rapport détaillé
 */
function exportDetailedReport() {
    const totalCrepes = appState.participants.reduce((sum, p) => sum + p.crepe_count, 0);
    const costPerCrepe = totalCrepes > 0 ? appState.settings.total_cost / totalCrepes : 0;
    
    let html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport - ${appState.currentSession.session_name}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
        h1 { color: #ff6b6b; border-bottom: 3px solid #ff6b6b; padding-bottom: 10px; }
        .info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #ff6b6b; color: white; }
        .total { font-weight: bold; background: #fff3cd; }
        .footer { text-align: center; margin-top: 40px; color: #666; }
    </style>
</head>
<body>
    <h1>🥞 Crêpe-Master - Rapport Détaillé</h1>
    
    <div class="info">
        <h2>Informations de la session</h2>
        <p><strong>Nom:</strong> ${appState.currentSession.session_name}</p>
        <p><strong>Code:</strong> ${appState.currentSession.session_code}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
        <p><strong>Participants:</strong> ${appState.participants.length}</p>
        <p><strong>Plaques actives:</strong> ${appState.settings.num_plates}</p>
    </div>
    
    <h2>Détails des consommations</h2>
    <table>
        <thead>
            <tr>
                <th>Participant</th>
                <th>Crêpes</th>
                <th>Prix unitaire</th>
                <th>Montant</th>
                <th>Dernière consommation</th>
            </tr>
        </thead>
        <tbody>
`;
    
    appState.participants
        .sort((a, b) => b.crepe_count - a.crepe_count)
        .forEach(p => {
            const cost = (p.crepe_count * costPerCrepe).toFixed(2);
            html += `
            <tr>
                <td>${p.username}${p.is_admin ? ' 🔧' : ''}</td>
                <td>${p.crepe_count}</td>
                <td>${costPerCrepe.toFixed(2)} €</td>
                <td>${cost} €</td>
                <td>${new Date(p.last_eaten_at).toLocaleString('fr-FR')}</td>
            </tr>
`;
        });
    
    html += `
            <tr class="total">
                <td>TOTAL</td>
                <td>${totalCrepes}</td>
                <td>-</td>
                <td>${appState.settings.total_cost.toFixed(2)} €</td>
                <td>-</td>
            </tr>
        </tbody>
    </table>
    
    <div class="footer">
        <p>Généré par Crêpe-Master 🥞</p>
        <p>${new Date().toLocaleString('fr-FR')}</p>
    </div>
</body>
</html>
`;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-${appState.currentSession.session_code}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('📄 Rapport téléchargé');
}

/**
 * Duplique la session actuelle
 */
async function duplicateSession() {
    const newCode = prompt('Code pour la nouvelle session:', appState.currentSession.session_code + '_COPIE');
    if (!newCode) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('sessions')
            .insert({
                session_code: newCode.toUpperCase(),
                session_name: appState.currentSession.session_name + ' (Copie)',
                num_plates: appState.currentSession.num_plates,
                total_cost: 0,
                is_closed: false
            })
            .select()
            .single();
        
        if (error) throw error;
        showToast('✅ Session dupliquée');
        await loadAllSessions();
        
    } catch (err) {
        console.error('Erreur duplication:', err);
        showToast('❌ Erreur: ' + err.message);
    }
}

/**
 * Archive une session
 */
async function archiveSession() {
    if (!confirm('Archiver cette session ? Elle restera visible mais en lecture seule.')) return;
    
    try {
        const { error } = await supabaseClient
            .from('sessions')
            .update({ 
                is_closed: true,
                read_only: true 
            })
            .eq('id', appState.currentSession.id);
        
        if (error) throw error;
        showToast('📦 Session archivée');
        
    } catch (err) {
        console.error('Erreur archivage:', err);
        showToast('❌ Erreur');
    }
}

/**
 * Supprime une session
 */
async function deleteCurrentSession() {
    const confirmation = prompt('Taper "SUPPRIMER" pour confirmer la suppression définitive:');
    if (confirmation !== 'SUPPRIMER') return;
    
    try {
        const { error } = await supabaseClient
            .from('sessions')
            .delete()
            .eq('id', appState.currentSession.id);
        
        if (error) throw error;
        
        showToast('🗑️ Session supprimée');
        elements.sessionsModal.classList.remove('active');
        
        // Retour à l'écran de sélection
        elements.mainScreen.classList.remove('active');
        elements.sessionScreen.classList.add('active');
        
    } catch (err) {
        console.error('Erreur suppression:', err);
        showToast('❌ Erreur: ' + err.message);
    }
}

/**
 * Change de session
 */
async function switchToSession(session) {
    if (!confirm(`Basculer vers la session "${session.session_name}" ?`)) return;
    
    appState.currentSession = session;
    elements.sessionsModal.classList.remove('active');
    
    // Recharger les données
    await loadInitialData();
    updateUI();
    showToast(`✅ Session changée: ${session.session_name}`);
}

// Événements des onglets
elements.sessionsListTab.addEventListener('click', () => {
    elements.sessionsListTab.classList.add('active');
    elements.currentSessionTab.classList.remove('active');
    elements.createSessionTab.classList.remove('active');
    elements.sessionsListContent.classList.add('active');
    elements.currentSessionContent.classList.remove('active');
    elements.createSessionContent.classList.remove('active');
});

elements.currentSessionTab.addEventListener('click', () => {
    elements.currentSessionTab.classList.add('active');
    elements.sessionsListTab.classList.remove('active');
    elements.createSessionTab.classList.remove('active');
    elements.currentSessionContent.classList.add('active');
    elements.sessionsListContent.classList.remove('active');
    elements.createSessionContent.classList.remove('active');
    updateCurrentSessionTab();
});

elements.createSessionTab.addEventListener('click', () => {
    elements.createSessionTab.classList.add('active');
    elements.sessionsListTab.classList.remove('active');
    elements.currentSessionTab.classList.remove('active');
    elements.createSessionContent.classList.add('active');
    elements.sessionsListContent.classList.remove('active');
    elements.currentSessionContent.classList.remove('active');
});

// Événements des boutons
elements.closeSessionsModal.addEventListener('click', () => {
    elements.sessionsModal.classList.remove('active');
});

elements.addMemberBtn.addEventListener('click', addMemberToSession);
elements.exportTicketBtn.addEventListener('click', exportTicket);
elements.exportDetailedBtn.addEventListener('click', exportDetailedReport);
elements.duplicateSessionBtn.addEventListener('click', duplicateSession);
elements.archiveSessionBtn.addEventListener('click', archiveSession);
elements.deleteSessionBtn.addEventListener('click', deleteCurrentSession);

elements.adminCreateSessionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('admin-session-name').value.trim();
    const code = document.getElementById('admin-session-code').value.trim().toUpperCase();
    const plates = parseInt(document.getElementById('admin-session-plates').value);
    const cost = parseFloat(document.getElementById('admin-session-cost').value);
    
    try {
        const { data, error } = await supabaseClient
            .from('sessions')
            .insert({
                session_name: name,
                session_code: code,
                num_plates: plates,
                total_cost: cost,
                is_closed: false
            })
            .select()
            .single();
        
        if (error) throw error;
        
        showToast('✅ Session créée');
        elements.adminCreateSessionForm.reset();
        await loadAllSessions();
        
    } catch (err) {
        console.error('Erreur création:', err);
        showToast('❌ Erreur: ' + err.message);
    }
});



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
    } else if (appState.settings.read_only) {
        elements.sessionStatus.textContent = '📖 Session en mode lecture seule';
        elements.sessionStatus.classList.add('active');
        elements.addCrepeBtn.disabled = true;
        elements.skipTurnBtn.disabled = false;
        
        // Admin : montrer les deux boutons
        if (appState.currentUser && appState.currentUser.is_admin) {
            elements.closeSessionBtn.style.display = 'block';
            elements.reopenSessionBtn.style.display = 'none';
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
    
    // Mettre à jour le bouton readonly pour l'admin
    if (appState.currentUser && appState.currentUser.is_admin) {
        updateReadonlyButton();
    }
}

// ==========================================
// Fonctions de gestion des sessions
// ==========================================

/**
 * Vérifier si l'authentification biométrique est disponible
 */
/*async function checkBiometricAvailability() {
    const isSecureContext = window.isSecureContext;
    const isLocalhost = window.location.hostname === 'localhost';
    
    if (!isSecureContext && !isLocalhost) {
        console.log('⚠️ WebAuthn nécessite HTTPS');
        return;
    }
    
    if (window.PublicKeyCredential && 
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        try {
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            if (available) {
                elements.biometricBtn.style.display = 'block';
            }
        } catch (err) {
            console.log('❌ Biométrie non disponible:', err.message);
        }
    }
}*/

/**
 * Enregistrer les identifiants biométriques
 */
/*async function registerBiometric(username, password) {
    try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        
        // Utiliser localhost explicitement pour Firefox
        const rpId = window.location.hostname === '127.0.0.1' ? 'localhost' : window.location.hostname;
        
        const publicKeyOptions = {
            challenge: challenge,
            rp: {
                name: "Crêpe-Master",
                id: rpId  // ← FIX ICI
            },
            user: {
                id: new TextEncoder().encode(username),
                name: username,
                displayName: username
            },
            pubKeyCredParams: [{
                type: "public-key",
                alg: -7 // ES256
            }],
            authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification: "required"
            },
            timeout: 60000
        };
        
        const credential = await navigator.credentials.create({
            publicKey: publicKeyOptions
        });
        
        if (credential) {
            // TOUT est stocké LOCALEMENT dans le navigateur
            localStorage.setItem(`biometric_${username}`, JSON.stringify({
                id: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
                password: password, // En clair local (comme les apps bancaires)
                session: appState.currentSession.id
            }));
            
            showToast('✅ Empreinte enregistrée localement !');
            return true;
        }
    } catch (err) {
        console.error('Erreur biométrique:', err);
        showToast(`❌ Erreur: ${err.message}`);
        return false;
    }
}
*/
/**
 * Connexion biométrique
 */
/*async function loginWithBiometric() {
    const username = elements.usernameInput.value.trim();
    
    if (!username) {
        elements.loginError.textContent = '❌ Entre ton nom d\'utilisateur d\'abord';
        return;
    }
    
    const savedData = localStorage.getItem(`biometric_${username}`);
    
    if (!savedData) {
        elements.loginError.textContent = '❌ Aucune empreinte enregistrée pour cet utilisateur';
        return;
    }
    
    try {
        const { password, session } = JSON.parse(savedData);
        
        // Vérifier que c'est la bonne session
        if (session !== appState.currentSession.id) {
            elements.loginError.textContent = '❌ Cette empreinte est pour une autre session';
            return;
        }
        
        // Créer un challenge
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        
        const publicKeyOptions = {
            challenge: challenge,
            timeout: 60000,
            userVerification: "required"
        };
        
        const assertion = await navigator.credentials.get({
            publicKey: publicKeyOptions
        });
        
        if (assertion) {
            // Connexion avec le mot de passe enregistré
            await login(username, password);
        }
    } catch (err) {
        console.error('Erreur de connexion biométrique:', err);
        elements.loginError.textContent = '❌ Authentification échouée';
    }
}*/

/**
 * Rejoindre une session existante
 */
async function joinSession(sessionCode) {
    try {
        const { data, error } = await supabaseClient
            .from('sessions')
            .select('*')
            .eq('session_code', sessionCode)
            .single();
        
        if (error || !data) {
            elements.sessionError.textContent = '❌ Code de session invalide';
            return false;
        }
        
        appState.currentSession = data;
        
        // Passer à l'écran de connexion
        elements.sessionScreen.classList.remove('active');
        elements.loginScreen.classList.add('active');
        
        showToast(`✅ Session "${data.session_name}" rejointe !`);
        return true;
        
    } catch (err) {
        console.error('Erreur lors de la jointure:', err);
        elements.sessionError.textContent = '❌ Erreur de connexion';
        return false;
    }
}

/**
 * Créer une nouvelle session
 */
async function createSession(name, code) {
    try {
        const { data, error } = await supabaseClient
            .from('sessions')
            .insert({
                session_name: name,
                session_code: code,
                num_plates: 2,
                is_closed: false,
                total_cost: 0
            })
            .select()
            .single();
        
        if (error) {
            if (error.code === '23505') { // Code déjà existant
                elements.createError.textContent = '❌ Ce code est déjà utilisé';
            } else {
                elements.createError.textContent = '❌ Erreur lors de la création';
            }
            return false;
        }
        
        appState.currentSession = data;
        
        // Passer à l'écran de connexion
        elements.sessionScreen.classList.remove('active');
        elements.loginScreen.classList.add('active');
        
        showToast(`✅ Session "${name}" créée !`);
        return true;
        
    } catch (err) {
        console.error('Erreur de création:', err);
        elements.createError.textContent = '❌ Erreur de création';
        return false;
    }
}

// ==========================================
// Fonctions de base de données
// ==========================================

/**
 * Connexion utilisateur
 */
async function login(username, code) {
    if (!appState.currentSession) {
        elements.loginError.textContent = '❌ Aucune session sélectionnée';
        return false;
    }
    
    try {
        // Chercher l'utilisateur dans cette session
        let { data, error } = await supabaseClient
            .from('participants')
            .select('*')
            .eq('username', username)
            .eq('session_id', appState.currentSession.id)
            .maybeSingle();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        // Si l'utilisateur n'existe pas, le créer
        if (!data) {
            const { data: newUser, error: createError } = await supabaseClient
                .from('participants')
                .insert({
                    username: username,
                    code: code,
                    session_id: appState.currentSession.id,
                    crepe_count: 0,
                    is_admin: false
                })
                .select()
                .single();
            
            if (createError) throw createError;
            data = newUser;
            showToast(`✅ Compte créé ! Bienvenue ${username} !`);
        } else {
            // Vérifier le code
            if (data.code !== code) {
                elements.loginError.textContent = '❌ Mot de passe incorrect';
                return false;
            }
        }
        
        appState.currentUser = data;
        elements.currentUsername.textContent = username;
        
        // Proposer l'enregistrement biométrique
        if (elements.biometricBtn.style.display === 'block' && 
            !localStorage.getItem(`biometric_${username}`)) {
            setTimeout(async () => {
                if (confirm('Veux-tu enregistrer ton empreinte pour te connecter plus rapidement la prochaine fois ?')) {
                    await registerBiometric(username, code);
                }
            }, 1000);
        }
        
        // Basculer vers l'écran principal
        elements.loginScreen.classList.remove('active');
        elements.mainScreen.classList.add('active');
        
        // Charger les données initiales
        await loadInitialData();
        
        // S'abonner aux changements temps réel
        subscribeToRealtimeUpdates();
        
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
        // Charger tous les participants de cette session
        const { data: participants, error: participantsError } = await supabaseClient
            .from('participants')
            .select('*')
            .eq('session_id', appState.currentSession.id);
        
        if (participantsError) throw participantsError;
        appState.participants = participants || [];
        
        // Utiliser les settings de la session
        appState.settings = {
            num_plates: appState.currentSession.num_plates,
            is_closed: appState.currentSession.is_closed,
            read_only: appState.currentSession.read_only || false,
            total_cost: appState.currentSession.total_cost
        };
        
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
function subscribeToNotifications() {
    supabaseClient
        .channel('notifications')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `session_id=eq.${appState.currentSession.id}`
        }, (payload) => {
            const notification = payload.new;
            
            if (notification.type === 'vibration_test') {
                // Vibration de test
                if ('vibrate' in navigator) {
                    navigator.vibrate(notification.data.pattern);
                }
                showToast('📳 Test de vibration reçu !');
            }
        })
        .subscribe();
}

/**
 * Démarrer les vibrations prioritaires en arrière-plan
 */
function startPriorityVibrations() {
    // Vérifier si on est prioritaire
    const checkAndVibrate = () => {
        if (!appState.currentUser) return;
        
        const currentUserData = appState.participants.find(p => p.id === appState.currentUser.id);
        if (!currentUserData) return;
        
        const rank = calculateRank(currentUserData, appState.participants);
        const isPriorityStatus = isPriority(rank, appState.settings.num_plates);
        
        if (isPriorityStatus && !appState.settings.is_closed) {
            if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200]); // Pattern: vibrer-pause-vibrer
            }
            
            // Notification du navigateur (même en arrière-plan)
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('🥞 Crêpe-Master', {
                    body: 'Tu es PRIORITAIRE ! C\'est ton tour 🎉',
                    icon: '🥞',
                    vibrate: [200, 100, 200],
                    tag: 'crepe-priority',
                    requireInteraction: false
                });
            }
        }
    };
    
    // Vérifier toutes les 60 secondes
    setInterval(checkAndVibrate, 60000);
}

/**
 * Demander la permission pour les notifications
 */
async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            showToast('🔔 Notifications activées pour les alertes prioritaires');
        }
    }
}

// MODIFIER la fonction loadInitialData pour inclure ces nouvelles fonctions (ligne ~637)
async function loadInitialData() {
    try {
        // ... code existant ...
        
        // S'abonner aux notifications
        subscribeToNotifications();
        
        // Démarrer les vibrations prioritaires
        startPriorityVibrations();
        
        // Demander permission notifications (pour background)
        await requestNotificationPermission();
        
    } catch (err) {
        console.error('Erreur lors du chargement:', err);
        showToast('❌ Erreur de chargement');
    }
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
    
    // Anti-spam : 1 crêpe par minute divisé par le nombre de poêles
    const cooldownMs = (60000 / appState.settings.num_plates); // 60000ms = 1 minute
    const now = Date.now();
    
    if (appState.lastCrepeAddTime && (now - appState.lastCrepeAddTime) < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - (now - appState.lastCrepeAddTime)) / 1000);
        showToast(`⏳ Patiente encore ${remainingSeconds} seconde${remainingSeconds > 1 ? 's' : ''} avant d'ajouter une crêpe`);
        return;
    }
    
    // Animation sur le bouton
    elements.addCrepeBtn.classList.add('crepe-animation');
    setTimeout(() => {
        elements.addCrepeBtn.classList.remove('crepe-animation');
    }, 600);
    
    // Animation sur la carte de statut
    elements.userStatusCard.classList.add('success-pulse');
    setTimeout(() => {
        elements.userStatusCard.classList.remove('success-pulse');
    }, 800);
    
    try {
        const { error } = await supabaseClient
            .from('participants')
            .update({ 
                crepe_count: appState.currentUser.crepe_count + 1,
                last_eaten_at: new Date().toISOString()
            })
            .eq('id', appState.currentUser.id);
        
        if (error) throw error;
        
        appState.lastCrepeAddTime = now;
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
            .from('sessions')
            .update({ num_plates: numPlates })
            .eq('id', appState.currentSession.id);
        
        if (error) throw error;
        
        appState.currentSession.num_plates = numPlates;
        appState.settings.num_plates = numPlates;
        
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
 * Tester les vibrations (admin)
 */
async function testVibration() {
    try {
        // Créer une notification pour tous les appareils
        const { error } = await supabaseClient
            .from('notifications')
            .insert({
                session_id: appState.currentSession.id,
                type: 'vibration_test',
                data: { pattern: [200, 100, 200, 100, 200] }
            });
        
        if (error) throw error;
        
        showToast('📳 Test de vibration envoyé à tous les appareils !');
        
        // Supprimer la notification après 5 secondes
        setTimeout(async () => {
            await supabaseClient
                .from('notifications')
                .delete()
                .eq('session_id', appState.currentSession.id)
                .eq('type', 'vibration_test');
        }, 5000);
        
    } catch (err) {
        console.error('Erreur test vibration:', err);
        showToast('❌ Erreur lors du test');
    }
}

/**
 * Activer/désactiver le mode lecture seule (admin)
 */
async function toggleReadonly() {
    const newState = !appState.settings.read_only;
    const action = newState ? 'activer' : 'désactiver';
    
    if (!confirm(`Voulez-vous ${action} le mode lecture seule ? ${newState ? 'Les utilisateurs ne pourront plus ajouter de crêpes.' : 'Les utilisateurs pourront à nouveau ajouter des crêpes.'}`)) {
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('sessions')
            .update({ read_only: newState })
            .eq('id', appState.currentSession.id);
        
        if (error) throw error;
        
        appState.currentSession.read_only = newState;
        appState.settings.read_only = newState;
        
        // Mettre à jour le texte du bouton
        updateReadonlyButton();
        
        showToast(`✅ Mode lecture seule ${newState ? 'activé' : 'désactivé'}`);
        
    } catch (err) {
        console.error('Erreur de modification:', err);
        showToast('❌ Erreur lors de la modification');
    }
}

/**
 * Mettre à jour le texte du bouton readonly
 */
function updateReadonlyButton() {
    if (appState.settings.read_only) {
        elements.toggleReadonlyBtn.textContent = '✏️ Désactiver mode lecture seule';
        elements.toggleReadonlyBtn.style.background = 'var(--success)';
    } else {
        elements.toggleReadonlyBtn.textContent = '📖 Activer mode lecture seule';
        elements.toggleReadonlyBtn.style.background = 'var(--accent-secondary)';
    }
}

/**
 * Exporter les résultats en PDF
 */
function exportToPDF() {
    const totalCrepes = appState.participants.reduce((sum, p) => sum + p.crepe_count, 0);
    const costPerCrepe = totalCrepes > 0 ? appState.settings.total_cost / totalCrepes : 0;
    
    // Créer le contenu HTML pour le PDF
    const sorted = [...appState.participants].sort((a, b) => b.crepe_count - a.crepe_count);
    
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #ff6b35; text-align: center; }
                h2 { color: #1a1a2e; margin-top: 30px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background-color: #ff6b35; color: white; }
                tr:nth-child(even) { background-color: #f2f2f2; }
                .total-row { font-weight: bold; background-color: #ffd93d !important; }
                .summary { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 40px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <h1>🥞 Crêpe-Master - Récapitulatif</h1>
            <div class="summary">
                <p><strong>Session:</strong> ${appState.currentSession.session_name}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR', { 
                    year: 'numeric', month: 'long', day: 'numeric', 
                    hour: '2-digit', minute: '2-digit' 
                })}</p>
                <p><strong>Total crêpes:</strong> ${totalCrepes}</p>
                <p><strong>Coût total:</strong> ${appState.settings.total_cost.toFixed(2)} €</p>
                <p><strong>Prix par crêpe:</strong> ${costPerCrepe.toFixed(2)} €</p>
            </div>
            
            <h2>Détail par participant</h2>
            <table>
                <thead>
                    <tr>
                        <th>Participant</th>
                        <th>Crêpes mangées</th>
                        <th>Montant à payer</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    sorted.forEach(participant => {
        const cost = (participant.crepe_count * costPerCrepe).toFixed(2);
        html += `
                    <tr>
                        <td>${participant.username}${participant.is_admin ? ' 🔧' : ''}</td>
                        <td>${participant.crepe_count}</td>
                        <td>${cost} €</td>
                    </tr>
        `;
    });
    
    html += `
                    <tr class="total-row">
                        <td><strong>TOTAL</strong></td>
                        <td><strong>${totalCrepes}</strong></td>
                        <td><strong>${appState.settings.total_cost.toFixed(2)} €</strong></td>
                    </tr>
                </tbody>
            </table>
            
            <div class="footer">
                <p>Généré par Crêpe-Master 🥞</p>
            </div>
        </body>
        </html>
    `;
    
    // Créer un blob et télécharger
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crepe-master-${appState.currentSession.session_code}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('📄 Fichier téléchargé ! Ouvre-le dans ton navigateur puis imprime-le en PDF');
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


// Événement du bouton
document.getElementById('manage-sessions-btn').addEventListener('click', openSessionsModal);

// ==========================================
// Événements
// ==========================================

// Onglets de session
elements.joinTab.addEventListener('click', () => {
    elements.joinTab.classList.add('active');
    elements.createTab.classList.remove('active');
    elements.joinSessionForm.classList.add('active');
    elements.createSessionForm.classList.remove('active');
});

elements.createTab.addEventListener('click', () => {
    elements.createTab.classList.add('active');
    elements.joinTab.classList.remove('active');
    elements.createSessionForm.classList.add('active');
    elements.joinSessionForm.classList.remove('active');
});

// Rejoindre une session
elements.joinSessionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sessionCode = elements.sessionCodeInput.value.trim().toUpperCase();
    
    if (!sessionCode) {
        elements.sessionError.textContent = '❌ Veuillez entrer un code';
        return;
    }
    
    await joinSession(sessionCode);
});

// Créer une session
elements.createSessionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = elements.newSessionName.value.trim();
    const code = elements.newSessionCode.value.trim().toUpperCase();
    
    if (!name || !code) {
        elements.createError.textContent = '❌ Veuillez remplir tous les champs';
        return;
    }
    
    await createSession(name, code);
});

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

// Connexion biométrique
//elements.biometricBtn.addEventListener('click', loginWithBiometric);

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

// Admin - Test de vibration
elements.testVibrationBtn.addEventListener('click', testVibration);

// Admin - Toggle readonly
elements.toggleReadonlyBtn.addEventListener('click', toggleReadonly);

// Fermer le modal
elements.closeModalBtn.addEventListener('click', () => {
    elements.closeModal.classList.remove('active');
});

// Export PDF
elements.exportPdfBtn.addEventListener('click', exportToPDF);

// ==========================================
// Initialisation
// ==========================================

// Vérifier que Supabase est configuré
if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.error('⚠️ ATTENTION: Veuillez configurer vos clés Supabase dans app.js');
    showToast('⚠️ Configuration Supabase requise');
}

// Vérifier la disponibilité de l'authentification biométrique
checkBiometricAvailability();

console.log('🥞 Crêpe-Master initialisé');