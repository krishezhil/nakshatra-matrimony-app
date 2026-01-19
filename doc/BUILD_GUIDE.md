# Nakshatra Matrimony Platform - Build & Distribution Guide

## Overview

This guide documents the complete build and distribution process for creating standalone executable packages for client delivery.

The project uses **PKG** (npm package) to create standalone executables that bundle Node.js with the application, requiring no additional installation on client machines.

---

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **PowerShell**: For running build scripts (Windows)
- **PKG**: Installed globally or via npx

```bash
# Install PKG globally (optional)
npm install -g pkg
```

---

## Project Structure (Build Related)

```
project-root/
├── build/
│   ├── build-pkg.ps1              # Step 1: Build executable
│   └── create-client-package.ps1  # Step 2: Create client package
├── dist/                          # Output directory
│   ├── nakshatra-matrimony-win64.exe
│   └── NakshatraMatrimony_v{X.X.X}_ClientPackage/
├── doc/
│   └── USER_MANUAL_Professional.pdf  # Required for client package
├── package.json                   # Contains version and PKG config
└── index.js                       # Application entry point
```

---

## Build Process

### Step 1: Update Version (Important!)

Before building, update the version in `package.json`:

```json
{
  "version": "1.0.8"
}
```

---

### Step 2: Build Executable

**Script:** `build/build-pkg.ps1`

**What it does:**
1. Validates environment (checks `package.json`, `index.js`)
2. Stops any running Node/Chrome processes
3. Updates version references
4. Builds Windows executable using PKG

**Command:**
```powershell
cd build
.\build-pkg.ps1
```

**Output:** `dist/nakshatra-matrimony-win64.exe`

**Build Duration:** Approximately 1-3 minutes depending on system

---

### Step 3: Create Client Package

**Script:** `build/create-client-package.ps1`

**What it does:**
1. Reads version from `package.json`
2. Creates package folder structure
3. Copies executable with versioned name
4. Copies documentation (PDF user manual)
5. Creates support info file
6. Creates ZIP archive

**Command:**
```powershell
cd build
.\create-client-package.ps1
```

**Optional Parameters:**
```powershell
# Custom version
.\create-client-package.ps1 -Version "1.0.8"

# Custom app name
.\create-client-package.ps1 -AppName "CustomAppName"

# Both
.\create-client-package.ps1 -AppName "MyApp" -Version "2.0.0"
```

**Output:**
```
dist/
├── NakshatraMatrimony_v{VERSION}_ClientPackage/
│   ├── NakshatraMatrimony-v{VERSION}.exe
│   ├── USER_MANUAL_Professional.pdf
│   └── SUPPORT_INFO.txt
└── NakshatraMatrimony_v{VERSION}_ClientPackage.zip
```

---

## Quick Build Commands

| Task | Command |
|------|---------|
| Build executable only | `cd build && .\build-pkg.ps1` |
| Create client package | `cd build && .\create-client-package.ps1` |
| Full build (both steps) | `cd build && .\build-pkg.ps1 && .\create-client-package.ps1` |

---

## NPM Scripts (Alternative Method)

From project root directory:

| Script | Command | Description |
|--------|---------|-------------|
| `build:exe` | `npm run build:exe` | Build Windows executable |
| `build:mac` | `npm run build:mac` | Build macOS executable |
| `build:linux` | `npm run build:linux` | Build Linux executable |
| `build:all` | `npm run build:all` | Build all platforms |

**Note:** These npm scripts create executables but do NOT create the client package. Use the PowerShell scripts for complete client packages.

---

## PKG Configuration

The PKG configuration in `package.json`:

```json
{
  "bin": "index.js",
  "pkg": {
    "assets": [
      "views/**/*",
      "public/**/*",
      "data/**/*",
      ".env.example",
      "node_modules/fflate/**/*"
    ],
    "scripts": [
      "index.js"
    ],
    "targets": [
      "node18-win-x64",
      "node18-macos-x64",
      "node18-linux-x64"
    ],
    "options": [
      "--no-warnings"
    ]
  }
}
```

### Assets Explanation

| Asset | Purpose |
|-------|---------|
| `views/**/*` | EJS templates for rendering pages |
| `public/**/*` | Static files (CSS, JS, images, fonts) |
| `data/**/*` | Default data files (nakshatra, gothram, etc.) |
| `.env.example` | Environment configuration template |
| `node_modules/fflate/**/*` | Compression library for exports |

---

## Complete Build Workflow

```
┌─────────────────────────────────────────┐
│  1. Update version in package.json      │
│     "version": "X.X.X"                  │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  2. cd build                            │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  3. .\build-pkg.ps1                     │
│     Output: dist/nakshatra-matrimony-   │
│             win64.exe                   │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  4. .\create-client-package.ps1         │
│     Output: dist/NakshatraMatrimony_    │
│             v{X.X.X}_ClientPackage.zip  │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  5. Deliver ZIP to client               │
└─────────────────────────────────────────┘
```

---

## Troubleshooting

### Common Issues

#### 1. PKG Not Found
```
Error: 'pkg' is not recognized as a command
```
**Solution:** Install PKG globally or use npx:
```bash
npm install -g pkg
# OR use npx (no installation needed)
npx pkg ...
```

#### 2. Build Fails - Missing Files
```
Error: package.json not found!
```
**Solution:** Ensure you're running scripts from the `build/` directory:
```powershell
cd build
.\build-pkg.ps1
```

#### 3. Client Package Missing PDF
```
WARNING: USER_MANUAL_Professional.pdf not found
```
**Solution:** Ensure the PDF exists in `doc/` folder before creating client package.

#### 4. Executable Already Running
```
Error: File in use
```
**Solution:** The build script automatically stops Node processes, but you may need to manually close the running application.

#### 5. Large Executable Size
The executable is ~85MB because it bundles:
- Node.js runtime
- All application code
- All dependencies
- Static assets

This is normal for PKG-built applications.

---

## Client Package Contents

The final client package ZIP contains:

| File | Description |
|------|-------------|
| `NakshatraMatrimony-v{X.X.X}.exe` | Standalone Windows executable |
| `USER_MANUAL_Professional.pdf` | User documentation |
| `SUPPORT_INFO.txt` | Version info and support details |

---

## Post-Build Checklist

- [ ] Version number is correct in package.json
- [ ] Executable runs without errors
- [ ] All features work (profile CRUD, matching, export)
- [ ] PDF documentation is included
- [ ] ZIP file is created successfully
- [ ] Test on a clean Windows machine (no Node.js installed)

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 1.0.5 | - | Initial client release |
| 1.0.6 | - | Bug fixes |
| 1.0.7 | - | Feature updates |

---

## Related Documentation

- `doc/CLIENT_DELIVERY_GUIDE.md` - Client delivery process
- `doc/QUICK_START_EXECUTABLE.md` - Quick start for end users
- `doc/USER_MANUAL.md` - Complete user documentation

---

*Last Updated: January 2026*
