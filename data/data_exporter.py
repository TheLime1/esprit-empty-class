import re
import json
import PyPDF2
import sys


class ScheduleToJSON:
    def __init__(self):
        self.schedules = {}
        self.class_rooms = {}  # Track primary room for each class

    def load_pdf(self, pdf_path):
        """Load and extract text from PDF file"""
        print(f"Loading PDF: {pdf_path}")

        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            print(f"Total pages: {total_pages}")

            all_text = ""
            for i, page in enumerate(pdf_reader.pages, 1):
                if i % 50 == 0:
                    print(f"Extracting... {i}/{total_pages} pages")
                all_text += page.extract_text()

            print("Extraction completed!")
            return all_text

    def parse_pdf_text(self, text):
        """Parse schedules from PDF text"""
        pages = text.split("Page")

        print(f"Analyzing {len(pages)} sections...")

        for page in pages:
            if not page.strip():
                continue

            # Extract class name (handles names with spaces like "4 ARCTIC9" and "4 ERP-BI1")
            class_match = re.search(
                r'Emploi du Temps\s+(.+?)(?:\n|Page|\Z)', page)
            if not class_match:
                continue

            # Remove spaces from class name (e.g., "4 ARCTIC9" -> "4ARCTIC9", "4 ERP-BI1" -> "4ERP-BI1")
            class_name = class_match.group(1).strip().replace(' ', '')

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

            for day in days:
                day_pattern = rf'{day}\s+(\d{{2}}/\d{{2}}/\d{{4}})'
                day_match = re.search(day_pattern, page)

                if day_match:
                    date = day_match.group(1)
                    day_key = f"{day} {date}"
                    day_start = day_match.start()

                    # Find next day boundary
                    next_day_idx = len(page)
                    for next_day in days:
                        if next_day != day:
                            next_match = re.search(
                                rf'{next_day}\s+\d{{2}}/\d{{2}}/\d{{4}}', page[day_start+10:])
                            if next_match:
                                next_day_idx = day_start + 10 + next_match.start()
                                break

                    day_section = page[day_start:next_day_idx]
                    courses = self._parse_courses(day_section, class_name)

                    # Add FREE slots for gaps in schedule
                    courses_with_free = self._add_free_slots(
                        courses, class_name)

                    # Fill in missing morning/afternoon slots as FREE
                    courses_complete = self._fill_empty_time_slots(
                        courses_with_free, class_name)

                    self.schedules[class_name]['days'][day_key] = courses_complete

        print(f"Analysis completed! {len(self.schedules)} classes found.")
        return self.schedules

    def _parse_courses(self, day_section, class_name):
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
            # Remove year at the beginning (e.g., "2025 Course Name" -> "Course Name")
            course_name = re.sub(r'^\d{4}\s+', '', course_name)
            # Remove year in the middle (e.g., "Course 2025 Name" -> "Course Name")
            course_name = re.sub(r'\s+\d{4}\s+', ' ', course_name)
            # Remove year at the end (e.g., "Course Name 2025" -> "Course Name")
            course_name = re.sub(r'\s+\d{4}$', '', course_name)
            # Normalize whitespace
            course_name = re.sub(r'\s+', ' ', course_name).strip()

            if course_name.upper() == 'PAUSE' or not course_name:
                continue

            # Track the most common room for this class
            if class_name not in self.class_rooms:
                self.class_rooms[class_name] = {}
            if location not in self.class_rooms[class_name]:
                self.class_rooms[class_name][location] = 0
            self.class_rooms[class_name][location] += 1

            # Determine time for this course
            # In the PDF:
            # - Morning courses (09H:00-12H:15) don't have explicit times in cells (times are in header)
            # - Afternoon courses have explicit times above the course name (e.g., "13H:30 - 16H:45")
            text_before = day_section[:match.start()]

            # Look for explicit time range with dash (afternoon/special courses have this)
            # Search in reasonable context before the course
            context = text_before[-200:] if len(
                text_before) > 200 else text_before
            time_range_pattern = r'(\d{2}H:\d{2})\s*-\s*(\d{2}H:\d{2})'
            time_match = re.search(time_range_pattern, context)

            if time_match:
                # Found explicit time range (e.g., "13H:30 - 16H:45" or "13H:45 - 17H:00")
                start_time = time_match.group(1)
                end_time = time_match.group(2)
                matched_time = f"{start_time}-{end_time}"
            else:
                # No explicit time found - this is a morning course
                # Morning courses span the morning blocks: 09H:00-12H:15
                matched_time = "09H:00-12H:15"

            # Add course
            courses.append({
                'time': matched_time,
                'course': course_name,
                'room': location
            })

        # Find online courses: CourseName/\nEn Ligne
        online_pattern = r'([^/\n]+?)/\s*\n\s*(En\s+Ligne)'
        online_matches = list(re.finditer(
            online_pattern, day_section, re.IGNORECASE))

        for match in online_matches:
            course_name = match.group(1).strip()
            location = 'En Ligne'

            # Clean course name
            course_name = re.sub(r'\d{2}/\d{2}/\d{4}', '', course_name)
            # Remove year at the beginning (e.g., "2025 Course Name" -> "Course Name")
            course_name = re.sub(r'^\d{4}\s+', '', course_name)
            # Remove year in the middle (e.g., "Course 2025 Name" -> "Course Name")
            course_name = re.sub(r'\s+\d{4}\s+', ' ', course_name)
            # Remove year at the end (e.g., "Course Name 2025" -> "Course Name")
            course_name = re.sub(r'\s+\d{4}$', '', course_name)
            # Normalize whitespace
            course_name = re.sub(r'\s+', ' ', course_name).strip()

            if course_name.upper() == 'PAUSE' or not course_name:
                continue

            # Determine time for this course
            # In the PDF:
            # - Morning courses (09H:00-12H:15) don't have explicit times in cells (times are in header)
            # - Afternoon courses have explicit times above the course name (e.g., "13H:30 - 16H:45")
            text_before = day_section[:match.start()]

            # Look for explicit time range with dash (afternoon/special courses have this)
            # Search in reasonable context before the course
            context = text_before[-200:] if len(
                text_before) > 200 else text_before
            time_range_pattern = r'(\d{2}H:\d{2})\s*-\s*(\d{2}H:\d{2})'
            time_match = re.search(time_range_pattern, context)

            if time_match:
                # Found explicit time range (e.g., "13H:30 - 16H:45" or "13H:45 - 17H:00")
                start_time = time_match.group(1)
                end_time = time_match.group(2)
                matched_time = f"{start_time}-{end_time}"
            else:
                # No explicit time found - this is a morning course
                # Morning courses span the morning blocks: 09H:00-12H:15
                matched_time = "09H:00-12H:15"

            # Add course
            courses.append({
                'time': matched_time,
                'course': course_name,
                'room': location
            })

        return courses

    def _add_free_slots(self, courses, class_name):
        """Add FREE slots for gaps in the schedule"""
        if not courses:
            return courses

        TIME_PATTERN = r'(\d{2}H:\d{2})'

        # Get the primary room for this class
        primary_room = self._get_primary_room(class_name)

        # Sort courses by start time
        courses_sorted = sorted(courses, key=lambda c: self._time_to_minutes(
            re.findall(TIME_PATTERN, c['time'])[0]))

        # Insert FREE slots only for gaps between courses
        # Don't add FREE before 09H:00 or after 16H:45 (end of last class slot)
        result = []
        last_end_time = None

        for course in courses_sorted:
            time_parts = re.findall(TIME_PATTERN, course['time'])
            if len(time_parts) >= 2:
                start_time = time_parts[0]
                end_time = time_parts[1]

                # Only add FREE slot if there's a gap and we're within schedule hours
                if last_end_time and self._time_to_minutes(start_time) > self._time_to_minutes(last_end_time):
                    # Check if this gap is the lunch break (PAUSE period: ~12H:15 to ~13H:30)
                    gap_start = self._time_to_minutes(last_end_time)
                    gap_end = self._time_to_minutes(start_time)

                    # Standard lunch break is from 12H:15 to 13H:30 (735 to 810 minutes)
                    # Don't add FREE slot if the gap overlaps with lunch break
                    is_lunch_break = (gap_start >= 720 and gap_start <= 750) and (
                        gap_end >= 800 and gap_end <= 820)

                    if not is_lunch_break:
                        # Add FREE slot for the gap (not lunch break)
                        result.append({
                            'time': f"{last_end_time} - {start_time}",
                            'course': 'FREE',
                            'room': primary_room
                        })

                result.append(course)
                last_end_time = end_time

        return result

    def _fill_empty_time_slots(self, courses, class_name):
        """Fill in FREE slots for missing morning or afternoon sessions"""
        if not courses:
            # Completely empty day - add both morning and afternoon as FREE
            primary_room = self._get_primary_room(class_name)
            return [
                {
                    'time': '09H:00-12H:15',
                    'course': 'FREE',
                    'room': primary_room
                },
                {
                    'time': '13H:30-16H:45',
                    'course': 'FREE',
                    'room': primary_room
                }
            ]

        TIME_PATTERN = r'(\d{2}H:\d{2})'
        primary_room = self._get_primary_room(class_name)

        # Check what time slots are covered
        has_morning = False
        has_afternoon = False

        for course in courses:
            time_parts = re.findall(TIME_PATTERN, course['time'])
            if len(time_parts) >= 2:
                start_minutes = self._time_to_minutes(time_parts[0])
                end_minutes = self._time_to_minutes(time_parts[1])

                # Morning session is roughly 09H:00 to 12H:15 (540 to 735 minutes)
                if start_minutes < 750:  # Starts before 12H:30
                    has_morning = True

                # Afternoon session is roughly 13H:30 to 17H:00 (810 to 1020 minutes)
                if end_minutes > 800:  # Ends after 13H:20
                    has_afternoon = True

        # Add missing sessions as FREE
        result = list(courses)

        if not has_morning:
            # Add morning FREE slot at the beginning
            result.insert(0, {
                'time': '09H:00-12H:15',
                'course': 'FREE',
                'room': primary_room
            })

        if not has_afternoon:
            # Add afternoon FREE slot at the end
            result.append({
                'time': '13H:30-16H:45',
                'course': 'FREE',
                'room': primary_room
            })

        return result

    def _get_primary_room(self, class_name):
        """Get the most common room for a class"""
        if class_name not in self.class_rooms or not self.class_rooms[class_name]:
            return "Unknown"

        # Filter out online rooms
        physical_rooms = {room: count for room, count in self.class_rooms[class_name].items()
                          if room != "En Ligne"}

        if not physical_rooms:
            # If all rooms are online, check if there's at least one physical room mentioned
            return list(self.class_rooms[class_name].keys())[0]

        # Return the most frequently used physical room
        return max(physical_rooms.items(), key=lambda x: x[1])[0]

    def _time_to_minutes(self, time_str):
        """Convert time string like '09H:00' to minutes since midnight"""
        parts = time_str.split('H:')
        if len(parts) == 2:
            hours = int(parts[0])
            minutes = int(parts[1])
            return hours * 60 + minutes
        return 0

    def _review_free_slots(self):
        """Review FREE slots to check if rooms are actually occupied by other classes"""
        print("\nReviewing FREE slots...")

        # Build a mapping of room -> day -> time -> list of classes using it
        room_occupancy = {}

        # First pass: collect all actual course schedules (not FREE)
        for class_name, class_data in self.schedules.items():
            for day_key, courses in class_data['days'].items():
                for course in courses:
                    if course['course'] != 'FREE':
                        room = course['room']
                        time = course['time']

                        if room not in room_occupancy:
                            room_occupancy[room] = {}
                        if day_key not in room_occupancy[room]:
                            room_occupancy[room][day_key] = {}
                        if time not in room_occupancy[room][day_key]:
                            room_occupancy[room][day_key][time] = []

                        room_occupancy[room][day_key][time].append(class_name)

        # Second pass: check FREE slots against room occupancy
        changes_made = 0
        for class_name, class_data in self.schedules.items():
            for day_key, courses in class_data['days'].items():
                for course in courses:
                    if course['course'] == 'FREE':
                        room = course['room']
                        time = course['time']

                        # Check if this room is occupied at this time
                        if self._is_room_occupied(room, day_key, time, room_occupancy):
                            course['course'] = 'NOT-FREE'
                            changes_made += 1

        print(
            f"✓ Review completed: {changes_made} FREE slots changed to NOT-FREE")
        return changes_made

    def _is_room_occupied(self, room, day_key, free_time, room_occupancy):
        """Check if a room is occupied during a FREE time slot"""
        if room not in room_occupancy:
            return False
        if day_key not in room_occupancy[room]:
            return False

        TIME_PATTERN = r'(\d{2}H:\d{2})'
        free_time_parts = re.findall(TIME_PATTERN, free_time)
        if len(free_time_parts) < 2:
            return False

        free_start = self._time_to_minutes(free_time_parts[0])
        free_end = self._time_to_minutes(free_time_parts[1])

        # Check all scheduled times in this room on this day
        for scheduled_time, classes in room_occupancy[room][day_key].items():
            scheduled_parts = re.findall(TIME_PATTERN, scheduled_time)
            if len(scheduled_parts) < 2:
                continue

            scheduled_start = self._time_to_minutes(scheduled_parts[0])
            scheduled_end = self._time_to_minutes(scheduled_parts[1])

            # Check if there's any overlap
            if self._times_overlap(free_start, free_end, scheduled_start, scheduled_end):
                return True

        return False

    def _times_overlap(self, start1, end1, start2, end2):
        """Check if two time ranges overlap"""
        # Two ranges overlap if one starts before the other ends
        return start1 < end2 and start2 < end1

    def export_to_json(self, output_file):
        """Export schedules to JSON file"""
        # Add primary room to metadata
        for class_name in self.schedules:
            self.schedules[class_name]['metadata']['primary_room'] = self._get_primary_room(
                class_name)

        # Review FREE slots to ensure accuracy
        self._review_free_slots()

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(self.schedules, f, ensure_ascii=False, indent=2)

        print(f"\n✓ Schedules exported to: {output_file}")
        print(f"✓ Total classes exported: {len(self.schedules)}")


def main():
    # Get PDF file path
    if len(sys.argv) > 1:
        pdf_file = sys.argv[1]
    else:
        pdf_file = input("Enter PDF file path: ")

    # Get output JSON file path
    if len(sys.argv) > 2:
        json_file = sys.argv[2]
    else:
        json_file = input(
            "Enter output JSON file name (default: schedules.json): ").strip()
        if not json_file:
            json_file = "schedules.json"

    # Parse and export
    parser = ScheduleToJSON()

    try:
        pdf_text = parser.load_pdf(pdf_file)
        parser.parse_pdf_text(pdf_text)
        parser.export_to_json(json_file)

        print("\n✓ Process completed successfully!")

    except FileNotFoundError:
        print(f"Error: File '{pdf_file}' not found!")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
