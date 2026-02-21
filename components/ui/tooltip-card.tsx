"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export const Tooltip = ({
  content,
  children,
  containerClassName,
}: {
  content: string | React.ReactNode;
  children: React.ReactNode;
  containerClassName?: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [height, setHeight] = useState(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [isVisible, content]);

  const calculatePosition = () => {
    if (!contentRef.current || !containerRef.current) return { x: 0, y: 0 };

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const tooltipWidth = 240;
    const tooltipHeight = contentRef.current.scrollHeight;

    // Center horizontally below the trigger
    let finalX = (containerRect.width - tooltipWidth) / 2;
    let finalY = containerRect.height + 8; // 8px gap below trigger

    // Check if tooltip goes beyond right edge
    const absoluteRight = containerRect.left + finalX + tooltipWidth;
    if (absoluteRight > viewportWidth) {
      finalX = viewportWidth - containerRect.left - tooltipWidth - 8;
    }

    // Check if tooltip goes beyond left edge
    const absoluteLeft = containerRect.left + finalX;
    if (absoluteLeft < 0) {
      finalX = -containerRect.left + 8;
    }

    // Check if tooltip goes beyond bottom edge — show above instead
    if (containerRect.bottom + 8 + tooltipHeight > viewportHeight) {
      finalY = -tooltipHeight - 8;
    }

    return { x: finalX, y: finalY };
  };

  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const handleTouchStart = () => {
    setIsVisible(true);
  };

  const handleTouchEnd = () => {
    setTimeout(() => {
      setIsVisible(false);
    }, 2000);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia("(hover: none)").matches) {
      e.preventDefault();
      setIsVisible((v) => !v);
    }
  };

  // Update position when tooltip becomes visible
  useEffect(() => {
    if (isVisible) {
      const newPosition = calculatePosition();
      setPosition(newPosition);
    }
  }, [isVisible, height]);

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-block", containerClassName)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            key={String(isVisible)}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 24,
            }}
            className="pointer-events-none absolute z-50 min-w-[15rem] overflow-hidden rounded-md border border-transparent bg-white shadow-sm ring-1 shadow-black/5 ring-black/5 dark:bg-neutral-900 dark:shadow-white/10 dark:ring-white/5"
            style={{
              top: position.y,
              left: position.x,
            }}
          >
            <div
              ref={contentRef}
              className="p-2 text-sm text-neutral-600 md:p-4 dark:text-neutral-400"
            >
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
