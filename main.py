#!/usr/bin/env python3
"""
find_empty_slots_more_robust.py

Improved timetable parser: better class/group detection using:
 - richer regexes
 - pdfplumber.extract_words() coordinates (top-of-block heuristics)
 - optional OCR fallback via pytesseract

Usage:
    pip install pdfplumber pytesseract pillow
    # optionally install tesseract system binary for OCR
    python find_empty_slots_more_robust.py "/mnt/data/Emploi du temps Cour du jour Semaine_20-10-2025 (1).pdf" --out both
"""

import re
import sys
import json
import csv
import argparse
from collections import OrderedDict, defaultdict

try:
    import pdfplumber
except Exception:
    raise SystemExit("Install dependency: pip install pdfplumber")

# Optional OCR
try:
    import pytesseract
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    from PIL import Image
    OCR_AVAILABLE = True
except Exception:
    OCR_AVAILABLE = False

# canonical slots
SLOT_BOUNDARIES = [
    ("09H:00", "10H:30"),
    ("10H:45", "12H:15"),
    ("13H:30", "15H:00"),
    ("15H:15", "16H:45"),
]
SLOT_NAMES = [f"{a}-{b}" for a, b in SLOT_BOUNDARIES]
DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]

# ---------- helper functions ----------


def normalize(text: str) -> str:
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text).strip()


def time_str_to_minutes(t: str) -> int:
    t = t.upper().replace(' ', '')
    t = t.replace('H:', ':').replace('H', ':')
    parts = t.split(':')
    try:
        h = int(parts[0])
        m = int(parts[1]) if len(parts) > 1 and parts[1] != '' else 0
        return h * 60 + m
    except Exception:
        return -1


def parse_range_to_minutes(r: str):
    r2 = r.replace(' ', '').replace('\u2013', '-').replace('\u2014', '-')
    m = re.match(
        r'(\d{1,2}H:?\d{0,2})\s*[-–—]\s*(\d{1,2}H:?\d{0,2})', r2, flags=re.IGNORECASE)
    if not m:
        m = re.match(r'(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})', r2)
    if not m:
        return None
    start = time_str_to_minutes(m.group(1))
    end = time_str_to_minutes(m.group(2))
    if start < 0 or end < 0:
        return None
    return (start, end)


def ranges_overlap(a_start, a_end, b_start, b_end):
    return not (a_end <= b_start or b_end <= a_start)


def find_time_ranges_in_text(text: str):
    candidates = re.findall(
        r'\d{1,2}H:?[:]?\d{0,2}\s*[-–—]\s*\d{1,2}H:?[:]?\d{0,2}', text, flags=re.IGNORECASE)
    candidates += re.findall(r'\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}', text)
    candidates += re.findall(r'\b\d{3,4}\s*[-–—]\s*\d{3,4}\b', text)
    seen = []
    for c in candidates:
        c = c.strip()
        if c not in seen:
            seen.append(c)
    return seen

# ---------- parsing functions ----------


def split_into_groups(full_text: str):
    parts = re.split(r'(?:Emploi\s+du\s+Temps|Emploi du temps|EDT)',
                     full_text, flags=re.IGNORECASE)
    groups = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        groups.append(p)
    return groups


def extract_days_block(group_text: str):
    dblocks = OrderedDict()
    pattern = r'(?:(Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi)\b(?:\s*\d{1,2}/\d{1,2}/\d{4})?)'
    items = list(re.finditer(pattern, group_text, flags=re.IGNORECASE))
    if not items:
        dblocks["unknown"] = group_text.strip()
        for d in DAYS:
            if d not in dblocks:
                dblocks[d] = ""
        return dblocks

    for i, m in enumerate(items):
        day = m.group(1).capitalize()
        start = m.end()
        end = items[i+1].start() if i+1 < len(items) else len(group_text)
        block = group_text[start:end].strip()
        dblocks[day] = normalize(block)

    for d in DAYS:
        if d not in dblocks:
            dblocks[d] = ""
    return dblocks


