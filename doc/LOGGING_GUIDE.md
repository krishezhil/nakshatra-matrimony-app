# Logging System Guide

## Overview

The Nakshatra Matching Matrimony Platform features a comprehensive structured logging system built on Winston, providing detailed insights into application behavior, performance, and error tracking.

## Logging Architecture

### Core Components

1. **Logger Utility** (`utils/logger.js`)
   - Central logging configuration and management
   - Feature-specific logger creation
   - Structured JSON format with consistent field ordering

2. **Feature-Specific Loggers**
   - `createProfile()` - Profile creation operations
   - `searchProfile()` - Profile search and filtering
   - `findMatching()` - Nakshatra matching operations
   - `export()` - Data export operations
   - `auth()` - Authentication operations
   - `system()` - System-level operations

3. **Source Context Identification**
   - Every log statement includes source field
   - Clear identification of originating component
   - Comprehensive coverage across all application layers

## Log Structure

### JSON Format
```json
{
  "timestamp": "2025-10-18T10:30:00.000Z",
  "level": "info",
  "feature": "FIND_MATCHING",
  "source": "MatchingController",
  "message": "Nakshatra matching operation completed successfully",
  "metadata": {
    "seekerProfile": "12345",
    "matchesFound": 15,
    "processingTime": "245ms",
    "operation": "findMatching"
  }
}
```

### Field Ordering
1. **timestamp** - ISO 8601 format timestamp
2. **level** - Log level (trace, debug, info, warn, error)
3. **feature** - Feature context (if applicable)
4. **source** - Source component identifier
5. **message** - Human-readable log message
6. **metadata** - Additional structured data

## Log Levels

### trace
- Detailed debugging information
- Function entry/exit points
- Step-by-step operation tracking
- Development and troubleshooting

### debug
- General debugging information
- Data processing steps
- Configuration details
- Development insights

### info
- General information messages
- Successful operations
- System status updates
- Normal application flow

### warn
- Warning messages
- Potential issues
- Performance concerns
- Rate limit notifications

### error
- Error messages
- Exception details
- Failed operations
- Critical issues requiring attention

## Source Context Implementation

### Application Layers

#### Core System (`source: 'Application'`)
- Main application initialization
- Server startup and shutdown
- Global configuration

#### Controllers (`source: '*Controller'`)
- `MatchingController` - Matching operations
- `ProfileController` - Profile CRUD operations
- `ExportController` - Export functionality
- `CommonController` - Common data operations
- `AuthController` - Authentication operations

#### Services (`source: '*Service'`)
- `ProfileService` - Profile business logic
- `MatchingDataService` - Matching data management
- `NakshatraService` - Nakshatra operations
- `GothramService` - Gothram management
- `ValidationService` - Input validation
- `ResponseFormatterService` - Response formatting
- `MatchingOrchestratorService` - Matching orchestration
- `MatchingFilterService` - Filtering operations
- `MatchingAlgorithmService` - Matching algorithms
- `RasiCompatibilityService` - Rasi compatibility

#### Routes (`source: '*Routes'`)
- `ProfileEjsRoutes` - EJS template routes
- `ProfileApiRoutes` - Profile API endpoints
- Other route handlers

#### Middleware (`source: '*Middleware'`)
- `ErrorMiddleware` - Error handling
- Custom middleware components

#### Utilities (`source: '*Utility'`)
- `RateLimiting` - Rate limiting operations
- `Sanitization` - Input sanitization
- `AgeCalculator` - Age calculations
- `ErrorHandler` - Error processing
- `Logger` - Logging operations

## Feature-Specific Logging

### Profile Operations
```javascript
// Unified Profile Logger (Recommended)
const profileLogger = log.profile();

profileLogger.featureStart('CREATE_PROFILE', {
  source: 'ProfileController',
  operation: 'CREATE_PROFILE',
  userId: req.user?.id,
  sessionId: req.sessionID
});

profileLogger.methodEntry('validateProfile', {
  source: 'ProfileController',
  fieldsReceived: Object.keys(profileData).length
});

profileLogger.info('Profile created successfully', {
  source: 'ProfileController',
  profileId: newProfile.id,
  profileType: profileData.gender
});
```

#### Profile Operations - Unified Approach

All profile-related operations (CREATE, UPDATE, GET, LIST, FILTER) now use the unified `log.profile()` logger with specific operation contexts:

```javascript
// Update Profile
const profileLogger = log.profile();
profileLogger.featureStart('UPDATE_PROFILE', {
  source: 'ProfileController',
  operation: 'UPDATE_PROFILE'
});

// Create Profile  
profileLogger.featureStart('CREATE_PROFILE', {
  source: 'ProfileController', 
  operation: 'CREATE_PROFILE'
});

// Filter Profiles
profileLogger.featureStart('FILTER_PROFILES', {
  source: 'ProfileApiRoutes',
  operation: 'FILTER_PROFILES'
});
```

**Benefits:**
- Consistent `"feature":"PROFILE"` across all profile operations
- Clear operation identification via `"operation"` field
- Reduced confusion about which logger to use
- Easier maintenance and debugging

### Matching Operations
```javascript
const matchingLogger = log.findMatching();

matchingLogger.featureStart('FIND_MATCHING', {
  source: 'MatchingController',
  seekerProfile: seekerData.id,
  matchingType: 'nakshatra'
});

matchingLogger.trace('Nakshatra compatibility calculated', {
  source: 'MatchingAlgorithmService',
  seekerNakshatra: seekerData.nakshatra,
  candidateNakshatra: candidate.nakshatra,
  compatibilityScore: score
});
```

