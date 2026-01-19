# Nakshatra Matrimony Platform

<p align="center">
  <img src="public/assets/logo.png" alt="Nakshatra Matrimony Logo" width="150">
</p>

<p align="center">
  <strong>A Hindu Matrimony Desktop Application with Nakshatra-based Compatibility Matching</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node Version">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg" alt="Platform">
  <img src="https://img.shields.io/badge/license-ISC-green.svg" alt="License">
</p>

---

## Overview

Nakshatra Matrimony Platform is a comprehensive matrimonial application that uses **traditional Vedic astrology** to provide compatibility matching based on **Nakshatras** (birth stars). The application features profile management, advanced matching algorithms, PDF/Excel exports, and can be packaged as a standalone desktop application requiring no installation.

### Key Highlights

- **Nakshatra-based Matching**: Uses traditional 27-Nakshatra compatibility rules
- **Rasi/Lagnam Compatibility**: Additional planetary compatibility checks
- **No Database Required**: JSON file-based storage for simplicity
- **Standalone Executable**: Can be packaged as a single `.exe` file
- **Offline Capable**: Works without internet connection

---

## Features

### Core Functionality
- **Profile Management** - Create, update, search, and manage matrimonial profiles
- **Nakshatra Matching** - Advanced compatibility analysis based on Vedic astrology
- **Porutham Calculations** - Comprehensive porutham scoring (Uthamam/Mathimam)
- **Age-based Filtering** - Indian matrimonial standards for age compatibility
- **Export Capabilities** - PDF and Excel export with detailed matching information
- **WhatsApp Integration** - Share profiles and matching results via WhatsApp

### Advanced Features
- **Dual Porutham Display** - Toggle between short (M/U) and full format
- **Comprehensive Logging** - Structured logging across all application layers
- **Backup & Restore** - Full data backup and restore functionality
- **Input Validation** - Comprehensive sanitization and validation

> **Note**: Rate limiting is available but **disabled by default** for optimal desktop app performance.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express.js 5.x |
| **Templating** | EJS (Embedded JavaScript) |
| **Frontend** | Bootstrap 5, Font Awesome |
| **Data Storage** | JSON files (no database) |
| **Logging** | Winston with daily rotation |
| **Security** | Helmet, express-rate-limit |
| **Export** | PDF (pdf-lib), Excel (xlsx) |
| **Packaging** | PKG (standalone executable) |

---

## Quick Start

### Prerequisites

- **Node.js** v18.0.0 or higher
- **npm** v8.0.0 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/nakshatra-matrimony-app.git

# Navigate to project directory
cd nakshatra-matrimony-app

# Install dependencies
npm install
```

### Development Mode

```bash
# Start with auto-reload (nodemon)
npm run dev

# Or start without auto-reload
npm start
```

The application will be available at **http://localhost:3131**

### Build Standalone Executable

```powershell
# Windows executable
npm run build:exe

# Cross-platform builds
npm run build:all
```

The executable will be created in the `dist/` folder.

---

## Screenshots

<p align="center">
  <em>Screenshots coming soon</em>
</p>

<!-- Add your screenshots here -->
<!-- 
<p align="center">
  <img src="doc/screenshots/home.png" alt="Home Page" width="400">
  <img src="doc/screenshots/matching.png" alt="Matching Page" width="400">
</p>
-->

---

## Project Structure

```
nakshatra-matrimony-app/
├── index.js                 # Application entry point
├── package.json             # Dependencies and scripts
│
├── controllers/             # Request handlers
│   ├── profileController.js
│   ├── matchingController.js
│   └── exportController.js
│
├── services/                # Business logic
│   ├── MatchingAlgorithmService.js
│   ├── RasiCompatibilityService.js
│   └── ProfileService.js
│
├── routes/                  # Express routes
│   ├── profile-api-routes.js
│   └── matching-routes.js
│
├── views/                   # EJS templates
│   ├── partials/
│   └── *.ejs
│
├── public/                  # Static assets
│   ├── css/
│   ├── js/
│   └── assets/
│
├── data/                    # Seed/reference data
│   ├── nakshatra.json
│   └── gothram.json
│
├── build/                   # Build scripts
│   ├── build-pkg.ps1
│   └── create-client-package.ps1
│
└── doc/                     # Documentation
    ├── BUILD_GUIDE.md
    ├── PROJECT_CONTEXT.md
    └── USER_MANUAL.md
```

---

## Documentation

Detailed documentation is available in the `doc/` folder:

| Document | Description |
|----------|-------------|
| [BUILD_GUIDE.md](doc/BUILD_GUIDE.md) | How to build and package the application |
| [PROJECT_CONTEXT.md](doc/PROJECT_CONTEXT.md) | Detailed project context for developers |
| [USER_MANUAL.md](doc/USER_MANUAL.md) | End-user documentation |
| [CLIENT_DELIVERY_GUIDE.md](doc/CLIENT_DELIVERY_GUIDE.md) | Client deployment guide |
| [LOGGING_GUIDE.md](doc/LOGGING_GUIDE.md) | Logging system documentation |
| [SECURITY.md](doc/SECURITY.md) | Security considerations |

---

## API Endpoints

### Profile APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile/filter` | Filter profiles with criteria |
| GET | `/api/profile/:id` | Get single profile |
| POST | `/api/profile` | Create new profile |
| PUT | `/api/profile` | Update profile |

### Matching APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/matching/serial/:serialNo` | Match by serial number |
| GET | `/matching/nakshatra` | Match by nakshatra |

### Export APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/export/profiles/pdf` | Export profiles to PDF |
| POST | `/export/profiles/excel` | Export profiles to Excel |

---

## Configuration

### Environment Variables

Create a `.env` file in the project root (optional - defaults work out of the box):

```env
# Application
PORT=3131
NODE_ENV=development

# Browser Settings
AUTO_OPEN_BROWSER=true
CHROME_APP_MODE=true

# Logging
LOG_LEVEL=info
ENABLE_FILE_LOGGING=true
CONSOLE_LOGGING=true
```

> **Note**: Rate limiting is **disabled by default** for desktop app performance. The infrastructure exists if needed for server deployments.

---

## Data Storage

User data is stored in the system's AppData directory:

| Platform | Location |
|----------|----------|
| **Windows** | `%APPDATA%\matrimony\data\` |
| **macOS** | `~/Library/Application Support/matrimony/data/` |
| **Linux** | `~/.config/matrimony/data/` |

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Use `const` and `let`, avoid `var`
- Use async/await for asynchronous operations
- Follow existing code formatting
- Add appropriate logging for new features
- Update documentation for significant changes

---

## License

Distributed under the ISC License. See `LICENSE` for more information.

---

## Support

- **Logs**: Check `%APPDATA%\matrimony\logs\` for application logs
- **Issues**: Open an issue on GitHub for bugs or feature requests
- **Documentation**: See the `doc/` folder for detailed guides

---

## Acknowledgments

- Traditional Vedic astrology texts for Nakshatra matching rules
- Bootstrap team for the excellent UI framework
- Node.js community for the amazing ecosystem

---

<p align="center">
  Made with ❤️ for Kandan Seva Sangam
</p>
