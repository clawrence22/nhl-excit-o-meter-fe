const BATCH_CHUNK_SIZE = 3;

class ExcitementAnalyzer {
    constructor() {
        this.apiBase = CONFIG.API_BASE;

        this.gamesById = new Map();
        this.gameCardRefs = new Map();
        this.activeLoadToken = null;

        this.initializeEventListeners();
    }

    formatPeriod(period) 
    {
        switch (period) {
            case 'Preview':
                return 'Preview';
            case 1:
                return '1st';
            case 2:
                return '2nd';
            case 3:
                return '3rd';
            default:
                return 'OT'
            }
    }

    formatLocalStartTime(isoString, includeDate = false) {
        if (!isoString) return '';
        const start = new Date(isoString);
        const timeOptions = { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' };
        const timeText = start.toLocaleTimeString([], timeOptions);
        if (!includeDate) {
            return timeText;
        }
        const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' };
        const dateText = start.toLocaleDateString([], dateOptions);
        return `${dateText} ${timeText}`;
    }

    initializeEventListeners() {
        const loadGamesBtn = document.getElementById('loadGamesBtn');
        const dateInput = document.getElementById('gameDate');

        loadGamesBtn.addEventListener('click', () => this.loadGames());
        dateInput.addEventListener('change', () => this.loadGames());
    }


    async loadGames() {
        const loadToken = Symbol('load');
        this.activeLoadToken = loadToken;
        this.gamesById.clear();
        this.gameCardRefs.clear();

        const dateInput = document.getElementById('gameDate');
        let date = dateInput.value;
        if (!date) {
            this.showError('Please select a date');
            return;
        }

        document.getElementById('gamesList').classList.add('hidden');
        this.showLoading();

        try {
            const games = await this.fetchScheduleGames(date);
            if (this.activeLoadToken !== loadToken) {
                return;
            }
            
            if (games["000001"] == "No Games Today")
            {
                this.displayNoGamesMsg();
                return;
            }

            this.displayGamesList(games);
            this.populateGameDetails(games, loadToken).catch((error) => {
                console.error('Failed to populate game details:', error);
            });
        } catch (error) {
            if (this.activeLoadToken !== loadToken) {
                return;
            }
            console.error('Error:', error);
            this.showError(`Failed to load games: ${error.message}`);
        }
    }

    async displayNoGamesMsg() 
    {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('error').classList.add('hidden');
        document.getElementById('results').classList.add('hidden');
    
        const gamesList = document.getElementById('gamesList');
        gamesList.classList.remove('hidden');
        gamesList.innerHTML = '<p style="text-align: center; color: #888;">No games found for this date</p>';
    }    

    async fetchScheduleGames(date) {
        const response = await fetch(`${this.apiBase}/excitement_date/${date}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch schedule: ${response.status}`);
        }
        const games = await response.json();

        return games;
    }

    async populateGameDetails(games, loadToken) {
        
        for (const [id, game_data] of Object.entries(games)) 
        {
            this.updateGameDetail(id, game_data, loadToken);
            this.setCardLoading(id, false);
            this.updateGameCard(id,game_data);
        }

            // if (game.gameState === 'FUT') {
            //     const gamePk = encodeURIComponent(game.id);
            //     const home = encodeURIComponent(game.homeTeam.abbrev);
            //     const away = encodeURIComponent(game.awayTeam.abbrev);
            //     const finishPreview = this.startGameTask(game.id);
            //     const previewTask = (async () => {
            //         try {
            //             const response = await fetch(`${this.apiBase}/preview?home=${home}&away=${away}&gamePk=${gamePk}`);
            //             if (this.activeLoadToken !== loadToken) {
            //                 return;
            //             }
            //             if (response.ok) {
            //                 const data = await response.json();
            //                 if (this.activeLoadToken !== loadToken) {
            //                     return;
            //                 }
            //                 if (data) {
            //                     this.updateGameDetail(
            //                         game.id,
            //                         {
            //                             excitement: data.expected_raw ?? null,
            //                             category: data.category ?? null,
            //                             gameSummary: this.buildPreviewSummary(data),
            //                         },
            //                         loadToken,
            //                     );
            //                 }
            //             }
            //         } catch (error) {
            //             if (this.activeLoadToken === loadToken) {
            //                 console.warn(`Preview lookup failed for game ${game.id}:`, error);
            //             }
            //         } finally {
            //             finishPreview();
            //         }
            //     })();
            //     detailTasks.push(previewTask);
            // }
        }


    updateGameDetail(gameId, updates, loadToken) {
        if (loadToken && this.activeLoadToken !== loadToken) {
            console.warn(`Ignoring update for game ${gameId} due to load token mismatch`);
            return;
        }
        const game = this.gamesById.get(gameId);
        if (!game) {
            console.warn(`Game ${gameId} not found in gamesById`);
            return;
        } 
        console.log("Found game: ",game)
        Object.assign(game, updates);
        this.updateGameCard(game);
    }

