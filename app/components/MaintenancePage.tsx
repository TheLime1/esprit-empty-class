"use client";

import { ACQUISITION_INFO } from "../config";
import Image from "next/image";

export function MaintenancePage() {
    // Stripe pattern for the construction tape
    const stripeStyle = {
        background: `repeating-linear-gradient(
      -45deg,
      #fbbf24 0px,
      #fbbf24 25px,
      #1e293b 25px,
      #1e293b 50px
    )`,
    };

    const stripeStyleReverse = {
        background: `repeating-linear-gradient(
      45deg,
      #fbbf24 0px,
      #fbbf24 25px,
      #1e293b 25px,
      #1e293b 50px
    )`,
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Construction tape stripes - top */}
            <div className="absolute top-0 left-0 right-0 h-16 sm:h-20 overflow-hidden">
                <div
                    className="tape-scroll h-full"
                    style={{
                        ...stripeStyle,
                        width: "200%",
                        willChange: "transform",
                    }}
                />
            </div>

            {/* Construction tape stripes - bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-16 sm:h-20 overflow-hidden">
                <div
                    className="tape-scroll-reverse h-full"
                    style={{
                        ...stripeStyleReverse,
                        width: "200%",
                        willChange: "transform",
                    }}
                />
            </div>

            {/* Main content */}
            <div className="z-10 text-center px-6 py-12 max-w-2xl">
                {/* Warning icon */}
                <div className="mb-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-yellow-400/20 border-4 border-yellow-400 animate-pulse">
                        <svg
                            className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                </div>

                {/* Main heading */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-yellow-400 mb-6 tracking-tight">
                    PROJECT PAUSED
                </h1>

                {/* Reason */}
                <div className="bg-slate-800/80 backdrop-blur-sm border-2 border-yellow-400/50 rounded-xl p-6 mb-8 shadow-2xl shadow-yellow-400/10">
                    <p className="text-lg sm:text-xl md:text-2xl text-slate-200 font-medium leading-relaxed">
                        ESPRIT introduced a{" "}
                        <span className="text-yellow-400 font-bold">new PDF format</span>
                    </p>
                </div>

                {/* New PDF Format Image */}
                <div className="mb-8 rounded-xl overflow-hidden border-2 border-slate-700 shadow-2xl">
                    <Image
                        src="/new_pdf_format.png"
                        alt="New ESPRIT PDF format example"
                        width={600}
                        height={400}
                        className="w-full h-auto"
                        priority
                    />
                </div>

                {/* Acquisition section */}
                <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                    <p className="text-slate-400 text-sm sm:text-base mb-2">
                        Want to acquire this project?
                    </p>
                    <p className="text-slate-300 text-base sm:text-lg mb-4">
                        <span className="font-bold text-yellow-400">
                            {ACQUISITION_INFO.monthlyVisitors}
                        </span>{" "}
                        monthly active visitors
                    </p>
                    <a
                        href={ACQUISITION_INFO.contactUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg shadow-yellow-400/30"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        Contact on GitHub
                    </a>
                </div>
            </div>

            {/* Animated corner decorations */}
            <div className="absolute top-20 left-4 w-4 h-4 bg-yellow-400 rounded-full animate-ping opacity-75" />
            <div className="absolute bottom-20 right-4 w-4 h-4 bg-yellow-400 rounded-full animate-ping opacity-75" />

            <style jsx>{`
        @keyframes tape-scroll {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        @keyframes tape-scroll-reverse {
          0% {
            transform: translate3d(-50%, 0, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }
        .tape-scroll {
          animation: tape-scroll 15s linear infinite;
        }
        .tape-scroll-reverse {
          animation: tape-scroll-reverse 15s linear infinite;
        }
      `}</style>
        </div>
    );
}
