"use client";

import { ACQUISITION_INFO } from "../config";

export function AcquisitionFooter() {
    return (
        <div className="border-t border-yellow-400/30 pt-3 mt-3">
            <p className="text-xs sm:text-sm text-muted-foreground">
                Want to acquire this project? (
                <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                    {ACQUISITION_INFO.monthlyVisitors}
                </span>{" "}
                monthly active visitors) •{" "}
                <a
                    href={ACQUISITION_INFO.contactUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold hover:text-foreground transition-colors underline decoration-yellow-400"
                >
                    Contact
                </a>
            </p>
        </div>
    );
}
