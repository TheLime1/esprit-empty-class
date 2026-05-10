"""Extract ESPRIT exam calendar PDFs into deterministic JSON."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import OrderedDict
from datetime import datetime
from pathlib import Path

import pdfplumber


WEEKDAYS = {
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
    "Dimanche",
}

EXPECTED_PAGE_COUNT = 42
EXPECTED_CLASS_COUNT = 243
EXPECTED_EVENT_COUNT = 1359
ACADEMIC_YEAR = "2025-2026"
SOURCE_PDF = "Calendrier_Session_Principale_2526_VF.pdf"


def normalize_space(value: str | None) -> str:
    """Collapse PDF cell whitespace."""
    return re.sub(r"\s+", " ", (value or "").replace("\n", " ")).strip()


def clean_subject(value: str | None) -> str:
    """Clean known table extraction artifacts without changing real labels."""
    subject = normalize_space(value)
    subject = re.sub(r"^\)+", "", subject).strip()
    subject = re.sub(r"^oit\)+", "", subject).strip()

    if subject.startswith("ommunication,"):
        subject = f"C{subject}"

    subject = subject.replace("EcCroit", "Ecrit")
    subject = subject.replace("EcCr", "Ecr")
    subject = subject.replace("(EX:Ecr)", "(EX:Ecrit)")

    if subject.endswith("(EX:Ecr"):
        subject = f"{subject}it)"
    elif subject.endswith("(EX:Ecrit"):
        subject = f"{subject})"

    return normalize_space(subject)


def clean_time(value: str | None) -> str:
    """Extract HH:MM from PDF strings like 11h00 or the rare 11h00 C."""
    match = re.search(r"(\d{2})h(\d{2})", normalize_space(value))
    if not match:
        raise ValueError(f"Invalid exam time: {value!r}")
    return f"{match.group(1)}:{match.group(2)}"


def parse_date(value: str | None) -> str:
    """Convert DD/MM/YYYY to YYYY-MM-DD."""
    return datetime.strptime(normalize_space(value), "%d/%m/%Y").date().isoformat()


def is_exam_row(row: list[str | None]) -> bool:
    return len(row) >= 3 and normalize_space(row[0]) in WEEKDAYS


def is_valid_subject(subject: str) -> bool:
    return (
        bool(subject)
        and subject.count("(") == subject.count(")")
        and re.search(r"\(EX:[^)]+\)", subject) is not None
        and "EcCr" not in subject
        and not subject.startswith("ommunication,")
    )


def repair_row_subjects(cells: list[str]) -> list[str]:
    """Repair row spillover by copying clean sibling text when needed."""
    good_subjects = [cell for cell in cells if is_valid_subject(cell)]
    fallback = max(good_subjects, key=len) if good_subjects else None

    repaired: list[str] = []
    for cell in cells:
        if not cell:
            repaired.append("")
            continue
        if fallback and not is_valid_subject(cell):
            repaired.append(fallback)
        else:
            repaired.append(cell)
    return repaired


def extract_exam_calendar(pdf_path: Path) -> dict:
    classes: OrderedDict[str, list[dict[str, str]]] = OrderedDict()
    duplicate_classes: set[str] = set()
    pages_parsed = 0
    malformed: list[tuple[int, str, str]] = []

    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)

        for page_number, page in enumerate(pdf.pages, start=1):
            tables = page.extract_tables()
            if not tables:
                raise ValueError(f"Page {page_number} has no extractable table")

            table = max(tables, key=len)
            header = next(
                (row for row in table if row and normalize_space(row[0]) == "Jour"),
                None,
            )
            if not header:
                raise ValueError(f"Page {page_number} has no table header")

            page_classes = [normalize_space(cell) for cell in header[3:] if normalize_space(cell)]
            if not page_classes:
                raise ValueError(f"Page {page_number} has no class columns")

            for class_code in page_classes:
                if class_code in classes:
                    duplicate_classes.add(class_code)
                classes.setdefault(class_code, [])

            for row in table:
                if not is_exam_row(row):
                    continue

                day = normalize_space(row[0])
                date = parse_date(row[1])
                time = clean_time(row[2])
                raw_cells = row[3 : 3 + len(page_classes)]
                subjects = repair_row_subjects([clean_subject(cell) for cell in raw_cells])

                for class_code, subject in zip(page_classes, subjects):
                    if not subject:
                        continue
                    if not is_valid_subject(subject):
                        malformed.append((page_number, class_code, subject))
                    classes[class_code].append(
                        {
                            "date": date,
                            "day": day,
                            "time": time,
                            "subject": subject,
                        }
                    )

            pages_parsed += 1

    for exams in classes.values():
        exams.sort(key=lambda exam: (exam["date"], exam["time"], exam["subject"]))

    event_count = sum(len(exams) for exams in classes.values())
    data = {
        "metadata": {
            "academicYear": ACADEMIC_YEAR,
            "sourcePdf": pdf_path.name,
            "pagesParsed": pages_parsed,
            "classCount": len(classes),
            "eventCount": event_count,
        },
        "classes": classes,
    }

    errors = []
    if total_pages != EXPECTED_PAGE_COUNT:
        errors.append(f"expected {EXPECTED_PAGE_COUNT} pages, got {total_pages}")
    if len(classes) != EXPECTED_CLASS_COUNT:
        errors.append(f"expected {EXPECTED_CLASS_COUNT} classes, got {len(classes)}")
    if event_count != EXPECTED_EVENT_COUNT:
        errors.append(f"expected {EXPECTED_EVENT_COUNT} events, got {event_count}")
    if duplicate_classes:
        errors.append(f"duplicate classes: {', '.join(sorted(duplicate_classes))}")
    if malformed:
        preview = "; ".join(
            f"page {page} {class_code}: {subject}"
            for page, class_code, subject in malformed[:5]
        )
        errors.append(f"malformed subjects: {preview}")

    if errors:
        raise ValueError("Strict validation failed: " + " | ".join(errors))

    return data


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "pdf",
        nargs="?",
        default=str(Path("data") / SOURCE_PDF),
        help="Path to the source exam calendar PDF",
    )
    parser.add_argument(
        "output",
        nargs="?",
        default=str(Path("data") / "exam_calendar2025-2026.json"),
        help="Path to write JSON output",
    )
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    output_path = Path(args.output)

    data = extract_exam_calendar(pdf_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    metadata = data["metadata"]
    print(
        "Extracted "
        f"{metadata['eventCount']} exam events for "
        f"{metadata['classCount']} classes from "
        f"{metadata['pagesParsed']} pages."
    )
    print(f"Wrote {output_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        raise SystemExit(1)
