# Nakshatra Matching Matrimony Platform

A comprehensive matrimonial platform with advanced nakshatra matching, porutham calculations, and profile management capabilities.

## 🌟 Features

### Core Functionality
- **Profile Management**: Create, update, search, and manage matrimonial profiles
- **Nakshatra Matching**: Advanced compatibility analysis based on Vedic astrology
- **Porutham Calculations**: Comprehensive porutham scoring with configurable display formats
- **Age-based Filtering**: Indian matrimonial standards for age compatibility
- **Export Capabilities**: PDF and Excel export with detailed matching information
- **WhatsApp Integration**: Share profiles and matching results via WhatsApp

### Advanced Features
- **Dual Porutham Display**: Toggle between short format (M/U) and full format (Mathimam/Uthamam)
- **Comprehensive Logging**: Structured logging with source identification across all application layers
- **Rate Limiting**: Configurable rate limiting for different operations
- **Input Validation**: Comprehensive sanitization and validation
- **Error Handling**: Centralized error management with detailed logging
- **Performance Monitoring**: Request tracking and operation timing

## 🚀 Quick Start

### Development Mode
```bash
# Install dependencies
npm install

# Start development server
npm start

# Access the application
http://localhost:3131
```

### Production Deployment

#### Executable Distribution
1. **Update Version (if needed):**
   - Edit `utils/version.js` line 8: `version: '1.0.x'`

2. **Build the Executable:**
   ```powershell
   .\build-pkg.ps1
   ```
   
3. **Distribute:**
   - Provide `dist/nakshatra-matrimony-win64.exe` to clients
   - Windows executable only (89MB, self-contained)

4. **Client Usage:**
   - Double-click `nakshatra-matrimony-win64.exe` to start
   - Browser opens automatically to `http://localhost:3131`
   - No installation or Node.js required

#### Traditional Server Deployment
```bash
# Production mode
NODE_ENV=production npm start

# With PM2
pm2 start index.js --name "matrimony-platform"
```

## 📁 Project Structure

```
├── controllers/          # Business logic controllers
├── data/                 # JSON data files (profiles, nakshatra, gothram)
├── middleware/           # Express middleware (error handling, etc.)
├── models/              # Data models and schemas
├── public/              # Static assets (CSS, JS, images)
│   ├── css/            # Styling (Bootstrap, custom themes)
│   ├── js/             # Client-side JavaScript
│   └── assets/         # Images and other assets
├── routes/              # Express routes (API and EJS)
├── services/            # Business logic services
├── utils/               # Utility functions and helpers
├── views/               # EJS templates
└── README.md
```

## 🔧 Configuration

### Environment Variables
```bash
# Application
PORT=3131
NODE_ENV=development

# Logging
LOG_LEVEL=info
ENABLE_FILE_LOGGING=true
CONSOLE_LOGGING=true

# Rate Limiting
ENABLE_RATE_LIMITING=false  # Set to 'false' to enable rate limiting
```

### Porutham Display Configuration
The application supports dual display formats for porutham values:

**Short Format (Default):**
- 4 → "M" (Mathimam)
- 11 → "U" (Uthamam)
- Other values → unchanged

**Full Format:**
- 4 → "Mathimam"
- 11 → "Uthamam"
- Other values → unchanged

Configure in `public/js/utils/poruthamFormatter.js`:
```javascript
const PORUTHAM_CONFIG = {
  displayFormat: 'short' // or 'full'
};
```

## 📊 Logging System

### Structured Logging
The application features comprehensive structured logging with:

- **JSON Format**: All logs in structured JSON format
- **Source Context**: Every log includes source identification
- **Feature Tracking**: Feature-specific logging contexts
- **Field Ordering**: Consistent log field arrangement
- **Performance Metrics**: Request timing and operation tracking

### Log Levels
- `trace`: Detailed debugging information
- `debug`: General debugging information
- `info`: General information and successful operations
- `warn`: Warning messages for potential issues
- `error`: Error messages for failures and exceptions

### Log Fields Structure
```json
{
  "timestamp": "2025-10-18T10:30:00.000Z",
  "level": "info",
  "feature": "FIND_MATCHING",
  "source": "MatchingController",
  "message": "Matching operation completed",
  "metadata": { ... }
}
```

