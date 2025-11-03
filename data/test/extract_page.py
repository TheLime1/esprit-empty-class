"""
Script to extract page 217 from a PDF file
"""
from PyPDF2 import PdfReader, PdfWriter


def extract_page(input_pdf_path: str, page_number: int, output_pdf_path: str):
    """
    Extract a specific page from a PDF file
    
    Args:
        input_pdf_path: Path to the input PDF file
        page_number: Page number to extract (1-indexed)
        output_pdf_path: Path to save the extracted page
    """
    # Create a PDF reader object
    reader = PdfReader(input_pdf_path)
    
    # Check if the page number is valid
    total_pages = len(reader.pages)
    if page_number < 1 or page_number > total_pages:
        raise ValueError(f"Invalid page number. PDF has {total_pages} pages.")
    
    # Create a PDF writer object
    writer = PdfWriter()
    
    # Add the specific page (convert to 0-indexed)
    writer.add_page(reader.pages[page_number - 1])
    
    # Write to output file
    with open(output_pdf_path, 'wb') as output_file:
        writer.write(output_file)
    
    print(f"Successfully extracted page {page_number} from {input_pdf_path}")
    print(f"Saved to: {output_pdf_path}")


if __name__ == "__main__":
    # Configuration
    INPUT_PDF = "last.pdf"
    PAGE_NUMBER = 217
    OUTPUT_PDF = "page_217.pdf"
    
    try:
        extract_page(INPUT_PDF, PAGE_NUMBER, OUTPUT_PDF)
    except Exception as e:
        print(f"Error: {e}")