    clearGameBadges(gameId) {
        const refs = this.gameCardRefs.get(gameId);
        if (refs?.badgesEl) {
            refs.badgesEl.innerHTML = '';
        }
    }

    setCardLoading(gameId, isLoading) {
        const refs = this.gameCardRefs.get(gameId);
        if (!refs) return;
        const { card, loadingEl, bodyEl } = refs;
        if (!card || !loadingEl || !bodyEl) {
            return;
        }
        if (isLoading) {
            card.classList.add('loading');
            loadingEl.classList.remove('hidden');
            bodyEl.classList.add('hidden');
            card.dataset.tooltipContent = '<strong>Loading game details...</strong>';
        } else {
            card.classList.remove('loading');
            loadingEl.classList.add('hidden');
            bodyEl.classList.remove('hidden');
        }
    }

    startGameTask(gameId) {
        const game = this.gamesById.get(gameId);
        if (!game) {
            return () => {};
        }
        game.pendingFetches = (game.pendingFetches || 0) + 1;
        game.isLoaded = false;
        this.setCardLoading(gameId, true);
        let finished = false;
        return () => {
            if (finished) {
                return;
            }
            finished = true;
            const current = this.gamesById.get(gameId);
            if (!current) {
                return;
            }
            const remaining = Math.max(0, (current.pendingFetches || 1) - 1);
            current.pendingFetches = remaining;
            if (remaining === 0) {
                current.isLoaded = true;
                this.setCardLoading(gameId, false);
                this.updateGameCard(current);
            }
        };
    }

    updateGameCard(id,game) {
        const refs = this.gameCardRefs.get(id);
        if (!refs) {
            return;
        }

        console.log("Details for game: ", game)

        const { card, scoreEl, statusEl, categoryEl, broadcastEl,badgesEl } = refs;

        const isFinal = game.is_game_over;
        const isPreview = (game.period === "Preview")
        const isFuture = false;

        const statusLabel = (isFinal ? 'FINAL' : this.formatPeriod(game.period));

        const timeLabel = (isPreview ? game.start_time : game.period_time_remaining);

        console.log("Status Label: ", statusLabel, "Time Label: ", timeLabel)


        scoreEl.classList.remove('hidden');
        const awayScoreVal = Number(game.away_goals);
        const homeScoreVal = Number(game.home_goals);
        scoreEl.textContent = `${awayScoreVal} - ${homeScoreVal}`;
        statusEl.innerHTML = `${statusLabel}<br>${timeLabel}`

        const baseClass = 'category-badge';
        let categoryClass = `${baseClass} loading`;
        let categoryText = isFuture ? 'Preview pending' : 'Loading...';
        
        
        const excitementclass = game.excitement_level.toLowerCase().replace(/\s+/g, '-');
        categoryClass = `${baseClass} ${excitementclass}`;
        categoryText = isFuture ? `Expected: ${game.excitement_level}` : game.excitement_level;
        
        categoryEl.className = categoryClass;
        categoryEl.textContent = categoryText;

        const broadcastLines = [];

        game.tv_broadcast.forEach((broadcast) => {
            console.log("broadcast:", broadcast)
            const network = broadcast.network
            if (broadcast.market == "Home") 
            {
                broadcastLines.push(`🏠 Home: ${network}`);
            }
            else if (broadcast.market == "Away")
            {
                broadcastLines.push(`✈️ Away: ${network}`);
            }
            else if (broadcast.market == "National")
            {
                broadcastLines.push(`📡 National: ${network}`);
            }
        });

        if (broadcastLines.length > 0) {
            broadcastEl.innerHTML = broadcastLines.join('<br>');
            broadcastEl.classList.remove('hidden');
        } 
        else {
            broadcastEl.innerHTML = '';
            broadcastEl.classList.add('hidden');
        }

       const badges = []
       badgesEl.classList.remove("hidden")

       const modifiers = game.excitement_modifiers

       if (modifiers["close-game"])
       {
         badges.push({icon: '😰', label: 'Close Game',type:"highlight"});
       }
       if (modifiers["hit-fest"])
       {
         badges.push({icon: '💥', label: 'Hits Fest', type: "highlight"});
       }
       if (modifiers["high-scoring"])
       {
         badges.push({icon: '🚨', label: 'High-scoring Game', type: "highlight"});
       }
       if (modifiers["chances_ice_tilt"])
       {
         badges.push({icon: '⚖️', label: 'Ice Tilt (Chances)', type: "detractor"});
       }
       if (modifiers["goals_ice_tilt"])
       {
         badges.push({icon: '⚖️', label: 'Ice Tilt (Goals)', type: "detractor"});
       }
       if (modifiers["next-goal-wins"])
       {
         badges.push({icon: '🏆', label: 'Next Goal Wins', type: "highlight"});
       }
       if (modifiers["frenzy"])
        {
         badges.push({icon: '🔥', label: 'Chance Frenzy', type: "highlight"});
       }
        
       const highlights = [];
       const detractors = [];
        if (badges.length > 0) {
            const badgeHtml = badges.map((badge) => {
                if (badge.type === "highlight") {
                    highlights.push(badge.label);
                } else {
                    detractors.push(badge.label);
                }
                return `<div class="game-badge ${badge.type}"><span class="badge-icon">${badge.icon}</span></div>`;
            }).join('');

            const highlightText = highlights.length ? `- ${highlights.join('<br>- ')}` : 'None';
            const detractorText = detractors.length ? `- ${detractors.join('<br>- ')}` : 'None';
            const tooltipText = `Highlights:<br>${highlightText}<br><br>Detractors:<br>${detractorText}`;

            badgesEl.innerHTML = `
                <div class="tooltip">
                    ${badgeHtml}
                    <span class="tooltiptext">${tooltipText}</span>
                </div>
            `;

            badgesEl.classList.remove('hidden');
        } 
        else {
            badgesEl.innerHTML = '';
            badgesEl.classList.add('hidden');
        }
        
    }

