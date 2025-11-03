import re

text = '''03/11/2025 Architecture des SI II/
  G308/
P
A
U
S
E13H:30 - 16H:45
  Graphes et applications/
  G308/'''

pattern = r'([^/\n]+?)/\s*([A-Z]\d+)\s*/'
matches = list(re.finditer(pattern, text))

print(f'Found {len(matches)} matches')
for i, m in enumerate(matches):
    course_name = m.group(1).strip()
    room = m.group(2)

    # Clean course name
    course_name = re.sub(r'\d{2}/\d{2}/\d{4}', '', course_name)
    course_name = re.sub(r'^\d{4}\s+', '', course_name)
    course_name = re.sub(r'\s+\d{4}\s+', ' ', course_name)
    course_name = re.sub(r'\s+\d{4}$', '', course_name)
    course_name = re.sub(r'\s+', ' ', course_name).strip()

    print(f'\nMatch {i}:')
    print(f'  Course (cleaned): "{course_name}"')
    print(f'  Room: "{room}"')
    print(f'  Position: {m.start()}-{m.end()}')

    # Check context before course
    text_before = text[:m.start()]

    # Check for time in longer context (200 chars)
    context = text_before[-200:] if len(text_before) > 200 else text_before
    time_range_pattern = r'(\d{2}H:\d{2})\s*-\s*(\d{2}H:\d{2})'
    time_match = re.search(time_range_pattern, context)

    if time_match:
        print(f'  Time found: {time_match.group(0)}')
    else:
        print('  No time found - checking for date...')
        # Check for date in shorter context (50 chars)
        longer_context = text_before[-50:] if len(
            text_before) > 50 else text_before
        print(f'  Date context (last 50 chars): {repr(longer_context)}')
        date_pattern = r'\d{2}/\d{2}/\d{4}'
        if re.search(date_pattern, longer_context):
            print('  Date found in context - this is a morning course (09H:00-12H:15)!')
        else:
            print('  No date found in context - would skip')
