
class ExcitementAnalyzer {
    constructor() {
        this.apiBase = CONFIG.API_BASE;
        this.gameCardRefs = new Map();
        this.activeLoadToken = null;

        this.initializeEventListeners();
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
        else {
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

        const valuePct = (value / 100) * 100;

       
        const endColor = '#2c2c2cfb';
        const bar = document.getElementById(containerId);

        if (isPreview && containerId.includes("-pulse-"))
        {
            const parentNode = bar.parentNode;
            parentNode.classList.add('hidden')
            return
        }

        bar.innerHTML = '';
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

   displayGamesList(games) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');

    const gamesList = document.getElementById('gamesList');
    gamesList.classList.remove('hidden');
    gamesList.innerHTML = '';
    

    console.log("Displaying Games:", games);

    const sortedGames = Object.entries(games).sort((a, b) => new Date(a[1].start_time) - new Date(b[1].start_time));

    for (const [id, game] of sortedGames) 
    {
        let game_data = game["game"]
        let home_data = game["home"]
        let away_data = game["away"]
        let game_excitement_data = game["excitement"]
        let playoffs = game["playoffs"]
        const gameCard = document.createElement('div');
        gameCard.className = 'game-card';

        gameCard.onclick = () => {
            window.location.href = `game.html?id=${id}&gameDate=${game_data.game_date}`;
        };

        // ---- STATUS / TIME ----
        const isFinal = game_data.is_game_over;
        const isPreview = (game_data.period === "Preview");
        const isIntermission = game_data.period_time_remaining.includes('Intermission');
        const periodText = this.formatPeriod(game_data.period, isFinal);

       

        const statusLabel = periodText; 
        const timeLabel = isPreview ? this.formatLocalStartTime(game_data.start_time) : game_data.period_time_remaining;

        // ---- SCORE ----
        const goalsText = `${Number(away_data.goals)} - ${Number(home_data.goals)}`;

        const scoreText = isPreview ? '' : goalsText

        // ---- BROADCAST ----
  


        const nationalBroadcasts = [...new Set(
        game_data.tv_broadcast
            .filter(b => b.market === "National" )
            .map(b => b.network)
        )];

        const homeBroadcasts = [...new Set(
        game_data.tv_broadcast
            .filter(b => b.market === "Home")
            .map(b => b.network)
        )];

        const awayBroadcasts = [...new Set(
        game_data.tv_broadcast
            .filter(b => b.market === "Away")
            .map(b => b.network)
        )];

        const nationBroadcastHTML = nationalBroadcasts.length > 0 ? `<div><strong>National:</strong> ${nationalBroadcasts.join(', ')}</div>` : '';
        const homeBroadcastHTML = homeBroadcasts.length > 0 ? `<div><strong>Home (${home_data.tla}):</strong> ${homeBroadcasts.join(', ')}</div>` : '';
        const awayBroadcastHTML = awayBroadcasts.length > 0 ? `<div><strong>Away (${away_data.tla}):</strong> ${awayBroadcasts.join(', ')}</div>` : '';

        const broadcastHTML = `${nationBroadcastHTML}${homeBroadcastHTML}${awayBroadcastHTML}`;
    
    


        // ---- BADGES ----
        const modifiers = game_excitement_data.modifiers || {};
        const badges = [];


        if (modifiers["close-game"]) badges.push({icon: '<img src="assets/modifiers/close_game.svg"/>', label: 'Close Game', type: "highlight"});
        if (modifiers["high-scoring"]) badges.push({icon: '<img src="assets/modifiers/high_score.svg"/>', label: 'High-scoring Game', type: "highlight"});
        if (modifiers["ice_tilt"]) badges.push({icon: '<img src="assets/modifiers/ice_tilt.svg" alt="Ice Tilt" />', label: 'Ice Tilt', type: "detractor"});
        if (modifiers["next-goal-wins"]) badges.push({icon: '<img src="assets/modifiers/next_goal_wins.svg" alt="Next Goal Wins" />', label: 'Next Goal Wins', type: "highlight"});
        if (modifiers["frenzy"]) badges.push({icon: '<img src="assets/modifiers/frenzy.svg" alt="Chance Frenzy" />', label: 'Chance Frenzy', type: "highlight"});
        if (modifiers["back_and_forth"]) badges.push({icon: '<img src="assets/modifiers/back_and_forth.svg" alt="Back and Forth" />', label: 'Back and Forth', imageFile: "back_and_forth", type: "highlight"});
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
                        <img src="assets/teams/${away_data.tla}_light.svg" class="team-logo">
                        <div class="team-abbrev">${away_data.name}</div>
                    </div>
                    <div class="vs-symbol">@</div>
                    <div class="team">
                        <img src="assets/teams/${home_data.tla}_light.svg" class="team-logo">
                        <div class="team-abbrev">${home_data.name}</div>
                    </div>
                </div>

                <div class="game-score">${scoreText}</div>
                <div class="game-status">${statusLabel}<br>${timeLabel}</div>
                 <div class="tug-container tug-labels" id="overallExcitement">
                            <span class="tug-title">Overall</span>
                            <div class="tug-gauge" id="gameExcitement-${id}"></div>
                        </div> 
                         <div class="tug-container tug-labels" id="overallExcitement">
                            <span class="tug-title">Pulse Check</span>
                            <div class="tug-gauge" id="gameExcitement-pulse-${id}"></div>
                        </div>
                    </div>
                ${badgesHTML}
                <br>
                <div class="broadcast-info">${broadcastHTML}</div>
                 <div class="debug-info">
                    Game ID: ${id}
                </div>
            </div>
        `;

        // create gauge AFTER DOM exists
        setTimeout(() => {
            this.createGrowingGauge(`gameExcitement-${id}`, game_data.ovr_excitment.excitement_score, game_data.ovr_excitment.excitement_level,isPreview);
            this.createGrowingGauge(`gameExcitement-pulse-${id}`, game_data.pulse_excitment.excitement_score, game_data.pulse_excitment.excitement_level,isPreview);

           
        }, 0);

        gamesList.appendChild(gameCard);
      }

    }

    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('error').classList.add('hidden');
    }

    showError(message) {
        document.getElementById('loading').classList.add('hidden');
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
