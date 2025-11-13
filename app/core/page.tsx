"use client";

import { motion } from "framer-motion";
import {
  Code2,
  Database,
  Layers,
  Zap,
  FileCode,
  Server,
  Globe,
  Cpu,
} from "lucide-react";
import { Card } from "@/components/ui/card";

export default function TheCore() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  const techStack = [
    { name: "Next.js 16", icon: Globe, color: "from-slate-500 to-slate-700" },
    { name: "TypeScript", icon: Code2, color: "from-blue-500 to-blue-700" },
    { name: "Python 3.11", icon: Cpu, color: "from-yellow-500 to-yellow-700" },
    { name: "PyPDF2", icon: FileCode, color: "from-red-500 to-red-700" },
    {
      name: "Framer Motion",
      icon: Zap,
      color: "from-purple-500 to-purple-700",
    },
    { name: "Tailwind CSS", icon: Layers, color: "from-cyan-500 to-cyan-700" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-slate-950 dark:via-purple-950 dark:to-slate-950 text-slate-900 dark:text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 10,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 12,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.h1
            className="text-6xl md:text-8xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400"
            animate={{
              backgroundPosition: ["0%", "100%", "0%"],
            }}
            transition={{
              duration: 5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            style={{
              backgroundSize: "200% auto",
            }}
          >
            THE CORE
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xl text-gray-400"
          >
            Behind the scenes of ESPRIT Empty Class Finder
          </motion.p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl mx-auto space-y-8"
        >
          {/* Section 1: The Problem */}
          <motion.div variants={itemVariants}>
            <Card className="p-8 bg-white dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-800/90 border-slate-300 dark:border-slate-700 backdrop-blur-sm shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-lg bg-gradient-to-br from-red-500 to-orange-500">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold">The Problem</h2>
              </div>
              <p className="text-slate-700 dark:text-gray-300 text-lg leading-relaxed">
                Students at ESPRIT need to find empty classrooms for studying or
                group work, but manually checking the 312-page PDF schedule is
                impossible. We needed a solution that could parse, analyze, and
                present this data in real-time with a beautiful, responsive
                interface.
              </p>
            </Card>
          </motion.div>

          {/* Section 2: The Architecture */}
          <motion.div variants={itemVariants}>
            <Card className="p-8 bg-white dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-800/90 border-slate-300 dark:border-slate-700 backdrop-blur-sm shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold">The Architecture</h2>
              </div>
              <div className="space-y-4">
                <div className="pl-4 border-l-4 border-purple-500">
                  <h3 className="text-xl font-semibold text-purple-600 dark:text-purple-400 mb-2">
                    1. Data Extraction Layer (Python)
                  </h3>
                  <p className="text-slate-700 dark:text-gray-300">
                    <code className="bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded text-sm text-purple-600 dark:text-purple-300">
                      data_exporter.py
                    </code>{" "}
                    uses PyPDF2 to parse the 312-page schedule PDF. It extracts
                    48,829 text sections, identifies 312 classes, and analyzes
                    their schedules using regex patterns to detect time slots,
                    rooms, and course codes.
                  </p>
                </div>

                <div className="pl-4 border-l-4 border-blue-500">
                  <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-2">
                    2. Intelligent Processing
                  </h3>
                  <p className="text-slate-700 dark:text-gray-300 mb-2">
                    The system fills empty time slots (08:00-18:30) for each
                    class, then runs a multi-pass review:
                  </p>
                  <ul className="list-disc list-inside text-slate-700 dark:text-gray-300 space-y-1 ml-4">
                    <li>
                      <strong className="text-blue-600 dark:text-blue-300">
                        Pass 1:
                      </strong>{" "}
                      Marks rooms as NOT-FREE if occupied by other classes
                    </li>
                    <li>
                      <strong className="text-blue-600 dark:text-blue-300">
                        Pass 2:
                      </strong>{" "}
                      Marks A1X rooms (first floor) and C0X rooms (Wednesday
                      afternoon) as FREEWARNING - these are high-risk for
                      soutenance/defense sessions
                    </li>
                  </ul>
                  <p className="text-slate-600 dark:text-gray-400 mt-2 text-sm italic">
                    Result: A precise classification of every room's
                    availability status across all time slots
                  </p>
                </div>

                <div className="pl-4 border-l-4 border-green-500">
                  <h3 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-2">
                    3. Data Storage (JSON)
                  </h3>
                  <p className="text-slate-700 dark:text-gray-300">
                    Outputs to{" "}
                    <code className="bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded text-sm text-green-600 dark:text-green-300">
                      schedules.json
                    </code>{" "}
                    - a structured format containing all 312 classes with their
                    complete weekly schedules, including FREE, NOT-FREE, and
                    FREEWARNING states.
                  </p>
                </div>

                <div className="pl-4 border-l-4 border-yellow-500">
                  <h3 className="text-xl font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
                    4. API Layer (Next.js Routes)
                  </h3>
                  <p className="text-slate-700 dark:text-gray-300">
                    Two powerful API endpoints:
                  </p>
                  <ul className="list-disc list-inside text-slate-700 dark:text-gray-300 space-y-1 ml-4 mt-2">
                    <li>
                      <code className="bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded text-sm">
                        /api/classes/[classCode]/location
                      </code>{" "}
                      - Intelligent class search with flexible matching (handles
                      &quot;4ERPBI3&quot;, &quot;erp/bi&quot;,
                      &quot;4SAE12&quot;)
                    </li>
                    <li>
                      <code className="bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded text-sm">
                        /api/rooms/free
                      </code>{" "}
                      - Real-time empty room finder with day/time/building
                      filters, separating FREE and FREEWARNING rooms
                    </li>
                  </ul>
                </div>

                <div className="pl-4 border-l-4 border-cyan-500">
                  <h3 className="text-xl font-semibold text-cyan-600 dark:text-cyan-400 mb-2">
                    5. Frontend (Next.js + React)
                  </h3>
                  <p className="text-slate-700 dark:text-gray-300">
                    Built with App Router, TypeScript, and Framer Motion for
                    smooth animations. Features include:
                  </p>
                  <ul className="list-disc list-inside text-slate-700 dark:text-gray-300 space-y-1 ml-4 mt-2">
                    <li>
                      Tabbed interface for &quot;Where is my class&quot; and
                      &quot;Find empty rooms&quot;
                    </li>
                    <li>
                      Real-time search with localStorage persistence (remembers
                      last searched class)
                    </li>
                    <li>Animated dark mode toggle</li>
                    <li>
                      Color-coded room cards: Green (FREE), Yellow (FREEWARNING
                      with ⚠️), Red (Occupied)
                    </li>
                    <li>Fully responsive design with mobile-first approach</li>
                  </ul>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Section 3: Tech Stack */}
          <motion.div variants={itemVariants}>
            <Card className="p-8 bg-white dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-800/90 border-slate-300 dark:border-slate-700 backdrop-blur-sm shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500">
                  <Server className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold">Tech Stack</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {techStack.map((tech, index) => (
                  <motion.div
                    key={tech.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    className={`p-4 rounded-lg bg-gradient-to-br ${tech.color} flex items-center gap-3 shadow-md`}
                  >
                    <tech.icon className="w-6 h-6 text-white" />
                    <span className="font-semibold text-white">
                      {tech.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Section 4: The Magic */}
          <motion.div variants={itemVariants}>
            <Card className="p-8 bg-white dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-800/90 border-slate-300 dark:border-slate-700 backdrop-blur-sm shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500">
                  <Code2 className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold">The Magic Happens</h2>
              </div>
              <div className="space-y-4 text-slate-700 dark:text-gray-300">
                <p className="text-lg">
                  <strong className="text-pink-600 dark:text-pink-400">
                    Search Intelligence:
                  </strong>{" "}
                  When you search &quot;4ERPBI3&quot;, the system normalizes the
                  query, checks exact matches, then falls back to flexible
                  pattern matching. It prevents false positives like
                  &quot;4SAE12&quot; matching &quot;4SAE1&quot; by requiring
                  exact trailing numbers.
                </p>
                <p className="text-lg">
                  <strong className="text-pink-600 dark:text-pink-400">
                    FREEWARNING System:
                  </strong>{" "}
                  A1X rooms on the first floor and C0X rooms on Wednesday
                  afternoons (13:30-16:45) are marked with warnings because
                  they&apos;re commonly used for soutenance sessions - helping
                  students avoid disruptions.
                </p>
                <p className="text-lg">
                  <strong className="text-pink-600 dark:text-pink-400">
                    Performance:
                  </strong>{" "}
                  All data is pre-processed into JSON, making API responses
                  instant. No database needed - pure static file serving with
                  intelligent querying.
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Section 5: The Numbers */}
          <motion.div variants={itemVariants}>
            <Card className="p-8 bg-white dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-800/90 border-slate-300 dark:border-slate-700 backdrop-blur-sm shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
                  <Layers className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold">By The Numbers</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: "PDF Pages", value: "312" },
                  { label: "Text Sections", value: "48,829" },
                  { label: "Classes Tracked", value: "312" },
                  { label: "FREEWARNING Slots", value: "30" },
                  { label: "Time Slots/Day", value: "7" },
                  { label: "Weekly Schedules", value: "2,184" },
                  { label: "Room Types", value: "A, B, C, D" },
                  { label: "API Endpoints", value: "3" },
                  { label: "React Components", value: "15+" },
                  { label: "TypeScript Files", value: "20+" },
                  { label: "Lines of Code", value: "~2,500" },
                  { label: "Build Time", value: "<10s" },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 + index * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400">
                      {stat.value}
                    </div>
                    <div className="text-slate-600 dark:text-gray-400 mt-1">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Easter Egg Footer */}
          <motion.div variants={itemVariants} className="text-center py-8">
            <motion.p
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 3,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
              className="text-slate-500 dark:text-gray-500 text-sm"
            >
              You found the core. Welcome to the matrix. 🔮
            </motion.p>
            <p className="text-slate-400 dark:text-gray-600 text-xs mt-2">
              Built with 💜 by a lazy developer who automated everything
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