## 🛡️ Security Features

- **Input Validation**: Comprehensive sanitization using express-validator
- **Rate Limiting**: Configurable rate limits for different endpoints
- **Error Handling**: Secure error responses without sensitive data exposure
- **Request Size Limits**: Protection against large request attacks
- **Timeout Protection**: Request timeout handling

## 📱 API Endpoints

### Profile Management
- `GET /api/profile` - List all profiles
- `GET /api/profile/filter` - Filter profiles with criteria
- `POST /api/profile` - Create new profile
- `PUT /api/profile` - Update existing profile
- `GET /api/profile/:id` - Get specific profile

### Matching Operations
- `GET /api/find` - Find matching profiles
- `POST /api/find` - Find matching profiles (form data)

### Export Operations
- `GET /export/api/export` - Export data
- `GET /export/matching-profiles` - Export matching profiles
- `POST /export/profiles/pdf` - Generate PDF export
- `POST /export/profiles/excel` - Generate Excel export

### Common Data
- `GET /common/api/nakshatra` - Get nakshatra data
- `GET /common/api/gothram` - Get gothram data
- `POST /common/api/gothram` - Create new gothram

### Backup Operations
- `GET /backup/admin` - Backup administration page
- `POST /backup/create` - Create data backup
- `POST /backup/restore` - Restore from backup

## 🎨 User Interface

### Pages
- **Welcome**: Entry page with application introduction
- **Home**: Main application page with navigation
- **Create Profile**: Profile creation form with comprehensive validation
- **Search Profiles**: Profile search and filtering
- **Find Matching**: Nakshatra-based matching interface
- **View All Profiles**: Complete profile listing with age calculation
- **Update Profile**: Profile editing interface
- **Data Backup**: Backup and restore functionality

### Features
- **Responsive Design**: Bootstrap-based responsive layout
- **Interactive Forms**: Real-time validation and feedback
- **Modal Dialogs**: WhatsApp sharing and detailed views
- **Export Options**: PDF and Excel download capabilities
- **Error Handling**: User-friendly error messages
- **Auto Browser**: Chrome app mode with automatic startup

### Note on Authentication
The application currently operates without user authentication. Login/register pages exist as UI templates but are not functionally implemented.

## 🔧 Development

### Available Scripts
```bash
npm start          # Start development server
npm test           # Run tests
.\build-pkg.ps1     # Build executable (PowerShell)
npm run dev        # Development with nodemon
```

### Code Quality
- **ESLint**: Code linting and style enforcement
- **Error Handling**: Comprehensive error management
- **Logging**: Structured logging throughout application
- **Validation**: Input validation and sanitization

## 📈 Performance

### Optimization Features
- **Efficient Matching**: Optimized nakshatra matching algorithms
- **Data Caching**: In-memory data caching for common operations
- **Request Optimization**: Minimal data transfer and processing
- **Error Recovery**: Graceful error handling and recovery

### Monitoring
- **Request Tracking**: HTTP request logging and timing
- **Operation Metrics**: Database and file operation tracking
- **Error Monitoring**: Comprehensive error logging and tracking
- **Performance Logging**: Operation timing and performance metrics

## 🛠️ Data Storage

### File-based Storage
- **Profiles**: `data/users.json`
- **Nakshatra**: `data/nakshatra.json`
- **Gothram**: `data/gothram.json`
- **Matching Data**: `data/male_matching_*.json`, `data/female_matching_*.json`

### Data Portability
- All data stored in user's appdata directory for executables
- Easy backup and migration capabilities
- Cross-platform compatibility

## 🐛 Troubleshooting

### Common Issues
1. **Port Already in Use**: Change PORT environment variable
2. **Data File Errors**: Check file permissions and format
3. **Rate Limiting**: Adjust rate limit configuration
4. **Logging Issues**: Verify file write permissions

### Debug Mode
Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

## 📝 License

[Add your license information here]

## 👥 Support

For issues and support:
- Check the logs in `logs/` directory
- Review error messages in console
- Contact the development team

---

**Version**: 1.0.4
**Last Updated**: November 2025
