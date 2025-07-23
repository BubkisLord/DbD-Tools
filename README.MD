# Dead by Daylight Build Randomizer & Tools

A full-featured Python and React application for Dead by Daylight users to generate random builds, test yourself on the game's perks and addons, and create custom match setups which you can export and share.

---

## Features

- 🎲 **Random Build Generation** for both killers and survivors
- 🧩 **Perk and Addon Quizzes** with multiple customisable settings
- 🛠️ **Manual Build Editor** for custom setups
- 😄 **Custom Match Generator** for 1 killer and 4 survivors - perfect for playing all-random custom matches with friends!
- 🔄 **Database Reinitialization** to update with the latest game content when it comes out
- 📦 **Modern UI** built with React and Tailwind CSS

---

## Requirements

- Python 3.12+ (for backend)
- Node.js (for frontend)

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/BubkisLord/DbD-Tools.git
cd "DbD-Tools"
```

### 2. Backend Setup (Python)

- Ensure Python 3.12+ is installed.
- Install required packages:

```bash
pip install -r requirements.txt
```

- Start the backend API:

```bash
python dbdmanager.py
```

The first run will scrape the DbD Wiki and build the local database, afterwards it will run the Flask API on [http://localhost:5000](http://localhost:5000).

### 3. Frontend Setup (React)

- Navigate to the frontend directory:

```bash
cd frontend
```

- Install dependencies:

```bash
npm install
```

- Start the React app:

```bash
npm run start
```

The frontend will be available at [http://localhost:3000](http://localhost:3000).

### Quick Setup (Copy & Paste)

- Clone the repository and install both backend and frontend dependencies in one go:

```bash
git clone https://github.com/BubkisLord/DbD-Tools.git
cd "DbD-Tools"
pip install -r requirements.txt
cd frontend
npm install
```

- Then in one terminal window, run the backend:

```bash
python dbdmanager.py
```

- And in another terminal window, run the frontend:

```bash
npm run start
```

---

## Usage

1. **Start both backend and frontend as described above.**
2. Open your browser to [http://localhost:3000](http://localhost:3000).
3. Choose from:
   - **Random Build**: Generate a random killer or survivor build.
   - **Addon Quiz**: Guess the correct add-on from a set of options.
   - **Perk Quiz**: Identify perks based on their description or icon.
   - **Custom Match Random Builds**: Generate builds for a full custom match.
   - **Name the Perk Quiz**: Guess the perk name from its effect.

4. You're ready to play! Use the settings panel in each tool to filter by role, select allowed characters, or customize quiz/build parameters.

---

## Project Structure

```yaml
DbD Build Rando/
├── dbdmanager.py                   # Backend Flask API and data scraper
├── dbd_data.db                     # SQLite database (auto-generated)
├── logs/                           # Log files for scraping and API - If debugging is on.
├── frontend/                       # React frontend
│   ├── src/                        # Source code folder for the React app
│   │   ├── App.js
│   │   ├── RandomBuild.js
│   │   ├── PerkMinigame.js
│   │   ├── CustomMatchBuilds.js
│   │   └── ...
│   └── package.json                # Frontend dependencies and scripts
├── requirements.txt                # Python dependencies
└── README.MD                       # Project documentation; You're reading it now!
```

---

## Updating Game Data

If new killers, survivors, perks, or add-ons are released, click **"Reinitialise Database"** in the app or run:

```bash
rm dbd_data.db
python dbdmanager.py
```

This will re-scrape the DbD Wiki and update your local database.

---

## Contributing

- Add new features, quizzes, or improvements via pull requests.
- Update the data scraping logic if the DbD Wiki changes its structure.
- Report bugs or suggest enhancements via issues.

---

## Web Scraping Details

The backend uses a custom Python scraper to gather the latest Dead by Daylight data directly from the official DbD Wiki. On the first run, the scraper fetches information about killers, survivors, perks, and add-ons, then stores it in a local SQLite database. This ensures the app always has up-to-date content without manual data entry.

- **Automatic Updates:** When new content is released, simply reinitialize the database to fetch the latest data.
- **Reliability:** The scraper is designed to handle changes in the Wiki's structure, but if issues arise, updating the scraping logic may be necessary.
- **Transparency:** All scraping code is open-source and can be reviewed or modified as needed.

No copyrighted images or assets are stored—only publicly available text data is used. As the wiki is under the Creative Commons Attribution-Share Alike 4.0 International license, this project complies with its terms by providing attribution and sharing modifications under the same license. See [Fandom.com's Licensing](https://www.fandom.com/licensing) for more details.

---

## Disclaimer

This project is not affiliated with or endorsed by Behaviour Interactive or Dead by Daylight. It is a fan-made tool for educational and entertainment purposes only. All data is sourced from the official DbD Wiki, and no copyrighted assets are stored in this repository.

---

*Enjoy your time in the fog!*
