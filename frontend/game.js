class GameAnalyzer {
    constructor() {
        this.apiBase = CONFIG.API_BASE;
        this.gameId = this.getGameIdFromUrl();
        this.multiplierReasons = [];
        this.scheduleData = null;
        this.lastTeamFormWarmed = null;
        this.homeTeamAbbrev = null;
        this.awayTeamAbbrev = null;
        this.currentSeasonHint = null;
        this.recentExcitementCache = new Map();
        this.teamFormSnapshots = new Map();
        this.previewTeamForm = null;
        this.previewStartTime = null;
        this.recentPotentialData = null;
        this.expectedRawComponents = null;
        this.latestExpectedRaw = null;
        this.teamFormMaxGames = 5;
        this.recentGamesWindow = null;
        this.recentGameDetails = null;
        this.isPreviewMode = false;
        if (this.gameId) {
            document.getElementById('debugGameId').textContent = this.gameId;
            this.loadGameInfo();
        } else {
            this.showError('No game ID provided');
        }
    }

    async loadGameInfo() {
        const response = await fetch(`${this.apiBase}/excitement_game/${this.gameId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch schedule: ${response.status}`);
        }
        const game = await response.json();
        this.updateTeamHeaders(game);
        this.displayResults(game)
    }

    updateTeamHeaders(game) {
        // Update team matchup header
        document.getElementById('awayLogo').src = `../assets/${game.away_tla}_light.svg`;
        document.getElementById('awayTeamName').textContent = game.away_tla;
        document.getElementById('awayStatsHeader').textContent = game.away_tla;
        
        document.getElementById('homeLogo').src = `../assets/${game.home_tla}_light.svg`;
        document.getElementById('homeTeamName').textContent = game.home_tla;
        document.getElementById('homeStatsHeader').textContent = game.home_tla;
    }

    getGameIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
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

    async displayResults(game) {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('error').classList.add('hidden');
        document.getElementById('results').classList.remove('hidden');
        
        this.resetPreviewUI();

        console.log("Game data: ",game)

        const isPreview = (game.period === "Preview")
        
        this.homeTeamAbbrev = game.home_tla
        this.awayTeamAbbrev = game.away_tla
        
        const statsSection = document.querySelector('.stats-section');
        if (statsSection) {
            statsSection.classList.remove('hidden');
        }

        // Category badge
        const baseClass = 'category-badge'
        const categoryElement = document.getElementById('category');
        const excitementclass = game.excitement_level.toLowerCase().replace(/\s+/g, '-');
        let categoryClass = `${baseClass} ${excitementclass}`;
        
        categoryElement.className = categoryClass;
        categoryElement.textContent = game.excitement_level;

        
        const summaryHeading = document.querySelector('#gameSummarySection h3');
        if (summaryHeading) {
            summaryHeading.textContent = 'Game Summary';
        }
        this.displayGameSummary(game.excitement_modifiers);

        // Live/finished game - show game info and totals
        const statsTitleEl = document.getElementById('statsTitle');
        if (statsTitleEl) {
            statsTitleEl.textContent = 'Game Statistics';
            statsTitleEl.removeAttribute('data-mode');
            statsTitleEl.removeAttribute('data-source');
            statsTitleEl.removeAttribute('data-window');
            statsTitleEl.removeAttribute('data-games-text');

            if (isPreview)
            {
                statsTitleEl.textContent = 'Season Averages';
            }
        }

            // Update team scores
            document.getElementById('awayTeamScore').textContent = game.away_goals;
            document.getElementById('homeTeamScore').textContent = game.home_goals;

            // Live game - format period with ordinal suffix
            let periodText = "Preview"
            let timeRemaining = ""
            if (game.period != "Preview")
            {
                const num = parseInt(game.period);
                periodText = num === 1 ? '1st' : num === 2 ? '2nd' : num === 3 ? '3rd' : `OT`;
                if (game.is_game_over)
                {
                    periodText = (num > 3) ? 'FINAL/OT' : "FINAL";
                }

                timeRemaining = game.period_time_remaining
            }   
           
            document.getElementById('periodStatus').textContent = periodText;
            document.getElementById('timeStatus').textContent = timeRemaining;

            var away_data = {"goals": game.away_goals, "hdc": game.away_hdc, "mdc": game.away_mdc, "hits": game.away_hits, "xg": game.away_xg.toFixed(1)};
            var home_data = {"goals": game.home_goals, "hdc": game.home_hdc, "mdc": game.home_mdc, "hits": game.home_hits, "xg": game.home_xg.toFixed(1)}; 

            this.updateTotals('home', home_data);
            this.updateTotals('away', away_data);
        }

    updateTotals(team, totals) {
        document.getElementById(`${team}Goals`).textContent = totals.goals;
        document.getElementById(`${team}Hdc`).textContent = totals.hdc;
        document.getElementById(`${team}Mdc`).textContent = totals.mdc;
        document.getElementById(`${team}Hits`).textContent = totals.hits;
        document.getElementById(`${team}Xg`).textContent = totals.xg;
    }




    resetPreviewUI() {
        const section = document.getElementById('previewDiagnostics');
        if (section) {
            section.classList.add('hidden');
        }

        const expectedBadge = document.getElementById('expectedCategoryBadge');
        if (expectedBadge) {
            expectedBadge.textContent = 'Preview';
            expectedBadge.className = 'category-badge';
        }

        const expectedRawValue = document.getElementById('expectedRawValue');
        if (expectedRawValue) {
            expectedRawValue.textContent = '0.0';
        }

        const thresholds = document.getElementById('categoryThresholds');
        if (thresholds) {
            thresholds.innerHTML = '';
        }

        const potential = document.getElementById('recentPotential');
        if (potential) {
            potential.innerHTML = '';
            potential.classList.add('hidden');
        }

        const teamFormCard = document.getElementById('teamFormCard');
        if (teamFormCard) {
            teamFormCard.classList.add('hidden');
        }
        this.teamFormSnapshots.clear();
        this.recentPotentialData = null;
        this.expectedRawComponents = null;
        this.latestExpectedRaw = null;
        this.recentGamesWindow = null;
        this.recentGameDetails = null;

        const teamFormList = document.getElementById('teamFormInsights');
        if (teamFormList) {
            teamFormList.innerHTML = '';
        }


        const monteCarloCard = document.getElementById('monteCarloCard');
        if (monteCarloCard) {
            monteCarloCard.classList.add('hidden');
        }

        const monteCarloSpread = document.getElementById('monteCarloSpread');
        if (monteCarloSpread) {
            monteCarloSpread.innerHTML = '';
        }
    }



    displayGameSummary(modifiers) {
        const section = document.getElementById('gameSummarySection');
        const container = document.getElementById('gameSummary');

        if (!modifiers) {
            section.style.display = 'none';
            return;
        }
       const badges = []
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
       if (modifiers["xgoals_ice_tilt"])
       {
         badges.push({icon: '⚖️', label: 'Ice Tilt (xGoals)', type: "detractor"});
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

        
        // Excitement Drivers
            let goodhtml = '<div class="summary-group"><h4>Excitement Drivers</h4>';
            let badhtml = '<div class="summary-group"><h4>Excitement Inhibitors</h4>';
            badges.map( badge => {
                 const badgeHtml = `<span class="game-badge ${badge.type}" data-tooltip="${badge.tooltip}}"><span class="badge-icon">${badge.icon}</span><span class="badge-label">${badge.label}</span></span>`
                if (badge.type == "highlight")
                { 
                    goodhtml += `<div class="summary-item factor-active">
                        <div class="summary-factor">
                            ${badgeHtml}
                        </div>
                    </div>`;
                }
                else
                {
                    badhtml += `<div class="summary-item factor-penalty">
                        <div class="summary-factor">
                            ${badgeHtml}
                        </div>
                    </div>`;
                }
               
            });
            goodhtml += '</div>';
            badhtml += '</div>';
            container.innerHTML = goodhtml + badhtml;
            section.style.display = 'block';
        }
        
        
    }
}


// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gameAnalyzer = new GameAnalyzer();
});
