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
            // Initial load
            this.loadGameInfo();
        } else {
            this.showError('No game ID provided');
        }
    }

    async loadGameInfo() {
        const [response, teamColors] = await Promise.all([
            fetch(`${this.apiBase}/excitement_game?id=${this.gameId}&date=${this.gameDate}`),
            fetch('../assets/teams/team-colors.json').then(r => r.json())
        ]);
        if (!response.ok) throw new Error(`Failed to fetch schedule: ${response.status}`);
        const game = await response.json();
        this.teamColors = teamColors;
        this.updateGameHeader(game);
        this.displayStats(game);
    }

    formatPeriod(period, isFinal,isIntermission) 
    {
        let suffix = ''
        if (isFinal) {
            return (period > 3) ? 'FINAL/OT' : "FINAL";
        }
        else if (isIntermission) {
            suffix = ' Intermission';
        }
        switch (period) {
            case 'Preview':
                return 'Preview';
            case 1:
                return '1st'+suffix;
            case 2:
                return '2nd'+suffix;
            case 3:
                return '3rd'+suffix;
            default:
                return 'OT'+suffix
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

    updateGameHeader(game) {
        console.log("SingleGameObj:",game)
        let away_data = game["away"]
        let home_data = game["home"]
        let game_data = game["game"]
        const isPreview = game_data.period === "Preview"

        // Update team matchup header
        document.getElementById('awayLogo').src = `../assets/teams/${game.away.tla}_light.svg`;
        document.getElementById('awayTeamName').textContent = away_data.name;
        document.getElementById('awayStatsHeader').textContent = away_data.tla;
        this.createGrowingGauge('awayExcitement',away_data.ovr_excitment.excitement_score,away_data.ovr_excitment.excitement_level,isPreview);
        this.createGrowingGauge('awayExcitementPulse',away_data.pulse_excitment.excitement_score,away_data.pulse_excitment.excitement_level,isPreview);
        
        
        document.getElementById('homeLogo').src = `../assets/teams/${home_data.tla}_light.svg`;
        document.getElementById('homeTeamName').textContent = home_data.name;
        document.getElementById('homeStatsHeader').textContent = home_data.tla;
        this.createGrowingGauge('homeExcitement',home_data.ovr_excitment.excitement_score,home_data.ovr_excitment.excitement_level,isPreview);
        this.createGrowingGauge('homeExcitementPulse',home_data.pulse_excitment.excitement_score,home_data.pulse_excitment.excitement_level,isPreview);

        
        // ---- STATUS / TIME ----
        const isFinal = game_data.is_game_over;
        const isIntermission = game_data.intermission;
        const periodText = this.formatPeriod(game_data.period, isFinal,isIntermission);
        const timeLabel = isPreview ? this.formatLocalStartTime(game_data.start_time) : game_data.period_time_remaining;

        this.displayGameModifiers(game_data.modifiers,game_data.momentum.overall,game_data.playoffs);
        
        document.getElementById('periodStatus').textContent = periodText;
        document.getElementById('timeStatus').textContent = timeLabel;
        this.createGrowingGauge('gameExcitement',game_data.ovr_excitment.excitement_score,game_data.ovr_excitment.excitement_level,isPreview);
        this.createGrowingGauge('gameExcitementPulse',game_data.pulse_excitment.excitement_score,game_data.pulse_excitment.excitement_level,isPreview);
       
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

        const isPreview = (game_data.period === "Preview")
        
        this.homeTeamAbbrev = home_data.tla
        this.awayTeamAbbrev = game.away.tla
        
        const statsSection = document.querySelector('.stats-section');
        if (statsSection) {
            statsSection.classList.remove('hidden');
        }

        // Live/finished game - show game info and totals
        const statsTitleEl = document.getElementById('mainStatsHeader');
        if (isPreview)
        {
            const bar = document.getElementById('iceTilt');
            const parentNode = bar.parentNode;
            parentNode.classList.add('hidden')
            
            const barPulse = document.getElementById('iceTiltPulse');
            const parentNodePulse = barPulse.parentNode;
            parentNodePulse.classList.add('hidden')
            statsTitleEl.textContent = 'Series Averages Between These Teams';
        }
        else
        {
            this.createIceTiltGauge('iceTilt',away_data.momentum.overall.momentum, home_data.momentum.overall.momentum,game_data.momentum.overall.owner);
            this.createIceTiltGauge('iceTiltPulse',away_data.momentum.pulse.momentum, home_data.momentum.pulse.momentum,game_data.momentum.pulse.owner);
            
        }
            

            var away_stats = {"goals":away_data.goals, "hdc":away_data.hdc, "mdc":away_data.mdc, "hits":away_data.hits};
            var home_stats = {"goals": home_data.goals, "hdc": home_data.hdc, "mdc": home_data.mdc, "hits": home_data.hits}; 

            this.updateTotals('home', home_stats);
            this.updateTotals('away', away_stats);
       
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
        
        if (value < 33) return mehColor;   
        if (value < 66) return midColor;  
        if (value < 80) return buzzColor;  
        return burnColor;                  
    }

    createGrowingGauge(containerId,value,label,isPreview) {

        const bar = document.getElementById(containerId);

        if (isPreview && containerId.includes("Pulse"))
        {
            console.log("Preview - hiding pulse gauge")
            const parentNode = bar.parentNode;
            parentNode.classList.add('hidden')
            return
        }

        const valuePct = (value / 100) * 100;

       
        const endColor = '#767676';
        
        const blendWidth = 8;
        const cutStart = Math.max(0, valuePct - blendWidth / 2);
        const cutEnd = Math.min(100, valuePct + blendWidth / 2);
        const color = this.getGuageColor(value)
        let label_class = 'tug-label'
        if (color == "#ff3c00")
        {
            bar.classList.add('back-and-forth')
            label_class = 'back-and-forth-label'
        }
        else
        {
            bar.classList.remove('back-and-forth')
            bar.style.background = `linear-gradient(to right, ${color} ${cutStart}%, #888 ${valuePct}%,  ${endColor} ${cutEnd}%)`;
        }
        // 2. Create the span element
        const labelSpan = document.createElement('span');

        // 3. Configure the span (text, class, style)
        labelSpan.textContent = label;
        labelSpan.className = label_class;
        bar.appendChild(labelSpan);
    }

    hexToRgb(hex) {
        const bigint = parseInt(hex.replace('#', ''), 16);
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255
        };
    }
    

    similarColors(team1Hex,team2Hex, threshold = 50) {
        const rgb1 = this.hexToRgb(team1Hex)
        const rgb2 = this.hexToRgb(team2Hex);

        const distance = Math.sqrt(
            Math.pow(rgb1.r - rgb2.r, 2) +
            Math.pow(rgb1.g - rgb2.g, 2) +
            Math.pow(rgb1.b - rgb2.b, 2)
        );

        return distance < threshold;
    }


    createIceTiltGauge(guageId,awayMomentum, homeMomentum,momentumOwner,isPreview) {

        const bar = document.getElementById(guageId);

        let away = awayMomentum;
        let home = homeMomentum;

        const total = away + home;
        const awayPct = (away / total) * 100;

        let awayColor = this.teamColors[this.awayTeamAbbrev].primary;
        const homeColor = this.teamColors[this.homeTeamAbbrev].primary;

        if (this.similarColors(awayColor,homeColor))
        {
            awayColor = this.teamColors[this.awayTeamAbbrev].secondary
        }

        if (momentumOwner == "Back & Forth") {
            bar.classList.add('back-and-forth');
            bar.classList.remove('tug-o-war')

        } else {
            bar.classList.remove('back-and-forth');
            bar.classList.add('tug-o-war');
            bar.innerHTML = '';
            const blendWidth = 8;
            const cutStart = Math.max(0, awayPct - blendWidth / 2);
            const cutEnd = Math.min(100, awayPct + blendWidth / 2);
            bar.style.background = '';
            bar.style.setProperty('--tug-away', awayColor);
            bar.style.setProperty('--tug-home', homeColor);
            bar.style.setProperty('--cut-start',cutStart +'%');
            bar.style.setProperty('--away-pct',awayPct + '%');
            bar.style.setProperty('--cut-end', cutEnd + '%');
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

    displayGameModifiers(modifiers,momentum,playoffs) {
        
        var badgesEl =  document.getElementById("game-excitement-summary");
        const badges = [];
        if (modifiers["next-goal-wins"]) badges.push({label: 'Next Goal Wins', imageFile: "next_goal_wins", type: "highlight"});
        if (momentum["back_and_forth"]) badges.push({label: 'Back and Forth', imageFile: "back_and_forth", type: "highlight"});
        if (momentum["ice_tilt"]) badges.push({label: 'Ice Tilt', imageFile: "ice_tilt", type: "detractor"});
        if (modifiers["close-game"]) badges.push({label: 'Close Game', imageFile: "close_game", type: "highlight"});
        if (modifiers["high-scoring"]) badges.push({label: 'High Scoring', imageFile: "high_score", type: "highlight"});
        if (playoffs["is_playoff"]) badges.push({label: 'Playoff Game', imageFile: "playoffs", type: "highlight"});
        if (playoffs["game_seven"]) badges.push({ label: 'Game Seven', imageFile: "game_seven", type: "highlight"});
        if (playoffs["elimination_game"] && !playoffs["game_seven"]) badges.push({label: 'Elimination Game', imageFile: "elimination_game", type: "highlight"});
        if (playoffs["cup_final"]) badges.push({label: 'Cup Final', imageFile: "cup_final", type: "highlight"});

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
