"""
Interactive script to extract one or more pages from a PDF file.

Prompts the user for:
 - input PDF path (default: last.pdf)
 - pages to extract (e.g. 1,3,5-7)
 - output PDF path (default: page_217.pdf)

Supports comma-separated pages and simple ranges using a dash.
"""
from typing import List
from PyPDF2 import PdfReader, PdfWriter


def _parse_part(part: str, total_pages: int) -> List[int]:
    """Parse a single token which may be a number or a range like '5-7'.

    Returns a list of page numbers (1-indexed).
    """
    part = part.strip()
    if not part:
        return []
    if '-' in part:
        try:
            start_s, end_s = part.split('-', 1)
            start = int(start_s)
            end = int(end_s)
        except Exception as exc:
            raise ValueError(f"Invalid range: '{part}'") from exc
        if start > end:
            raise ValueError(f"Invalid range (start > end): '{part}'")
        if start < 1 or end > total_pages:
            raise ValueError(
                f"Range {start}-{end} out of bounds (1-{total_pages})")
        return list(range(start, end + 1))
    else:
        try:
            n = int(part)
        except Exception as exc:
            raise ValueError(f"Invalid page number: '{part}'") from exc
        if n < 1 or n > total_pages:
            raise ValueError(f"Page {n} out of bounds (1-{total_pages})")
        return [n]


def parse_pages_spec(spec: str, total_pages: int) -> List[int]:
    """Parse a pages specification like '1,3,5-7' into a sorted list of unique 1-indexed pages.

    Args:
        spec: string provided by the user
        total_pages: total pages in the PDF (for validation)

    Returns:
        sorted list of unique page numbers (1-indexed)

    Raises:
        ValueError: if the spec contains invalid numbers or ranges out of bounds
    """
    if not spec:
        raise ValueError("No pages specified")

    # use a small helper to keep cognitive complexity low
    def _parse_part_local(part: str) -> List[int]:
        return _parse_part(part, total_pages)

    page_nums = set()
    for token in (x.strip() for x in spec.split(',')):
        if not token:
            continue
        for n in _parse_part_local(token):
            page_nums.add(n)

    return sorted(page_nums)


def extract_pages(input_pdf_path: str, page_list: List[int], output_pdf_path: str):
    """Extract multiple pages from a PDF and write them to a new PDF.

    Args:
        input_pdf_path: path to input PDF
        page_list: list of 1-indexed page numbers to extract
        output_pdf_path: path to write the new PDF
    """
    pdf_reader = PdfReader(input_pdf_path)
    total_pages = len(pdf_reader.pages)
    if not page_list:
        raise ValueError("No pages to extract")

    # Validate pages again just in case
    for p in page_list:
        if p < 1 or p > total_pages:
            raise ValueError(f"Page {p} out of bounds (1-{total_pages})")

    writer = PdfWriter()
    for p in page_list:
        writer.add_page(pdf_reader.pages[p - 1])

    with open(output_pdf_path, 'wb') as out_f:
        writer.write(out_f)

    print(
        f"Successfully extracted {len(page_list)} page(s) from '{input_pdf_path}'")
    print(f"Pages: {', '.join(map(str, page_list))}")
    print(f"Saved to: {output_pdf_path}")


if __name__ == "__main__":
    # sensible defaults
    DEFAULT_INPUT = "last.pdf"
    DEFAULT_OUTPUT = "page_217.pdf"
    DEFAULT_PAGE = "217"

    try:
        input_path = input(
            f"Input PDF path [{DEFAULT_INPUT}]: ").strip() or DEFAULT_INPUT
        # open to get total pages for validation
        reader = PdfReader(input_path)
        total = len(reader.pages)
    except FileNotFoundError:
        print(f"File not found: {input_path}")
        raise
    except Exception as e:
        print(f"Unable to read PDF '{input_path}': {e}")
        raise

    pages_spec = input(
        f"Pages to extract (e.g. 1,3,5-7) [{DEFAULT_PAGE}]: ").strip() or DEFAULT_PAGE
    try:
        pages = parse_pages_spec(pages_spec, total)
    except ValueError as ve:
        print(f"Invalid pages spec: {ve}")
        raise

    output_path = input(
        f"Output PDF path [{DEFAULT_OUTPUT}]: ").strip() or DEFAULT_OUTPUT

    try:
        extract_pages(input_path, pages, output_path)
    except Exception as e:
        print(f"Error extracting pages: {e}")
        raise
