import os
import math
import requests
import time

# ==== CONFIGURAZIONE ====

# Italia bounding box (Valle d’Aosta → Sicilia)
LAT_MIN = 35.49
LAT_MAX = 47.10
LON_MIN = 6.60
LON_MAX = 18.52

ZOOM_MIN = 6
ZOOM_MAX = 15 # aumenta fino a 15 se vuoi più dettaglio (ma file + pesanti)

TILE_URL = "https://a.tile.opentopomap.org/{z}/{x}/{y}.png"
DELAY = 0.5  # secondi tra richieste (evita di farsi bloccare)

# === PERCORSO DI USCITA ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "..", "public", "tiles")

# ==== FUNZIONI ====

def deg2num(lat, lon, zoom):
    """Converte coordinate geografiche in tile XY"""
    lat_rad = math.radians(lat)
    n = 2 ** zoom
    x = int((lon + 180.0) / 360.0 * n)
    y = int((1.0 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2.0 * n)
    return x, y

def download_tiles():
    total_downloaded = 0

    for zoom in range(ZOOM_MIN, ZOOM_MAX + 1):
        print(f"\n🗺️ Zoom livello {zoom}")
        x_start, y_start = deg2num(LAT_MAX, LON_MIN, zoom)
        x_end, y_end = deg2num(LAT_MIN, LON_MAX, zoom)

        total = (x_end - x_start + 1) * (y_end - y_start + 1)
        count = 0

        for x in range(x_start, x_end + 1):
            for y in range(y_start, y_end + 1):
                count += 1
                url = TILE_URL.format(z=zoom, x=x, y=y)
                tile_path = os.path.join(OUTPUT_DIR, str(zoom), str(x))
                os.makedirs(tile_path, exist_ok=True)
                file_path = os.path.join(tile_path, f"{y}.png")

                if os.path.exists(file_path):
                    continue  # già esiste, lo saltiamo

                try:
                    print(f"[{count}/{total}] Scarico {url}")
                    r = requests.get(url, timeout=10)
                    if r.status_code == 200:
                        with open(file_path, "wb") as f:
                            f.write(r.content)
                        total_downloaded += 1
                    else:
                        print(f"⚠️ Tile mancante: {url}")
                except Exception as e:
                    print(f"❌ Errore scaricando {url}: {e}")

                time.sleep(DELAY)

    print(f"\n✅ Download completato. Tile salvate: {total_downloaded}")

# ==== ESECUZIONE ====
if __name__ == "__main__":
    download_tiles()
