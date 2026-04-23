class GameAnalyzer {
    constructor() {
        this.apiBase = CONFIG.API_BASE;
        this.gameId = this.getGameIdFromUrl();
        this.gameDate = this.getGameDateFromUrl();
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
        const [response, teamColors] = await Promise.all([
            fetch(`${this.apiBase}/excitement_game?id=${this.gameId}&date=${this.gameDate}`),
            fetch('team-colors.json').then(r => r.json())
        ]);
        if (!response.ok) throw new Error(`Failed to fetch schedule: ${response.status}`);
        const game = await response.json();
        this.teamColors = teamColors;
        this.updateGameHeader(game);
        this.displayStats(game);
    }


    updateGameHeader(game) {
        console.log("SingleGameObj:",game)
        let away_data = game["away"]
        let home_data = game["home"]
        let game_data = game["game"]
        let excitement_data = game["excitement"]
        // Update team matchup header
        document.getElementById('awayLogo').src = `../assets/teams/${game.away.tla}_light.svg`;
        document.getElementById('awayTeamName').textContent = away_data.name;
        document.getElementById('awayStatsHeader').textContent = away_data.tla;
        this.createGrowingGauge('awayExcitement',away_data.ovr_excitment.excitement_score,away_data.ovr_excitment.excitement_level);
        this.createGrowingGauge('awayExcitementFive',away_data.five_min_excitment.excitement_score,away_data.five_min_excitment.excitement_level);
        
        
        document.getElementById('homeLogo').src = `../assets/teams/${home_data.tla}_light.svg`;
        document.getElementById('homeTeamName').textContent = home_data.name;
        document.getElementById('homeStatsHeader').textContent = home_data.tla;
        this.createGrowingGauge('homeExcitement',home_data.ovr_excitment.excitement_score,home_data.ovr_excitment.excitement_level);
        this.createGrowingGauge('homeExcitementFive',home_data.five_min_excitment.excitement_score,home_data.five_min_excitment.excitement_level);

        // Live game - format period with ordinal suffix
        let periodText = "Preview"
        let timeRemaining = ""
        if (game_data.period != "Preview")
        {
            const num = parseInt(game_data.period);
            periodText = num === 1 ? '1st' : num === 2 ? '2nd' : num === 3 ? '3rd' : `OT`;
            if (game_data.is_game_over)
            {
                periodText = (num > 3) ? 'FINAL/OT' : "FINAL";
            }

            timeRemaining = game_data.period_time_remaining
        }
        this.displayGameModifiers(excitement_data.modifiers,game.playoffs);
        
        document.getElementById('periodStatus').textContent = periodText;
        document.getElementById('timeStatus').textContent = timeRemaining;
        this.createGrowingGauge('gameExcitement',game_data.ovr_excitment.excitement_score,game_data.ovr_excitment.excitement_level);
        this.createGrowingGauge('last5Excitement',game_data.five_min_excitment.excitement_score,game_data.five_min_excitment.excitement_level);
       
    }

    getGameIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    getGameDateFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('gameDate');
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

    async displayStats(game) {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('error').classList.add('hidden');
        document.getElementById('results').classList.remove('hidden');

        let game_data = game["game"]
        let away_data = game["away"]
        let home_data = game["home"]
        let excitement_data = game["excitement"]

        const isPreview = (game_data.period === "Preview")
        
        this.homeTeamAbbrev = home_data.tla
        this.awayTeamAbbrev = game.away.tla
        
        const statsSection = document.querySelector('.stats-section');
        if (statsSection) {
            statsSection.classList.remove('hidden');
        }

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
                statsTitleEl.textContent = 'Last 5 Game Averages Between These Teams';
            }
        }

            var away_stats = {"goals":away_data.goals, "hdc":away_data.hdc, "mdc":away_data.mdc, "hits":away_data.hits};
            var home_stats = {"goals": home_data.goals, "hdc": home_data.hdc, "mdc": home_data.mdc, "hits": home_data.hits}; 

            this.updateTotals('home', home_stats);
            this.updateTotals('away', away_stats);
            this.createTugOfWarGauge(away_data.momentum, home_data.momentum,game_data.momentum_owner);
        }

    updateTotals(team, totals) {
        document.getElementById(`${team}Goals`).textContent = totals.goals;
        document.getElementById(`${team}Hdc`).textContent = totals.hdc;
        document.getElementById(`${team}Mdc`).textContent = totals.mdc;
        document.getElementById(`${team}Hits`).textContent = totals.hits;
    }

    getGuageColor(value)
    {
        const mehColor = '#767676';
        const midColor = '#e2d62a';
        const buzzColor = '#ffa600';
        const burnColor = '#ff3c00';
        
        if (value <= 25) return mehColor;   
        if (value <= 50) return midColor;  
        if (value <= 75) return buzzColor;  
        return burnColor;                  
    }

    createGrowingGauge(containerId,value,label) {

        const valuePct = (value / 100) * 100;

       
        const endColor = '#767676';
        const bar = document.getElementById(containerId);
        bar.innerHTML = '';
        const blendWidth = 8;
        const cutStart = Math.max(0, valuePct - blendWidth / 2);
        const cutEnd = Math.min(100, valuePct + blendWidth / 2);
        const color = this.getGuageColor(value)
        bar.style.background = `linear-gradient(to right, ${color} ${cutStart}%, #888 ${valuePct}%,  ${endColor} ${cutEnd}%)`;
        bar.innerHTML = `<span class="tug-label">${label}</span>`;
    }


    createTugOfWarGauge(awayMomentum, homeMomentum,momentumOwner) {
        let away = awayMomentum;
        let home = homeMomentum;

        const total = away + home;
        const awayPct = (away / total) * 100;

        const awayColor = this.teamColors?.[this.awayTeamAbbrev]?.primary ?? '#ff6b35';
        const homeColor = this.teamColors?.[this.homeTeamAbbrev]?.primary ?? '#c0392b';

        const bar = document.getElementById('iceTilt');

        if (momentumOwner == "Back & Forth") {
            bar.classList.add('tug-back-and-forth');
            bar.style.background = '';
            bar.style.setProperty('--tug-away', awayColor);
            bar.style.setProperty('--tug-home', homeColor);
        } else {
            bar.classList.remove('tug-back-and-forth');
            bar.innerHTML = '';
            const blendWidth = 8;
            const cutStart = Math.max(0, awayPct - blendWidth / 2);
            const cutEnd = Math.min(100, awayPct + blendWidth / 2);
            bar.style.background = `linear-gradient(to right, ${awayColor} ${cutStart}%, #888 ${awayPct}%, ${homeColor} ${cutEnd}%)`;
        }
        
         bar.innerHTML = `<span class="tug-label">${momentumOwner}</span>`;
    }

    updateStateRowModifier(rowId, modifier) {
        var rowEl =  document.getElementById(rowId);
        if (rowEl.classList.contains("normal"))
        {
            rowEl.classList.add(modifier);
            rowEl.classList.remove("normal");
        }
    }

    addBadge(rowId, label, imageFile,modifier) {
        var badgesEl = document.getElementById(rowId);

        var badgeEl = document.createElement('div');
        badgeEl.classList.add("stat-badge");
        badgeEl.classList.add(modifier);

        var labelSpan = document.createElement('span');
        labelSpan.classList.add("badge-label");
        labelSpan.textContent = label;

        var imgEl = document.createElement('img');
        imgEl.classList.add("badge-icon");
        imgEl.src = `assets/modifiers/${imageFile}.svg`;

        badgeEl.appendChild(imgEl);
        badgeEl.appendChild(labelSpan);

        badgesEl.appendChild(badgeEl);
    }

    displayGameModifiers(modifiers,playoffs) {
        
        var badgesEl =  document.getElementById("game-excitement-summary");
        const badges = [];
        if (modifiers["next-goal-wins"]) badges.push({label: 'Next Goal Wins', imageFile: "next_goal_wins", type: "highlight"});
        if (modifiers["back_and_forth"]) badges.push({label: 'Back and Forth', imageFile: "back_and_forth", type: "highlight"});
        if (modifiers["ice_tilt"]) badges.push({label: 'Ice Tilt', imageFile: "ice_tilt", type: "detactor"});
        if (modifiers["close-game"]) badges.push({label: 'Close Game', imageFile: "close_game", type: "highlight"});
        if (modifiers["high-scoring"]) badges.push({label: 'High Scoring', imageFile: "high_score", type: "highlight"});
        if (playoffs["is_playoff"]) badges.push({label: 'Playoff Game', imageFile: "playoffs", type: "highlight"});
        if (playoffs["game_seven"]) badges.push({ label: 'Game Seven', imageFile: "game_seven", type: "highlight"});
        if (playoffs["elimination_game"] && !playoffs["game_seven"]) badges.push({label: 'Elimination Game', imageFile: "elimination_game", type: "highlight"});
        if (playoffs["cup_final"]) badges.push({label: 'Cup Final', imageFile: "cup_final", type: "highlight"});

        console.log("Game Modifiers:", modifiers);
        console.log("Derived Badges:", badges);
        badges.forEach((badge) => {
            // Create the div element
            var badgeEl = document.createElement('div');

            badgeEl.classList.add("stat-badge");
            badgeEl.classList.add(badge.type);

            var labelSpan = document.createElement('span');
            labelSpan.classList.add("badge-label");
            labelSpan.textContent = badge.label;

            var imgEl = document.createElement('img');
            imgEl.classList.add("badge-icon");
            imgEl.src = `assets/modifiers/${badge.imageFile}.svg`;

            badgeEl.appendChild(imgEl);
            badgeEl.appendChild(labelSpan);

            badgesEl.appendChild(badgeEl);
        });
    }
}


// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gameAnalyzer = new GameAnalyzer();
});