def detect_filled_slots(day_block: str):
    filled = {name: False for name in SLOT_NAMES}
    if not day_block:
        return filled

    ranges = find_time_ranges_in_text(day_block)
    parsed_ranges = []
    for r in ranges:
        pr = parse_range_to_minutes(r)
        if pr:
            parsed_ranges.append(pr)

    slot_minutes = []
    for a, b in SLOT_BOUNDARIES:
        slot_minutes.append((time_str_to_minutes(a), time_str_to_minutes(b)))

    for (s, e) in parsed_ranges:
        for i, (sa, se) in enumerate(slot_minutes):
            if ranges_overlap(s, e, sa, se):
                filled[SLOT_NAMES[i]] = True

    if not any(filled.values()):
        lines = [ln.strip() for ln in re.split(
            r'[\n\r]+', day_block) if ln.strip()]
        meaningful = [ln for ln in lines if re.search(
            r'[A-Za-z0-9À-ÖØ-öø-ÿ]', ln)]
        meaningful = [ln for ln in meaningful if len(ln) > 2 and not re.match(
            r'^(Salle|Pause|Horaire|Heure)\b', ln, flags=re.IGNORECASE)]
        if meaningful:
            for i, ln in enumerate(meaningful):
                if i >= len(SLOT_NAMES):
                    break
                filled[SLOT_NAMES[i]] = True

    return filled

# ---------- stronger group detection ----------


def detect_group_name_regex_variants(text: str):
    # various patterns to catch different formats
    patterns = [
        r'\b(?:Classe|Groupe)\s*[:\-]?\s*([0-9]{1,2}\s*[A-Z]\s*[0-9]{1,2}[A-Z]?)\b',
        r'\b(?:Classe|Groupe)\s*[:\-]?\s*([0-9]\s*[A-Z]\s*[0-9]{1,2})\b',
        r'\b([0-9]{1,2}\s*[A-Z]\s*[0-9]{1,2}[A-Z]?)\b',
        r'\b([0-9]{1,2}[A-Z][0-9]{1,2}[A-Z]?)\b',
        r'\b([0-9]{1,2}\-[A-Z]\-[0-9]{1,2})\b',
    ]
    for pat in patterns:
        m = re.search(pat, text, flags=re.IGNORECASE)
        if m:
            name = re.sub(r'\s+', '', m.group(1)).upper()
            name = re.sub(r'[^0-9A-Z\-]', '', name)
            if len(name) >= 2:
                return name
    return None


def detect_group_from_words_on_pages(pdf, group_text_snippet):
    """
    Inspect words with coordinates on pages to find short tokens near top (y small).
    We'll search across pages for words that look like class tokens and are near top.
    """
    candidates = []
    # try to find a page containing the snippet, then analyze that page's words
    for i, page in enumerate(pdf.pages):
        page_txt = page.extract_text() or ""
        if group_text_snippet[:40].strip() and group_text_snippet[:40].strip() in page_txt:
            words = page.extract_words(
                extra_attrs=["x0", "top", "x1", "bottom", "fontname", "size"])
            # find short words near top (top coordinate small)
            for w in words:
                txt = w.get("text", "").strip()
                top = float(w.get("top", 9999))
                # shortlist short tokens at the top region (top less than some threshold)
                if 0 < len(txt) <= 6 and top < 120:  # threshold may need adjustment
                    candidates.append((txt, top, i+1))
            # return if any candidates found
            if candidates:
                return candidates, i+1
    # fallback: scan first 2 pages broadly
    words = []
    for i in range(min(2, len(pdf.pages))):
        wds = pdf.pages[i].extract_words(
            extra_attrs=["x0", "top", "x1", "bottom", "fontname", "size"])
        for w in wds:
            txt = w.get("text", "").strip()
            top = float(w.get("top", 9999))
            if 0 < len(txt) <= 6 and top < 140:
                words.append((txt, top, i+1))
    return words, (1 if words else None)


def ocr_page_and_find(pdf, page_index):
    """
    Run OCR on given page index (0-based). Return OCR text or None.
    """
    if not OCR_AVAILABLE:
        return None
    try:
        page = pdf.pages[page_index]
        pil = page.to_image(resolution=200).original
        text = pytesseract.image_to_string(pil, lang='fra+eng')
        return text
    except Exception:
        return None


