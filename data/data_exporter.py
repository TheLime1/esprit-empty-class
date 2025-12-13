"""PDF Schedule Parser - Converts ESPRIT schedule PDFs to JSON format."""

import re
import json
import sys
import PyPDF2
import pdfplumber


class ScheduleToJSON:
    """Parse and convert PDF schedules to structured JSON format."""

    # Constants
    DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    TIME_PATTERN = r'(\d{2}H:\d{2})'
    ROOM_PATTERN = r'^[A-Z]\d+$'
    ONLINE_PATTERN = r'^En\s+ligne$'

    # Standard time slots
    MORNING_SLOT = '09H:00-12H:15'
    AFTERNOON_SLOT = '13H:30-16H:45'
    MORNING_START = 540   # 09:00 in minutes
    MORNING_END = 750     # 12:30 in minutes
    AFTERNOON_START = 810  # 13:30 in minutes
    AFTERNOON_END = 1005   # 16:45 in minutes

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

    def parse_pdf_spatial(self, pdf_path):
        """Parse schedules from PDF using spatial positioning.

        Uses pdfplumber to extract words with their x,y positions,
        allowing correct mapping of courses to days even when some
        days are completely empty.

        Args:
            pdf_path: Path to the PDF file

        Returns:
            dict: Parsed schedules organized by class
        """
        print(f"Parsing PDF with spatial awareness: {pdf_path}")

        skipped_pages = []
        duplicate_classes = {}

        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            print(f"Total pages in PDF: {total_pages}")

            for page_num, page in enumerate(pdf.pages):
                words = page.extract_words()

                if not words:
                    skipped_pages.append(page_num + 1)
                    print(f"  ⚠ Page {page_num + 1} skipped - no words found")
                    continue

                # Extract class name from words
                class_name = self._extract_class_name_from_words(
                    words, page_num + 1)
                if not class_name:
                    skipped_pages.append(page_num + 1)
                    # Debug: print first few words to see what's on this page
                    if len(words) > 0:
                        first_words = ' '.join([w['text'] for w in words[:20]])
                        print(
                            f"  ⚠ Page {page_num + 1} skipped - no class name found. First words: {first_words[:100]}...")
                    continue

                # Extract day columns (x-coordinates for each day)
                day_columns = self._extract_day_columns(words)
                if not day_columns:
                    skipped_pages.append(page_num + 1)
                    print(
                        f"  ⚠ Page {page_num + 1} skipped - no day columns found (class: {class_name})")
                    continue

                # Check for duplicate class names
                if class_name in self.schedules:
                    if class_name not in duplicate_classes:
                        duplicate_classes[class_name] = []
                    duplicate_classes[class_name].append(page_num + 1)
                    print(
                        f"  ⚠ Page {page_num + 1} - DUPLICATE class name '{class_name}' (will overwrite previous)")

                # Extract metadata
                metadata = self._extract_metadata_from_words(words)

                # Initialize schedule
                self.schedules[class_name] = {
                    'days': {},
                    'metadata': metadata
                }

                # Extract courses with their positions
                courses = self._extract_courses_with_positions(
                    words, day_columns)

                # Assign courses to days based on x-position
                self._assign_courses_by_position(
                    class_name, courses, day_columns)

        classes_found = len(self.schedules)
        print(
            f"\nAnalysis completed! {classes_found} classes found from {total_pages} pages.")
        if classes_found < total_pages:
            missing_count = total_pages - classes_found
            print(f"  ⚠ Warning: {missing_count} pages missing")
            if skipped_pages:
                print(f"  📄 Skipped page numbers: {skipped_pages}")
            if duplicate_classes:
                print(f"  🔄 Duplicate class names found (pages overwritten):")
                for cls, pages in duplicate_classes.items():
                    print(f"     - '{cls}' appears on pages: {pages}")
        return self.schedules

    def _extract_class_name_from_words(self, words, page_num=0):
        """Extract class name from words list."""
        # Look for pattern like "4SAE11" or "4ARCTIC9" near "Emploi du Temps"
        candidates = []

        for i, w in enumerate(words):
            text = w['text'].strip()
            # Class names patterns (allow accented characters like é, à, è, ô):
            # - \d[\w-]+\d+ : like 4SAE11, 3IA2, 4ERP-BI1, 4GamiX1, 4MécaT1
            # - \d[\w-]+ : like 3A1, 4A (ending with just letters)
            # - [\w]+\d+ : like PREPA1, SLEAM2
            # - \d+[\w-]+\d* : More flexible digit-letter combos
            # Using \w which matches [A-Za-z0-9_] plus Unicode letters (like é, à, etc)
            if (re.match(r'^\d[\w-]+\d*$', text, re.UNICODE) or
                re.match(r'^[\w]+\d+$', text, re.UNICODE | re.IGNORECASE) or
                    re.match(r'^\d+[\w-]+$', text, re.UNICODE)):
                # Prioritize entries near "Emploi" or at start of page
                priority = 0
                if i < 30:  # Near start of page
                    priority += 10
                # Check if near "Emploi" keyword
                for j in range(max(0, i-5), min(len(words), i+5)):
                    if 'Emploi' in words[j]['text'] or 'Temps' in words[j]['text']:
                        priority += 20
                        break
                candidates.append((priority, text))

        if candidates:
            # Return highest priority candidate
            candidates.sort(reverse=True)
            return candidates[0][1]

        # If no candidates found, log all words for debugging
        if page_num > 0:
            all_text = ' '.join([w['text'] for w in words[:30]])
            print(
                f"  [Page {page_num}] No class name pattern found in: {all_text[:150]}...")

        return None

    def _extract_day_columns(self, words):
        """Extract the x-coordinate ranges for each day column.

        Returns a dict mapping day names to their x-coordinate range.
        """
        day_positions = {}

        for w in words:
            if w['text'] in self.DAY_NAMES:
                day_positions[w['text']] = {
                    'x_center': (w['x0'] + w['x1']) / 2,
                    'x0': w['x0'],
                    'x1': w['x1']
                }

        if not day_positions:
            return None

        # Calculate column boundaries based on day header positions
        # Sort days by x position
        sorted_days = sorted(day_positions.items(),
                             key=lambda x: x[1]['x_center'])

        # Calculate column boundaries - use full midpoint between adjacent days
        day_columns = {}
        for i, (day_name, pos) in enumerate(sorted_days):
            # Start boundary: midpoint to previous day, or extend far left for first
            if i == 0:
                x_start = 0  # Start from left edge of page
            else:
                prev_day_center = sorted_days[i - 1][1]['x_center']
                x_start = (prev_day_center + pos['x_center']) / 2

            # End boundary: midpoint to next day, or extend far right for last
            if i < len(sorted_days) - 1:
                next_day_center = sorted_days[i + 1][1]['x_center']
                x_end = (pos['x_center'] + next_day_center) / 2
            else:
                x_end = 1500  # Extend to right edge of page for last column

            day_columns[day_name] = {'x_start': x_start, 'x_end': x_end}

        return day_columns

    def _extract_metadata_from_words(self, words):
        """Extract metadata from words list."""
        metadata = {}

        for i, w in enumerate(words):
            # Look for year pattern
            if re.match(r'\d{4}/\d{4}', w['text']):
                metadata['year'] = w['text']
            # Look for date range
            elif re.match(r'\d{2}/\d{2}/\d{4}', w['text']):
                if 'period' not in metadata:
                    metadata['period'] = w['text']
                else:
                    metadata['period'] += f" - {w['text']}"

        return metadata

    def _extract_courses_with_positions(self, words, day_columns):
        """Extract courses with their positions from words.

        Groups words into course blocks based on proximity and
        identifies course names, rooms, and times.
        """
        courses = []

        # Find all time patterns (09:00 - 12:15 or 13:30 - 16:45)
        time_words = []
        for w in words:
            if re.match(r'\d{2}:\d{2}', w['text']):
                time_words.append(w)

        # Group time words into pairs (start-end)
        time_blocks = []
        i = 0
        while i < len(time_words) - 1:
            start_time = time_words[i]
            # Check if next non-dash word is end time
            if i + 1 < len(time_words):
                end_time = time_words[i + 1]
                # Verify they're close together (same time block)
                if abs(start_time['top'] - end_time['top']) < 10:
                    time_blocks.append({
                        'start': start_time['text'],
                        'end': end_time['text'],
                        'x': (start_time['x0'] + end_time['x1']) / 2,
                        'y': start_time['top']
                    })
                    i += 2
                    continue
            i += 1

        # For each time block, find associated course name and room
        for time_block in time_blocks:
            x = time_block['x']
            y = time_block['y']

            # Find which day column this time block is in
            day_name = None
            for day, col in day_columns.items():
                if col['x_start'] <= x <= col['x_end']:
                    day_name = day
                    break

            if not day_name:
                continue

            # Find course name and room above or near this time
            course_words = []
            room = None

            for w in words:
                # Word should be in same column
                if not (day_columns[day_name]['x_start'] <= w['x0'] <= day_columns[day_name]['x_end']):
                    continue

                # Word should be above or at same level as time
                if w['top'] > y + 20:  # Allow some tolerance
                    continue
                if w['top'] < y - 150:  # Not too far above
                    continue

                # Check if it's a room
                if re.match(r'^[A-Z]\d+$', w['text']):
                    room = w['text']
                # Check if it's "En ligne"
                elif w['text'].lower() == 'en' or w['text'].lower() == 'ligne':
                    room = 'En Ligne'
                # Check if it's the time itself or hour markers
                elif re.match(r'\d{2}:\d{2}', w['text']) or re.match(r'^\d{2}h$', w['text']):
                    continue
                # Skip day names
                elif w['text'] in self.DAY_NAMES:
                    continue
                # Skip date patterns like "15/12" or "20/12"
                elif re.match(r'^\d{2}/\d{2}$', w['text']):
                    continue
                # Skip full date patterns like "14/12/2025"
                elif re.match(r'^\d{2}/\d{2}/\d{4}$', w['text']):
                    continue
                # Otherwise it might be part of course name
                elif w['text'] not in ['-']:
                    course_words.append(w)

            # Build course name from words (sorted by y then x position)
            if course_words:
                course_words.sort(key=lambda w: (w['top'], w['x0']))
                course_name = ' '.join(w['text'] for w in course_words)
                course_name = self._clean_course_name(course_name)
            else:
                course_name = None

            if course_name and room:
                # Determine time slot
                time_str = f"{time_block['start'].replace(':', 'H:')}-{time_block['end'].replace(':', 'H:')}"

                courses.append({
                    'day': day_name,
                    'time': time_str,
                    'course': course_name,
                    'room': room,
                    'y': y  # Keep y for sorting
                })

                self._track_room_usage_for_blocks(room)

        return courses

    def _assign_courses_by_position(self, class_name, courses, day_columns):
        """Assign courses to days based on their x-position."""
        # Get days info for full date keys
        year = self.schedules[class_name]['metadata'].get(
            'period', '').split('/')[-1][:4] or '2025'

        # Create schedule for each day
        for day_name in self.DAY_NAMES:
            if day_name not in day_columns:
                continue

            day_courses = [c for c in courses if c['day'] == day_name]

            # Collect all morning and afternoon courses (there might be multiple)
            morning_courses = []
            afternoon_courses = []

            for c in day_courses:
                # Check start time to determine slot
                time_start = c['time'].split(
                    '-')[0] if '-' in c['time'] else c['time']
                # Extract hour
                hour_match = re.search(r'(\d{2})H?:', time_start)
                if hour_match:
                    hour = int(hour_match.group(1))
                    if hour < 12:
                        morning_courses.append({
                            'time': c['time'],
                            'course': c['course'],
                            'room': c['room']
                        })
                        self._track_room_usage(class_name, c['room'])
                    else:
                        afternoon_courses.append({
                            'time': c['time'],
                            'course': c['course'],
                            'room': c['room']
                        })
                        self._track_room_usage(class_name, c['room'])

            # Find date for this day from metadata
            day_key = f"{day_name}"  # Will be enhanced with actual date

            # Build day schedule - include all courses sorted by time
            day_schedule = []

            # Sort morning courses by time and add them
            morning_courses.sort(key=lambda c: c['time'])
            day_schedule.extend(morning_courses)

            # Sort afternoon courses by time and add them
            afternoon_courses.sort(key=lambda c: c['time'])
            day_schedule.extend(afternoon_courses)

            # Fill empty slots only if we have no courses at all for a slot
            filled = self._fill_empty_time_slots_multi(
                day_schedule, class_name)
            if filled:
                self.schedules[class_name]['days'][day_key] = filled

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

            class_name = self._extract_class_name(page)
            if not class_name:
                continue

            # Initialize schedule
            self.schedules[class_name] = {
                'days': {},
                'metadata': self._extract_metadata(page)
            }

            # Extract days info first
            days_info = self._extract_days_info(page)

            # Extract all course blocks from the page
            course_blocks = self._extract_all_course_blocks(page)

            # Assign courses to days based on time slots
            self._assign_courses_to_days(
                class_name,
                days_info,
                course_blocks
            )

        print(f"Analysis completed! {len(self.schedules)} classes found.")
        return self.schedules

    def _extract_all_course_blocks(self, page):
        """Extract all course blocks from the page.

        The PDF text extraction outputs courses in day order:
        Day1 morning, Day1 afternoon, Day2 morning, Day2 afternoon, etc.

        Each course block format in the text is:
        [COURSE NAME possibly with hour prefix]
        [ROOM]
        [TIME in format HH:MM - HH:MM]

        Sometimes the time and next course name are on the same line.

        Args:
            page: Text content of the page

        Returns:
            list: List of course block dictionaries with time, course, room
        """
        course_blocks = []

        # Find all time patterns in the format HH:MM - HH:MM
        time_pattern = r'(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})'
        time_matches = list(re.finditer(time_pattern, page))

        # Find where the actual schedule data starts (after the hour markers row)
        # The hour markers are "09h", "10h", ..., "17h"
        # The last hour marker (17h) followed by the first course name
        hour_marker_match = re.search(r'17h', page)
        data_start = hour_marker_match.end() if hour_marker_match else 0

        # For each time, look backwards to find the room and course name
        for i, time_match in enumerate(time_matches):
            # Build time string
            start_h, start_m = time_match.group(1), time_match.group(2)
            end_h, end_m = time_match.group(3), time_match.group(4)
            time_str = f"{start_h}H:{start_m}-{end_h}H:{end_m}"

            # Determine the search region: from previous time match (or data_start) to this one
            if i == 0:
                search_start = data_start
            else:
                search_start = time_matches[i-1].end()

            text_before = page[search_start:time_match.start()]

            # Split into lines and clean
            lines = text_before.split('\n')
            lines = [l.strip() for l in lines if l.strip()]

            # Filter out hour markers, day headers, and header content
            filtered_lines = []
            for line in lines:
                # Skip standalone hour markers like "09h", "10h"
                if re.match(r'^\d{2}h$', line):
                    continue
                # Skip day names
                if line in self.DAY_NAMES:
                    continue
                # Skip dates like "15/12"
                if re.match(r'^\d{2}/\d{2}$', line):
                    continue
                # Skip header content
                if 'Emploi du Temps' in line:
                    continue
                if 'Université' in line or 'Universitaire' in line:
                    continue
                if 'ESPRIT' in line:
                    continue
                # Skip lines that look like class name + year info (header remnants)
                if re.search(r'Année', line):
                    continue
                if re.match(r'^\d{2}/\d{2}/\d{4}\s*-\s*\d{2}/\d{2}/\d{4}', line):
                    continue
                # Skip if it contains a previous time pattern (leftover from last block)
                if re.search(time_pattern, line):
                    # But extract any course name that might be after the time on same line
                    after_time = re.sub(time_pattern, '', line).strip()
                    if after_time and len(after_time) >= 3:
                        filtered_lines.append(after_time)
                    continue
                filtered_lines.append(line)

            if len(filtered_lines) < 2:  # Need at least course name and room
                continue

            # Room is the last element (right before time)
            room = None
            room_line = filtered_lines[-1]

            if re.match(r'^[A-Z]\d+$', room_line):
                room = room_line
                filtered_lines = filtered_lines[:-1]
            elif re.match(r'^En\s+ligne$', room_line, re.IGNORECASE):
                room = 'En Ligne'
                filtered_lines = filtered_lines[:-1]

            if not room or not filtered_lines:
                continue

            # Remaining filtered_lines are the course name parts
            course_name = ' '.join(filtered_lines)

            # Clean the course name (removing hour prefixes like "17h")
            course_name = self._clean_course_name(course_name)

            if course_name and len(course_name) >= 3:
                course_blocks.append({
                    'time': time_str,
                    'course': course_name,
                    'room': room,
                    'position': i  # Keep track of order
                })

                # Track room usage
                self._track_room_usage_for_blocks(room)

        return course_blocks

    def _track_room_usage_for_blocks(self, room):
        """Simple room tracking for blocks extraction."""
        if '_temp_rooms' not in dir(self):
            self._temp_rooms = {}
        if room not in self._temp_rooms:
            self._temp_rooms[room] = 0
        self._temp_rooms[room] += 1

    def _assign_courses_to_days(self, class_name, days_info, course_blocks):
        """Assign course blocks to the appropriate days.

        The courses are extracted in order as they appear in the PDF:
        Day1 morning, Day1 afternoon (optional), Day2 morning, Day2 afternoon (optional), etc.

        When we see two morning courses in a row, it means the previous day
        has no afternoon course.

        Args:
            class_name: Name of the class
            days_info: List of day info dictionaries
            course_blocks: List of extracted course blocks
        """
        day_keys = [day['key'] for day in days_info]
        day_schedules = {day_key: {'morning': None, 'afternoon': None}
                         for day_key in day_keys}

        # Mark each course with its slot type
        for course in course_blocks:
            time_parts = re.findall(r'(\d{2})H:(\d{2})', course['time'])
            if time_parts:
                start_hour = int(time_parts[0][0])
                course['slot'] = 'morning' if start_hour < 12 else 'afternoon'
            else:
                course['slot'] = 'morning'  # Default

        # Process courses sequentially, assigning them to days in order
        current_day_index = 0
        expecting_slot = 'morning'  # Start expecting a morning course

        for course in course_blocks:
            if current_day_index >= len(day_keys):
                break

            current_day_key = day_keys[current_day_index]
            slot = course['slot']

            if expecting_slot == 'morning':
                if slot == 'morning':
                    # Assign morning course to current day
                    day_schedules[current_day_key]['morning'] = {
                        'time': course['time'],
                        'course': course['course'],
                        'room': course['room']
                    }
                    self._track_room_usage(class_name, course['room'])
                    expecting_slot = 'afternoon'  # Now expect afternoon
                else:
                    # Got afternoon when expecting morning - shouldn't happen normally
                    # Just assign it and move on
                    day_schedules[current_day_key]['afternoon'] = {
                        'time': course['time'],
                        'course': course['course'],
                        'room': course['room']
                    }
                    self._track_room_usage(class_name, course['room'])
                    current_day_index += 1
                    expecting_slot = 'morning'
            else:  # expecting_slot == 'afternoon'
                if slot == 'afternoon':
                    # Assign afternoon course to current day
                    day_schedules[current_day_key]['afternoon'] = {
                        'time': course['time'],
                        'course': course['course'],
                        'room': course['room']
                    }
                    self._track_room_usage(class_name, course['room'])
                    current_day_index += 1
                    expecting_slot = 'morning'  # Move to next day
                else:
                    # Got morning when expecting afternoon
                    # This means current day has no afternoon course
                    # Move to next day and assign this morning course there
                    current_day_index += 1
                    if current_day_index < len(day_keys):
                        current_day_key = day_keys[current_day_index]
                        day_schedules[current_day_key]['morning'] = {
                            'time': course['time'],
                            'course': course['course'],
                            'room': course['room']
                        }
                        self._track_room_usage(class_name, course['room'])
                        expecting_slot = 'afternoon'

        # Convert to final format and fill empty slots
        for day_key in day_keys:
            courses_for_day = []

            if day_schedules[day_key]['morning']:
                courses_for_day.append(day_schedules[day_key]['morning'])
            if day_schedules[day_key]['afternoon']:
                courses_for_day.append(day_schedules[day_key]['afternoon'])

            courses_complete = self._fill_empty_time_slots(
                courses_for_day, class_name)
            if courses_complete:
                self.schedules[class_name]['days'][day_key] = courses_complete

    def _extract_class_name(self, page):
        """Extract class name from page.

        Args:
            page: Text content of the page

        Returns:
            str: Class name or None if not found
        """
        class_match = re.search(
            r'Emploi du Temps\s+(\S+)',
            page,
            re.IGNORECASE
        )
        if class_match:
            class_name = class_match.group(1).strip()
            # Remove "Année" suffix if present
            if class_name.endswith('Année'):
                class_name = class_name[:-5]
            return class_name
        return None

    def _extract_metadata(self, page):
        """Extract metadata from page.

        Args:
            page: Text content of the page

        Returns:
            dict: Metadata dictionary
        """
        metadata = {}

        # Extract year
        year_match = re.search(
            r'Année\s+[Uu]niversitaire\s*:\s*(\d{4}/\d{4})',
            page
        )
        if year_match:
            metadata['year'] = year_match.group(1)

        # Extract date range
        date_range_match = re.search(
            r'(\d{2}/\d{2}/\d{4})\s*-\s*(\d{2}/\d{2}/\d{4})',
            page
        )
        if date_range_match:
            metadata['period'] = (
                f"{date_range_match.group(1)} - "
                f"{date_range_match.group(2)}"
            )

        return metadata

    def _extract_days_info(self, page):
        """Extract day information from page.

        Args:
            page: Text content of the page

        Returns:
            list: List of day info dictionaries
        """
        days_info = []

        # Get year from date range for full date construction
        date_range_match = re.search(
            r'(\d{2}/\d{2}/\d{4})\s*-\s*(\d{2}/\d{2}/\d{4})',
            page
        )
        year = "2025"  # Default
        if date_range_match:
            year = date_range_match.group(1).split('/')[-1]

        for day_name in self.DAY_NAMES:
            day_pattern = rf'{day_name}\s+(\d{{2}}/\d{{2}})'
            day_match = re.search(day_pattern, page)

            if day_match:
                date_short = day_match.group(1)
                full_date = f"{date_short}/{year}"
                days_info.append({
                    'name': day_name,
                    'date': full_date,
                    'key': f"{day_name} {full_date}"
                })

        return days_info

    def _find_day_boundaries(self, page, day_name, day_header_pos):
        """Find the start and end positions of a day's column.

        Args:
            page: Text content of the page
            day_name: Name of the day
            day_header_pos: Position of the day header

        Returns:
            tuple: (start_pos, end_pos)
        """
        next_day_pos = len(page)

        for other_day in self.DAY_NAMES:
            if other_day != day_name:
                next_match = re.search(
                    rf'{other_day}\s+\d{{2}}/\d{{2}}',
                    page[day_header_pos + 10:]
                )
                if next_match:
                    candidate_pos = day_header_pos + 10 + next_match.start()
                    next_day_pos = min(next_day_pos, candidate_pos)

        return day_header_pos, next_day_pos

    def _is_valid_room(self, line):
        """Check if a line is a valid room identifier.

        Args:
            line: Text line to check

        Returns:
            str: Room identifier or None if invalid
        """
        if re.match(self.ROOM_PATTERN, line):
            return line
        if re.match(self.ONLINE_PATTERN, line, re.IGNORECASE):
            return 'En Ligne'
        return None

    def _should_stop_collecting_course_name(self, line):
        """Check if we should stop collecting course name lines.

        Args:
            line: Text line to check

        Returns:
            bool: True if should stop
        """
        # Stop at time markers (09h, 10h, etc.)
        if re.match(r'^\d{2}h$', line):
            return True
        # Stop at day names
        if line in self.DAY_NAMES:
            return True
        # Stop at dates
        if re.match(r'^\d{2}/\d{2}$', line):
            return True
        # Stop at short lines
        if len(line) < 3:
            return True
        return False

    def _clean_course_name(self, course_name):
        """Clean course name by removing unwanted elements.

        Args:
            course_name: Raw course name

        Returns:
            str: Cleaned course name
        """
        # Remove years (2025, etc.)
        course_name = re.sub(r'\b\d{4}\b', '', course_name)
        # Remove time references like "17h", "16h" - with or without word boundary
        # This handles cases like "17hARCHITECTURE" -> "ARCHITECTURE"
        course_name = re.sub(r'^\d{2}h', '', course_name)  # At start
        # In middle with space before
        course_name = re.sub(r'\s\d{2}h\b', '', course_name)
        # Clean up whitespace
        course_name = re.sub(r'\s+', ' ', course_name).strip()
        return course_name

    def _parse_courses_for_day(self, page, day_name, class_name):
        """Extract courses for a specific day from the table format.

        Args:
            page: Text content of the page
            day_name: Name of the day (e.g., 'Lundi')
            class_name: Name of the class

        Returns:
            list: List of course dictionaries
        """
        courses = []

        # Find day header
        day_pattern = rf'{day_name}\s+\d{{2}}/\d{{2}}'
        day_match = re.search(day_pattern, page)
        if not day_match:
            return courses

        # Get day column boundaries
        start_pos, end_pos = self._find_day_boundaries(
            page,
            day_name,
            day_match.start()
        )
        day_section = page[start_pos:end_pos]

        # Find all time patterns in this section
        time_pattern = r'(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})'
        time_matches = list(re.finditer(time_pattern, day_section))

        # Track the end position of the previous time match
        prev_end_pos = 0

        for i, time_match in enumerate(time_matches):
            # Determine the start position for this course
            # (after the previous time match)
            course_start = prev_end_pos

            course_data = self._extract_course_from_time_match(
                day_section,
                time_match,
                class_name,
                course_start
            )
            if course_data:
                courses.append(course_data)

            # Update the previous end position
            prev_end_pos = time_match.end()

        return courses

    def _extract_course_from_time_match(self, day_section, time_match,
                                        class_name, course_start=0):
        """Extract course information from a time match.

        Args:
            day_section: Text section for this day
            time_match: Regex match object for time
            class_name: Name of the class
            course_start: Starting position for this course (after prev time)

        Returns:
            dict: Course data or None if invalid
        """
        # Build time string
        start_h, start_m = time_match.group(1), time_match.group(2)
        end_h, end_m = time_match.group(3), time_match.group(4)
        time_str = f"{start_h}H:{start_m}-{end_h}H:{end_m}"

        # Extract text before time, but only from course_start
        text_before_time = day_section[course_start:time_match.start()]
        lines = [l.strip() for l in text_before_time.split('\n')
                 if l.strip()]

        if len(lines) < 2:  # Need at least room and course name
            return None

        # Room is the last line before time
        room = self._is_valid_room(lines[-1])
        if not room:
            return None

        # Collect course name lines
        course_lines = []
        for line in reversed(lines[:-1]):  # Exclude the room line
            if self._should_stop_collecting_course_name(line):
                break
            course_lines.append(line)

        if not course_lines:
            return None

        # Build and clean course name
        course_lines.reverse()
        course_name = self._clean_course_name(' '.join(course_lines))

        if not course_name or len(course_name) < 3:
            return None

        # Track room usage
        self._track_room_usage(class_name, room)

        return {
            'time': time_str,
            'course': course_name,
            'room': room
        }

    def _track_room_usage(self, class_name, room):
        """Track room usage for a class.

        Args:
            class_name: Name of the class
            room: Room identifier
        """
        if class_name not in self.class_rooms:
            self.class_rooms[class_name] = {}
        if room not in self.class_rooms[class_name]:
            self.class_rooms[class_name][room] = 0
        self.class_rooms[class_name][room] += 1

    def _fill_empty_time_slots(self, courses, class_name):
        """Fill in FREE slots for missing morning or afternoon sessions.

        Args:
            courses: List of existing courses
            class_name: Name of the class

        Returns:
            list: Complete list of courses with FREE slots added
        """
        primary_room = self._get_primary_room(class_name)

        if not courses:
            return [
                self._create_free_slot(self.MORNING_SLOT, primary_room),
                self._create_free_slot(self.AFTERNOON_SLOT, primary_room)
            ]

        has_morning, has_afternoon = self._check_time_coverage(courses)
        result = list(courses)

        if not has_morning:
            result.insert(
                0,
                self._create_free_slot(self.MORNING_SLOT, primary_room)
            )

        if not has_afternoon:
            result.append(
                self._create_free_slot(self.AFTERNOON_SLOT, primary_room)
            )

        return result

    def _fill_empty_time_slots_multi(self, courses, class_name):
        """Fill in FREE slots for missing morning or afternoon sessions.

        Handles multiple courses in the same slot (e.g., two morning courses).

        Args:
            courses: List of existing courses (may have multiple per slot)
            class_name: Name of the class

        Returns:
            list: Complete list of courses with FREE slots added where needed
        """
        primary_room = self._get_primary_room(class_name)

        if not courses:
            return [
                self._create_free_slot(self.MORNING_SLOT, primary_room),
                self._create_free_slot(self.AFTERNOON_SLOT, primary_room)
            ]

        # Check if we have any morning or afternoon courses
        has_morning = False
        has_afternoon = False

        for course in courses:
            time_start = course['time'].split(
                '-')[0] if '-' in course['time'] else course['time']
            hour_match = re.search(r'(\d{2})H?:', time_start)
            if hour_match:
                hour = int(hour_match.group(1))
                if hour < 12:
                    has_morning = True
                else:
                    has_afternoon = True

        result = list(courses)

        if not has_morning:
            result.insert(
                0,
                self._create_free_slot(self.MORNING_SLOT, primary_room)
            )

        if not has_afternoon:
            result.append(
                self._create_free_slot(self.AFTERNOON_SLOT, primary_room)
            )

        return result

    def _create_free_slot(self, time_str, room):
        """Create a FREE slot entry.

        Args:
            time_str: Time range string
            room: Room identifier

        Returns:
            dict: FREE slot entry
        """
        return {
            'time': time_str,
            'course': 'FREE',
            'room': room
        }

    def _check_time_coverage(self, courses):
        """Check if courses cover morning and afternoon slots.

        Args:
            courses: List of courses

        Returns:
            tuple: (has_morning, has_afternoon)
        """
        has_morning = False
        has_afternoon = False

        for course in courses:
            time_parts = re.findall(self.TIME_PATTERN, course['time'])
            if len(time_parts) >= 2:
                start_minutes = self._time_to_minutes(time_parts[0])
                end_minutes = self._time_to_minutes(time_parts[1])

                # Morning: starts before 12:30
                if start_minutes < self.MORNING_END:
                    has_morning = True
                # Afternoon: ends after 13:30
                if end_minutes > self.AFTERNOON_START:
                    has_afternoon = True

        return has_morning, has_afternoon

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
            return list(self.class_rooms[class_name].keys())[0]

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

        room_occupancy = self._build_room_occupancy_map()
        changes_made = 0
        warning_made = 0

        for class_name, class_data in self.schedules.items():
            for day_key, courses in class_data['days'].items():
                for course in courses:
                    if course['course'] == 'FREE':
                        if self._is_room_occupied(
                            course['room'],
                            day_key,
                            course['time'],
                            room_occupancy
                        ):
                            course['course'] = 'NOT-FREE'
                            changes_made += 1
                        elif self._is_free_warning(
                            course['room'],
                            day_key,
                            course['time']
                        ):
                            course['course'] = 'FREEWARNING'
                            warning_made += 1

        print(
            f"✓ Review completed: {changes_made} FREE slots changed to "
            f"NOT-FREE, {warning_made} to FREEWARNING"
        )
        return changes_made

    def _build_room_occupancy_map(self):
        """Build a map of room occupancy across all classes.

        Returns:
            dict: Room occupancy mapping
        """
        room_occupancy = {}

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

        return room_occupancy

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

        free_time_parts = re.findall(self.TIME_PATTERN, free_time)
        if len(free_time_parts) < 2:
            return False

        free_start = self._time_to_minutes(free_time_parts[0])
        free_end = self._time_to_minutes(free_time_parts[1])

        for scheduled_time in room_occupancy[room][day_key].keys():
            scheduled_parts = re.findall(self.TIME_PATTERN, scheduled_time)
            if len(scheduled_parts) < 2:
                continue

            scheduled_start = self._time_to_minutes(scheduled_parts[0])
            scheduled_end = self._time_to_minutes(scheduled_parts[1])

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
        # Check if room is A1X (first floor)
        if room.startswith('A1'):
            return True

        # Check if room is C0X on Wednesday afternoon
        if room.startswith('C0'):
            day_name = day_key.split(' ')[0]

            if day_name == 'Mercredi':
                time_parts = re.findall(self.TIME_PATTERN, time)
                if len(time_parts) >= 2:
                    start_minutes = self._time_to_minutes(time_parts[0])
                    end_minutes = self._time_to_minutes(time_parts[1])

                    # Check overlap with afternoon slot (13:30-16:45)
                    if self._times_overlap(
                        start_minutes,
                        end_minutes,
                        self.AFTERNOON_START,
                        self.AFTERNOON_END
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
        # Use spatial parsing for accurate day mapping
        parser.parse_pdf_spatial(pdf_file)
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
