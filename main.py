import re
from collections import defaultdict
import PyPDF2


class ScheduleParser:
    def __init__(self):
        self.schedules = {}

    def load_pdf(self, pdf_path):
        """Load and extract text from PDF file"""
        print(f"Chargement du PDF: {pdf_path}")

        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            print(f"Nombre de pages: {total_pages}")

            all_text = ""
            for i, page in enumerate(pdf_reader.pages, 1):
                if i % 50 == 0:
                    print(f"Extraction en cours... {i}/{total_pages} pages")
                all_text += page.extract_text()

            print("Extraction terminée!")
            return all_text

    def parse_pdf_text(self, text):
        """Parse schedules from PDF text"""
        pages = text.split("Page")

        print(f"Analyse de {len(pages)} sections...")

        for page in pages:
            if not page.strip():
                continue

            # Extract class name
            class_match = re.search(r'Emploi du Temps\s+(\w+)', page)
            if not class_match:
                continue

            class_name = class_match.group(1).strip()

            # Initialize schedule
            self.schedules[class_name] = {
                'days': {},
                'metadata': {}
            }

            # Extract metadata
            year_match = re.search(
                r'Année\s+universitaire\s*:\s*(\d{4}/\d{4})', page)
            if year_match:
                self.schedules[class_name]['metadata']['year'] = year_match.group(
                    1)

            semester_match = re.search(r'Semestre\s+(\d+)', page)
            if semester_match:
                self.schedules[class_name]['metadata']['semester'] = semester_match.group(
                    1)

            period_match = re.search(
                r'Semestre\s+\d+\s*:\s*([\d/\w\s-]+)', page)
            if period_match:
                self.schedules[class_name]['metadata']['period'] = period_match.group(
                    1).strip()

            # Parse each day
            days = ['Lundi', 'Mardi', 'Mercredi',
                    'Jeudi', 'Vendredi', 'Samedi']

            for i, day in enumerate(days):
                day_pattern = rf'{day}\s+(\d{{2}}/\d{{2}}/\d{{4}})'
                day_match = re.search(day_pattern, page)

                if day_match:
                    date = day_match.group(1)
                    day_key = f"{day} {date}"
                    day_start = day_match.start()  # Include the day name

                    # Find next day boundary
                    next_day_idx = len(page)
                    for j, next_day in enumerate(days):
                        if next_day != day:
                            next_match = re.search(
                                rf'{next_day}\s+\d{{2}}/\d{{2}}/\d{{4}}', page[day_start+10:])
                            if next_match:
                                next_day_idx = day_start + 10 + next_match.start()
                                break

                    day_section = page[day_start:next_day_idx]
                    courses = self._parse_courses(day_section, page)
                    self.schedules[class_name]['days'][day_key] = courses

        print(f"Analyse terminée! {len(self.schedules)} classes trouvées.")
        return self.schedules

    def _parse_courses(self, day_section, full_page):
        """Extract courses from day section"""
        courses = []

        # Find all courses with standard room format: CourseName/Room/
        standard_pattern = r'([^/\n]+?)/\s*([A-Z]\d+)\s*/'
        standard_matches = list(re.finditer(standard_pattern, day_section))

        for match in standard_matches:
            course_name = match.group(1).strip()
            location = match.group(2).strip()

            # Clean course name: remove dates and years
            course_name = re.sub(r'\d{2}/\d{2}/\d{4}', '', course_name)
            course_name = re.sub(r'^\d{4}\s+', '', course_name)
            course_name = re.sub(r'\s+\d{4}\s+', ' ', course_name)
            course_name = re.sub(r'\s+', ' ', course_name).strip()

            if course_name.upper() == 'PAUSE' or not course_name:
                continue

            # Determine time
            text_before = day_section[:match.start()]
            extended_time_match = re.search(
                r'(\d{2}H:\d{2}\s*-\s*\d{2}H:\d{2})', text_before[-100:])

            if extended_time_match:
                matched_time = extended_time_match.group(1)
            else:
                text_after = day_section[match.end():match.end()+200]
                has_afternoon_time = re.search(
                    r'13H:\d{2}\s*-\s*16H:\d{2}', text_after)

                if has_afternoon_time or 'PAUSE' in text_after[:100]:
                    matched_time = "09H:00 - 12H:15"
                else:
                    matched_time = "09H:00 10H:30"

            if not any(c['course'] == course_name and c['room'] == location for c in courses):
                courses.append({
                    'time': matched_time,
                    'course': course_name,
                    'room': location
                })

        # Find online courses: CourseName/\nEn Ligne (no trailing slash)
        online_pattern = r'([^/\n]+?)/\s*\n\s*(En\s+Ligne)'
        online_matches = list(re.finditer(
            online_pattern, day_section, re.IGNORECASE))

        for match in online_matches:
            course_name = match.group(1).strip()
            location = 'En Ligne'

            # Clean course name
            course_name = re.sub(r'\d{2}/\d{2}/\d{4}', '', course_name)
            course_name = re.sub(r'^\d{4}\s+', '', course_name)
            course_name = re.sub(r'\s+\d{4}\s+', ' ', course_name)
            course_name = re.sub(r'\s+', ' ', course_name).strip()

            if course_name.upper() == 'PAUSE' or not course_name:
                continue

            # Determine time
            text_before = day_section[:match.start()]
            extended_time_match = re.search(
                r'(\d{2}H:\d{2}\s*-\s*\d{2}H:\d{2})', text_before[-100:])

            if extended_time_match:
                matched_time = extended_time_match.group(1)
            else:
                text_after = day_section[match.end():match.end()+200]
                has_afternoon_time = re.search(
                    r'13H:\d{2}\s*-\s*16H:\d{2}', text_after)

                if has_afternoon_time or 'PAUSE' in text_after[:100]:
                    matched_time = "09H:00 - 12H:15"
                else:
                    matched_time = "09H:00 10H:30"

            if not any(c['course'] == course_name and c['room'] == location for c in courses):
                courses.append({
                    'time': matched_time,
                    'course': course_name,
                    'room': location
                })

        return courses

    def display_schedule(self, class_name):
        """Display schedule for a class"""
        if class_name not in self.schedules:
            print(f"Classe {class_name} non trouvée!")
            print(f"Classes disponibles: {', '.join(self.schedules.keys())}")
            return

        schedule = self.schedules[class_name]
        metadata = schedule['metadata']

        print(f"\n{'='*90}")
        print(f"EMPLOI DU TEMPS - {class_name}")
        if 'year' in metadata:
            print(f"Année universitaire: {metadata['year']}", end="")
        if 'semester' in metadata:
            print(f" - Semestre {metadata['semester']}")
        if 'period' in metadata:
            print(f"Période: {metadata['period']}")
        print(f"{'='*90}\n")

        for day, courses in schedule['days'].items():
            print(f"{day}")
            print("-" * 90)

            if not courses:
                print("  Pas de cours")
            else:
                for course in courses:
                    room_info = f"[{course['room']}]" if course['room'] else ""
                    print(
                        f"  {course['time']:<25} {course['course']:<50} {room_info}")
            print()

    def display_all(self):
        """Display all schedules"""
        for class_name in sorted(self.schedules.keys()):
            self.display_schedule(class_name)

    def get_classes(self):
        """Get list of all classes"""
        return sorted(self.schedules.keys())

    def search_course(self, keyword):
        """Search for courses containing keyword"""
        results = {}
        for class_name, schedule in self.schedules.items():
            for day, courses in schedule['days'].items():
                for course in courses:
                    if keyword.lower() in course['course'].lower():
                        if class_name not in results:
                            results[class_name] = []
                        results[class_name].append({
                            'day': day,
                            'time': course['time'],
                            'course': course['course'],
                            'room': course['room']
                        })
        return results

    def save_to_file(self, output_file):
        """Save schedules to text file"""
        with open(output_file, 'w', encoding='utf-8') as f:
            for class_name in sorted(self.schedules.keys()):
                schedule = self.schedules[class_name]
                metadata = schedule['metadata']

                f.write(f"\n{'='*90}\n")
                f.write(f"EMPLOI DU TEMPS - {class_name}\n")
                if 'year' in metadata:
                    f.write(f"Année universitaire: {metadata['year']}")
                if 'semester' in metadata:
                    f.write(f" - Semestre {metadata['semester']}\n")
                if 'period' in metadata:
                    f.write(f"Période: {metadata['period']}\n")
                f.write(f"{'='*90}\n\n")

                for day, courses in schedule['days'].items():
                    f.write(f"{day}\n")
                    f.write("-" * 90 + "\n")

                    if not courses:
                        f.write("  Pas de cours\n")
                    else:
                        for course in courses:
                            room_info = f"[{course['room']}]" if course['room'] else ""
                            f.write(
                                f"  {course['time']:<25} {course['course']:<50} {room_info}\n")
                    f.write("\n")

        print(f"Emplois du temps sauvegardés dans: {output_file}")