def detect_group_name(group_text: str, pdf=None, fallback_index: int = 0):
    # 1) Try regex on group_text
    res = detect_group_name_regex_variants(group_text[:400])
    if res:
        return res

    # 2) look near top of pages via extract_words() if pdf provided
    if pdf:
        candidates, page_idx = detect_group_from_words_on_pages(
            pdf, group_text)
        if candidates:
            # try to pick best candidate that matches token-like pattern
            for txt, top, pageno in candidates:
                t = re.sub(r'[^0-9A-Za-z\-]', '', txt).upper()
                if re.match(r'^[0-9]{1,2}[A-Z][0-9]{1,2}[A-Z]?$', t) or re.match(r'^[0-9]{1,2}[A-Z]$', t) or re.match(r'^[0-9]{1,2}[A-Z][0-9]{1,2}\-?$', t):
                    return t
            # fallback to the shortest candidate
            cand_sorted = sorted(candidates, key=lambda x: (len(x[0]), x[1]))
            return re.sub(r'[^0-9A-Z\-]', '', cand_sorted[0][0].upper())

    # 3) OCR fallback: try OCR on the page(s) where this snippet appears
    if pdf and OCR_AVAILABLE:
        # find page where snippet likely located
        found_page = None
        for i, p in enumerate(pdf.pages):
            if group_text[:40].strip() and group_text[:40].strip() in (p.extract_text() or ""):
                found_page = i
                break
        if found_page is None:
            found_page = 0
        ocr_text = ocr_page_and_find(pdf, found_page)
        if ocr_text:
            res2 = detect_group_name_regex_variants(ocr_text[:800])
            if res2:
                return res2

    # final fallback
    return f"Group_{fallback_index}"

# ---------- main processing ----------


def process_pdf(path: str, target_group: str = None):
    text = ""
    with pdfplumber.open(path) as pdf:
        for p in pdf.pages:
            text += "\n" + (p.extract_text() or "")
        text = normalize(text)
        groups = split_into_groups(text)
        results = OrderedDict()
        for gi, g in enumerate(groups, start=1):
            # attempt detection using pdf object for extract_words/ocr assistance
            group_title = detect_group_name(g, pdf=pdf, fallback_index=gi)
            if target_group and target_group.upper() not in group_title.upper():
                continue
            dblocks = extract_days_block(g)
            group_result = OrderedDict()
            for day in DAYS:
                block = dblocks.get(day, "")
                filled_map = detect_filled_slots(block)
                empty_slots = [s for s, v in filled_map.items() if not v]
                filled_slots = [s for s, v in filled_map.items() if v]
                group_result[day] = {
                    "filled_slots": filled_slots,
                    "empty_slots": empty_slots,
                    "raw_block_sample": (block[:160] + '...') if block else ""
                }
            # normalize unique group titles
            key = group_title
            # ensure no collisions
            if key in results:
                key = f"{group_title}_{gi}"
            results[key] = group_result
    return results


def print_summary(results):
    for group, days in results.items():
        print(f"\n=== {group} ===")
        for day in DAYS:
            info = days.get(day, {})
            filled = info.get("filled_slots", [])
            empty = info.get("empty_slots", SLOT_NAMES.copy())
            print(
                f"{day}: Filled -> {filled if filled else 'None'} | Empty -> {empty}")


def write_json(results, filename="results.json"):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nWrote JSON -> {filename}")


def write_csv(results, filename="results.csv"):
    rows = []
    for group, days in results.items():
        for day, info in days.items():
            filled_set = set(info.get("filled_slots", []))
            for slot in SLOT_NAMES:
                status = "FILLED" if slot in filled_set else "EMPTY"
                rows.append({"group": group, "day": day, "slot": slot,
                            "status": status, "raw": info.get("raw_block_sample", "")})
    with open(filename, "w", encoding="utf-8", newline='') as f:
        writer = csv.DictWriter(
            f, fieldnames=["group", "day", "slot", "status", "raw"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"\nWrote CSV -> {filename}")

# ---------- CLI ----------


def main():
    ap = argparse.ArgumentParser(
        description="Find empty class slots in a timetable PDF (more robust).")
    ap.add_argument("pdf", help="Path to PDF file")
    ap.add_argument(
        "--out", choices=["json", "csv", "both"], help="Write output file")
    ap.add_argument(
        "--group", help="Only process groups that include this string (case-insensitive)")
    args = ap.parse_args()

    pdf_path = args.pdf
    target_group = args.group
    print("PDF:", pdf_path)
    print("OCR available:", OCR_AVAILABLE)
    results = process_pdf(pdf_path, target_group=target_group)
    if not results:
        print("No groups found or no group matched the filter.")
        return
    print_summary(results)
    if args.out:
        if args.out in ("json", "both"):
            write_json(results, "results.json")
        if args.out in ("csv", "both"):
            write_csv(results, "results.csv")


if __name__ == "__main__":
    main()
