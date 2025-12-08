# Security Documentation

## Known Vulnerabilities (As of September 2025)

### High Priority Issues

#### 1. XLSX Package Vulnerability
- **Package**: xlsx@^0.18.5
- **Severity**: High
- **Issues**: 
  - Prototype Pollution (GHSA-4r6h-8v6p-xvw6)
  - Regular Expression Denial of Service (GHSA-5pgg-2g8v-p4x9)
- **Status**: No fix available from vendor
- **Mitigation**: 
  - Input validation before XLSX processing
  - File size limits enforced
  - Timeout protection on XLSX operations
  - Used only for export (no user upload processing)

#### 2. PKG Package Vulnerability  
- **Package**: pkg@^5.8.1
- **Severity**: Moderate
- **Issues**: Local Privilege Escalation (GHSA-22r3-9w55-cj54)
- **Status**: No fix available from vendor
- **Mitigation**: 
  - Development/build tool only (not in production runtime)
  - Used only for executable packaging
  - No user input processed by pkg

### Security Measures Implemented

#### Environment Variables
- Secrets moved to .env file
- Example template provided (.env.example)
- Production secrets marked for replacement

#### Input Validation
- All user inputs validated in controllers
- Profile data validation functions implemented
- Nakshatra ID validation with allowlists
- Phone number format validation
- Date format validation

#### Logging Security
- Sensitive data (phone, email) masked in logs
- Structured logging with controlled data exposure
- Log files stored in AppData (user-specific)

#### Error Handling
- Consistent error responses without data leakage
- Stack traces not exposed to frontend
- Detailed errors logged server-side only

## Recommended Actions

### Immediate (Next Release)
1. ✅ Add .env file configuration
2. ✅ Implement input sanitization
3. ✅ Update package.json metadata
4. ⚠️ Monitor for xlsx/pkg security updates

### Short Term (Next 3 Months)
1. Research xlsx alternatives (e.g., exceljs, node-xlsx)
2. Consider replacing pkg with alternatives (nexe, electron-builder)
3. Implement Content Security Policy (CSP)
4. Add rate limiting for API endpoints

### Long Term (Next 6 Months)
1. Security audit by external vendor
2. Penetration testing
3. Dependency scanning automation
4. Security compliance documentation

## Security Contacts
- For security issues: [Add contact email]
- For vulnerability reports: [Add contact method]

## Last Updated
September 14, 2025