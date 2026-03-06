# 🏫 ESPRIT Classroom Finder

A modern Next.js web application to help ESPRIT students find empty classrooms, locate their classes, and stay on top of the academic calendar.

## ✨ Features

### 🏠 Find Empty Rooms
- Search available classrooms by **day**, **time slot**, and **building/bloc**
- Auto-detects the current day and time to pre-fill the search form
- Displays **FREEWARNING** rooms (rooms that are technically free but may have soutenances)
- Results grouped and styled for quick scanning

### 🔍 Where's My Class?
- Search for any class by code to see its **current room** and session status
- View the full **weekly schedule** for any class
- **Remembers your last searched class** via localStorage for quick access
- Shows the **nearest empty room** relative to your current class location

### 📅 Year Calendar
- Full **academic year calendar** (2025/2026) with week names and dates
- Quick visual reference for the whole semester

### 📢 Academic Ticker
- Banner at the top of the page showing the **current academic week** in real time

### 🌙 Dark Mode
- Full dark/light theme toggle, persisted across sessions

### 🕌 Ramadan Mode
- Switchable schedule times for the Ramadan period (adjusted morning/afternoon slots)
- Easily toggled via `app/config.ts`

### 🎓 Student Dashboard Banner
- Dismissible banner linking to the community **ESPRIT Student Dashboard** (grades, absences, and more)

### 🤝 ESPRIT Discord
- Prominent link to the **ESPRIT Discord server** for drives, courses, events, PFEs, and internships

### 📱 Responsive Design
- Works seamlessly on mobile, tablet, and desktop

### 🎨 Modern UI
- Beautiful gradients, smooth animations (Framer Motion), and accessible components

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/TheLime1/esprit-empty-class.git
cd esprit-empty-class
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Production Build

```bash
npm run build
npm start
```

## ⚙️ Configuration

All runtime flags live in `app/config.ts`:

| Export | Type | Description |
|---|---|---|
| `MAINTENANCE_MODE` | `boolean` | Set to `true` to show a maintenance page instead of the app |
| `RAMADAN_MODE` | `boolean` | Set to `true` to use Ramadan-adjusted schedule time slots |
| `TIME_SLOTS` | object | Derived from `RAMADAN_MODE` — morning/afternoon start/end times |
| `FRIDAY_AFTERNOON` | object | Friday-specific afternoon time slot |
| `CONTRIBUTORS` | array | List of contributors shown in the footer `{ name, url }` |

## 📁 Project Structure

```
app/
  ├── api/               # Next.js API routes
  │   ├── calendar/      # Academic calendar endpoint
  │   ├── classes/       # Class location & schedule endpoints
  │   ├── current-week/  # Current week endpoint
  │   ├── empty/         # Available days endpoint
  │   ├── rooms/         # Free rooms & nearest room endpoints
  │   └── v1/            # Versioned API
  ├── components/        # Feature components
  │   ├── FindEmptyRooms/   # Empty room search UI
  │   ├── WhereIsMyClass/   # Class location UI
  │   ├── YearCalendar/     # Academic calendar UI
  │   ├── Shared/           # Shared/reusable components
  │   ├── AcquisitionFooter.tsx
  │   ├── ContributorsFooter.tsx
  │   ├── DashboardBanner.tsx
  │   ├── MaintenancePage.tsx
  │   └── TopTabs.tsx
  ├── config.ts          # App-wide feature flags & configuration
  ├── core/              # Core/legacy pages
  └── docs/              # Documentation page
components/ui/           # shadcn/ui base components
data/
  ├── schedules.json           # Weekly class schedules
  ├── year_calendar2025-2026.json  # Academic year calendar
  └── data_exporter.py         # Python script to parse schedule PDFs
lib/                     # Utility functions
public/                  # Static assets
```

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI Library | React 19 |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui + Radix UI |
| Animations | Framer Motion |
| Data Fetching | TanStack Query v5 |
| Date Utilities | date-fns |
| Form Validation | Zod |
| Notifications | Sonner |
| Icons | Lucide React |
| Analytics | Vercel Analytics |

## 👥 Contributors

| Name | GitHub |
|---|---|
| Aymen Hmani | [@TheLime1](https://github.com/TheLime1) |
| Mohamed Aziz LAKHDHAR | [@AzizLAKHDHAR](https://github.com/AzizLAKHDHAR) |

> **Note**: The contributor list displayed in the app footer is maintained in `app/config.ts` (`CONTRIBUTORS` array). Keep both in sync when adding new contributors.

Want to see your name here? Check out the [Contributing](#-contributing) section!

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

After your PR is merged, add yourself to the `CONTRIBUTORS` array in `app/config.ts` so you appear in the app footer.

## 📝 License

This project is open source and available under the MIT License.