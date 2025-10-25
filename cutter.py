from PyPDF2 import PdfReader, PdfWriter

# Input and output file paths
input_file = "enligne.pdf"
output_file = "enligne1page.pdf"

# Read the input PDF
reader = PdfReader(input_file)
writer = PdfWriter()

# Take only the first 2 pages (if available)
for i in range(min(1, len(reader.pages))):
    writer.add_page(reader.pages[i])

# Write the new PDF
with open(output_file, "wb") as f:
    writer.write(f)

print(
    f"✅ New PDF saved as '{output_file}' with {min(2, len(reader.pages))} pages.")