    ensureModalExists() {
        if (!document.getElementById('infoModal')) {
            const modal = document.createElement('div');
            modal.id = 'infoModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="closeModal()">&times;</span>
                    <div id="modalContent"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }
    }

    displayGamesList(games) {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('error').classList.add('hidden');
        document.getElementById('results').classList.add('hidden');

        const gamesList = document.getElementById('gamesList');
        gamesList.classList.remove('hidden');
        gamesList.innerHTML = '';

        console.log("Displaying Games:",games)

        for (const [id, game_data] of Object.entries(games)) {
            

            this.gamesById.set(id, game_data);

            const gameCard = document.createElement('div');
            gameCard.className = 'game-card';
            gameCard.onclick = () => {
                const date = document.getElementById('gameDate').value;
                window.location.href = `game.html?id=${id}`;
            };

            gameCard.innerHTML = `
                <div class="game-card-loading">
                    <div class="spinner spinner-small"></div>
                    <span>Loading game...</span>
                </div>
                <div class="game-card-body hidden">
                    <div class="game-teams">
                        <div class="team">
                            <img src="assets/${game_data.away_tla}_light.svg" alt="${game_data.away_tla}" class="team-logo">
                            <div class="team-abbrev">${game_data.away_tla}</div>
                        </div>
                        <div class="vs-symbol">@</div>
                        <div class="team">
                            <img src="assets/${game_data.home_tla}_light.svg" alt="${game_data.home_tla}" class="team-logo">
                            <div class="team-abbrev">${game_data.home_tla}</div>
                        </div>
                    </div>
                    <div class="game-score js-score hidden"></div>
                    <div class="game-status js-status"></div>
                    <div class="game-excitement">
                        <span class="category-badge js-category">Loading...</span><div class="game-badges tooltip" id="badges-${id}"></div>
                    </div>
                    <br>
                    <div class="broadcast-info js-broadcast hidden"></div>
                </div>
            `;

            const refs = {
                card: gameCard,
                loadingEl: gameCard.querySelector('.game-card-loading'),
                bodyEl: gameCard.querySelector('.game-card-body'),
                scoreEl: gameCard.querySelector('.js-score'),
                statusEl: gameCard.querySelector('.js-status'),
                categoryEl: gameCard.querySelector('.js-category'),
                broadcastEl: gameCard.querySelector('.js-broadcast'),
                badgesEl: gameCard.querySelector(`#badges-${id}`),
            };
            this.gameCardRefs.set(id, refs);

            this.setCardLoading(id, true);
            this.updateGameCard(game_data);
            gamesList.appendChild(gameCard);
        };

        this.ensureModalExists();
    }



    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('results').classList.add('hidden');
        document.getElementById('error').classList.add('hidden');
    }

    showError(message) {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('results').classList.add('hidden');
        document.getElementById('error').classList.remove('hidden');
        document.getElementById('errorMessage').textContent = message;
    }








}

// Global functions for modal
function showModal(gameId) {
    const gameCard = document.querySelector(`[onclick*="${gameId}"]`).closest('.game-card');
    const content = gameCard.dataset.tooltipContent;
    document.getElementById('modalContent').innerHTML = content;
    document.getElementById('infoModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('infoModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('infoModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ExcitementAnalyzer();
});