def main():
    import sys

    # Get PDF file path
    if len(sys.argv) > 1:
        pdf_file = sys.argv[1]
    else:
        pdf_file = input("Entrez le chemin du fichier PDF: ")

    # Parse PDF
    parser = ScheduleParser()

    try:
        pdf_text = parser.load_pdf(pdf_file)
        parser.parse_pdf_text(pdf_text)

        # Display menu
        while True:
            print("\n" + "="*90)
            print("MENU")
            print("="*90)
            print("1. Afficher toutes les classes")
            print("2. Afficher l'emploi du temps d'une classe")
            print("3. Rechercher un cours")
            print("4. Sauvegarder dans un fichier")
            print("5. Quitter")

            choice = input("\nChoisissez une option: ")

            if choice == "1":
                print(
                    f"\nClasses disponibles ({len(parser.get_classes())} au total):")
                for i, class_name in enumerate(parser.get_classes(), 1):
                    print(f"  {i}. {class_name}")

            elif choice == "2":
                class_name = input("Entrez le nom de la classe: ").strip()
                parser.display_schedule(class_name)

            elif choice == "3":
                keyword = input("Entrez un mot-clé à rechercher: ")
                results = parser.search_course(keyword)

                if results:
                    print(f"\nRésultats pour '{keyword}':")
                    for class_name, occurrences in results.items():
                        print(f"\n{class_name}:")
                        for occ in occurrences:
                            print(f"  - {occ['day']}")
                            print(
                                f"    {occ['time']} | {occ['course']} | Salle {occ['room']}")
                else:
                    print(f"Aucun résultat trouvé pour '{keyword}'")

            elif choice == "4":
                output_file = input(
                    "Nom du fichier de sortie (ex: schedules.txt): ")
                parser.save_to_file(output_file)

            elif choice == "5":
                print("Au revoir!")
                break

            else:
                print("Option invalide!")

    except FileNotFoundError:
        print(f"Erreur: Le fichier '{pdf_file}' n'existe pas!")
    except Exception as e:
        print(f"Erreur: {e}")


if __name__ == "__main__":
    main()
