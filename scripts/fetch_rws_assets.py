"""Fetch and normalize the verified Wikimedia Commons TaionWC RWS scan set.

The script refuses files whose Commons metadata does not identify them as
public domain. It also generates the static Expo require map and the original
app card back/fallback assets.
"""

from __future__ import annotations

import io
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "assets" / "tarot" / "rws"
FRONTS = ASSET_ROOT / "fronts"
BACK = ASSET_ROOT / "back"
GENERATED_TS = ROOT / "src" / "features" / "tarot" / "artwork" / "rwsAssets.ts"
CANVAS_SIZE = (456, 787)
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = (
    "TarotJournalApp/0.1 "
    "(https://github.com/WimserGu/Tarot-Journal-App; public-domain artwork build)"
)

MAJORS = [
    "Fool",
    "Magician",
    "High Priestess",
    "Empress",
    "Emperor",
    "Hierophant",
    "Lovers",
    "Chariot",
    "Strength",
    "Hermit",
    "Wheel of Fortune",
    "Justice",
    "Hanged Man",
    "Death",
    "Temperance",
    "Devil",
    "Tower",
    "Star",
    "Moon",
    "Sun",
    "Judgement",
    "World",
]
RANKS = [
    "ace",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "page",
    "knight",
    "queen",
    "king",
]
SUITS = [
    ("wands", "Wands", 22),
    ("cups", "Cups", 36),
    ("swords", "Swords", 50),
    ("pentacles", "Pents", 64),
]


def entries() -> list[dict[str, object]]:
    result: list[dict[str, object]] = []
    for card_id, title in enumerate(MAJORS):
        result.append(
            {
                "cardId": card_id,
                "commonsFilename": f"RWS Tarot {card_id:02d} {title}.jpg",
                "assetFilename": f"major_{card_id:02d}_{title.lower().replace(' ', '_')}.jpg",
            }
        )
    for suit, commons_suit, start_id in SUITS:
        for rank_number, rank in enumerate(RANKS, start=1):
            result.append(
                {
                    "cardId": start_id + rank_number - 1,
                    "commonsFilename": f"{commons_suit}{rank_number:02d}.jpg",
                    "assetFilename": f"{suit}_{rank_number:02d}_{rank}.jpg",
                }
            )
    return result


def fetch_json(parameters: dict[str, str]) -> dict[str, object]:
    url = f"{COMMONS_API}?{urllib.parse.urlencode(parameters)}"
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def commons_metadata(source_entries: list[dict[str, object]]) -> dict[str, dict[str, object]]:
    by_filename: dict[str, dict[str, object]] = {}
    filenames = [str(entry["commonsFilename"]) for entry in source_entries]
    for start in range(0, len(filenames), 40):
        titles = "|".join(f"File:{name}" for name in filenames[start : start + 40])
        response = fetch_json(
            {
                "action": "query",
                "format": "json",
                "formatversion": "2",
                "prop": "imageinfo",
                "iiprop": "url|extmetadata|sha1|size",
                "iiurlwidth": "700",
                "titles": titles,
            }
        )
        pages = response.get("query", {}).get("pages", [])  # type: ignore[union-attr]
        for page in pages:
            title = str(page["title"]).removeprefix("File:")
            image_info = page.get("imageinfo", [])
            if not image_info:
                raise RuntimeError(f"Commons file is missing: {title}")
            by_filename[title] = image_info[0]
    return by_filename


def metadata_value(metadata: dict[str, object], key: str) -> str:
    value = metadata.get(key, {})
    return str(value.get("value", "")) if isinstance(value, dict) else ""


def download(url: str) -> bytes:
    for attempt in range(6):
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == 5:
                raise
            retry_after = error.headers.get("Retry-After")
            time.sleep(float(retry_after) if retry_after else max(30, 2**attempt))
    raise RuntimeError("Artwork download retry loop ended unexpectedly")


