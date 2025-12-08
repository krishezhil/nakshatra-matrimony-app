# Nakshatra Matching Matrimony Platform - Copilot Instructions

## Project Overview
This is a comprehensive matrimonial platform built with Node.js backend, EJS frontend, REST API, and file system data store. The platform specializes in Vedic astrology-based nakshatra matching for matrimonial purposes.

## Project Status
- [x] Project scaffolding completed (Node.js, EJS, REST API, file system data store)
- [x] Core matrimonial features implemented
- [x] Nakshatra matching system integrated
- [x] Porutham transformation system implemented (4→"M", 11→"U")
- [x] Comprehensive logging system with source context
- [x] Age-based filtering according to Indian matrimonial standards
- [x] Export functionality (PDF, Excel) with WhatsApp integration
- [x] Rate limiting and security features
- [x] Complete documentation and cleanup

## Architecture

### Backend (Node.js + Express)
- **Controllers**: Business logic for profiles, matching, export, auth
- **Services**: Core business services (ProfileService, MatchingService, etc.)
- **Routes**: API endpoints and EJS template routes
- **Middleware**: Error handling, rate limiting, validation
- **Utils**: Logging, configuration, validation, age calculation

### Frontend (EJS Templates + Vanilla JS)
- **Views**: EJS templates for all pages
- **Public Assets**: CSS (Bootstrap + custom), JavaScript modules
- **Features**: Responsive design, real-time validation, modal dialogs

### Data Storage (File System)
- **Profiles**: `data/users.json`
- **Nakshatra Data**: `data/nakshatra.json`
- **Gothram Data**: `data/gothram.json`
- **Matching Data**: `data/male_matching_*.json`, `data/female_matching_*.json`

## Key Features

### Nakshatra Matching
- Advanced compatibility analysis based on Vedic astrology
- Comprehensive porutham calculations
- Age-based filtering per Indian matrimonial standards

### Porutham Transformation
- Dual display modes: Short (4→"M", 11→"U") and Full format
- Configurable transformation in `public/js/utils/poruthamFormatter.js`
- Integrated across UI, exports, and WhatsApp sharing

### Comprehensive Logging
- Winston-based structured logging with JSON format
- Source context identification across all components
- Feature-specific loggers with consistent field ordering
- 85+ log statements across 21 files with clear source identification

### Export & Sharing
- PDF and Excel export capabilities
- WhatsApp integration for profile sharing
- Configurable export formats with porutham transformations

## Development Guidelines

### Code Organization
- Follow MVC pattern with clear separation of concerns
- Use structured logging with appropriate source context
- Implement comprehensive error handling
- Follow consistent naming conventions

### Logging Standards
```javascript
// Always include source field
log.info('Operation completed', {
  source: 'ComponentName',
  operation: 'operationName',
  additionalContext: value
});

// Use feature-specific loggers for complex operations
const featureLogger = log.findMatching();
featureLogger.featureStart('OPERATION_NAME', { source: 'ComponentName' });
```

### Error Handling
- Use centralized error handling via `utils/errorHandler.js`
- Provide user-friendly error messages
- Log errors with full context including source identification

### Performance
- Implement rate limiting for API endpoints
- Use efficient data structures for matching algorithms
- Cache frequently accessed data

## Testing & Validation

### Key Test Areas
1. **Porutham Transformations**: Verify 4→"M", 11→"U" across all displays
2. **Nakshatra Matching**: Validate compatibility calculations
3. **Age Filtering**: Test Indian matrimonial standard compliance
4. **Export Functionality**: PDF, Excel generation with correct data
5. **Logging System**: Verify source context in all log statements

### Validation Commands
```bash
# Start application
npm start

# Run in debug mode
LOG_LEVEL=debug npm start

# Check for errors
npm test
```

## Deployment

### Development
```bash
npm install
npm start
# Access at http://localhost:3000
```

### Production Executable
```bash
npm run build:exe
# Generates executable in dist/ folder
```

## Documentation
- **README.md**: Comprehensive project documentation
- **LOGGING_GUIDE.md**: Detailed logging system documentation
- **PORUTHAM_TRANSFORMATION.md**: Porutham transformation system guide

## Key Configuration Files
- **package.json**: Dependencies and scripts
- **index.js**: Main application entry point
- **utils/config.js**: Application configuration
- **public/js/utils/poruthamFormatter.js**: Porutham transformation configuration

## Best Practices for Development
1. **Always use structured logging** with source context
2. **Test porutham transformations** in all UI components
3. **Follow Indian matrimonial standards** for age filtering
4. **Maintain consistency** in error handling and validation
5. **Document any new features** thoroughly
6. **Use appropriate log levels** for different environments
7. **Test export functionality** after any profile-related changes

## Work through each development task systematically, keep communication concise and focused, and follow established development best practices.
