"use client";

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
