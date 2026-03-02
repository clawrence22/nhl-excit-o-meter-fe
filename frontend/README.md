# NHL Excite-o-Meter Frontend

A modern web interface for visualizing NHL game excitement data, inspired by the NHL Edge website design.

## Features

- **Real-time Analysis**: Enter any NHL game ID to analyze excitement levels
- **Visual Dashboard**: Clean, dark-themed interface with gradient accents
- **Data Visualization**: 
  - Large excitement score display with category rating
  - Game context information (period, time, score, multipliers)
  - Team-by-team event breakdowns
  - Interactive doughnut chart showing event distribution
  - Recent events timeline with contribution scores

## Usage

1. Start the backend API server:
   ```bash
   python app.py
   ```

2. Open `index.html` in a web browser

3. Enter a game ID (e.g., `2023020204`) and click "ANALYZE GAME"

## Design

The interface follows NHL Edge aesthetics:
- Dark gradient background (#0a0a0a to #1a1a1a)
- Orange/red accent colors (#ff6b35, #f7931e)
- Clean typography with uppercase labels
- Card-based layout with subtle borders
- Responsive design for mobile devices

## API Integration

Connects to the local Flask API at `http://localhost:5001/excitement/{gameId}` and displays:
- Raw excitement score and category
- Game context (period, time remaining, score, context multiplier)
- Home/away team event totals
- Recent contributing events with tags and scores