### Error Logging
```javascript
log.error('Database operation failed', {
  source: 'ProfileService',
  operation: 'readProfiles',
  errorCode: err.code,
  filePath: dataPath,
  errorMessage: err.message
}, err);
```

## Configuration

### Environment Variables
```bash
# Logging Level
LOG_LEVEL=info          # trace, debug, info, warn, error

# File Logging
ENABLE_FILE_LOGGING=true
LOG_FILE_PATH=./logs/app.log

# Console Logging
CONSOLE_LOGGING=true
CONSOLE_LOG_LEVEL=info

# Features
ENABLE_REQUEST_TRACKING=true
ENABLE_PERFORMANCE_LOGGING=true
```

### Programmatic Configuration
```javascript
const config = {
  logLevel: 'info',
  enableFileLogging: true,
  enableConsoleLogging: true,
  features: {
    requestTracking: true,
    performanceLogging: true,
    errorTracking: true
  }
};
```

## Log File Management

### File Structure
```
logs/
├── app.log              # Main application log
├── error.log            # Error-specific log
├── access.log           # Request access log
└── archive/             # Archived log files
    ├── app-2025-10-17.log
    └── app-2025-10-16.log
```

### Rotation Policy
- Daily rotation for main application logs
- Size-based rotation (100MB threshold)
- 30-day retention policy
- Automatic compression of archived logs

## Monitoring and Analysis

### Key Metrics to Monitor

1. **Error Rates**
   - Count of error-level logs
   - Error patterns and frequencies
   - Critical error alerts

2. **Performance Metrics**
   - Request processing times
   - Database operation duration
   - Matching algorithm performance

3. **Feature Usage**
   - Profile creation rates
   - Search operation frequency
   - Export operation patterns

4. **System Health**
   - Application startup/shutdown events
   - Memory usage patterns
   - Rate limiting activations

### Log Analysis Tools

#### Command Line Analysis
```bash
# Error analysis
grep '"level":"error"' logs/app.log | jq .

# Performance monitoring
grep '"duration"' logs/app.log | jq '.metadata.duration'

# Feature usage
grep '"feature":"FIND_MATCHING"' logs/app.log | jq .

# Source-specific logs
grep '"source":"MatchingController"' logs/app.log | jq .
```

#### Structured Queries
```bash
# Find all errors from ProfileController
jq 'select(.level=="error" and .source=="ProfileController")' logs/app.log

# Performance analysis for matching operations
jq 'select(.feature=="FIND_MATCHING" and .metadata.duration)' logs/app.log

# Rate limiting events
jq 'select(.message | contains("Rate limit"))' logs/app.log
```

## Best Practices

### For Developers

1. **Use Appropriate Log Levels**
   - `trace` for detailed debugging
   - `debug` for development insights
   - `info` for normal operations
   - `warn` for potential issues
   - `error` for failures

2. **Include Relevant Context**
   - Always include `source` field
   - Add operation identifiers
   - Include timing information
   - Provide relevant metadata

3. **Avoid Sensitive Data**
   - Use `log.maskSensitive()` for user data
   - Never log passwords or tokens
   - Sanitize personal information

4. **Performance Considerations**
   - Use appropriate log levels for production
   - Avoid excessive logging in tight loops
   - Consider async logging for high-volume scenarios

### For Operations

1. **Monitor Critical Logs**
   - Set up alerts for error-level logs
   - Monitor performance degradation
   - Track feature usage patterns

2. **Regular Log Review**
   - Weekly error pattern analysis
   - Performance trend monitoring
   - Capacity planning based on usage logs

3. **Log Retention**
   - Maintain adequate retention periods
   - Archive critical logs for compliance
   - Regular cleanup of old log files

## Troubleshooting

### Common Issues

1. **Missing Log Files**
   - Check file permissions
   - Verify log directory exists
   - Check disk space availability

2. **Poor Performance**
   - Reduce log level in production
   - Enable file logging only when needed
   - Monitor log file sizes

3. **Missing Context**
   - Verify source field in all log statements
   - Check feature logger usage
   - Ensure proper error logging

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Enable trace logging (very verbose)
LOG_LEVEL=trace npm start

# File logging only
CONSOLE_LOGGING=false npm start
```

## Integration Examples

### Custom Middleware Logging
```javascript
const customMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  log.info('Middleware processing started', {
    source: 'CustomMiddleware',
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent')
  });
  
  res.on('finish', () => {
    log.info('Middleware processing completed', {
      source: 'CustomMiddleware',
      statusCode: res.statusCode,
      duration: `${Date.now() - startTime}ms`
    });
  });
  
  next();
};
```

### Service Layer Logging
```javascript
class ProfileService {
  async performOperation(data) {
    const operationLogger = log.profile();
    
    operationLogger.featureStart('PROFILE_OPERATION', {
      source: 'ProfileService',
      operation: 'PERFORM_OPERATION'
    });
    
    try {
      operationLogger.methodEntry('performOperation', {
        source: 'CustomService',
        operationType: data.type,
        dataSize: Object.keys(data).length
      });
      
      // ... operation logic ...
      
      operationLogger.info('Operation completed successfully', {
        source: 'CustomService',
        result: 'success',
        processingTime: Date.now() - startTime
      });
      
      return result;
    } catch (error) {
      operationLogger.error('Operation failed', {
        source: 'CustomService',
        errorType: error.constructor.name,
        errorMessage: error.message
      }, error);
      
      throw error;
    }
  }
}
```

---

This logging system provides comprehensive visibility into application behavior, making debugging, monitoring, and maintenance significantly more effective.