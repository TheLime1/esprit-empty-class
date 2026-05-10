/**
 * Shared class-code matching for timetable and exam lookups.
 */

export function normalizeClassCode(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replaceAll(/[^A-Z0-9]/g, "");
}

function getTrailingNumber(value: string): string | null {
  return value.match(/\d+$/)?.[0] ?? null;
}

function getLeadingNumber(value: string): string | null {
  return value.match(/^(\d+)/)?.[0] ?? null;
}

export function findMatchingClassKey(
  searchCode: string,
  classKeys: string[],
): string | null {
  const normalizedSearch = normalizeClassCode(searchCode);

  if (!normalizedSearch || !/\d/.test(normalizedSearch)) {
    return null;
  }

  const directMatch = classKeys.find(
    (key) => normalizeClassCode(key) === normalizedSearch,
  );
  if (directMatch) {
    return directMatch;
  }

  const searchTrailingNum = getTrailingNumber(normalizedSearch);
  const searchLeading = getLeadingNumber(normalizedSearch);

  if (!searchTrailingNum || !searchLeading) {
    return null;
  }

  const searchMiddle = normalizedSearch.slice(
    searchLeading.length,
    -searchTrailingNum.length,
  );

  if (!searchMiddle) {
    return null;
  }

  for (const className of classKeys) {
    const normalizedClass = normalizeClassCode(className);
    const classTrailingNum = getTrailingNumber(normalizedClass);
    const classLeading = getLeadingNumber(normalizedClass);

    if (
      !classTrailingNum ||
      !classLeading ||
      classTrailingNum !== searchTrailingNum ||
      classLeading !== searchLeading
    ) {
      continue;
    }

    const classMiddle = normalizedClass.slice(
      classLeading.length,
      -classTrailingNum.length,
    );

    if (classMiddle.includes(searchMiddle)) {
      return className;
    }
  }

  return null;
}
