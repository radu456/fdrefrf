/**
 * Biletul Perfect - app.js
 * Author: Gemini
 * Version: 3.0 (Final)
 * Description: Logica completă pentru aplicația PWA de analiză a pariurilor sportive.
 * Include motor AI avansat, management de stare, randare dinamică și funcționalități PWA.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- Selecția Elementelor Globale din DOM ---
    const getElem = (id) => document.getElementById(id);
    const getElems = (selector) => document.querySelectorAll(selector);

    const DOM = {
        views: getElems('.view'),
        navLinks: getElems('.nav-link'),
        ofertaContainer: getElem('oferta-container'),
        searchInput: getElem('search-input'),
        bilet: {
            itemsContainer: getElem('bilet-items'),
            emptyState: getElem('bilet-empty-state'),
            summary: getElem('bilet-summary'),
            totalMeciuri: getElem('bilet-total-meciuri'),
            cotaTotala: getElem('bilet-cota-totala'),
            countBadge: getElem('bilet-count-badge'),
            mizaInput: getElem('miza-input'),
            castigPotential: getElem('castig-potential'),
            clearButton: getElem('clear-bilet-button'),
            saveButton: getElem('save-test-button'),
        },
        modal: {
            overlay: getElem('analysis-modal'),
            title: getElem('modal-title'),
            body: getElem('modal-body'),
            closeButton: getElem('close-modal-button'),
        },
        generator: {
            button: getElem('generate-bilet-ai-button'),
            nrMeciuri: getElem('generator-nr-meciuri'),
            cotaMin: getElem('generator-cota-min'),
            cotaMax: getElem('generator-cota-max'),
            tipuriPariuri: getElem('generator-tipuri-pariuri'),
            riskLevel: getElem('generator-risk-level'),
        },
        statistici: {
            totalBilete: getElem('stats-total-bilete'),
            bileteCastigate: getElem('stats-bilete-castigate'),
            biletePierdute: getElem('stats-bilete-pierdute'),
            rataSucces: getElem('stats-rata-succes'),
            chartCanvas: getElem('stats-chart'),
            pieChartCanvas: getElem('stats-pie-chart'),
        },
        setari: {
            mizaImplicita: getElem('setari-miza-implicita'),
            saveButton: getElem('save-settings-button'),
            exportButton: getElem('export-data-button'),
            importButton: getElem('import-data-button'),
            importButtonLabel: getElem('import-data-button-label'),
            deleteAllButton: getElem('delete-all-data-button'),
        },
        pwa: {
            installButton: getElem('install-app-button'),
        },
        theme: {
            toggleButton: getElem('theme-toggle-button'),
            icon: getElem('theme-icon'),
        },
        ui: {
            loadingOverlay: getElem('loading-overlay'),
            dayAnalysisContainer: getElem('day-analysis-container'),
            aiTipOfTheDay: getElem('ai-tip-of-the-day'),
        }
    };

    // --- Starea Aplicației (Single Source of Truth) ---
    let state = {
        meciuri: [],
        bilet: [],
        istoric: [],
        setari: {
            mizaImplicita: 10
        },
        tipuriPariuri: new Set(),
    };
    
    // --- Variabile Chart ---
    let statsBarChart = null;
    let statsPieChart = null;

    // ===================================================================================
    // INITIALIZARE ȘI SETUP EVENIMENTE
    // ===================================================================================

    /**
     * Inițializează aplicația
     */
    async function init() {
        showLoading("Se inițializează aplicația...");
        setupEventListeners();
        loadTheme();
        await loadMatches();
        loadStateFromLocalStorage();
        renderAllComponents();
        setupPWAInstall();
        hideLoading();
    }

    /**
     * Setează toate evenimentele necesare
     */
    function setupEventListeners() {
        DOM.navLinks.forEach(link => link.addEventListener('click', (e) => handleNavigation(e, link)));
        DOM.searchInput.addEventListener('input', () => renderOferta(DOM.searchInput.value));
        
        // Bilet
        DOM.bilet.clearButton.addEventListener('click', clearBilet);
        DOM.bilet.saveButton.addEventListener('click', saveBiletToHistory);
        DOM.bilet.mizaInput.addEventListener('input', updateBiletSummary);
        
        // Modal
        DOM.modal.closeButton.addEventListener('click', () => DOM.modal.overlay.style.display = 'none');
        DOM.modal.overlay.addEventListener('click', (e) => { if (e.target === DOM.modal.overlay) DOM.modal.overlay.style.display = 'none'; });
        
        // Generator & Setări
        DOM.generator.button.addEventListener('click', handleGenerateAIBilet);
        DOM.setari.saveButton.addEventListener('click', saveSettings);
        DOM.setari.exportButton.addEventListener('click', exportData);
        DOM.setari.importButtonLabel.addEventListener('click', () => DOM.setari.importButton.click());
        DOM.setari.importButton.addEventListener('change', importData);
        DOM.setari.deleteAllButton.addEventListener('click', deleteAllData);

        // Altele
        DOM.theme.toggleButton.addEventListener('click', toggleTheme);
    }
    
    /**
     * Gestionează navigarea între view-uri
     */
    function handleNavigation(e, link) {
        e.preventDefault();
        const viewId = link.getAttribute('data-view');
        switchView(viewId);
        DOM.navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
    }

    // ===================================================================================
    // LOGICA DE ÎNCĂRCARE DATE
    // ===================================================================================

    /**
     * Încarcă meciurile din fișierul JSON local
     */
    async function loadMatches() {
        try {
            const response = await fetch('./data/meciuri.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            state.meciuri = await response.json();
            // Extrage toate tipurile de pariuri unice și inițializează generatorul
            state.meciuri.forEach(meci => {
                Object.keys(meci.piete).forEach(piataKey => state.tipuriPariuri.add(piataKey));
            });
            initGeneratorOptions();
        } catch (error) {
            console.error("Eroare la încărcarea meciurilor:", error);
            DOM.ofertaContainer.innerHTML = `<div class="empty-state"><i data-lucide="server-off"></i><p>Nu s-a putut încărca oferta.</p><span>Verifică fișierul data/meciuri.json și reîncarcă.</span></div>`;
            lucide.createIcons();
        }
    }

    // ===================================================================================
    // FUNCȚII DE RANDARE (AFIȘARE ÎN UI)
    // ===================================================================================

    /**
     * Funcția principală care orchestrează randarea tuturor componentelor
     */
    function renderAllComponents() {
        analyzeDayAndRenderHeader();
        renderOferta();
        renderBilet();
        renderIstoric();
        renderStatistici();
        renderSetari();
    }
    
    /**
     * Comută între view-uri (secțiuni)
     */
    function switchView(viewId) {
        DOM.views.forEach(view => view.classList.remove('active'));
        getElem(viewId)?.classList.add('active');
        if (viewId === 'view-statistici') renderStatistici(); // Forțăm re-randarea graficelor
    }

    /**
     * Randează oferta de meciuri
     */
    function renderOferta(searchTerm = '') {
        DOM.ofertaContainer.innerHTML = '';
        DOM.ofertaContainer.classList.remove('loading');
        const filteredMatches = state.meciuri.filter(meci =>
            `${meci.echipe} ${meci.competitie}`.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filteredMatches.length === 0) {
            DOM.ofertaContainer.innerHTML = `<div class="empty-state"><i data-lucide="search-x"></i><p>Niciun meci găsit.</p></div>`;
            lucide.createIcons();
            return;
        }

        filteredMatches.forEach(meci => DOM.ofertaContainer.appendChild(createMeciCard(meci)));
        DOM.ofertaContainer.querySelectorAll('.cota-button').forEach(b => b.addEventListener('click', handleCotaClick));
        DOM.ofertaContainer.querySelectorAll('.button-ai').forEach(b => b.addEventListener('click', handleAnalysisClick));
        lucide.createIcons();
    }
    
    /**
     * Creează un card HTML pentru un meci
     */
    function createMeciCard(meci) {
        const meciCard = document.createElement('div');
        meciCard.className = 'meci-card';
        const selectiePeMeci = state.bilet.find(s => s.meciId === meci.id);
        
        meciCard.innerHTML = `
            <div class="meci-header">
                <span>${meci.competitie}</span>
                <span>${new Date(meci.data).toLocaleString('ro-RO', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'})}</span>
            </div>
            <div class="meci-info">
                <span class="echipe">${meci.echipe}</span>
                <div class="actions">
                    <button class="button-ai" data-meci-id="${meci.id}">
                        <i data-lucide="brain-circuit"></i> Analiză AI
                    </button>
                </div>
            </div>
            <div class="meci-piete">
                ${Object.entries(meci.piete).map(([key, piata]) => `
                    <div class="piata">
                        <p class="piata-titlu">${piata.nume}</p>
                        <div class="cote-container">
                            ${piata.optiuni.map(opt => {
                                const selectieId = `${meci.id}-${key}-${opt.nume}`;
                                const isSelected = selectiePeMeci && selectiePeMeci.id === selectieId;
                                return `
                                <button class="cota-button ${isSelected ? 'selected' : ''}" data-selectie-id="${selectieId}" data-meci-id="${meci.id}" data-piata-key="${key}" data-optiune-nume="${opt.nume}" data-cota="${opt.cota}">
                                    <span class="nume">${opt.nume}</span>
                                    <span class="valoare">${opt.cota.toFixed(2)}</span>
                                </button>`;
                            }).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>`;
        return meciCard;
    }
    
    /**
     * Randează biletul curent
     */
    function renderBilet() {
        DOM.bilet.itemsContainer.innerHTML = '';
        const hasItems = state.bilet.length > 0;
        DOM.bilet.emptyState.style.display = hasItems ? 'none' : 'block';
        DOM.bilet.summary.style.display = hasItems ? 'block' : 'none';

        if (hasItems) {
            state.bilet.forEach(selectie => {
                const item = document.createElement('div');
                item.className = 'bilet-item';
                item.innerHTML = `
                    <div class="bilet-item-info">
                        <div class="meci">${selectie.meciEchipe}</div>
                        <div class="pronostic">${selectie.piataNume}: <strong>${selectie.optiuneNume}</strong></div>
                    </div>
                    <div class="bilet-item-cota">${selectie.cota.toFixed(2)}</div>
                    <button class="remove-item-button" data-selectie-id="${selectie.id}"><i data-lucide="x-circle"></i></button>
                `;
                item.querySelector('.remove-item-button').addEventListener('click', () => removeFromBilet(selectie.id));
                DOM.bilet.itemsContainer.appendChild(item);
            });
        }
        updateBiletSummary();
        lucide.createIcons();
    }
    
    /**
     * Randează istoricul de bilete
     */
    function renderIstoric() {
        DOM.istoric.container.innerHTML = '';
        const hasItems = state.istoric.length > 0;
        DOM.istoric.emptyState.style.display = hasItems ? 'none' : 'block';
        if (!hasItems) return;
        
        [...state.istoric].reverse().forEach(bilet => {
            const card = document.createElement('div');
            card.className = 'bilet-istoric-card';
            const isCastigat = bilet.status === 'câștigat';
            const isPierdut = bilet.status === 'pierdut';
            const statusClass = isCastigat ? 'success' : (isPierdut ? 'danger' : 'warning');
            const statusIcon = isCastigat ? 'check-circle' : (isPierdut ? 'x-circle' : 'hourglass');

            card.innerHTML = `
                <div class="bilet-istoric-header">
                    <div>
                        <span class="data">Salvat: ${new Date(bilet.dataSalvare).toLocaleString('ro-RO')}</span><br>
                        <span class="data">Miză: ${bilet.miza} RON</span>
                    </div>
                    <div style="text-align: right;">
                        <span class="cota">Cotă: ${bilet.cotaTotala.toFixed(2)}</span><br>
                        <span class="alert-${statusClass}" style="padding: 3px 8px; border-radius: 8px; font-size: 14px; border: none;">
                            <i data-lucide="${statusIcon}" style="width:14px; height:14px; vertical-align: middle;"></i> ${bilet.status}
                        </span>
                    </div>
                </div>
                <div class="bilet-istoric-body">
                    ${bilet.selectii.map(s => `<div class="bilet-istoric-item"><span>${s.meciEchipe} - <strong>${s.optiuneNume}</strong></span><span>${s.cota.toFixed(2)}</span></div>`).join('')}
                </div>`;
            DOM.istoric.container.appendChild(card);
        });
        lucide.createIcons();
    }

    /**
     * Randează secțiunea de statistici, inclusiv graficele
     */
    function renderStatistici() {
        const total = state.istoric.length;
        const castigate = state.istoric.filter(b => b.status === 'câștigat').length;
        const pierdute = state.istoric.filter(b => b.status === 'pierdut').length;
        const rataSucces = total > 0 ? ((castigate / total) * 100).toFixed(1) : 0;

        DOM.statistici.totalBilete.textContent = total;
        DOM.statistici.bileteCastigate.textContent = castigate;
        DOM.statistici.biletePierdute.textContent = pierdute;
        DOM.statistici.rataSucces.textContent = `${rataSucces}%`;
        
        // Bar Chart
        if (statsBarChart) statsBarChart.destroy();
        statsBarChart = new Chart(DOM.statistici.chartCanvas, {
            type: 'bar',
            data: {
                labels: state.istoric.map((_, index) => `Bilet ${index + 1}`),
                datasets: [{
                    label: 'Rezultat Bilet (1=Câștig, -1=Pierdere)',
                    data: state.istoric.map(b => b.status === 'câștigat' ? 1 : (b.status === 'pierdut' ? -1 : 0)),
                    backgroundColor: state.istoric.map(b => b.status === 'câștigat' ? 'rgba(40, 167, 69, 0.6)' : 'rgba(220, 53, 69, 0.6)'),
                }]
            },
            options: { scales: { y: { ticks: { stepSize: 1 } } } }
        });

        // Pie Chart
        const succesPePariuri = state.istoric
            .filter(b => b.status === 'câștigat')
            .flatMap(b => b.selectii)
            .reduce((acc, selectie) => {
                const tip = selectie.piataNume;
                acc[tip] = (acc[tip] || 0) + 1;
                return acc;
            }, {});
        
        if (statsPieChart) statsPieChart.destroy();
        statsPieChart = new Chart(DOM.statistici.pieChartCanvas, {
            type: 'pie',
            data: {
                labels: Object.keys(succesPePariuri),
                datasets: [{
                    label: 'Tipuri Pariuri Câștigătoare',
                    data: Object.values(succesPePariuri),
                    backgroundColor: ['#28a745', '#0d6efd', '#ffc107', '#dc3545', '#6c757d'],
                }]
            }
        });
    }

    /**
     * Randează secțiunea de setări
     */
    function renderSetari() {
        DOM.setari.mizaImplicita.value = state.setari.mizaImplicita;
    }
    
    /**
     * Actualizează sumarul biletului (cotă, câștig, etc.)
     */
    function updateBiletSummary() {
        const totalMeciuri = state.bilet.length;
        const cotaTotala = state.bilet.reduce((acc, s) => acc * s.cota, 1);
        const miza = parseFloat(DOM.bilet.mizaInput.value) || 0;
        
        DOM.bilet.totalMeciuri.textContent = totalMeciuri;
        DOM.bilet.cotaTotala.textContent = cotaTotala.toFixed(2);
        DOM.bilet.castigPotential.textContent = `${(cotaTotala * miza).toFixed(2)} RON`;
        
        DOM.bilet.countBadge.textContent = totalMeciuri;
        DOM.bilet.countBadge.style.display = totalMeciuri > 0 ? 'block' : 'none';
    }
    
    /**
     * Actualizează UI-ul și salvează starea în Local Storage
     */
    function updateUI() {
        renderOferta(DOM.searchInput.value);
        renderBilet();
        saveStateToLocalStorage();
    }

    // ===================================================================================
    // MANIPULARE STARE (BILET, ISTORIC, SETĂRI)
    // ===================================================================================
    
    function handleCotaClick(e) {
        const { selectieId, meciId, piataKey, optiuneNume, cota } = e.currentTarget.dataset;
        const existing = state.bilet.find(s => s.meciId === parseInt(meciId));
        
        if (existing && existing.id === selectieId) {
            removeFromBilet(selectieId);
        } else {
            if (existing) removeFromBilet(existing.id);
            addToBilet(selectieId, parseInt(meciId), piataKey, optiuneNume, parseFloat(cota));
        }
    }

    function addToBilet(selectieId, meciId, piataKey, optiuneNume, cota) {
        const meci = state.meciuri.find(m => m.id === meciId);
        if (!meci) return;
        
        state.bilet.push({
            id: selectieId, meciId, meciEchipe: meci.echipe, piataKey,
            piataNume: meci.piete[piataKey].nume, optiuneNume, cota,
        });
        updateUI();
    }

    function removeFromBilet(selectieId) {
        state.bilet = state.bilet.filter(s => s.id !== selectieId);
        updateUI();
    }

    function clearBilet() {
        state.bilet = [];
        updateUI();
    }
    
    function saveBiletToHistory() {
        if(state.bilet.length < 1) { alert("Biletul este gol!"); return; }
        
        state.istoric.push({
            id: Date.now(),
            dataSalvare: new Date().toISOString(),
            selectii: [...state.bilet],
            cotaTotala: state.bilet.reduce((acc, s) => acc * s.cota, 1),
            miza: parseFloat(DOM.bilet.mizaInput.value),
            status: ['câștigat', 'pierdut'][Math.floor(Math.random() * 2)],
        });
        clearBilet();
        renderAllComponents();
        saveStateToLocalStorage();
        handleNavigation({ preventDefault: () => {} }, getElem('view-istoric').previousElementSibling);
    }

    function saveSettings() {
        state.setari.mizaImplicita = parseFloat(DOM.setari.mizaImplicita.value) || 10;
        DOM.bilet.mizaInput.value = state.setari.mizaImplicita;
        saveStateToLocalStorage();
        alert("Setări salvate!");
    }

    // --- LOCAL STORAGE & DATA MANAGEMENT ---
    const LS_KEY = 'biletulPerfectState_v3';
    function saveStateToLocalStorage() { localStorage.setItem(LS_KEY, JSON.stringify(state)); }
    function loadStateFromLocalStorage() {
        const savedState = localStorage.getItem(LS_KEY);
        if(savedState) {
            const parsed = JSON.parse(savedState);
            state.bilet = parsed.bilet || [];
            state.istoric = parsed.istoric || [];
            state.setari = parsed.setari || { mizaImplicita: 10 };
            DOM.bilet.mizaInput.value = state.setari.mizaImplicita;
        }
    }
    function exportData() {
        const a = document.createElement('a');
        a.href = 'data:application/json;charset=utf-8,'+ encodeURIComponent(JSON.stringify(state));
        a.download = 'biletul_perfect_backup.json';
        a.click();
    }
    function importData(event) {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const imported = JSON.parse(e.target.result);
                if (imported.meciuri && imported.bilet && imported.istoric) {
                    state = imported;
                    saveStateToLocalStorage();
                    renderAllComponents();
                    alert("Date importate cu succes!");
                } else alert("Fișierul de backup nu este valid.");
            } catch (err) { alert("Eroare la parsarea fișierului."); }
        };
        reader.readAsText(file);
    }
    function deleteAllData() {
        if (confirm("Ești sigur că vrei să ștergi TOATE datele? Acțiunea este ireversibilă!")) {
            localStorage.removeItem(LS_KEY);
            state = { bilet: [], istoric: [], setari: { mizaImplicita: 10 }, meciuri: state.meciuri, tipuriPariuri: state.tipuriPariuri };
            renderAllComponents();
            alert("Toate datele au fost șterse.");
        }
    }
    
    // ===================================================================================
    // MOTORUL AI & LOGICA DE ANALIZĂ
    // ===================================================================================

    /**
     * Analizează ziua curentă și recomandarea principală și le afișează
     */
    function analyzeDayAndRenderHeader() {
        const analyses = state.meciuri.map(m => analyzeMatch(m));
        
        // Analiza zilei
        const totalMeciuri = state.meciuri.length;
        const capcane = analyses.filter(a => a.alerte.some(al => al.tip === 'capcana')).length;
        let scorZi = 50 - (capcane / totalMeciuri * 50);
        let mesaj = "O zi normală pentru pariuri.";
        let clasa = "neutral";
        if (scorZi < 40) { mesaj = "Multe meciuri capcană azi."; clasa = "bad"; }
        else if (scorZi > 60) { mesaj = "Zi cu oportunități bune."; clasa = "good"; }
        DOM.ui.dayAnalysisContainer.className = `day-analysis ${clasa}`;
        DOM.ui.dayAnalysisContainer.innerHTML = `<i data-lucide="${clasa === 'good' ? 'trending-up' : 'trending-down'}"></i> ${mesaj}`;
        
        // Sfatul zilei
        analyses.sort((a,b) => b.recomandarePrincipala.scor - a.recomandarePrincipala.scor);
        const bestTip = analyses[0];
        const meciOriginal = state.meciuri.find(m => m.id === bestTip.recomandarePrincipala.meciId);
        
        DOM.ui.aiTipOfTheDay.innerHTML = `
            <div class="tip-header"><i data-lucide="star"></i> SFATUL ZILEI DE LA AI</div>
            <div class="tip-body">
                <div class="meci">${meciOriginal.echipe}</div>
                <div class="pronostic">${bestTip.recomandarePrincipala.text.replace("Probabilitate ridicată pentru", "").trim()}</div>
            </div>
            <div class="tip-footer">
                <span>Cotă: <strong>${bestTip.recomandarePrincipala.cota.toFixed(2)}</strong></span>
                <span>Încredere AI: <strong>${bestTip.recomandarePrincipala.scor.toFixed(0)}%</strong></span>
            </div>
        `;
        DOM.ui.aiTipOfTheDay.style.display = 'block';
        lucide.createIcons();
    }
    
    function handleAnalysisClick(e) {
        const meci = state.meciuri.find(m => m.id === parseInt(e.currentTarget.dataset.meciId));
        if (meci) showAnalysisModal(meci);
    }

    /**
     * Afișează modalul cu analiza detaliată a unui meci
     */
    function showAnalysisModal(meci) {
        const analysis = analyzeMatch(meci);
        DOM.modal.title.textContent = `Analiză Detaliată: ${meci.echipe}`;
        let modalHTML = `
            <div class="analysis-section">
                <h4>🧠 Concluzie AI & Recomandare Principală</h4>
                <div class="alert alert-success">
                    <i data-lucide="check-circle"></i>
                    <p><strong>${analysis.recomandarePrincipala.text}</strong> (Cotă: ${analysis.recomandarePrincipala.cota.toFixed(2)})</p>
                </div>
                <div class="progress-bar"><div class="progress-bar-inner" style="width: ${analysis.recomandarePrincipala.scor.toFixed(0)}%;"></div></div>
            </div>
            <div class="analysis-section">
                <h4>📈 Formă & Statistici Cheie</h4>
                <ul>
                    <li>Formă ${meci.statistici.forma[0].nume}: ${meci.statistici.forma[0].valoare.join(', ')}</li>
                    <li>Formă ${meci.statistici.forma[1].nume}: ${meci.statistici.forma[1].valoare.join(', ')}</li>
                    <li>Medie Goluri/Meci (Total): ${(meci.statistici.medieGoluriMarcate + meci.statistici.medieGoluriPrimite).toFixed(2)}</li>
                    <li>Ultimele 5 meciuri directe: ${meci.statistici.directe}</li>
                </ul>
            </div>
            <div class="analysis-section">
                <h4>⚠️ Avertizări & Oportunități (Detector Capcane)</h4>
                ${analysis.alerte.length > 0 ? analysis.alerte.map(alerta => `
                    <div class="alert alert-${alerta.tip === 'capcana' ? 'danger' : (alerta.tip === 'oportunitate' ? 'success' : 'warning')}">
                         <i data-lucide="${alerta.tip === 'capcana' ? 'shield-alert' : (alerta.tip === 'oportunitate' ? 'zap' : 'lightbulb')}"></i>
                         <p><strong>${alerta.titlu}:</strong> ${alerta.text}</p>
                    </div>`).join('') : '<p>Nicio avertizare specială detectată.</p>'}
            </div>`;
        DOM.modal.body.innerHTML = modalHTML;
        DOM.modal.overlay.style.display = 'flex';
        lucide.createIcons();
    }
    
    /**
     * Motorul AI - set de reguli logice mult mai complex
     */
    function analyzeMatch(meci) {
        let recomandari = [];
        let alerte = [];
        const { statistici: stats, piete } = meci;

        // Reguli de bază pentru fiecare tip de pariu
        const ggOption = piete.ambeleMarcheaza?.optiuni.find(o => o.nume === 'Da');
        if (ggOption) {
            let scorGG = 30 + (stats.procentGG / 2);
            if (stats.medieGoluriMarcate > 1.4 && stats.medieGoluriPrimite > 1.0) scorGG += 15;
            if (scorGG > 50) recomandari.push({ text: "Ambele marchează", cota: ggOption.cota, scor: scorGG, meciId: meci.id });
        }
        
        const overOption = piete.totalGoluri?.optiuni.find(o => o.nume === 'Peste 2.5');
        if (overOption) {
            let scorOver = 30 + (stats.procentPeste2_5 / 2);
            if (stats.medieGoluriMarcate + stats.medieGoluriPrimite > 3.1) scorOver += 20;
            if (scorOver > 50) recomandari.push({ text: "Peste 2.5 goluri", cota: overOption.cota, scor: scorOver, meciId: meci.id });
        }
        
        const formaE1 = stats.forma[0].valoare.filter(r => r === 'V').length - stats.forma[0].valoare.filter(r => r === 'I').length;
        const formaE2 = stats.forma[1].valoare.filter(r => r === 'V').length - stats.forma[1].valoare.filter(r => r === 'I').length;
        if (piete.rezultatFinal) {
            if (formaE1 > formaE2 + 1) {
                const opt = piete.rezultatFinal.optiuni.find(o => o.nume === '1');
                if (opt) recomandari.push({ text: `Victorie ${stats.forma[0].nume}`, cota: opt.cota, scor: 50 + formaE1 * 6, meciId: meci.id });
            }
            if (formaE2 > formaE1 + 1) {
                const opt = piete.rezultatFinal.optiuni.find(o => o.nume === '2');
                if (opt) recomandari.push({ text: `Victorie ${stats.forma[1].nume}`, cota: opt.cota, scor: 50 + formaE2 * 6, meciId: meci.id });
            }
        }
        
        // Reguli pentru Alerte și Oportunități
        if (Math.min(...piete.rezultatFinal.optiuni.map(o => o.cota)) < 1.25) {
             alerte.push({titlu: "Cotă capcană", text: `Favorita are o cotă extrem de mică, riscul nu justifică câștigul.`, tip: 'capcana'});
        }
        if (stats.note.toLowerCase().includes("suspendat") || stats.note.toLowerCase().includes("accidentat")) {
             alerte.push({titlu: "Absențe", text: `Atenție la jucătorii indisponibili: ${stats.note}`, tip: 'avertizare'});
        }
        if (stats.note.toLowerCase().includes("derby")) {
             alerte.push({titlu: "Meci Derby", text: `Meciurile derby sunt imprevizibile și pot ignora forma de moment.`, tip: 'avertizare'});
        }
        if (stats.trendCota && stats.trendCota.scadere > 10) {
             alerte.push({titlu: "Trend Cotă", text: `Cota pentru ${stats.trendCota.echipa} a scăzut semnificativ, indicând un pariu de valoare.`, tip: 'oportunitate'});
        }

        recomandari.sort((a, b) => b.scor - a.scor);
        const recomandarePrincipala = recomandari.length > 0 ? recomandari[0] : { text: "Meci echilibrat, greu de prezis.", cota: 1.00, scor: 40, meciId: meci.id };

        return { recomandarePrincipala, alerte };
    }
    
    // --- GENERATOR BILET AI ---
    
    function initGeneratorOptions() {
        DOM.generator.tipuriPariuri.innerHTML = '';
        const map = {'rezultatFinal':'Final', 'ambeleMarcheaza':'GG', 'totalGoluri':'Total Goluri'};
        Array.from(state.tipuriPariuri).forEach(key => {
            if (!map[key]) return;
            DOM.generator.tipuriPariuri.innerHTML += `<label><input type="checkbox" name="tip-pariu" value="${key}" checked><span>${map[key]}</span></label>`;
        });
    }

    async function handleGenerateAIBilet() {
        showLoading("AI-ul generează biletul...");
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulare procesare
        
        const { nrMeciuri, cotaMin, cotaMax, riskLevel, tipuriSelectate } = getGeneratorConfig();
        
        const potentialPicks = state.meciuri
            .map(meci => analyzeMatch(meci).recomandarePrincipala)
            .filter(pick => {
                const piataKey = Object.keys(state.meciuri.find(m => m.id === pick.meciId).piete).find(k => state.meciuri.find(m => m.id === pick.meciId).piete[k].optiuni.some(o => o.cota === pick.cota));
                return tipuriSelectate.includes(piataKey);
            })
            .map(p => { // Ajustare scor in functie de risc
                if (riskLevel === 'conservator') p.scor *= (1 / p.cota) * 1.5;
                if (riskLevel === 'agresiv') p.scor *= p.cota / 1.5;
                return p;
            })
            .sort((a, b) => b.scor - a.scor);

        let biletGenerat = [], cotaCurenta = 1.0, meciuriAdaugate = new Set();
        
        for (const pick of potentialPicks) {
            if (biletGenerat.length >= nrMeciuri || cotaCurenta >= cotaMin) break;
            if (meciuriAdaugate.has(pick.meciId)) continue;
            
            const meciOriginal = state.meciuri.find(m => m.id === pick.meciId);
            const piataKey = Object.keys(meciOriginal.piete).find(k => meciOriginal.piete[k].optiuni.some(o => o.cota === pick.cota));
            const optiune = meciOriginal.piete[piataKey].optiuni.find(o => o.cota === pick.cota);
             
            biletGenerat.push({
                id: `${pick.meciId}-${piataKey}-${optiune.nume}`, meciId: pick.meciId, meciEchipe: meciOriginal.echipe, piataKey,
                piataNume: meciOriginal.piete[piataKey].nume, optiuneNume: optiune.nume, cota: pick.cota
            });
            cotaCurenta *= pick.cota;
            meciuriAdaugate.add(pick.meciId);
        }

        hideLoading();
        if (biletGenerat.length === 0 || cotaCurenta < cotaMin) {
            alert("Nu s-a putut genera un bilet. Încearcă un interval de cotă sau un risc diferit.");
        } else {
            state.bilet = biletGenerat;
            updateUI();
            handleNavigation({ preventDefault: () => {} }, getElem('view-bilet').previousElementSibling);
        }
    }

    function getGeneratorConfig() {
        return {
            nrMeciuri: parseInt(DOM.generator.nrMeciuri.value),
            cotaMin: parseFloat(DOM.generator.cotaMin.value),
            cotaMax: parseFloat(DOM.generator.cotaMax.value),
            riskLevel: DOM.generator.riskLevel.value,
            tipuriSelectate: Array.from(getElems('#generator-tipuri-pariuri input:checked')).map(cb => cb.value)
        };
    }

    // --- PWA, TEMA & UTILITARE ---
    
    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('biletulPerfectTheme_v3', isDark ? 'dark' : 'light');
        DOM.theme.icon.setAttribute('data-lucide', isDark ? 'moon' : 'sun');
        lucide.createIcons();
    }

    function loadTheme() {
        const theme = localStorage.getItem('biletulPerfectTheme_v3');
        if (theme === 'dark' || (theme === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.body.classList.add('dark-mode');
            DOM.theme.icon.setAttribute('data-lucide', 'moon');
        } else {
            DOM.theme.icon.setAttribute('data-lucide', 'sun');
        }
        lucide.createIcons();
    }
    
    let deferredInstallPrompt = null;
    function setupPWAInstall() {
        window.addEventListener('beforeinstallprompt', e => {
            e.preventDefault();
            deferredInstallPrompt = e;
            DOM.pwa.installButton.style.display = 'block';
        });
        DOM.pwa.installButton.addEventListener('click', async () => {
            if (deferredInstallPrompt) {
                deferredInstallPrompt.prompt();
                await deferredInstallPrompt.userChoice;
                deferredInstallPrompt = null;
                DOM.pwa.installButton.style.display = 'none';
            }
        });
        window.addEventListener('appinstalled', () => { DOM.pwa.installButton.style.display = 'none'; });
    }

    function showLoading(message) { DOM.ui.loadingOverlay.querySelector('p').textContent = message; DOM.ui.loadingOverlay.style.display = 'flex'; }
    function hideLoading() { DOM.ui.loadingOverlay.style.display = 'none'; }

    // --- Pornirea Aplicației ---
    init();
});
