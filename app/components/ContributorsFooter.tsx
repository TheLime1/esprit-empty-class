"use client";

import { CONTRIBUTORS } from "../config";

export function ContributorsFooter() {
  if (CONTRIBUTORS.length === 0) return null;

  return (
    <div className="border-t border-muted/30 pt-3 mt-3">
      <p className="text-xs sm:text-sm text-muted-foreground">
        Thanks to contributors:{" "}
        {CONTRIBUTORS.map((c, i) => (
          <span key={c.name}>
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:text-foreground transition-colors underline"
            >
              {c.name}
            </a>
            {i < CONTRIBUTORS.length - 1 && ", "}
          </span>
        ))}
      </p>
    </div>
  );
}
