# 🏫 ESPRIT Empty Class Finder

A modern Next.js web application to help ESPRIT students find empty classrooms and locate their classes easily.

## ✨ Features

- 🔍 **Where Is My Class**: Search for your class location and view weekly schedules
- 🏠 **Find Empty Rooms**: Discover available classrooms by day, time, and building
- 📅 **Weekly Timetable**: View your class schedule in list or calendar format
- 🌙 **Dark Mode**: Full dark mode support
- 📱 **Responsive Design**: Works seamlessly on all devices
- 🎨 **Modern UI**: Beautiful gradients and smooth animations

## ⚠️ Known Issues

**Note**: There are currently bugs in the schedule parsing logic. The data extraction from ESPRIT's schedule system needs improvements. Contributions to fix the parser are welcome!

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

## 📁 Project Structure

```
app/                      # Next.js app directory
  ├── api/               # API routes
  ├── components/        # React components
  └── core/              # Core pages
components/ui/           # shadcn/ui components
data/                    # Schedule data and parsers
lib/                     # Utility functions
public/                  # Static assets
```

## 🛠️ Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui + Radix UI
- **Animations**: Framer Motion
- **Icons**: Lucide React

## 🤝 Contributing

Contributions are welcome! Especially help with fixing the schedule parser bugs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the MIT License.