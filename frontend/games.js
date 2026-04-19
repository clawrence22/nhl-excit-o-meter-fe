
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
        } catch (error) {
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

   displayGamesList(games) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');

    const gamesList = document.getElementById('gamesList');
    gamesList.classList.remove('hidden');
    gamesList.innerHTML = '';
    
    games = new Map([...games.entries()].sort());

    console.log("Displaying Games:", games);

    for (const [id, game] of Object.entries(games)) 
    {
        this.gamesById.set(id, game);

        const gameCard = document.createElement('div');
        gameCard.className = 'game-card';

        gameCard.onclick = () => {
            window.location.href = `game.html?id=${id}&gameDate=${game.game_date}`;
        };

        // ---- STATUS / TIME ----
        const isFinal = game.is_game_over;
        const isPreview = (game.period === "Preview");

        const statusLabel = isFinal ? 'FINAL' : this.formatPeriod(game.period);
        const timeLabel = isPreview ? game.start_time : game.period_time_remaining;

        // ---- SCORE ----
        const goalsText = `${Number(game.away_goals)} - ${Number(game.home_goals)}`;

        const scoreText = isPreview ? '' : goalsText

        // ---- BROADCAST ----
        const broadcastLines = [];
        game.tv_broadcast.forEach((b) => {
            if (b.market === "Home") broadcastLines.push(`🏠 Home: ${b.network}`);
            else if (b.market === "Away") broadcastLines.push(`✈️ Away: ${b.network}`);
            else if (b.market === "National") broadcastLines.push(`📡 National: ${b.network}`);
        });

        const broadcastHTML = broadcastLines.length
            ? `<div class="broadcast-info">${broadcastLines.join('<br>')}</div>`
            : '';

        // ---- BADGES ----
        const modifiers = game.excitement_modifiers || {};
        const playoffs = game.playoffs || {};
        const badges = [];


        if (modifiers["close-game"]) badges.push({icon: '<img src="assets/modifiers/close_game.svg"/>', label: 'Close Game', type: "highlight"});
        if (modifiers["high-scoring"]) badges.push({icon: '<img src="assets/modifiers/high_score.svg"/>', label: 'High-scoring Game', type: "highlight"});
        if (modifiers["chances_ice_tilt"]) badges.push({icon: '<img src="assets/modifiers/ice_tilt.svg" alt="Ice Tilt (Chances)" />', label: 'Ice Tilt (Chances)', type: "detractor"});
        if (modifiers["goals_ice_tilt"]) badges.push({icon: '<img src="assets/modifiers/ice_tilt.svg" alt="Ice Tilt (Goals)" />', label: 'Ice Tilt (Goals)', type: "detractor"});
        if (modifiers["next-goal-wins"]) badges.push({icon: '<img src="assets/modifiers/next_goal_wins.svg" alt="Next Goal Wins" />', label: 'Next Goal Wins', type: "highlight"});
        if (modifiers["frenzy"]) badges.push({icon: '<img src="assets/modifiers/frenzy.svg" alt="Chance Frenzy" />', label: 'Chance Frenzy', type: "highlight"});
        if (playoffs["is_playoff"]) badges.push({icon: '<img src="assets/modifiers/playoffs.svg" alt="Playoff Game" />', label: 'Playoff Game', type: "highlight"});
        if (playoffs["game_seven"]) badges.push({icon: '<img src="assets/modifiers/game_seven.svg" alt="Game Seven" />', label: 'Game Seven', type: "highlight"});
        if (playoffs["elimination_game"] && !playoffs["game_seven"]) badges.push({icon: '<img src="assets/modifiers/elimination_game.svg" alt="Elimination Game" />', label: 'Elimination Game', type: "highlight"});
        if (playoffs["cup_final"]) badges.push({icon: '<img src="assets/modifiers/cup_final.svg" alt="Cup Final" />', label: 'Cup Final', type: "highlight"});


        let badgesHTML = '';
        if (badges.length > 0) {
            const highlights = [];
            const detractors = [];

            const badgeIcons = badges.map((b) => {
                if (b.type === "highlight") highlights.push(b.label);
                else detractors.push(b.label);

                return `<div class="game-badge ${b.type}">
                            <span class="badge-icon">${b.icon}</span>
                        </div>`;
            }).join('');


            badgesHTML = `
                <div class="badges">
                    ${badgeIcons}
                </div>`;
        }

        // ---- FINAL HTML ----
        gameCard.innerHTML = `
            <div class="game-card-body">
                <div class="game-teams">
                    <div class="team">
                        <img src="assets/teams/${game.away_tla}_light.svg" class="team-logo">
                        <div class="team-abbrev">${game.away_tla}</div>
                    </div>
                    <div class="vs-symbol">@</div>
                    <div class="team">
                        <img src="assets/teams/${game.home_tla}_light.svg" class="team-logo">
                        <div class="team-abbrev">${game.home_tla}</div>
                    </div>
                </div>

                <div class="game-score">${scoreText}</div>
                <div class="game-status">${statusLabel}<br>${timeLabel}</div>
                <br>
                <div class="game-excitement" id="gameExcitement-${id}"></div>
                <br>
                ${badgesHTML}
                <br>
                ${broadcastHTML}
            </div>
        `;

        // create gauge AFTER DOM exists
        setTimeout(() => {
            this.createGuage(`gameExcitement-${id}`, game.excitement_score, game.excitement_level);
        }, 0);

        gamesList.appendChild(gameCard);
      }

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
