# Nakshatra Matrimony Platform - Project Context for AI Agents

## Quick Summary

**Nakshatra Matrimony Platform** is a **Node.js/Express** desktop application for Hindu matrimonial services. It provides **Nakshatra-based compatibility matching** between profiles using traditional astrological rules. The application is packaged as a standalone Windows executable using PKG.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express.js 5.x |
| **Templating** | EJS (Embedded JavaScript) |
| **Frontend** | Bootstrap 5, Font Awesome, Custom CSS |
| **Data Storage** | JSON files (file-based, no database) |
| **Logging** | Winston with daily rotation |
| **Security** | Helmet, express-rate-limit, input sanitization |
| **Export** | PDF (pdf-lib), Excel (xlsx) |
| **Packaging** | PKG (creates standalone .exe) |

---

## Project Structure

```
project-root/
├── index.js                 # Application entry point
├── package.json             # Dependencies and build config
│
├── controllers/             # Request handlers
│   ├── profileController.js    # Profile CRUD operations
│   ├── matchingController.js   # Matching logic coordination
│   ├── exportController.js     # PDF/Excel export
│   ├── backupController.js     # Backup/restore functionality
│   └── authController.js       # Auth (not fully implemented)
│
├── services/                # Business logic layer
│   ├── MatchingOrchestratorService.js  # Main matching flow
│   ├── MatchingAlgorithmService.js     # Core matching algorithm
│   ├── MatchingFilterService.js        # Filter/sort logic
│   ├── RasiCompatibilityService.js     # Rasi/Lagnam compatibility
│   ├── ProfileService.js               # Profile data access
│   ├── NakshatraService.js             # Nakshatra data access
│   ├── GothramService.js               # Gothram management
│   └── ValidationService.js            # Input validation
│
├── routes/                  # Express route definitions
│   ├── profile-api-routes.js   # REST API for profiles
│   ├── profile-ejs-routes.js   # Page rendering routes
│   ├── matching-routes.js      # Matching API routes
│   ├── export-routes.js        # Export endpoints
│   └── backup-routes.js        # Backup/restore routes
│
├── views/                   # EJS templates
│   ├── partials/               # Reusable components
│   │   ├── navbar.ejs
│   │   ├── footer.ejs
│   │   ├── find-matching-search-form.ejs
│   │   └── find-matching-scripts.ejs
│   ├── showallprofile.ejs      # Profile listing page
│   ├── create-profile.ejs      # Profile creation form
│   ├── update-profile.ejs      # Profile edit form
│   └── find-matching.ejs       # Matching search page
│
├── public/                  # Static assets
│   ├── css/                    # Stylesheets
│   ├── js/                     # Client-side JavaScript
│   └── assets/                 # Images, fonts
│
├── data/                    # Default/seed data (bundled)
│   ├── nakshatra.json          # 27 Nakshatras master data
│   ├── gothram.json            # Gothram list
│   ├── male_matching_uthamam.json    # Male matching rules
│   ├── female_matching_uthamam.json  # Female matching rules
│   └── profile.json            # Sample profiles (not used at runtime)
│
├── utils/                   # Utility modules
│   ├── logger.js               # Winston logging setup
│   ├── appData.js              # AppData path management
│   ├── errorHandler.js         # Error handling utilities
│   └── sanitization.js         # Security middleware
│
├── middleware/              # Express middleware
│   └── versionMiddleware.js    # Version info injection
│
├── build/                   # Build scripts
│   ├── build-pkg.ps1           # Create executable
│   └── create-client-package.ps1  # Package for delivery
│
└── doc/                     # Documentation
```

---

## Data Storage Architecture

### Runtime Data Location
All user data is stored in **AppData** (not in project folder):

