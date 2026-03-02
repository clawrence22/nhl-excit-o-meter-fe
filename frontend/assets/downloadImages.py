
import requests

# List of strings to use in URL
team_tlas = [ "ANA", "BOS", "BUF", "CAR", "CBJ",
                  "CGY", "CHI", "COL", "DAL", "DET", 
                  "EDM", "FLA", "LAK", "MIN", "MTL", 
                  "NJD", "NSH", "NYI", "NYR", "OTT", 
                  "PHI", "PIT", "SEA", "SJS", "STL", 
                  "TBL", "TOR", "UTA", "VAN", "VGK", 
                  "WPG", "WSH"]

# Base URL where images are located
base_url = 'https://example.com/images/'

for team in team_tlas:
    # Construct full URL using the string
    image_url = f"assets/{team}_light.svg"
    
    try:
        # Send GET request to download image
        response = requests.get(image_url)
        response.raise_for_status()
        
        # Save image to file using string as filename
        with open(f'{team}_light.svg', 'wb') as f:
            f.write(response.content)
            
        print(f'Successfully downloaded {team}_light.svg')
            
    except requests.exceptions.RequestException as e:
        print(f'Error downloading {team}_light.svg: {e}')