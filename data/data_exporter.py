"""PDF Schedule Parser - Converts ESPRIT schedule PDFs to JSON format."""

import re
import json
import sys
import PyPDF2


class ScheduleToJSON:
    """Parse and convert PDF schedules to structured JSON format."""

    def __init__(self):
        """Initialize the parser."""
        self.schedules = {}
        self.class_rooms = {}  # Track primary room for each class

    def load_pdf(self, pdf_path):
        """Load and extract text from PDF file.

        Args:
            pdf_path: Path to the PDF file

        Returns:
            str: Extracted text from all pages
        """
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
        """Parse schedules from PDF text.

        Args:
            text: Raw text extracted from PDF

        Returns:
            dict: Parsed schedules organized by class
        """
        pages = text.split("Page")

        print(f"Analyzing {len(pages)} sections...")

        for page in pages:
            if not page.strip():
                continue

            # Extract class name (appears near "Emploi du Temps")
            class_match = re.search(
                r'Emploi du Temps\s+(\S+)',
                page,
                re.IGNORECASE
            )
            if not class_match:
                continue

            class_name = class_match.group(1).strip()

            # Remove "Année" suffix if present
            if class_name.endswith('Année'):
                class_name = class_name[:-5]  # Remove last 5 characters

            # Initialize schedule
            self.schedules[class_name] = {
                'days': {},
                'metadata': {}
            }

            # Extract metadata
            year_match = re.search(
                r'Année\s+[Uu]niversitaire\s*:\s*(\d{4}/\d{4})',
                page
            )
            if year_match:
                self.schedules[class_name]['metadata']['year'] = (
                    year_match.group(1)
                )

            # Extract date range
            date_range_match = re.search(
                r'(\d{2}/\d{2}/\d{4})\s*-\s*(\d{2}/\d{2}/\d{4})',
                page
            )
            if date_range_match:
                period = (
                    f"{date_range_match.group(1)} - "
                    f"{date_range_match.group(2)}"
                )
                self.schedules[class_name]['metadata']['period'] = period

            # Parse the table structure
            days_info = []
            day_names = [
                'Lundi', 'Mardi', 'Mercredi',
                'Jeudi', 'Vendredi', 'Samedi'
            ]

            for day_name in day_names:
                # Match day name followed by date (DD/MM format)
                day_pattern = rf'{day_name}\s+(\d{{2}}/\d{{2}})'
                day_match = re.search(day_pattern, page)

                if day_match:
                    date_short = day_match.group(1)
                    # Try to get the full year from the date range
                    year = "2025"  # Default
                    if date_range_match:
                        year = date_range_match.group(1).split('/')[-1]

                    full_date = f"{date_short}/{year}"
                    days_info.append({
                        'name': day_name,
                        'date': full_date,
                        'key': f"{day_name} {full_date}"
                    })

            # For each day, extract courses
            for day_info in days_info:
                courses = self._parse_courses_new_format(
                    page,
                    day_info['name'],
                    class_name
                )

                if courses:
                    # Fill in missing time slots as FREE
                    courses_complete = self._fill_empty_time_slots(
                        courses,
                        class_name
                    )
                    self.schedules[class_name]['days'][day_info['key']] = (
                        courses_complete
                    )

        print(f"Analysis completed! {len(self.schedules)} classes found.")
        return self.schedules

    def _parse_courses_new_format(self, page, day_name, class_name):
        """Extract courses for a specific day from the table format.

        Args:
            page: Text content of the page
            day_name: Name of the day (e.g., 'Lundi')
            class_name: Name of the class

        Returns:
            list: List of course dictionaries
        """
        courses = []

        # Find the day header position
        day_pattern = rf'{day_name}\s+\d{{2}}/\d{{2}}'
        day_match = re.search(day_pattern, page)
        if not day_match:
            return courses

        day_start = day_match.start()

        # Find the next day or end of schedule
        next_day_pos = len(page)
        other_days = [
            'Lundi', 'Mardi', 'Mercredi',
            'Jeudi', 'Vendredi', 'Samedi'
        ]
        for other_day in other_days:
            if other_day != day_name:
                next_match = re.search(
                    rf'{other_day}\s+\d{{2}}/\d{{2}}',
                    page[day_start + 20:]
                )
                if next_match:
                    candidate_pos = day_start + 20 + next_match.start()
                    next_day_pos = min(next_day_pos, candidate_pos)

        day_section = page[day_start:next_day_pos]

        # Split by lines
        lines = day_section.split('\n')

        i = 0
        while i < len(lines):
            line = lines[i].strip()

            # Skip empty lines and day headers
            if (not line or line.startswith(day_name) or
                    re.match(r'^\d{2}/\d{2}$', line)):
                i += 1
                continue

            # Look for time patterns (HH:MM - HH:MM)
            if re.search(r'\d{2}:\d{2}\s*-\s*\d{2}:\d{2}', line):
                time_match = re.search(
                    r'(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})',
                    line
                )
                if time_match:
                    start_time = time_match.group(1).replace(':', 'H:')
                    end_time = time_match.group(2).replace(':', 'H:')
                    time_str = f"{start_time}-{end_time}"

                    # Look backwards for room and course name
                    room = None
                    course_lines = []

                    # Check previous lines (up to 5 for multi-line names)
                    for j in range(max(0, i - 5), i):
                        prev_line = lines[j].strip()

                        if not prev_line:
                            continue

                        # Room pattern: letter followed by digits
                        if re.match(r'^[A-Z]\d+$', prev_line):
                            room = prev_line
                        # Online class pattern (case-insensitive)
                        elif re.match(r'^En\s+ligne$', prev_line,
                                      re.IGNORECASE):
                            room = 'En Ligne'
                        # Course name parts: text lines
                        elif (not re.match(r'^[A-Z]\d+$', prev_line) and
                              not re.match(r'^\d+$', prev_line)):
                            # Skip if has time pattern
                            if not re.search(
                                r'\d{2}:\d{2}\s*-\s*\d{2}:\d{2}',
                                prev_line
                            ):
                                course_lines.append(prev_line)

                    if room and course_lines:
                        # Combine course name lines (reverse for order)
                        course_lines.reverse()
                        course_name = ' '.join(course_lines)

                        # Clean course name
                        course_name = re.sub(r'\d{4}', '', course_name)
                        course_name = re.sub(r'\s+', ' ', course_name)
                        course_name = course_name.strip()

                        if course_name:
                            # Track room usage
                            if class_name not in self.class_rooms:
                                self.class_rooms[class_name] = {}
                            if room not in self.class_rooms[class_name]:
                                self.class_rooms[class_name][room] = 0
                            self.class_rooms[class_name][room] += 1

                            courses.append({
                                'time': time_str,
                                'course': course_name,
                                'room': room
                            })

            i += 1

        return courses

    def _fill_empty_time_slots(self, courses, class_name):
        """Fill in FREE slots for missing morning or afternoon sessions.

        Args:
            courses: List of existing courses
            class_name: Name of the class

        Returns:
            list: Complete list of courses with FREE slots added
        """
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

        time_pattern = r'(\d{2}H:\d{2})'
        primary_room = self._get_primary_room(class_name)

        # Check what time slots are covered
        has_morning = False
        has_afternoon = False

        for course in courses:
            time_parts = re.findall(time_pattern, course['time'])
            if len(time_parts) >= 2:
                start_minutes = self._time_to_minutes(time_parts[0])
                end_minutes = self._time_to_minutes(time_parts[1])

                # Morning session: 09H:00 to 12H:15 (540 to 735 minutes)
                if start_minutes < 750:  # Starts before 12H:30
                    has_morning = True

                # Afternoon session: 13H:30 to 17H:00 (810 to 1020 minutes)
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
        """Get the most common room for a class.

        Args:
            class_name: Name of the class

        Returns:
            str: Most frequently used room
        """
        if (class_name not in self.class_rooms or
                not self.class_rooms[class_name]):
            return "Unknown"

        # Filter out online rooms
        physical_rooms = {
            room: count
            for room, count in self.class_rooms[class_name].items()
            if room != "En Ligne"
        }

        if not physical_rooms:
            # If all rooms are online, return online
            return list(self.class_rooms[class_name].keys())[0]

        # Return the most frequently used physical room
        return max(physical_rooms.items(), key=lambda x: x[1])[0]

    def _time_to_minutes(self, time_str):
        """Convert time string like '09H:00' to minutes since midnight.

        Args:
            time_str: Time string in format 'HHH:MM'

        Returns:
            int: Minutes since midnight
        """
        parts = time_str.split('H:')
        if len(parts) == 2:
            hours = int(parts[0])
            minutes = int(parts[1])
            return hours * 60 + minutes
        return 0

    def _review_free_slots(self):
        """Review FREE slots to check if rooms are occupied by other classes.

        Returns:
            int: Number of changes made
        """
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

                        room_occupancy[room][day_key][time].append(
                            class_name
                        )

        # Second pass: check FREE slots against room occupancy
        changes_made = 0
        warning_made = 0
        for class_name, class_data in self.schedules.items():
            for day_key, courses in class_data['days'].items():
                for course in courses:
                    if course['course'] == 'FREE':
                        room = course['room']
                        time = course['time']

                        # Check if this room is occupied at this time
                        is_occupied = self._is_room_occupied(
                            room,
                            day_key,
                            time,
                            room_occupancy
                        )
                        if is_occupied:
                            course['course'] = 'NOT-FREE'
                            changes_made += 1
                        # Check if this is a FREEWARNING slot
                        elif self._is_free_warning(room, day_key, time):
                            course['course'] = 'FREEWARNING'
                            warning_made += 1

        print(
            f"✓ Review completed: {changes_made} FREE slots changed to "
            f"NOT-FREE, {warning_made} to FREEWARNING"
        )
        return changes_made

    def _is_room_occupied(self, room, day_key, free_time, room_occupancy):
        """Check if a room is occupied during a FREE time slot.

        Args:
            room: Room identifier
            day_key: Day key string
            free_time: Time range of the FREE slot
            room_occupancy: Dictionary of room occupancy data

        Returns:
            bool: True if room is occupied
        """
        if room not in room_occupancy:
            return False
        if day_key not in room_occupancy[room]:
            return False

        time_pattern = r'(\d{2}H:\d{2})'
        free_time_parts = re.findall(time_pattern, free_time)
        if len(free_time_parts) < 2:
            return False

        free_start = self._time_to_minutes(free_time_parts[0])
        free_end = self._time_to_minutes(free_time_parts[1])

        # Check all scheduled times in this room on this day
        for scheduled_time in room_occupancy[room][day_key].keys():
            scheduled_parts = re.findall(time_pattern, scheduled_time)
            if len(scheduled_parts) < 2:
                continue

            scheduled_start = self._time_to_minutes(scheduled_parts[0])
            scheduled_end = self._time_to_minutes(scheduled_parts[1])

            # Check if there's any overlap
            if self._times_overlap(
                free_start,
                free_end,
                scheduled_start,
                scheduled_end
            ):
                return True

        return False

    def _times_overlap(self, start1, end1, start2, end2):
        """Check if two time ranges overlap.

        Args:
            start1: Start time of first range (minutes)
            end1: End time of first range (minutes)
            start2: Start time of second range (minutes)
            end2: End time of second range (minutes)

        Returns:
            bool: True if ranges overlap
        """
        return start1 < end2 and start2 < end1

    def _is_free_warning(self, room, day_key, time):
        """Check if a FREE slot should be marked as FREEWARNING.

        Rules:
        1. All A1X rooms (1st floor) are FREEWARNING
        2. All C0X rooms on Wednesday 13:30-16:45 are FREEWARNING

        Args:
            room: Room identifier
            day_key: Day key string
            time: Time range string

        Returns:
            bool: True if should be marked as FREEWARNING
        """
        time_pattern = r'(\d{2}H:\d{2})'

        # Check if room is A1X (first floor)
        if room.startswith('A1'):
            return True

        # Check if room is C0X on Wednesday afternoon
        if room.startswith('C0'):
            day_name = day_key.split(' ')[0]

            if day_name == 'Mercredi':
                time_parts = re.findall(time_pattern, time)
                if len(time_parts) >= 2:
                    start_minutes = self._time_to_minutes(time_parts[0])
                    end_minutes = self._time_to_minutes(time_parts[1])

                    # Check if it overlaps with 13:30-16:45
                    soutenance_start = 13 * 60 + 30
                    soutenance_end = 16 * 60 + 45

                    if self._times_overlap(
                        start_minutes,
                        end_minutes,
                        soutenance_start,
                        soutenance_end
                    ):
                        return True

        return False

    def export_to_json(self, output_file):
        """Export schedules to JSON file.

        Args:
            output_file: Path to output JSON file
        """
        # Add primary room to metadata
        for class_name in self.schedules:
            primary_room = self._get_primary_room(class_name)
            self.schedules[class_name]['metadata']['primary_room'] = (
                primary_room
            )

        # Review FREE slots to ensure accuracy
        self._review_free_slots()

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(self.schedules, f, ensure_ascii=False, indent=2)

        print(f"\n✓ Schedules exported to: {output_file}")
        print(f"✓ Total classes exported: {len(self.schedules)}")


def main():
    """Main entry point for the script."""
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
            "Enter output JSON file name (default: schedules.json): "
        ).strip()
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