def normalize_front(source: bytes, destination: Path) -> None:
    with Image.open(io.BytesIO(source)) as image:
        normalized = ImageOps.exif_transpose(image).convert("RGB")
        normalized.thumbnail(CANVAS_SIZE, Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", CANVAS_SIZE, "#eee4cf")
        x = (CANVAS_SIZE[0] - normalized.width) // 2
        y = (CANVAS_SIZE[1] - normalized.height) // 2
        canvas.paste(normalized, (x, y))
        canvas.save(destination, "JPEG", quality=84, optimize=True, progressive=True)


def generate_card_back(destination: Path) -> None:
    width, height = CANVAS_SIZE
    image = Image.new("RGB", CANVAS_SIZE, "#153b35")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((12, 12, width - 13, height - 13), 18, outline="#d4b96f", width=6)
    draw.rounded_rectangle((26, 26, width - 27, height - 27), 14, outline="#88b5a5", width=3)
    for y in range(58, height - 40, 54):
        for x in range(50, width - 30, 54):
            color = "#d4b96f" if ((x // 54) + (y // 54)) % 2 == 0 else "#88b5a5"
            draw.polygon([(x, y - 13), (x + 13, y), (x, y + 13), (x - 13, y)], outline=color, width=3)
            draw.ellipse((x - 4, y - 4, x + 4, y + 4), fill=color)
    center_x, center_y = width // 2, height // 2
    draw.ellipse((center_x - 48, center_y - 48, center_x + 48, center_y + 48), outline="#d4b96f", width=5)
    draw.polygon(
        [
            (center_x, center_y - 38),
            (center_x + 38, center_y),
            (center_x, center_y + 38),
            (center_x - 38, center_y),
        ],
        outline="#d4b96f",
        width=5,
    )
    pixels = image.load()
    for linear_position in range((width * height) // 2):
        x = linear_position % width
        y = linear_position // width
        pixels[width - 1 - x, height - 1 - y] = pixels[x, y]
    image.save(destination, "PNG", optimize=True)


def generate_fallback(destination: Path) -> None:
    width, height = CANVAS_SIZE
    image = Image.new("RGB", CANVAS_SIZE, "#e9e0cc")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((10, 10, width - 11, height - 11), 18, outline="#485b53", width=6)
    draw.rounded_rectangle((28, 28, width - 29, height - 29), 12, outline="#91a198", width=3)
    center_x, center_y = width // 2, height // 2
    draw.polygon(
        [
            (center_x, center_y - 55),
            (center_x + 16, center_y - 16),
            (center_x + 55, center_y),
            (center_x + 16, center_y + 16),
            (center_x, center_y + 55),
            (center_x - 16, center_y + 16),
            (center_x - 55, center_y),
            (center_x - 16, center_y - 16),
        ],
        outline="#485b53",
        width=6,
    )
    image.save(destination, "PNG", optimize=True)


def write_static_registry(source_entries: list[dict[str, object]]) -> None:
    lines = [
        "import type { ImageSourcePropType } from 'react-native';",
        "import cardBackAsset from '../../../../assets/tarot/rws/back/rws_back.png';",
        "import fallbackFrontAsset from '../../../../assets/tarot/rws/fallback_front.png';",
    ]
    for entry in source_entries:
        lines.append(
            f"import card{entry['cardId']}Asset from '../../../../assets/tarot/rws/fronts/{entry['assetFilename']}';"
        )
    lines.extend(
        [
        "",
        "export const RWS_CARD_BACK_ASSET = cardBackAsset as ImageSourcePropType;",
        "export const RWS_FALLBACK_FRONT_ASSET = fallbackFrontAsset as ImageSourcePropType;",
        "",
        "export const RWS_FRONT_ASSETS = Object.freeze({",
        ]
    )
    for entry in source_entries:
        lines.append(f"  {entry['cardId']}: card{entry['cardId']}Asset as ImageSourcePropType,")
    lines.extend(["}) as Readonly<Record<number, ImageSourcePropType>>;", "", "export const RWS_FRONT_FILENAMES = Object.freeze({"])
    for entry in source_entries:
        lines.append(f"  {entry['cardId']}: '{entry['assetFilename']}',")
    lines.extend(["}) as Readonly<Record<number, string>>;", ""])
    GENERATED_TS.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    source_entries = entries()
    if len(source_entries) != 78 or len({entry["cardId"] for entry in source_entries}) != 78:
        raise RuntimeError("Expected exactly 78 unique stable card IDs")
    FRONTS.mkdir(parents=True, exist_ok=True)
    BACK.mkdir(parents=True, exist_ok=True)
    metadata = commons_metadata(source_entries)
    audit_rows: list[dict[str, object]] = []
    for index, entry in enumerate(source_entries, start=1):
        commons_filename = str(entry["commonsFilename"])
        image_info = metadata[commons_filename]
        extmetadata = image_info.get("extmetadata", {})
        license_label = metadata_value(extmetadata, "LicenseShortName")
        usage_terms = metadata_value(extmetadata, "UsageTerms")
        if "public domain" not in f"{license_label} {usage_terms}".lower():
            raise RuntimeError(f"File lacks a Commons public-domain label: {commons_filename}")
        thumb_url = str(image_info.get("thumburl") or image_info["url"])
        destination = FRONTS / str(entry["assetFilename"])
        if not destination.exists():
            normalize_front(download(thumb_url), destination)
            time.sleep(2)
        audit_rows.append(
            {
                **entry,
                "commonsPage": str(image_info["descriptionurl"]),
                "commonsOriginalUrl": str(image_info["url"]),
                "commonsSha1": str(image_info.get("sha1", "")),
                "licenseLabel": license_label,
                "usageTerms": usage_terms,
                "sourceWidth": image_info.get("width"),
                "sourceHeight": image_info.get("height"),
            }
        )
        print(f"[{index:02d}/78] {commons_filename} -> {destination.name}")
    generate_card_back(BACK / "rws_back.png")
    generate_fallback(ASSET_ROOT / "fallback_front.png")
    write_static_registry(source_entries)
    (ASSET_ROOT / "source-files.json").write_text(
        json.dumps(
            {
                "accessedAt": "2026-07-14",
                "commonsCategory": "https://commons.wikimedia.org/wiki/Category:Rider-Waite-Smith_tarot_deck_(TaionWC)",
                "normalizedDimensions": {"width": CANVAS_SIZE[0], "height": CANVAS_SIZE[1]},
                "files": audit_rows,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
