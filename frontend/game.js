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
        this.updateGameHeader(game);
        this.displayStats(game)
    }

    createGuage(containerId, excitement_score,excitement_level) {

        var gauge = anychart.gauges.linear();
        gauge.layout('horizontal');
        gauge.background().fill(null)  // dark background = pro audio look

        var scale = anychart.scales.linear();
        scale.minimum(10);
        scale.maximum(90);
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
        document.getElementById('awayLogo').src = `../assets/${game.away_tla}_light.svg`;
        document.getElementById('awayTeamName').textContent = game.away_tla;
        document.getElementById('awayStatsHeader').textContent = game.away_tla;
        this.createGuage('awayExcitement', game.away_excitement,game.away_team_level);
        
        
        document.getElementById('homeLogo').src = `../assets/${game.home_tla}_light.svg`;
        document.getElementById('homeTeamName').textContent = game.home_tla;
        document.getElementById('homeStatsHeader').textContent = game.home_tla;
        this.createGuage('homeExcitement', game.home_excitement,game.home_team_level);

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
            this.displayGameModifiers(game.excitement_modifiers);
        }   
        
        document.getElementById('periodStatus').textContent = periodText;
        document.getElementById('timeStatus').textContent = timeRemaining;
        this.createGuage('gameExcitement', game.excitement_score,game.excitement_level);
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

    async displayStats(game) {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('error').classList.add('hidden');
        document.getElementById('results').classList.remove('hidden');
    

        console.log("Game data: ",game)

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
                statsTitleEl.textContent = 'Season Averages';
            }
        }

            var away_data = {"goals": game.away_goals, "hdc": game.away_hdc, "mdc": game.away_mdc, "hits": game.away_hits};
            var home_data = {"goals": game.home_goals, "hdc": game.home_hdc, "mdc": game.home_mdc, "hits": game.home_hits}; 

            this.updateTotals('home', home_data);
            this.updateTotals('away', away_data);
        }

    updateTotals(team, totals) {
        document.getElementById(`${team}Goals`).textContent = totals.goals;
        document.getElementById(`${team}Hdc`).textContent = totals.hdc;
        document.getElementById(`${team}Mdc`).textContent = totals.mdc;
        document.getElementById(`${team}Hits`).textContent = totals.hits;
    }



    displayGameModifiers(modifiers) {
        
        var badgesEl =  document.getElementById("excitement-summary")
        
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
        if (modifiers["next-goal-wins"])
        {
            badges.push({icon: '🏆', label: 'Next Goal Wins', type: "highlight"});
        }
        if (modifiers["frenzy"])
        {
            badges.push({icon: '🔥', label: 'Chance Frenzy', type: "highlight"});
        }




        badges.forEach((badge) => {
            // Create the div element
            const badgeDiv = document.createElement('div');

            // Add content and styles/classes
            badgeDiv.className = `game-badge ${badge.type}`;
            badgeDiv.id = `${badge.label}`; 
            
            const badgeIconSpan = document.createElement('span');
            badgeIconSpan.className = 'badge-icon';
            badgeIconSpan.textContent = `${badge.icon}`;
            badgeDiv.append(badgeIconSpan);

            const badgelabelSpan = document.createElement('span');
            badgelabelSpan.className = 'badge-label';
            badgelabelSpan.textContent = `${badge.label}`;
            badgeDiv.append(badgelabelSpan);

            // Append to the container
            badgesEl.appendChild(badgeDiv);
            });
        }
}


// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gameAnalyzer = new GameAnalyzer();
});
