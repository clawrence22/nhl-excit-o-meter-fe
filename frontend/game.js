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
        const response = await fetch(`${this.apiBase}/excitement_game?id=${this.gameId}&date=${this.gameDate}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch schedule: ${response.status}`);
        }
        const game = await response.json();
        this.updateGameHeader(game);
        this.displayStats(game)
    }

    createGuage(containerId, excitement_score,excitement_level) {

        var gauge = anychart.gauges.linear();
        gauge.layout('horizontal');
        gauge.background().fill(null)  // dark background = pro audio look

        var scale = anychart.scales.linear();
        scale.minimum(10);
        scale.maximum(100);
        gauge.scale(scale);

        gauge.data([excitement_score]);

        var led = gauge.led(0);

        led.size('2%');      // thin bar
        led.gap(1);          // spacing between LEDs

        // ✅ Threshold-based coloring (NOT smooth gradient)
        var colorScale = anychart.scales.ordinalColor();

        colorScale.ranges([
            { less: 24.99, color: '#e3e3e3' },     //meh
            { from: 25.00, to: 49.99, color: '#fff708' }, //mid
            { from: 50.00, to: 74.99, color: '#ff9603' }, // buzzin
            { greater: 75.00, color: '#ff6200' } // burner
        ]);

        led.colorScale(colorScale);
        var title = gauge.title();
        title.orientation('top');
        title.align('center');
        title.text(excitement_level);
        title.margin(0, 0, -80, 0);
        title.fontColor("#dad7d7");

        title.enabled(true);

        gauge.container(containerId);
        gauge.draw();
    }


    updateGameHeader(game) {
        console.log("SingleGameObj:",game)
        // Update team matchup header
        document.getElementById('awayLogo').src = `../assets/teams/${game.away_tla}_light.svg`;
        document.getElementById('awayTeamName').textContent = game.away_tla;
        document.getElementById('awayStatsHeader').textContent = game.away_tla;
        this.createGuage('awayExcitement', game.away_excitement,game.away_excitement_level);
        
        
        document.getElementById('homeLogo').src = `../assets/teams/${game.home_tla}_light.svg`;
        document.getElementById('homeTeamName').textContent = game.home_tla;
        document.getElementById('homeStatsHeader').textContent = game.home_tla;
        this.createGuage('homeExcitement', game.home_excitement,game.home_excitement_level);

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
        this.displayGameModifiers(game.excitement_modifiers,game.playoffs);
        
        document.getElementById('periodStatus').textContent = periodText;
        document.getElementById('timeStatus').textContent = timeRemaining;
        this.createGuage('gameExcitement', game.excitement_score,game.excitement_level);
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

        const isPreview = (game.period === "Preview")
        
        this.homeTeamAbbrev = game.home_tla
        this.awayTeamAbbrev = game.away_tla
        
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
                statsTitleEl.textContent = 'Average Over Last 10 Games';
            }
        }

            var away_data = {"goals": game.away_goals, "hdc": game.away_hdc, "mdc": game.away_mdc, "hits": game.away_hits};
            var home_data = {"goals": game.home_goals, "hdc": game.home_hdc, "mdc": game.home_mdc, "hits": game.home_hits}; 

            this.updateTotals('home', home_data);
            this.updateTotals('away', away_data);
            this.displayStatsModifiers(game.excitement_modifiers);
        }

    updateTotals(team, totals) {
        document.getElementById(`${team}Goals`).textContent = totals.goals;
        document.getElementById(`${team}Hdc`).textContent = totals.hdc;
        document.getElementById(`${team}Mdc`).textContent = totals.mdc;
        document.getElementById(`${team}Hits`).textContent = totals.hits;
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
        
    displayStatsModifiers(modifiers) 
    {

        if (modifiers["close-game"])
        {
            this.updateStateRowModifier("stat-goal", "highlight");
            this.addBadge("badges-goal", "Close Game","close_game","highlight");
           
        }
        
        if (modifiers["high-scoring"])
        {
            this.updateStateRowModifier("stat-goal", "highlight");
            this.addBadge("badges-goal", "High Scoring Game","high_score","highlight");
        }

         if (modifiers["goals_ice_tilt"])
        {
            this.updateStateRowModifier("stat-goal", "detractor");
            this.addBadge("badges-goal", "Goals Ice Tilt","ice_tilt","detractor");
        }
        
        if (modifiers["frenzy"])
        {
            this.updateStateRowModifier("stat-hdc", "highlight");
            this.addBadge("badges-hdc", "Chances Frenzy","frenzy","highlight");

            this.updateStateRowModifier("stat-mdc", "highlight");
            this.addBadge("badges-mdc", "Chances Frenzy","frenzy","highlight");
        }
       
        if (modifiers["chances_ice_tilt"])
        {
            this.updateStateRowModifier("stat-hdc", "detractor");
            this.addBadge("badges-hdc", "Chances Ice Tilt","ice_tilt","detractor");
            this.updateStateRowModifier("stat-mdc", "detractor");
            this.addBadge("badges-mdc", "Chances Ice Tilt","ice_tilt","detractor");
        }
       
    
    }

    displayGameModifiers(modifiers,playoffs) {
        
        var badgesEl =  document.getElementById("game-excitement-summary");
        const badges = [];
        if (modifiers["next-goal-wins"]) badges.push({icon: '<img src="assets/modifiers/next_goal_wins.svg" alt="Next Goal Wins" />', label: 'Next Goal Wins', imageFile: "next_goal_wins", type: "highlight"});
        if (playoffs["is_playoff"]) badges.push({icon: '<img src="assets/modifiers/playoffs.svg" alt="Playoff Game" />', label: 'Playoff Game', imageFile: "playoffs", type: "highlight"});
        if (playoffs["game_seven"]) badges.push({icon: '<img src="assets/modifiers/game_seven.svg" alt="Game Seven" />', label: 'Game Seven', imageFile: "game_seven", type: "highlight"});
        if (playoffs["elimination_game"] && !playoffs["game_seven"]) badges.push({icon: '<img src="assets/modifiers/elimination_game.svg" alt="Elimination Game" />', label: 'Elimination Game', imageFile: "elimination_game", type: "highlight"});
        if (playoffs["cup_final"]) badges.push({icon: '<img src="assets/modifiers/cup_final.svg" alt="Cup Final" />', label: 'Cup Final', imageFile: "cup_final", type: "highlight"});

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