| Platform | Path |
|----------|------|
| **Windows** | `%APPDATA%\matrimony\data\` |
| **macOS** | `~/Library/Application Support/matrimony/data/` |
| **Linux** | `~/.config/matrimony/data/` |

### Key Data Files
| File | Location | Purpose |
|------|----------|---------|
| `profile.json` | AppData/data/ | All profile records |
| `gothram.json` | AppData/data/ | Custom gothram entries |
| `*.log` | AppData/logs/ | Application logs |

### Profile Data Structure
```javascript
{
  "id": 1,                    // Number (should be String for consistency)
  "serial_no": "M001",        // Unique identifier
  "name": "John Doe",
  "gender": "Male",           // "Male" or "Female"
  "birth_date": "1990-01-15",
  "nakshatraid": 5,           // 1-27 (references nakshatra.json)
  "gothram": "Bharadwaj",
  "rasi_lagnam": "Suth",      // Rasi/Lagnam value
  "qualification": "PG",
  "region": "Chennai",
  "contact_no": "9876543210",
  "is_active": true,
  "is_remarried": "false",    // Stored as string
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Core Business Logic

### Nakshatra Matching System
The application uses traditional Hindu astrology rules:

1. **27 Nakshatras**: Each profile has a nakshatra (birth star)
2. **Matching Rules**: Predefined compatibility between nakshatras
3. **Two Categories**: 
   - **Uthamam** (Excellent match)
   - **Mathimam** (Good match)
4. **Gender-specific**: Different rules for male vs female seekers

### Rasi/Lagnam Compatibility
Additional compatibility check based on planetary positions:

| Rasi Value | Risk Level |
|------------|------------|
| `Suth` | Safe (no risk planets) |
| `Sani`, `Sevai`, `Kethu`, `Raaghu` | Risk planets |
| Combined (e.g., `Sani/Kethu`) | Multiple risk planets |

**Compatibility Rule**: Risk planets must match between profiles.

---

## Key Files to Know

### When Modifying Profiles
- `controllers/profileController.js` - CRUD operations
- `routes/profile-api-routes.js` - API endpoints
- `routes/profile-ejs-routes.js` - Page routes
- `views/create-profile.ejs` - Creation form
- `views/update-profile.ejs` - Edit form
- `views/showallprofile.ejs` - Listing page

### When Modifying Matching
- `controllers/matchingController.js` - Entry point
- `services/MatchingOrchestratorService.js` - Flow control
- `services/MatchingAlgorithmService.js` - Core algorithm
- `services/RasiCompatibilityService.js` - Rasi logic
- `views/find-matching.ejs` - Search page
- `views/partials/find-matching-search-form.ejs` - Search form

### When Modifying UI/Styling
- `public/css/` - Stylesheets
- `public/css/brand.css` - Brand colors
- `views/partials/` - Reusable components

### When Modifying Build
- `package.json` - Version and PKG config
- `build/build-pkg.ps1` - Executable builder
- `build/create-client-package.ps1` - Package creator

---

## Known Issues & Technical Debt

### 1. Spelling Mismatch (Critical)
- **UI uses**: `Raaghu` (double 'a')
- **Service uses**: `Raghu` (single 'a')
- **File**: `services/RasiCompatibilityService.js` line 15
- **Impact**: Rasi compatibility may not work correctly for Raaghu values

### 2. Profile ID Type Inconsistency
- **New profiles**: ID stored as Number
- **Existing data**: ID stored as String
- **File**: `controllers/profileController.js` line 865
- **Workaround**: Code uses loose equality (`==`) which handles both

### 3. Disabled Security Middleware
- **File**: `index.js` lines 46-48
- **Issue**: `sanitizeBody` and `sanitizeQuery` are commented out

### 4. Unimplemented Auth
- **File**: `controllers/authController.js`
- **Status**: Login/register/logout are placeholder functions

---

## API Endpoints

### Profile APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile/filter` | Filter profiles |
| GET | `/api/profile/:id` | Get single profile |
| POST | `/api/profile` | Create profile |
| PUT | `/api/profile` | Update profile |

### Matching APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/matching/serial/:serialNo` | Match by serial number |
| GET | `/matching/nakshatra` | Match by nakshatra |

### Page Routes
| Route | Page |
|-------|------|
| `/` | Welcome page |
| `/profile/showall` | All profiles listing |
| `/profile/create` | Create profile form |
| `/profile/update/:id` | Edit profile form |
| `/matching/find` | Find matching page |
| `/backup/admin` | Backup management |

---

## Build & Deployment

### Development
```bash
npm run dev          # Start with nodemon (auto-reload)
npm start            # Start without auto-reload
```

### Production Build
```powershell
cd build
.\build-pkg.ps1                    # Create executable
.\create-client-package.ps1        # Create delivery package
```

### Output
- Executable: `dist/nakshatra-matrimony-win64.exe` (~85MB)
- Package: `dist/NakshatraMatrimony_v{X.X.X}_ClientPackage.zip`

---

## Coding Conventions

### Backend
- Use `const` and `let`, avoid `var`
- Async/await for asynchronous operations
- Structured logging with Winston
- Error handling with try/catch and custom error classes

### Frontend (EJS)
- Bootstrap 5 for layout and components
- Brand colors via CSS variables (`--brand-maroon`, `--brand-gold`)
- Font Awesome for icons
- EJS conditionals for dynamic content

### Data Handling
- JSON files for persistence
- Loose equality (`==`) for ID comparisons (mixed types)
- String normalization for boolean fields

---

## Common Tasks

### Add a New Filter to Profile Listing
1. Add input to `views/showallprofile.ejs` search form
2. Extract parameter in `routes/profile-api-routes.js`
3. Add filter logic in the filter endpoint

### Add a New Field to Profile
1. Update `models/profile.js` constructor
2. Update create/update forms in views
3. Update `controllers/profileController.js` create/update methods
4. Update any relevant display views

### Modify Matching Algorithm
1. Edit `services/MatchingAlgorithmService.js` for core logic
2. Edit `services/MatchingFilterService.js` for filtering
3. Edit `services/RasiCompatibilityService.js` for Rasi rules

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3131 | Server port |
| `NODE_ENV` | development | Environment mode |
| `AUTO_OPEN_BROWSER` | true | Open browser on start |
| `CHROME_APP_MODE` | true | Use Chrome app mode |

---

## Contact & Support

- **Logs Location**: `%APPDATA%\matrimony\logs\`
- **Data Location**: `%APPDATA%\matrimony\data\`
- **Documentation**: `doc/` folder

---

*This document should be provided to any AI agent or developer working on this project to ensure quick context understanding.*
