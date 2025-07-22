import requests
from bs4 import BeautifulSoup
import sqlite3
import logging
import os
import shutil
from flask import Flask, jsonify, request
from flask_cors import CORS
from random import *
import unicodedata

DB_PATH = "dbd_data.db"

# Setup logging to file and move old logs to logs/ folder
def setup_logging():
    log_dir = "logs"
    log_file = "latest.log"
    # Move old log file if exists
    if os.path.exists(log_file):
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
        # Find a unique name for the old log
        idx = 1
        while True:
            archive_name = os.path.join(log_dir, f"log_{idx}.log")
            if not os.path.exists(archive_name):
                break
            idx += 1
        try:
            # Open and close the file before moving to ensure it's not locked
            with open(log_file, "a", encoding="utf-8"):
                pass
            shutil.move(log_file, archive_name)
        except PermissionError:
            # If file is locked, skip moving
            pass
    # Setup logging to latest.log
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler(log_file, encoding="utf-8"),
            logging.StreamHandler()
        ]
    )

setup_logging()

def create_tables(conn):
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS killers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            power TEXT,
            icon TEXT
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS survivors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS killer_perks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            icon TEXT,
            name TEXT UNIQUE,
            description TEXT UNIQUE,
            killer_id INTEGER,
            FOREIGN KEY (killer_id) REFERENCES killers(id)
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS survivor_perks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            icon TEXT,
            name TEXT UNIQUE,
            description TEXT UNIQUE,
            survivor_id INTEGER,
            FOREIGN KEY (survivor_id) REFERENCES survivors(id)
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS killer_addons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            icon TEXT,
            name TEXT UNIQUE,
            killer_id INTEGER,
            description TEXT,
            rarity TEXT CHECK(rarity IN ('common', 'uncommon', 'rare', 'very rare', 'ultra rare')),
            FOREIGN KEY (killer_id) REFERENCES killers(id)
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS survivor_addons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            icon TEXT,
            name TEXT UNIQUE,
            item INTEGER,
            description TEXT,
            rarity TEXT CHECK(rarity IN ('common', 'uncommon', 'rare', 'very rare', 'ultra rare')),
            FOREIGN KEY (item) REFERENCES survivor_items(id)
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS survivor_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            icon TEXT,
            name TEXT UNIQUE,
            description TEXT
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS offerings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            icon TEXT,
            name TEXT UNIQUE,
            description TEXT,
            role TEXT CHECK(role IN ('killer', 'survivor', 'all', 'unknown')),
            rarity TEXT CHECK(rarity IN ('common', 'uncommon', 'rare', 'very rare', 'ultra rare'))
        )
    ''')
    conn.commit()

def scrape_killers():
    url = "https://deadbydaylight.fandom.com/wiki/Killers"
    r = requests.get(url)
    soup = BeautifulSoup(r.text, "html.parser")
    tables = soup.find_all("table", {"class": lambda x: x and "wikitable" in x})
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s"
    )
    killers = []
    if len(tables) > 1:
        powers_table = tables[0]
        for row in powers_table.find_all("tr"):
            for th in row.find_all("th"):
                a_tags = th.find_all("a", title=True)
                if len(a_tags) >= 2:
                    power = a_tags[0].get("title")
                    name = a_tags[-1].get("title")
                    if name and name.startswith("The "):
                        killers.append((name, power, None))

        perks_table = tables[1] if len(tables) > 1 else None
        if perks_table:
            rows = perks_table.find_all("tr")[1:]
            for row in rows:
                ths = row.find_all("th")
                tds = row.find_all("td")
                if len(ths) >= 3 and len(tds) >= 1:
                    icon_img = ths[0].find("img")
                    icon = get_icon_url(icon_img)
                    name_a = ths[1].find("a", title=True)
                    name = name_a.get_text(strip=True) if name_a else ""
                    desc_html = clean_description_html(tds[0])
                    char_a = ths[2].find("a", title=True)
                    character = ("The " + char_a.get_text(strip=True) if char_a else "").strip()
                    character_icon = ths[2].find("img")
                    if character_icon:
                        character_icon_url = get_icon_url(character_icon)
                    else:
                        character_icon_url = None
                    # Update the killer's icon if not already set
                    for idx, (k_name, k_power, k_icon) in enumerate(killers):
                        if k_name == character and not k_icon and character_icon_url:
                            killers[idx] = (k_name, k_power, character_icon_url)
                            break
 
                    
    return killers

def normalize_survivor_name(name):
    if name == "Troupe":
        # Special case for "Troupe" which is the 2 characters Aestri Yazar & Baermar Uraz
        # This is a workaround for the wiki's inconsistent naming.
        name = "Aestri Yazar & Baermar Uraz"

    # Normalize unicode, remove apostrophes, replace underscores with spaces, strip whitespace
    name = unicodedata.normalize("NFC", name)
    name = name.replace("_", " ")
    name = name.replace("’", "'")  # Replace curly apostrophe with straight
    name = name.replace("'", "")   # Remove apostrophes
    name = name.strip()
    return name

def scrape_survivors():
    url = "https://deadbydaylight.fandom.com/wiki/Survivors"
    logging.info(f"Requesting survivors page: {url}")
    r = requests.get(url)
    soup = BeautifulSoup(r.text, "html.parser")
    tables = soup.find_all("table", {"class": "wikitable"})
    survivor_table = tables[3] if len(tables) > 3 else None
    survivors = []
    if survivor_table:
        rows = survivor_table.find_all("tr")
        # Find the index of the row with a <th> that contains "SURVIVORS" (case-insensitive, partial match)
        start_idx = None
        for idx, row in enumerate(rows):
            th = row.find("th")
            if th and "SURVIVOR" in th.get_text(strip=True).upper():
                start_idx = idx
                break
        if start_idx is not None:
            for row_idx, row in enumerate(rows[start_idx+1:], start=start_idx+1):
                tds = row.find_all("td")
                for td_idx, td in enumerate(tds):
                    for a in td.find_all("a", title=True, recursive=False):
                        name = a.get("title").strip()
                        if name and not name.startswith("File:") and not name.lower().startswith("chapter "):
                            normalized_name = normalize_survivor_name(name)
                            if normalized_name not in survivors:
                                survivors.append(normalized_name)
                                logging.info(f"Found survivor: {normalized_name} (row {row_idx}, td {td_idx})")
        else:
            logging.warning("Could not find a header row containing 'SURVIVOR' in survivors table.")
    else:
        logging.warning("Survivors table not found on the page. There must be less than 4 tables.")
    logging.info(f"Total survivors found: {len(survivors)}")
    return survivors

def clean_description_html(desc_cell):
    # Parse the cell as HTML
    soup = BeautifulSoup(str(desc_cell), "html.parser")
    # Remove all <a> tags but keep their children
    for a in soup.find_all('a'):
        a.unwrap()
    # Remove all href attributes from any remaining tags (just in case)
    for tag in soup.find_all(True):
        if 'href' in tag.attrs:
            del tag.attrs['href']
    # Return the inner HTML (not the outer <td> tag)
    return ''.join(str(child) for child in soup.td.contents) if soup.td else str(soup)

def get_icon_url(img_tag):
    # Prefer data-src, then src, and ensure it's not a data URI
    if img_tag:
        url = img_tag.get("data-src") or img_tag.get("src") or ""
        if url.startswith("data:image"):
            return ""  # Ignore data URIs
        # If the URL is relative, prepend the wiki base
        if url and url.startswith("//"):
            url = "https:" + url
        elif url and url.startswith("/"):
            url = "https://deadbydaylight.fandom.com" + url
        
        if "/revision" in url:
            url = url.split("/revision")[0]  # Remove revision part if present
        return url
    return ""

def scrape_killer_perks():
    url = "https://deadbydaylight.fandom.com/wiki/Killers"
    r = requests.get(url)
    soup = BeautifulSoup(r.text, "html.parser")
    tables = soup.find_all("table", {"class": lambda x: x and "wikitable" in x})
    logging.info(f"Found {len(tables)} tables with 'wikitable' in class")
    perks = []
    if len(tables) > 1:
        table = tables[1]
        rows = table.find_all("tr")[1:]
        for row_idx, row in enumerate(rows):
            ths = row.find_all("th")
            tds = row.find_all("td")
            if len(ths) >= 3 and len(tds) >= 1:
                icon_img = ths[0].find("img")
                icon = get_icon_url(icon_img)
                name_a = ths[1].find("a", title=True)
                name = name_a.get_text(strip=True) if name_a else ""
                desc_html = clean_description_html(tds[0])
                char_a = ths[2].find("a", title=True)
                character = ("The " + char_a.get_text(strip=True) if char_a else "").strip()
                if "Unable to retrieve the Perk description or unable to display it." in desc_html:
                    desc_html = "Unable to retrieve the Perk description or unable to display it. This is almost certainly due to the wiki being incomplete. Unfortunately, there is nothing that can be done about this when scraping data."
                logging.info(f"Row #{row_idx}: name={name}, character={character}")
                perks.append((icon, name, desc_html, character))
            else:
                logging.warning(f"Row #{row_idx} in table #1 does not have expected structure (ths: {len(ths)}, tds: {len(tds)})")
    else:
        logging.warning("Less than 2 tables found, cannot process killer perks.")
    return perks
    
def scrape_survivor_perks():
    url = "https://deadbydaylight.fandom.com/wiki/Survivors"
    r = requests.get(url)
    soup = BeautifulSoup(r.text, "html.parser")
    tables = soup.find_all("table", {"class": lambda x: x and "wikitable" in x})
    logging.info(f"Found {len(tables)} tables with 'wikitable' in class")
    perks = []
    if len(tables) > 1:
        table = tables[1]
        rows = table.find_all("tr")[1:]
        for row_idx, row in enumerate(rows):
            ths = row.find_all("th")
            tds = row.find_all("td")
            if len(ths) >= 3 and len(tds) >= 1:
                icon_img = ths[0].find("img")
                icon = get_icon_url(icon_img)
                name_a = ths[1].find("a", title=True)
                name = name_a.get_text(strip=True) if name_a else ""
                desc_html = clean_description_html(tds[0])
                char_a = ths[2].find("a", href=True)
                if char_a and char_a.has_attr("href"):
                    href = char_a["href"]
                    if href.startswith("/wiki/"):
                        character = href[len("/wiki/"):].replace("_", " ")
                    else:
                        character = href.replace("_", " ")
                else:
                    character = ""
                character = normalize_survivor_name(character)
                logging.info(f"Row #{row_idx}: name={name}, character={character}")
                perks.append((icon, name, desc_html, character))
            else:
                logging.warning(f"Row #{row_idx} in table #1 does not have expected structure (ths: {len(ths)}, tds: {len(tds)})")
    else:
        logging.warning("Less than 2 tables found, cannot process survivor perks.")
    return perks

def scrape_survivor_items():
    url = "https://deadbydaylight.fandom.com/wiki/Add-ons"
    r = requests.get(url)
    soup = BeautifulSoup(r.text, "html.parser")
    items = []
    tabber = soup.find_all("div", {"class": "tabber wds-tabber"})[1]
    divs = tabber.find_all("div", {"class": "wds-tab__content"})
    logging.info(f"Found {len(divs)} div elements in survivor items tabber")
    for div in divs:
        name = div.find("h3").get_text(strip=True).removesuffix("es").removesuffix("s")
        icon_img = div.find("figure").find("img")
        icon = get_icon_url(icon_img)
        text_blocks = [child for child in div.children if child.name == "p"]
        cleaned_html = ""
        for text_block in text_blocks:
            cleaned_html += clean_description_html(text_block)
        cleaned_html.strip()
        # Darn wiki has a note about unavailable addons for the firecrackers.
        cleaned_html.replace("These Add-ons can be found in the Game code, but are not available to use.", "")
        items.append((icon, name, cleaned_html))
    return items

def scrape_survivor_addons():
    url = "https://deadbydaylight.fandom.com/wiki/Add-ons"
    r = requests.get(url)
    soup = BeautifulSoup(r.text, "html.parser")
    addons = []
    tabber = soup.find_all("div", {"class": "tabber wds-tabber"})[1]
    divs = tabber.find_all("div", {"class": "wds-tab__content"})
    for div in divs:
        item_name = div.find("h3").get_text(strip=True).removesuffix("es").removesuffix("s")
        table = div.find("table", {"class": "wikitable"})
        for row_idx, row in enumerate(table.find_all("tr")[1:]):
            cols = row.find_all(["th", "td"])
            if len(cols) == 3:
                icon_img = cols[0].find("img")
                icon = get_icon_url(icon_img)
                rarity = "unknown"
                try:
                    rarity_div = cols[0].find("div", {"style": "--assembly-image-size: 128px;"})
                    if rarity_div and rarity_div.get("class"):
                        class_name = rarity_div.get("class")[-1] if isinstance(rarity_div.get("class"), list) else rarity_div.get("class")
                        if class_name:
                            rarity = class_name.replace("-item-element", "").replace("-", " ")
                except (AttributeError, IndexError, TypeError) as e:
                    logging.warning(f"Could not extract rarity for addon in row {row_idx}: {e}. Skipping...")
                    continue
                
                name_a = cols[1].find("a", title=True)
                name = name_a.get_text(strip=True)
                desc_html = clean_description_html(cols[2])
                if cols[2].find("span", {"class": "tooltip borderless"}):
                    logging.warning(f"Row #{row_idx} in table is retired, not available anymore, or on dbd mobile; skipping...")
                    continue
                logging.info(f"Row #{row_idx}: item={item_name}, addon={name}, rarity={rarity}")
                addons.append((icon, name, item_name, desc_html, rarity))
            else:
                logging.warning(f"Row #{row_idx} in table does not have expected structure.")
    return addons

def scrape_addons(killer_data):
    url = "https://deadbydaylight.fandom.com/wiki/Add-ons"
    r = requests.get(url)
    soup = BeautifulSoup(r.text, "html.parser")
    logging.info(f"Requesting addon page: {url}")
    addons = []
    h3s = soup.find_all("h3")
    for h3 in h3s:
        table = h3.find_next_sibling("table")
        if table and "wikitable" in table.get("class", []):
            power = None
            prev_figure = h3.find_previous_sibling("figure")
            if prev_figure:
                killer_link = prev_figure.find("a", title=True)
                if killer_link:
                    power = killer_link["title"]
            if not power:
                headline = h3.find("span", class_="mw-headline")
                power = headline.get_text(strip=True) if headline else "Unknown"
            for row_idx, row in enumerate(table.find_all("tr")[1:]):
                ths = row.find_all("th")
                tds = row.find_all("td")
                if len(ths) >= 2 and len(tds) >= 1:
                    icon_img = ths[0].find("img")
                    icon = get_icon_url(icon_img)
                    
                    # Try to extract rarity, but handle failures gracefully
                    rarity = "unknown"
                    try:
                        rarity_div = ths[0].find("div", {"style": "--assembly-image-size: 128px;"})
                        if rarity_div and rarity_div.get("class"):
                            class_name = rarity_div.get("class")[-1] if isinstance(rarity_div.get("class"), list) else rarity_div.get("class")
                            if class_name:
                                rarity = class_name.replace("-item-element", "").replace("-", " ")
                    except (AttributeError, IndexError, TypeError) as e:
                        logging.warning(f"Could not extract rarity for addon in row {row_idx}: {e}")
                    
                    name_a = ths[1].find("a", title=True)
                    name = name_a.get_text(strip=True) if name_a else ""
                    desc_html = clean_description_html(tds[0])
                    # Unfortunately, the wiki has inconsistent naming for Bear Trap vs Bear Traps,
                    # so we normalize it here.
                    if power == "Bear Trap":
                        power = "Bear Traps"
                    logging.info(f"Row #{row_idx}: power={power}, addon={name}, rarity={rarity}")
                    addons.append((icon, name, power, desc_html, rarity))
                else:
                    logging.warning(f"Row #{row_idx} in table after {power} does not have expected structure (ths: {len(ths)}, tds: {len(tds)})")
    
    # Check for missing addons using alternate method
    for name, power, _ in killer_data:
        if power not in [addon[2] for addon in addons]:
            logging.info(f"Addons not found for power '{power}', retrieving using alternate method...")
            killer_url = "https://deadbydaylight.fandom.com/wiki/" + name.replace(" ", "_")
            try:
                killer_r = requests.get(killer_url)
                killer_soup = BeautifulSoup(killer_r.text, "html.parser")
                found_addons = False
                
                for h3 in killer_soup.find_all("h3"):
                    # Check if h3 has an id attribute or span with id
                    h3_id = h3.get("id", "")
                    span_id = ""
                    span = h3.find("span", class_="mw-headline")
                    if span:
                        span_id = span.get("id", "")
                    
                    target_id = f"Add-ons_for_{power.replace(' ', '_')}"
                    if target_id in h3_id or target_id in span_id:
                        logging.info(f"Found addons for power '{power}' in killer page.")
                        table = h3.find_next_sibling("table", {"class": "wikitable"})
                        if not table:
                            logging.warning(f"No addons table found for power '{power}' in killer page.")
                            continue
                        found_addons = True
                        for row_idx, row in enumerate(table.find_all("tr")[1:]):
                            cols = row.find_all(["th", "td"])
                            if len(cols) >= 3:
                                icon_img = cols[0].find("img")
                                icon = get_icon_url(icon_img)
                                
                                rarity = "unknown"
                                try:
                                    rarity_div = cols[0].find("div", {"style": "--assembly-image-size: 128px;"})
                                    if rarity_div and rarity_div.get("class"):
                                        class_name = rarity_div.get("class")[0] if isinstance(rarity_div.get("class"), list) else rarity_div.get("class")
                                        if class_name:
                                            rarity = class_name.split(" ")[-1].replace("-item-element", "").replace("-", " ")
                                except (AttributeError, IndexError, TypeError) as e:
                                    logging.warning(f"Could not extract rarity for addon {name} in alternate method: {e}")
                                
                                name_a = cols[1].find("a", title=True)
                                addon_name = name_a.get_text(strip=True) if name_a else ""
                                desc_html = clean_description_html(cols[2])
                                logging.info(f"Row #{row_idx}: power={power}, addon={addon_name}, rarity={rarity}")
                                logging.info(f"Rarity: {rarity}")
                                addons.append((icon, addon_name, power, desc_html, rarity))
                            else:
                                logging.warning(f"Row #{row_idx} in table after {power} does not have expected structure (cols: {len(cols)})")
                        break
                
                if not found_addons:
                    logging.warning(f"Could not find addons for power '{power}' using alternate method.")
                    
            except Exception as e:
                logging.error(f"Error retrieving addons for power '{power}' from killer page: {e}")
    
    return addons

def scrape_flashlights():
    url = "https://deadbydaylight.fandom.com/wiki/Flashlights"
    r = requests.get(url)
    soup = BeautifulSoup(r.text, "html.parser")
    logging.info(f"Requesting flashlight page: {url}")
    flashlights = []

    # Find all tables before the final table, which contains the flashlight addons
    tables = soup.find_all("table", {"class": "wikitable"})
    if not tables:
        logging.warning("No tables found on the flashlight page.")
        return []
    if len(tables) < 2:
        logging.warning("Less than 2 tables found on the flashlight page, cannot process addons.")
        return []
    
    for table_idx, table in enumerate(tables[:-1]):
        logging.info(f"Processing table #{table_idx} for flashlights")
        rows = table.find_all("tr")[1:]
        for row_idx, row in enumerate(rows):
            tds = row.find_all(["td", "th"])
            if len(tds) >= 2:
                icon_img = tds[0].find("img")
                icon = get_icon_url(icon_img)
                name_a = tds[1].find("a", title=True)
                name = name_a.get_text(strip=True) if name_a else ""
                desc_html = clean_description_html(tds[2])
                if "THIS ITEM CAN NO LONGER BE OBTAINED FROM THE BLOODWEB" in desc_html:
                    continue
                flashlights.append((icon, name, desc_html))
                logging.info(f"Row #{row_idx}: name={name}")
            else:
                logging.warning(f"Row #{row_idx} in table #{table_idx} does not have expected structure (tds: {len(tds)})")

    flashlight_addons = []
    addons_table = tables[-1]
    rows = addons_table.find_all("tr")[1:]
    for row_idx, row in enumerate(rows):
        tds = row.find_all(["td", "th"])
        if len(tds) >= 2:
            icon_img = tds[0].find("img")
            icon = get_icon_url(icon_img)
            name_a = tds[1].find("a", title=True)
            name = name_a.get_text(strip=True) if name_a else ""
            desc_html = clean_description_html(tds[2])
            logging.info(f"Row #{row_idx}: name={name}")
            flashlight_addons.append((icon, name, desc_html))
        else:
            logging.warning(f"Row #{row_idx} in flashlight addon table does not have expected structure (tds: {len(tds)})")

    return flashlights, flashlight_addons

def scrape_offerings():
    url = "https://deadbydaylight.fandom.com/wiki/Offerings"
    r = requests.get(url)
    soup = BeautifulSoup(r.text, "html.parser")
    logging.info(f"Requesting offering page: {url}")
    offerings = []

    # Find all tables before the final table, which contains the flashlight addons
    tables = soup.find_all("table", {"class": "wikitable"})
    if not tables:
        logging.warning("No tables found on the offering page.")
        return []
    
    for table_idx, table in enumerate(tables):
        logging.info(f"Processing table #{table_idx} for offerings")
        rows = table.find_all("tr")[1:]
        for row_idx, row in enumerate(rows):
            cols = row.find_all(["th", "td"])
            if len(cols) == 3:
                href = cols[0].find("a").get("href", "").strip()
                icon = get_icon_url(cols[0].find("img"))
                name = cols[1].find("a", title=True).get_text(strip=True)
                desc_html = clean_description_html(cols[2])
                if "<span class=\"tooltip borderless\">" in desc_html:
                    logging.warning(f"Row #{row_idx} in table #{table_idx} is retired, not available anymore, or on dbd mobile; skipping...")
                    continue
                if not href:
                    logging.warning(f"Row #{row_idx} in table #{table_idx} is missing a link, skipping...")
                    continue
                else:
                    offering_page_r = requests.get("https://deadbydaylight.fandom.com" + href)
                    offering_soup = BeautifulSoup(offering_page_r.text, "html.parser")
                    offering_type = offering_soup.find_all("p")[0].get_text(strip=True)
                    if "killers" in offering_type.lower():
                        role = "killer"
                    elif "survivors" in offering_type.lower():
                        role = "survivor"
                    elif "all players" in offering_type.lower():
                        role = "all"
                    else:
                        logging.warning(f"Could not determine role for offering {name} (row #{row_idx}, table #{table_idx})")
                        role = "unknown"
                    
                    rarities = ["common", "uncommon", "rare", "very rare", "ultra rare"]
                    rarity = None
                    for r in rarities:
                        if r in offering_type.lower():
                            rarity = r
                offerings.append((icon, name, desc_html, role, rarity))
                logging.info(f"Row #{row_idx}: name={name}")
            else:
                logging.warning(f"Row #{row_idx} in table #{table_idx} does not have expected structure (cols: {len(cols)})")
    return offerings


def init_database():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        
    conn = sqlite3.connect(DB_PATH)
    create_tables(conn)
    c = conn.cursor()

    print("Scraping killers...")
    killer_data = scrape_killers()
    for name, power, icon in killer_data:
        c.execute("INSERT OR IGNORE INTO killers (name, power, icon) VALUES (?, ?, ?)", (name, power, icon))

    print("Scraping survivors...")
    for name in scrape_survivors():
        c.execute("INSERT OR IGNORE INTO survivors (name) VALUES (?)", (name,))

    print("Scraping killer perks...")
    for icon, name, desc, killer in scrape_killer_perks():
        logging.info(f"Processing killer perk: {name} for killer {killer}")
        c.execute("SELECT id FROM killers WHERE name = ?", (killer,))
        result = c.fetchone()
        killer_id = result[0] if result else None
        c.execute("INSERT OR IGNORE INTO killer_perks (icon, name, description, killer_id) VALUES (?, ?, ?, ?)", (icon, name, desc, killer_id))

    print("Scraping survivor perks...")
    for icon, name, desc, survivor in scrape_survivor_perks():
        # Always normalize survivor name before lookup
        survivor_norm = normalize_survivor_name(survivor)
        c.execute("SELECT id FROM survivors WHERE name = ?", (survivor_norm,))
        result = c.fetchone()
        survivor_id = result[0] if result else None
        c.execute("INSERT OR IGNORE INTO survivor_perks (icon, name, survivor_id, description) VALUES (?, ?, ?, ?)", (icon, name, survivor_id, desc))

    print("Scraping survivor items...")
    survivor_items = scrape_survivor_items()
    for icon, name, desc in survivor_items:
        c.execute("INSERT OR IGNORE INTO survivor_items (icon, name, description) VALUES (?, ?, ?)", (icon, name, desc))

    print("Scraping survivor addons...")
    survivor_addons = scrape_survivor_addons()
    for icon, name, item, desc, rarity in survivor_addons:
        c.execute("SELECT id FROM survivor_items WHERE name = ?", (item,))
        result = c.fetchone()
        item_id = result[0] if result else None
        c.execute("INSERT OR IGNORE INTO survivor_addons (icon, name, item, description, rarity) VALUES (?, ?, ?, ?, ?)", (icon, name, item_id, desc, rarity))

    print("Scraping addons...")
    for icon, name, killer, desc, rarity in scrape_addons(killer_data):
        # Look up killer_id from killers table
        c.execute("SELECT id FROM killers WHERE power = ?", (killer,))
        result = c.fetchone()
        killer_id = result[0] if result else None
        c.execute("INSERT OR IGNORE INTO killer_addons (icon, name, killer_id, description, rarity) VALUES (?, ?, ?, ?, ?)", (icon, name, killer_id, desc, rarity))

    for icon, name, desc, role, rarity in scrape_offerings():
        c.execute("INSERT OR IGNORE INTO offerings (icon, name, description, role, rarity) VALUES (?, ?, ?, ?, ?)", (icon, name, desc, role, rarity))

    conn.commit()
    conn.close()
    print("Done! Data saved to", DB_PATH)

app = Flask(__name__)
CORS(app)

@app.route("/api/characters", methods=["GET"])
def api_characters():
    role = request.args.get("role", "any")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    if role == "killer":
        c.execute("SELECT name FROM killers ORDER BY name")
        characters = [row[0] for row in c.fetchall()]
    elif role == "survivor":
        c.execute("SELECT name FROM survivors ORDER BY name")
        characters = [row[0] for row in c.fetchall()]
    else:
        c.execute("SELECT name FROM killers ORDER BY name")
        characters = [row[0] for row in c.fetchall()]
        c.execute("SELECT name FROM survivors ORDER BY name")
        characters.extend([row[0] for row in c.fetchall()])
    characters = sorted(set(characters))
    conn.close()
    return jsonify({"characters": characters})

@app.route("/api/update", methods=["POST"])
def api_update():
    try:
        init_database()
        return jsonify({"status": "success", "message": "Database updated."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

def get_rarity_color(rarity):
    colors = {
        "common": "#ab713c",
        "uncommon": "#e8c252",
        "rare": "#199b1e",
        "very rare": "#ac3ee3",
        "ultra rare": "#ff0955"
    }

    return colors.get(rarity, "#FFFFFF")

def generate_random_build(role, allowed=None, use_offering=False):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    result = {}
    if role == "any":
        role = ["killer", "survivor"][randint(0, 1)]

    if use_offering:
        c.execute("SELECT icon, name, description, rarity FROM offerings WHERE role = ? OR role = 'all' ORDER BY RANDOM() LIMIT 1", (role,))
        offering_data = c.fetchone()
        if not offering_data:
            logging.warning("No offering found for %s role.", role)
            result["offering"] = None
        else:
            color = get_rarity_color(offering_data[3])

            result["offering"] = {
                "icon": offering_data[0],
                "name": offering_data[1],
                "description": offering_data[2],
                "rarity": offering_data[3].title(),
                "color": color
            }
            logging.info("Offering found for %s role: %s", role, result["offering"]["name"])
    else:
        result["offering"] = None

    # Select character based on role
    if role == "killer":
        if allowed:
            placeholders = ",".join("?" for _ in allowed)
            q = f"SELECT id, name, icon FROM killers WHERE name IN ({placeholders}) ORDER BY RANDOM() LIMIT 1"
            c.execute(q, tuple(allowed))
        else:
            c.execute("SELECT id, name, icon FROM killers ORDER BY RANDOM() LIMIT 1")
    else:  # survivor
        if allowed:
            placeholders = ",".join("?" for _ in allowed)
            q = f"SELECT id, name FROM survivors WHERE name IN ({placeholders}) ORDER BY RANDOM() LIMIT 1"
            c.execute(q, tuple(allowed))
        else:
            c.execute("SELECT id, name FROM survivors ORDER BY RANDOM() LIMIT 1")
    
    character = c.fetchone()
    if not character:
        conn.close()
        return None

    character_name = character[1]
    if role == "killer":
        killer_id = character[0]
        killer_icon = character[2]
        result["killer"] = {"name": character_name, "icon": killer_icon}

        c.execute("SELECT name, description, icon, rarity FROM killer_addons WHERE killer_id = ? ORDER BY RANDOM() LIMIT 2", (killer_id,))
        addons = [{"name": a[0], "description": a[1], "icon": a[2], "rarity": a[3].title(), "color": get_rarity_color(a[3])} for a in c.fetchall()]
        if not addons:
            logging.warning("No addons found for killer %s", character_name)
            result["addons"] = None
        else:
            result["addons"] = addons
    else:
        result["survivor"] = {"name": character_name}

        c.execute("SELECT id, icon, name, description FROM survivor_items ORDER BY RANDOM() LIMIT 1")
        item_row = c.fetchone()
        if item_row:
            item_id, item_icon, item_name, item_desc = item_row
            result["item"] = {
            "icon": item_icon,
            "name": item_name,
            "description": item_desc
            }
            # Select 2 random addons for this item
            c.execute(
            "SELECT name, description, icon, rarity FROM survivor_addons WHERE item = ? ORDER BY RANDOM() LIMIT 2",
            (item_id,)
            )
            addons = [
            {
                "name": a[0],
                "description": a[1],
                "icon": a[2],
                "rarity": a[3].title(),
                "color": get_rarity_color(a[3])
            }
            for a in c.fetchall()
            ]
            result["addons"] = addons
        else:
            result["item"] = None
            result["addons"] = []

    perk_table = role + "_perks"
    character_table = role + "s"
    character_id_field = f"perk_table.{role}_id"
    
    if allowed:
        placeholders = ",".join("?" for _ in allowed)
        q = f"""
            SELECT perk_table.name, perk_table.description, character_table.name as owner_name, perk_table.icon
            FROM {perk_table} perk_table
            LEFT JOIN {character_table} character_table ON {character_id_field} = character_table.id
            WHERE character_table.name IN ({placeholders})
            ORDER BY RANDOM() LIMIT 4
        """
        c.execute(q, tuple(allowed))
    else:
        q = f"""
            SELECT perk_table.name, perk_table.description, character_table.name as owner_name, perk_table.icon
            FROM {perk_table} perk_table
            LEFT JOIN {character_table} character_table ON {character_id_field} = character_table.id
            ORDER BY RANDOM() LIMIT 4
        """
        c.execute(q)
    
    perks = [{"name": p[0], "description": p[1], "owner": p[2], "icon": p[3]} for p in c.fetchall()]
    result["perks"] = perks

    conn.close()
    return result

@app.route("/api/random_build", methods=["POST", "GET"])
def api_random_build():
    if request.method == "POST":
        data = request.get_json(force=True)
        allowed = data.get("allowed", None)
        use_offerings = data.get("useOfferings", False)
        role = data.get("role", None) or request.args.get("role", "any")
    else:
        allowed = None
        use_offerings = False
        role = request.args.get("role", "any")

    if role not in ["killer", "survivor", "any"]:
        return jsonify({"error": "Invalid role"}), 400

    result = generate_random_build(role, allowed, use_offerings)
    if result is None:
        return jsonify({"error": f"No {role}s found"}), 404

    return jsonify(result)

@app.route("/api/batch_random_build", methods=["GET", "POST"])
def batch_random_build():
    if request.method == "POST":
        data = request.get_json(force=True)
        role = data.get("role", None)
        amount = int(data.get("amount", 1))
        allowed = data.get("allowed", None)
    else:
        role = request.args.get("role", None)
        amount = int(request.args.get("amount", 1))
        allowed = None

    if role not in ["killer", "survivor"]:
        return jsonify({"error": "Invalid role"}), 400

    builds = []
    for _ in range(amount):
        build = generate_random_build(role, allowed)
        if build is None:
            return jsonify({"error": f"No {role}s found"}), 404
        builds.append(build)

    return jsonify({"builds": builds})


@app.route("/api/custom_match_random_builds", methods=["GET"])
def custom_match_random_builds():
    killer_build_raw = generate_random_build("killer")
    if not killer_build_raw:
        return jsonify({"error": "No killer found"}), 404

    killer_info = killer_build_raw.get("killer", {})
    result = {
        "killer": {
            "name": killer_info.get("name"),
            "icon": killer_info.get("icon"),
            "addons": killer_build_raw.get("addons", []),
            "perks": killer_build_raw.get("perks", [])
        },
        "survivors": []
    }

    for _ in range(4):
        sb = generate_random_build("survivor")
        if not sb:
            return jsonify({"error": "Not enough survivors found"}), 404
        result["survivors"].append(sb)

    return jsonify(result)

@app.route("/api/all_addons")
def api_all_addons():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        SELECT a.name, a.description, a.icon, k.name as killer
        FROM killer_addons a
        LEFT JOIN killers k ON a.killer_id = k.id
        ORDER BY k.name, a.name
    """)
    addons = [
        {"name": row[0], "description": row[1], "icon": row[2], "killer": row[3]}
        for row in c.fetchall()
    ]
    conn.close()
    return jsonify({"addons": addons})

@app.route("/api/random_addons", methods=["GET", "POST"])
def api_random_addons():
    if request.method == "POST":
        data = request.get_json(force=True)
        allowed = data.get("allowed", None)
        role = data.get("role", None) or request.args.get("role", "killer")
    else:
        allowed = None
        role = request.args.get("role", "killer")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    result = {}
    if role == "any":
        role = ["killer", "survivor"][randint(0, 1)]

    if role == "killer":
        if allowed:
            q = "SELECT id, name, icon FROM killers WHERE name IN ({}) ORDER BY RANDOM() LIMIT 1".format(
                ",".join("?" for _ in allowed)
            )
            c.execute(q, allowed)
        else:
            c.execute("SELECT id, name, icon FROM killers ORDER BY RANDOM() LIMIT 1")
        killer = c.fetchone()
        if not killer:
            conn.close()
            return jsonify({"error": "No killers found"}), 404
        killer_id, killer_name, killer_icon = killer
        result["killer"] = {"name": killer_name, "icon": killer_icon}

        c.execute("SELECT name, description, icon FROM killer_addons WHERE killer_id = ? ORDER BY RANDOM() LIMIT 1", (killer_id,))
        a = c.fetchone()
        if not a:
            conn.close()
            # If there are no addons, try again - will select another random killer.
            # If there is only killers in which addons cannot be retrieved, the maximum
            # recursion depth will be exceeded and the frontend will display "Failed to fetch."
            return api_random_addons()
        
        chosen_addon = {"name": a[0], "description": a[1], "icon": a[2]}
        result["chosen_addon"] = chosen_addon

        c.execute(
            "SELECT name, description, icon FROM killer_addons WHERE killer_id = ? AND name != ? ORDER BY RANDOM() LIMIT 3",
            (killer_id, chosen_addon["name"]),
        )
        false_addons = [{"name": a[0], "description": a[1], "icon": a[2]} for a in c.fetchall()]
        false_addons.append(chosen_addon)
        options = false_addons + [chosen_addon]
        options = [dict(t) for t in {tuple(d.items()) for d in options}]  # remove exact duplicates
        shuffle(options)

        result["addon_options"] = options
    elif role == "survivor":
        if allowed:
            q = "SELECT id, name FROM survivors WHERE name IN ({}) ORDER BY RANDOM() LIMIT 1".format(
                ",".join("?" for _ in allowed)
            )
            c.execute(q, allowed)
        else:
            c.execute("SELECT id, name FROM survivors ORDER BY RANDOM() LIMIT 1")
        survivor = c.fetchone()
        if not survivor:
            conn.close()
            return api_random_addons()
        survivor_name = survivor[1]
        result["survivor"] = {"name": survivor_name}

        c.execute("SELECT name, description, icon FROM killer_addons WHERE killer_id IS NULL ORDER BY RANDOM() LIMIT 1")
        a = c.fetchone()
        chosen_addon = {"name": a[0], "description": a[1], "icon": a[2]}
        result["chosen_addon"] = chosen_addon

        c.execute(
            "SELECT name, description, icon FROM killer_addons WHERE killer_id IS NULL AND name != ? ORDER BY RANDOM() LIMIT 3",
            (chosen_addon["name"],)
        )
        false_addons = [{"name": a[0], "description": a[1], "icon": a[2]} for a in c.fetchall()]
        result["false_addons"] = false_addons
    else:
        return jsonify({"error": "An unknown error has occurred."})
    conn.close()
    return jsonify(result)

@app.route("/api/random_perks", methods=["GET", "POST"])
def api_random_perks():
    if request.method == "POST":
        data = request.get_json(force=True)
        allowed = data.get("allowed", None)
        role = data.get("role", None) or request.args.get("role", "killer")
    else:
        allowed = None
        role = request.args.get("role", "killer")

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    result = {}

    if role == "any":
        role = ["killer", "survivor"][randint(0, 1)]

    if role == "killer":
        if allowed:
            q = "SELECT id, name, icon FROM killers WHERE name IN ({}) ORDER BY RANDOM() LIMIT 1".format(
                ",".join("?" for _ in allowed)
            )
            c.execute(q, allowed)
        else:
            c.execute("SELECT id, name, icon FROM killers ORDER BY RANDOM() LIMIT 1")

        killer = c.fetchone()
        if not killer:
            conn.close()
            return api_random_perks()

        _, killer_name, killer_icon = killer
        result["killer"] = {"name": killer_name, "icon": killer_icon}

        # Fetch one random killer perk (can filter by character_id if needed)
        c.execute("""
            SELECT name, description, icon
            FROM killer_perks
            ORDER BY RANDOM() LIMIT 1
        """)
        p = c.fetchone()
        if not p:
            conn.close()
            return api_random_perks()

        chosen_perk = {"name": p[0], "description": p[1], "icon": p[2]}
        result["chosen_perk"] = chosen_perk

        c.execute("""
            SELECT name, description, icon
            FROM killer_perks
            WHERE name != ?
            ORDER BY RANDOM() LIMIT 3
        """, (chosen_perk["name"],))
        false_perks = [{"name": r[0], "description": r[1], "icon": r[2]} for r in c.fetchall()]

        options = false_perks + [chosen_perk]
        options = [dict(t) for t in {tuple(d.items()) for d in options}]  # deduplicate
        shuffle(options)
        result["perk_options"] = options

    elif role == "survivor":
        if allowed:
            q = "SELECT id, name FROM survivors WHERE name IN ({}) ORDER BY RANDOM() LIMIT 1".format(
                ",".join("?" for _ in allowed)
            )
            c.execute(q, allowed)
        else:
            c.execute("SELECT id, name FROM survivors ORDER BY RANDOM() LIMIT 1")

        survivor = c.fetchone()
        if not survivor:
            conn.close()
            return api_random_perks()

        _, survivor_name = survivor
        result["survivor"] = {"name": survivor_name}

        c.execute("""
            SELECT name, description, icon
            FROM survivor_perks
            ORDER BY RANDOM() LIMIT 1
        """)
        p = c.fetchone()
        if not p:
            conn.close()
            return api_random_perks()

        chosen_perk = {"name": p[0], "description": p[1], "icon": p[2]}
        result["chosen_perk"] = chosen_perk

        c.execute("""
            SELECT name, description, icon
            FROM survivor_perks
            WHERE name != ?
            ORDER BY RANDOM() LIMIT 3
        """, (chosen_perk["name"],))
        false_perks = [{"name": r[0], "description": r[1], "icon": r[2]} for r in c.fetchall()]

        options = false_perks + [chosen_perk]
        options = [dict(t) for t in {tuple(d.items()) for d in options}]
        shuffle(options)
        result["perk_options"] = options

    else:
        return jsonify({"error": "Invalid role"}), 400

    conn.close()
    return jsonify(result)


@app.route("/api/all_perks")
def api_all_perks():
    role = request.args.get("role", "killer")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    if role == "killer":
        c.execute("""
            SELECT kp.name, kp.description, kp.icon, k.name as owner
            FROM killer_perks kp
            LEFT JOIN killers k ON kp.killer_id = k.id
            ORDER BY k.name, kp.name
        """)
        perks = [
            {"name": row[0], "description": row[1], "icon": row[2], "owner": row[3], "role": "killer"}
            for row in c.fetchall()
        ]

    elif role == "survivor":
        c.execute("""
            SELECT sp.name, sp.description, sp.icon, s.name as owner
            FROM survivor_perks sp
            LEFT JOIN survivors s ON sp.survivor_id = s.id
            ORDER BY s.name, sp.name
        """)
        perks = [
            {"name": row[0], "description": row[1], "icon": row[2], "owner": row[3], "role": "survivor"}
            for row in c.fetchall()
        ]

    else:
        c.execute("""
            SELECT kp.name, kp.description, kp.icon, k.name AS owner, 'killer' AS role
            FROM killer_perks kp
            LEFT JOIN killers k ON kp.killer_id = k.id

            UNION ALL

            SELECT sp.name, sp.description, sp.icon, s.name AS owner, 'survivor' AS role
            FROM survivor_perks sp
            LEFT JOIN survivors s ON sp.survivor_id = s.id

            ORDER BY role;
        """)
        perks = [
            {"name": row[0], "description": row[1], "icon": row[2], "owner": row[3], "role": row[4]}
            for row in c.fetchall()
        ]

    conn.close()
    return jsonify({"perks": perks})

if __name__ == "__main__":
    if not os.path.exists(DB_PATH):
        logging.info("Database not found, initializing...")
        init_database()
    app.run(debug=True, port=5000)