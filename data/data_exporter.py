"""PDF Schedule Parser - Converts ESPRIT schedule PDFs to JSON format."""

import re
import json
import sys
import PyPDF2


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
        self._temp_rooms = {}  # Temporary room tracking for block extraction

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
        time_pattern = r'(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})'
        time_matches = list(re.finditer(time_pattern, page))
        data_start = self._find_data_start(page)

        for i, time_match in enumerate(time_matches):
            course_block = self._extract_single_course_block(
                page, time_match, time_matches, i, data_start, time_pattern
            )
            if course_block:
                course_blocks.append(course_block)
                self._track_room_usage_for_blocks(course_block['room'])

        return course_blocks

    def _find_data_start(self, page):
        """Find where the actual schedule data starts."""
        hour_marker_match = re.search(r'17h', page)
        return hour_marker_match.end() if hour_marker_match else 0

    def _extract_single_course_block(self, page, time_match, time_matches,
                                     index, data_start, time_pattern):
        """Extract a single course block from a time match."""
        time_str = self._build_time_string(time_match)
        search_start = data_start if index == 0 else time_matches[index-1].end(
        )
        text_before = page[search_start:time_match.start()]

        filtered_lines = self._filter_course_lines(text_before, time_pattern)

        if len(filtered_lines) < 2:
            return None

        room, course_lines = self._extract_room_from_lines(filtered_lines)

        if not room or not course_lines:
            return None

        course_name = self._clean_course_name(' '.join(course_lines))

        if course_name and len(course_name) >= 3:
            return {
                'time': time_str,
                'course': course_name,
                'room': room,
                'position': index
            }
        return None

    def _build_time_string(self, time_match):
        """Build formatted time string from regex match."""
        start_h, start_m = time_match.group(1), time_match.group(2)
        end_h, end_m = time_match.group(3), time_match.group(4)
        return f"{start_h}H:{start_m}-{end_h}H:{end_m}"

    def _filter_course_lines(self, text_before, time_pattern):
        """Filter and clean lines to extract course information."""
        lines = [l.strip() for l in text_before.split('\n') if l.strip()]
        filtered_lines = []

        for line in lines:
            if self._should_skip_line(line):
                continue
            if re.search(time_pattern, line):
                after_time = re.sub(time_pattern, '', line).strip()
                if after_time and len(after_time) >= 3:
                    filtered_lines.append(after_time)
                continue
            filtered_lines.append(line)

        return filtered_lines

    def _should_skip_line(self, line):
        """Check if a line should be skipped during course extraction."""
        skip_patterns = [
            (r'^\d{2}h$', None),  # Hour markers
            (r'^\d{2}/\d{2}$', None),  # Dates
            (r'^\d{2}/\d{2}/\d{4}\s*-\s*\d{2}/\d{2}/\d{4}', None),  # Date ranges
            (r'Année', None),  # Year info
        ]

        skip_strings = [
            'Emploi du Temps', 'Université', 'Universitaire', 'ESPRIT'
        ]

        for pattern, _ in skip_patterns:
            if re.match(pattern, line) or re.search(pattern, line):
                return True

        if line in self.DAY_NAMES:
            return True

        for skip_str in skip_strings:
            if skip_str in line:
                return True

        return False

    def _extract_room_from_lines(self, lines):
        """Extract room identifier from filtered lines."""
        if not lines:
            return None, []

        room_line = lines[-1]
        room = None

        if re.match(r'^[A-Z]\d+$', room_line):
            room = room_line
            return room, lines[:-1]
        elif re.match(r'^En\s+ligne$', room_line, re.IGNORECASE):
            room = 'En Ligne'
            return room, lines[:-1]

        return None, lines

    def _track_room_usage_for_blocks(self, room):
        """Simple room tracking for blocks extraction."""
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
        day_schedules = {day_key: {'morning': {}, 'afternoon': {}}
                         for day_key in day_keys}

        # Mark each course with its slot type
        self._mark_course_slots(course_blocks)

        # Process courses sequentially
        self._process_courses_sequentially(
            course_blocks, day_keys, day_schedules, class_name
        )

        # Convert to final format
        self._finalize_day_schedules(class_name, day_keys, day_schedules)

    def _mark_course_slots(self, course_blocks):
        """Mark each course with its time slot type (morning/afternoon)."""
        for course in course_blocks:
            time_parts = re.findall(r'(\d{2})H:(\d{2})', course['time'])
            if time_parts:
                start_hour = int(time_parts[0][0])
                course['slot'] = 'morning' if start_hour < 12 else 'afternoon'
            else:
                course['slot'] = 'morning'

    def _process_courses_sequentially(self, course_blocks, day_keys,
                                      day_schedules, class_name):
        """Process courses and assign them to days in order."""
        current_day_index = 0
        expecting_slot = 'morning'

        for course in course_blocks:
            if current_day_index >= len(day_keys):
                break

            current_day_index, expecting_slot = self._assign_single_course(
                course, day_keys, day_schedules, class_name,
                current_day_index, expecting_slot
            )

    def _assign_single_course(self, course, day_keys, day_schedules,
                              class_name, current_day_index, expecting_slot):
        """Assign a single course to the appropriate day and slot."""
        current_day_key = day_keys[current_day_index]
        slot = course['slot']
        course_data = {
            'time': course['time'],
            'course': course['course'],
            'room': course['room']
        }

        if expecting_slot == 'morning':
            return self._handle_morning_assignment(
                slot, course_data, day_schedules, current_day_key,
                class_name, current_day_index
            )
        else:
            return self._handle_afternoon_assignment(
                slot, course_data, day_schedules, day_keys,
                class_name, current_day_index
            )

    def _handle_morning_assignment(self, slot, course_data, day_schedules,
                                   current_day_key, class_name, current_day_index):
        """Handle assignment when expecting morning slot."""
        if slot == 'morning':
            day_schedules[current_day_key]['morning'] = course_data
            self._track_room_usage(class_name, course_data['room'])
            return current_day_index, 'afternoon'
        else:
            day_schedules[current_day_key]['afternoon'] = course_data
            self._track_room_usage(class_name, course_data['room'])
            return current_day_index + 1, 'morning'

    def _handle_afternoon_assignment(self, slot, course_data, day_schedules,
                                     day_keys, class_name, current_day_index):
        """Handle assignment when expecting afternoon slot."""
        current_day_key = day_keys[current_day_index]

        if slot == 'afternoon':
            day_schedules[current_day_key]['afternoon'] = course_data
            self._track_room_usage(class_name, course_data['room'])
            return current_day_index + 1, 'morning'
        else:
            # Morning when expecting afternoon - skip to next day
            current_day_index += 1
            if current_day_index < len(day_keys):
                current_day_key = day_keys[current_day_index]
                day_schedules[current_day_key]['morning'] = course_data
                self._track_room_usage(class_name, course_data['room'])
                return current_day_index, 'afternoon'
            return current_day_index, 'morning'

    def _finalize_day_schedules(self, class_name, day_keys, day_schedules):
        """Convert day schedules to final format and fill empty slots."""
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

        for time_match in time_matches:
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

        for class_data in self.schedules.values():
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
                        self._add_course_to_occupancy(
                            room_occupancy, course, day_key, class_name
                        )

        return room_occupancy

    def _add_course_to_occupancy(self, room_occupancy, course, day_key, class_name):
        """Add a course to the room occupancy map."""
        room = course['room']
        time = course['time']

        if room not in room_occupancy:
            room_occupancy[room] = {}
        if day_key not in room_occupancy[room]:
            room_occupancy[room][day_key] = {}
        if time not in room_occupancy[room][day_key]:
            room_occupancy[room][day_key][time] = []

        room_occupancy[room][day_key][time].append(class_name)

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
        pdf_text = parser.load_pdf(pdf_file)
        parser.parse_pdf_text(pdf_text)
        parser.export_to_json(json_file)

        print("\n✓ Process completed successfully!")

    except FileNotFoundError:
        print(f"Error: File '{pdf_file}' not found!")
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}")
        import traceback
        traceback.print_exc()
    except (IOError, OSError) as e:
        print(f"Error accessing file: {e}")
        import traceback
        traceback.print_exc()
    except ValueError as e:
        print(f"Error processing PDF: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
