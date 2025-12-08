const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const log = require('../utils/logger');
const { 
  AppError, 
  ERROR_MESSAGES, 
  ERROR_TYPES, 
  handleControllerError, 
  handleExportError,
  asyncHandler 
} = require('../utils/errorHandler');

// Load pdf-lib for PKG-compatible PDF generation
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// Load nakshatra data for name mapping
const nakshatraData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/nakshatra.json'), 'utf8'));

// Create nakshatra ID to name mapping
const nakshatraMap = {};
nakshatraData.forEach(nakshatra => {
  nakshatraMap[nakshatra.id] = nakshatra.display_name;
});

log.info('Export controller initialized', {
  source: 'ExportController',
  nakshatraDataCount: nakshatraData.length,
  nakshatraMapSize: Object.keys(nakshatraMap).length
});

// Helper function to get nakshatra name from ID
const getNakshatraName = (nakshatraId) => {
  const id = parseInt(nakshatraId);
  return nakshatraMap[id] || `ID: ${nakshatraId}`;
};

// Helper function to sanitize text for PDF generation (remove problematic Unicode characters)
const sanitizeTextForPDF = (text) => {
  if (!text || typeof text !== 'string') return 'N/A';
  
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces and similar
    .replace(/[\u2028\u2029]/g, ' ')       // Replace line/paragraph separators with space
    .replace(/[\u00A0]/g, ' ')            // Replace non-breaking space with regular space
    .replace(/[^\x00-\x7F]/g, (char) => { // Handle other non-ASCII characters
      // Keep common characters, replace others with safe alternatives
      const charCode = char.charCodeAt(0);
      if (charCode > 255) {
        return '?'; // Replace with question mark for unsupported characters
      }
      return char;
    })
    .trim() || 'N/A';
};

// Helper function to format income with Indian number formatting
const formatIncome = (income) => {
  log.debug('Income formatting request', { input: income, type: typeof income });
  
  if (!income || income === '' || income === 'N/A') {
    log.debug('Income formatting: returning N/A for empty value');
    return 'N/A';
  }
  
  // Clean the income data - remove any existing formatting, spaces, or currency symbols
  const cleanedIncome = String(income).replace(/[^\d.]/g, '');
  const numericIncome = Number(cleanedIncome);
  
  if (isNaN(numericIncome) || numericIncome === 0) {
    log.debug('Income formatting: returning N/A for invalid number', { numericIncome, cleanedIncome });
    return 'N/A';
  }
  
  // Use Rs. symbol with space for better formatting (removed ₹ to avoid encoding issues)
  const formatted = ` Rs. ${numericIncome.toLocaleString('en-IN')}`;
  log.debug('Income formatting completed', { input: income, cleanedIncome, output: formatted });
  return formatted;
};

// Helper function to format porutham with classification
const formatPoruthamWithClassification = (porutham, matchingSource) => {
  if (!porutham) return 'N/A';
  
  const classification = matchingSource === 'uthamam' ? 'Uthamam' : 
                        matchingSource === 'mathimam' ? 'Mathimam' : '';
  
  return classification ? `${porutham}/10 (${classification})` : `${porutham}/10`;
};

// ExportController: Handles data export API logic
exports.exportData = (req, res) => {
  log.info('Export data endpoint called (not implemented)', {
    method: req.method,
    userAgent: req.get('User-Agent')
  });
  res.json({ message: 'Export endpoint (not implemented)' });
};

// Export matching profiles with different formats
exports.exportMatchingProfiles = async (req, res) => {
  const startTime = Date.now();
  
  // Initialize variables with proper scoping (moved outside try block)
  let profiles = null;
  let format = null;
  let seekerInfo = {};
  
  try {
    log.info('Export request received', {
      source: 'ExportController',
      contentType: req.headers['content-type'],
      method: req.method,
      userAgent: req.get('User-Agent'),
      bodySize: JSON.stringify(req.body).length
    });
    
    // Handle both JSON and form-encoded data
    if (req.headers['content-type']?.includes('application/json')) {
      // JSON request (from File System Access API)
      try {
        const jsonData = req.body;
        profiles = jsonData.profiles || null;
        format = jsonData.format || null;
        seekerInfo = jsonData.seekerInfo || {};
        log.debug('Parsed JSON request data', {
          hasProfiles: !!profiles,
          hasFormat: !!format,
          hasSeekerInfo: !!seekerInfo
        });
      } catch (jsonError) {
        log.error('Error parsing JSON data', {}, jsonError);
        return res.status(400).json({ error: 'Invalid JSON data format' });
      }
    } else {
      // Form-encoded request (from traditional form submission)
      try {
        profiles = req.body.profiles ? JSON.parse(req.body.profiles) : null;
        seekerInfo = req.body.seekerInfo ? JSON.parse(req.body.seekerInfo) : {};
        format = req.body.format || null; // Ensure format is explicitly assigned
        
        log.debug('Parsed form-encoded request data', {
          hasProfiles: !!profiles,
          hasFormat: !!format,
          hasSeekerInfo: !!seekerInfo,
          rawFormat: req.body.format
        });
      } catch (parseError) {
        log.error('Error parsing form data', {}, parseError);
        return res.status(400).json({ error: 'Invalid data format in form submission' });
      }
    }
    
    // Phase 1: Add defensive format parameter validation
    log.info('Format parameter validation', {
      format: format,
      formatType: typeof format,
      formatUndefined: format === undefined,
      formatNull: format === null,
      formatEmpty: format === '',
      rawBody: {
        format: req.body.format,
        formatType: typeof req.body.format
      }
    });

    // Phase 3: Comprehensive parameter validation
    const validationErrors = [];

    // Validate format parameter
    if (!format) {
      validationErrors.push({
        field: 'format',
        error: 'Format parameter is required',
        received: { value: format, type: typeof format },
        validOptions: ['excel', 'whatsapp', 'whatsapp-pdf', 'pdf']
      });
    } else if (!['excel', 'whatsapp', 'whatsapp-pdf', 'pdf'].includes(format)) {
      validationErrors.push({
        field: 'format',
        error: 'Invalid format parameter',
        received: { value: format, type: typeof format },
        validOptions: ['excel', 'whatsapp', 'whatsapp-pdf', 'pdf']
      });
    }

    // Validate profiles parameter
    if (!profiles) {
      validationErrors.push({
        field: 'profiles',
        error: 'Profiles parameter is required',
        received: { value: profiles, type: typeof profiles }
      });
    } else if (!Array.isArray(profiles)) {
      validationErrors.push({
        field: 'profiles',
        error: 'Profiles must be an array',
        received: { value: 'non-array', type: typeof profiles, isArray: Array.isArray(profiles) }
      });
    } else if (profiles.length === 0) {
      validationErrors.push({
        field: 'profiles',
        error: 'Profiles array cannot be empty',
        received: { length: profiles.length }
      });
    } else {
      // Validate individual profile structure
      const invalidProfiles = profiles.filter((profile, index) => {
        return !profile || typeof profile !== 'object' || !profile.name;
      });
      
      if (invalidProfiles.length > 0) {
        validationErrors.push({
          field: 'profiles',
          error: 'Some profiles are invalid or missing required fields',
          received: { 
            totalProfiles: profiles.length, 
            invalidCount: invalidProfiles.length,
            firstInvalidIndex: profiles.findIndex(p => !p || typeof p !== 'object' || !p.name)
          }
        });
      }
    }

    // Validate seekerInfo parameter (optional but should be object if provided)
    if (seekerInfo && typeof seekerInfo !== 'object') {
      validationErrors.push({
        field: 'seekerInfo',
        error: 'SeekerInfo must be an object when provided',
        received: { value: seekerInfo, type: typeof seekerInfo }
      });
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      log.error('Parameter validation failed', {
        validationErrors,
        requestBody: Object.keys(req.body),
        contentType: req.headers['content-type']
      });
      
      return res.status(400).json({
        error: 'Parameter validation failed',
        details: 'One or more required parameters are missing or invalid',
        validationErrors: validationErrors,
        requestInfo: {
          contentType: req.headers['content-type'],
          method: req.method,
          bodyKeys: Object.keys(req.body)
        }
      });
    }
    
    log.info('All parameter validation passed', { 
      source: 'ExportController',
      format, 
      profilesCount: profiles.length,
      hasSeekerInfo: !!seekerInfo && !!seekerInfo.name,
      sampleProfile: profiles[0] ? { 
        id: profiles[0].id, 
        name: profiles[0].name,
        gender: profiles[0].gender 
      } : null
    });

    // Generate filename with optional seeker name
    let filename = 'Matchings_';
    if (seekerInfo && seekerInfo.name && seekerInfo.name !== 'null') {
      filename = `Matchings_${seekerInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }

    log.debug('Format validation check', {
      source: 'ExportController',
      operation: 'exportMatchingProfiles',
      format: format,
      formatType: typeof format,
      isExcel: format === 'excel',
      isPDF: format === 'pdf',
      isWhatsappPDF: format === 'whatsapp-pdf',
      isWhatsapp: format === 'whatsapp'
    });

    // Unified PDF generation function using pdf-lib (PKG-compatible)
    async function generateProfilePDF(profiles, seekerInfo) {
      // Debug: Log seekerInfo structure to understand available fields
      log.info('PDF Generation - SeekerInfo structure', {
        source: 'ExportController',
        seekerInfo: seekerInfo,
        seekerInfoKeys: seekerInfo ? Object.keys(seekerInfo) : [],
        hasAge: !!(seekerInfo && (seekerInfo.age || seekerInfo.extractedAge)),
        ageValue: seekerInfo ? (seekerInfo.age || seekerInfo.extractedAge) : null
      });
      
      // Sort profiles: Three-level hierarchy
      // Level 1: Match Type (Uthamam → Mathimam)
      // Level 2: Porutham Score (highest first)
      // Level 3: Nakshatra ID (lowest first as tiebreaker)
      const sortedProfiles = [...profiles].sort((a, b) => {
        // Level 1: Match Type
        const getTypeOrder = (matchingSource) => {
          if (matchingSource === 'uthamam') return 1;
          if (matchingSource === 'mathimam') return 2;
          return 3;
        };
        const typeA = getTypeOrder(a.matchingSource);
        const typeB = getTypeOrder(b.matchingSource);
        
        if (typeA !== typeB) return typeA - typeB;
        
        // Level 2: Porutham Score (highest first)
        const scoreA = parseFloat(a.porutham) || 0;
        const scoreB = parseFloat(b.porutham) || 0;
        
        if (scoreA !== scoreB) return scoreB - scoreA;
        
        // Level 3: Nakshatra ID (lowest first as tiebreaker)
        const nakshatraA = parseInt(a.nakshatraid) || 0;
        const nakshatraB = parseInt(b.nakshatraid) || 0;
        return nakshatraA - nakshatraB;
      });
      
      // Debug: Log profile structure to understand available fields
      if (sortedProfiles.length > 0) {
        log.info('PDF export sorting applied: Type → Porutham → Nakshatra', {
          source: 'ExportController',
          format: 'PDF',
          totalProfiles: sortedProfiles.length,
          sortingHierarchy: {
            level1: 'Match Type (Uthamam → Mathimam → Others)',
            level2: 'Porutham Score (10 → 0)',
            level3: 'Nakshatra ID (1 → 36, tiebreaker)'
          },
          topMatch: {
            type: sortedProfiles[0].matchingSource,
            porutham: sortedProfiles[0].porutham,
            nakshatra: sortedProfiles[0].nakshatraid,
            name: sortedProfiles[0].name
          }
        });
        log.info('PDF Generation - Profile fields available', {
          source: 'ExportController',
          profileFields: Object.keys(sortedProfiles[0]),
          hasAdditionalContact: 'additional_contact_no' in sortedProfiles[0],
          additionalContactValue: sortedProfiles[0].additional_contact_no,
          sampleProfile: {
            name: sortedProfiles[0].name,
            contact_no: sortedProfiles[0].contact_no,
            additional_contact_no: sortedProfiles[0].additional_contact_no
          }
        });
      }
      
      // Create PDF document
      const pdfDoc = await PDFDocument.create();
      
      // Load fonts
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const normalFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      // Create first page
      let page = pdfDoc.addPage();
      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      // Define colors (same visual colors as jsPDF)
      const colors = {
        brown: rgb(139/255, 69/255, 19/255),       // Brown theme
        gray: rgb(100/255, 100/255, 100/255),     // Gray text
        lightGray: rgb(248/255, 249/255, 250/255), // Background
        green: rgb(0, 128/255, 0),                 // Porutham score
        black: rgb(0, 0, 0),                       // Default text
        contactGray: rgb(128/255, 128/255, 128/255) // Contact info
      };
      
      // Add title
      page.drawText('MATRIMONY MATCHING PROFILES', {
        x: pageWidth / 2 - 120, // Center approximation
        y: pageHeight - 20,
        size: 18,
        font: boldFont,
        color: colors.black
      });
      
      // Add seeker info if available
      let currentY = pageHeight - 35;
      if (seekerInfo && seekerInfo.name && seekerInfo.name !== 'null') {
        // Build seeker text with optional age
        let seekerText = `Seeker: ${sanitizeTextForPDF(seekerInfo.name)} (${sanitizeTextForPDF(seekerInfo.serialNo)})`;
        
        // Add age if available (check both age and extractedAge fields)
        const seekerAge = seekerInfo.age || seekerInfo.extractedAge;
        if (seekerAge && seekerAge !== '' && seekerAge !== 'null') {
          seekerText += ` - Age: ${sanitizeTextForPDF(seekerAge)}`;
        }
        
        page.drawText(seekerText, {
          x: 20,
          y: currentY,
          size: 12,
          font: normalFont,
          color: colors.black
        });
        currentY -= 12;
      }
      
      // Add generation date
      page.drawText(`Generated: ${new Date().toLocaleDateString('en-IN')} | Total Matches: ${sortedProfiles.length}`, {
        x: 20,
        y: currentY,
        size: 10,
        font: normalFont,
        color: colors.black
      });
      currentY -= 20;

      // Create separate boxes for each profile
      for (let index = 0; index < sortedProfiles.length; index++) {
        const profile = sortedProfiles[index];
        
        // Check if we need a new page
        if (currentY < 100) {
          page = pdfDoc.addPage();
          currentY = pageHeight - 20;
        }

        // Profile box dimensions
        const boxHeight = 95;
        const boxWidth = pageWidth - 40;
        const boxX = 20;
        const boxY = currentY - boxHeight;

        // Profile box background (light gray)
        page.drawRectangle({
          x: boxX,
          y: boxY,
          width: boxWidth,
          height: boxHeight,
          color: colors.lightGray
        });
        
        // Profile box border (brown)
        page.drawRectangle({
          x: boxX,
          y: boxY,
          width: boxWidth,
          height: boxHeight,
          borderColor: colors.brown,
          borderWidth: 0.5
        });

        // Profile header with name and basic info
        page.drawText(`${sanitizeTextForPDF(profile.name)} (${sanitizeTextForPDF(profile.serial_no)})`, {
          x: 25,
          y: boxY + boxHeight - 12,
          size: 14,
          font: boldFont,
          color: colors.brown
        });
        
        // Age only (no gender) - Regular PDF format standard
        page.drawText(`${sanitizeTextForPDF(profile.age?.toString())} years`, {
          x: 25,
          y: boxY + boxHeight - 24,
          size: 10,
          font: normalFont,
          color: colors.gray
        });

        // Two-column layout for profile details
        const leftColumnX = 25;
        const rightColumnX = pageWidth / 2 + 10;
        let leftY = boxY + boxHeight - 34;
        let rightY = boxY + boxHeight - 34;

        // Left column
        // Qualification
        page.drawText('Qualification:', {
          x: leftColumnX,
          y: leftY,
          size: 9,
          font: boldFont,
          color: colors.black
        });
        page.drawText(sanitizeTextForPDF(profile.qualification), {
          x: leftColumnX + 65,
          y: leftY,
          size: 9,
          font: normalFont,
          color: colors.black
        });
        leftY -= 12;

        // Monthly Income
        page.drawText('Monthly Income:', {
          x: leftColumnX,
          y: leftY,
          size: 9,
          font: boldFont,
          color: colors.black
        });
        page.drawText(sanitizeTextForPDF(formatIncome(profile.monthly_income)), {
          x: leftColumnX + 75,
          y: leftY,
          size: 9,
          font: normalFont,
          color: colors.black
        });
        leftY -= 12;

        // Nakshatra
        page.drawText('Nakshatra:', {
          x: leftColumnX,
          y: leftY,
          size: 9,  
          font: boldFont,
          color: colors.black
        });
        page.drawText(sanitizeTextForPDF(getNakshatraName(profile.nakshatraid)), {
          x: leftColumnX + 55,
          y: leftY,
          size: 9,
          font: normalFont,
          color: colors.black
        });
        leftY -= 12;

        // Rasi/Lagnam
        page.drawText('Rasi/Lagnam:', {
          x: leftColumnX,
          y: leftY,
          size: 9,
          font: boldFont,
          color: colors.black
        });
        page.drawText(sanitizeTextForPDF(profile.rasi_lagnam), {
          x: leftColumnX + 65,
          y: leftY,
          size: 9,
          font: normalFont,
          color: colors.black
        });

        // Right column
        // Job Details
        page.drawText('Job:', {
          x: rightColumnX,
          y: rightY,
          size: 9,
          font: boldFont,
          color: colors.black
        });
        const jobText = sanitizeTextForPDF(profile.job_details);
        page.drawText(jobText.length > 20 ? jobText.substring(0, 20) + '...' : jobText, {
          x: rightColumnX + 25,
          y: rightY,
          size: 9,
          font: normalFont,
          color: colors.black
        });
        rightY -= 12;

        // Region
        page.drawText('Region:', {
          x: rightColumnX,
          y: rightY,
          size: 9,
          font: boldFont,
          color: colors.black
        });
        page.drawText(sanitizeTextForPDF(profile.region), {
          x: rightColumnX + 35,
          y: rightY,
          size: 9,
          font: normalFont,
          color: colors.black
        });
        rightY -= 12;

        // Gothram
        page.drawText('Gothram:', {
          x: rightColumnX,
          y: rightY,
          size: 9,
          font: boldFont,
          color: colors.black
        });
        page.drawText(sanitizeTextForPDF(profile.gothram), {
          x: rightColumnX + 40,
          y: rightY,
          size: 9,
          font: normalFont,
          color: colors.black
        });
        rightY -= 12;

        // Porutham Score (highlighted in green)
        if (profile.porutham) {
          page.drawText('Porutham:', {
            x: rightColumnX,
            y: rightY,
            size: 9,
            font: boldFont,
            color: colors.green
          });
          page.drawText(sanitizeTextForPDF(formatPoruthamWithClassification(profile.porutham, profile.matchingSource)), {
            x: rightColumnX + 45,
            y: rightY,
            size: 9,
            font: normalFont,
            color: colors.green
          });
        }

        // Contact info at the bottom - include both primary and additional
        const contactInfo = [];
        if (profile.contact_no) {
          contactInfo.push(`Primary: ${profile.contact_no}`);
        }
        if (profile.additional_contact_no && profile.additional_contact_no.trim() !== '') {
          contactInfo.push(`Additional: ${profile.additional_contact_no}`);
        }

        if (contactInfo.length > 0) {
          let contactText;
          if (contactInfo.length === 1) {
            // Single contact - use existing format
            contactText = `Contact: ${contactInfo[0].replace('Primary: ', '')}`;
          } else {
            // Multiple contacts - show both on same line
            contactText = `Contact: ${contactInfo.join(' | ')}`;
          }
          
          page.drawText(contactText, {
            x: 25,
            y: boxY + 8,
            size: 9,
            font: normalFont,
            color: colors.black
          });
        }

        currentY = boxY - 20; // Space between profile boxes
      }

      // Add footer with page numbers
      const pages = pdfDoc.getPages();
      const totalPages = pages.length;
      pages.forEach((currentPage, index) => {
        currentPage.drawText(`Page ${index + 1} of ${totalPages}`, {
          x: pageWidth - 60,
          y: 10,
          size: 8,
          font: normalFont,
          color: colors.contactGray
        });
      });
      
      // Return PDF buffer
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    }

    if (format === 'excel') {
      // Add timestamp to Excel filename for uniqueness
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const excelFilename = `${filename}_${timestamp}`;
      
      // Create Excel file with all profile details
      const workbook = XLSX.utils.book_new();
      
      // Sort profiles: Three-level hierarchy
      // Level 1: Match Type (Uthamam → Mathimam)
      // Level 2: Porutham Score (highest first)
      // Level 3: Nakshatra ID (lowest first as tiebreaker)
      const sortedProfiles = [...profiles].sort((a, b) => {
        // Level 1: Match Type
        const getTypeOrder = (matchingSource) => {
          if (matchingSource === 'uthamam') return 1;
          if (matchingSource === 'mathimam') return 2;
          return 3;
        };
        const typeA = getTypeOrder(a.matchingSource);
        const typeB = getTypeOrder(b.matchingSource);
        
        if (typeA !== typeB) return typeA - typeB;
        
        // Level 2: Porutham Score (highest first)
        const scoreA = parseFloat(a.porutham) || 0;
        const scoreB = parseFloat(b.porutham) || 0;
        
        if (scoreA !== scoreB) return scoreB - scoreA;
        
        // Level 3: Nakshatra ID (lowest first as tiebreaker)
        const nakshatraA = parseInt(a.nakshatraid) || 0;
        const nakshatraB = parseInt(b.nakshatraid) || 0;
        return nakshatraA - nakshatraB;
      });
      
      // Prepare data for Excel - handle missing fields gracefully
      log.info('Excel export sorting applied: Type → Porutham → Nakshatra', {
        source: 'ExportController',
        format: 'Excel',
        totalProfiles: sortedProfiles.length,
        sortingHierarchy: {
          level1: 'Match Type (Uthamam → Mathimam → Others)',
          level2: 'Porutham Score (10 → 0)',
          level3: 'Nakshatra ID (1 → 36, tiebreaker)'
        },
        topMatch: sortedProfiles.length > 0 ? {
          type: sortedProfiles[0].matchingSource,
          porutham: sortedProfiles[0].porutham,
          nakshatra: sortedProfiles[0].nakshatraid,
          name: sortedProfiles[0].name
        } : 'No matches'
      });
      
      const excelData = sortedProfiles.map((profile, index) => ({
        'Name': (profile.name || 'N/A') + ' (' + (profile.serial_no || 'N/A') + ')',
        'Gender': profile.gender || '',
        'Age': profile.age || '',
        'Birth Date': profile.birth_date || 'N/A',
        'Birth Place': profile.birth_place || 'N/A',
        'Qualification': profile.qualification || '',
        'Job Details': profile.job_details || 'N/A',
        'Monthly Income': formatIncome(profile.monthly_income),
        'Nakshatra': getNakshatraName(profile.nakshatraid) || 'N/A',
        'Rasi/Lagnam': profile.rasi_lagnam || '',
        'Gothram': profile.gothram || 'N/A',
        'Contact No': profile.contact_no || 'N/A',
        'Address': profile.address || 'N/A',
        'Father Name': profile.father_name || 'N/A',
        'Mother Name': profile.mother_name || 'N/A',
        'Siblings': profile.siblings || 'N/A',
        'Region': profile.region || '',
        'Porutham Score': formatPoruthamWithClassification(profile.porutham, profile.matchingSource),
        'Created Date': profile.createdAt || 'N/A'
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Auto-size columns
      const columnWidths = [
        { wch: 20 },  // Name
        { wch: 10 },  // Gender
        { wch: 8 },   // Age
        { wch: 12 },  // Birth Date
        { wch: 15 },  // Birth Place
        { wch: 20 },  // Qualification
        { wch: 20 },  // Job Details
        { wch: 15 },  // Monthly Income
        { wch: 18 },  // Nakshatra
        { wch: 15 },  // Rasi/Lagnam
        { wch: 15 },  // Gothram
        { wch: 15 },  // Contact No
        { wch: 30 },  // Address
        { wch: 20 },  // Father Name
        { wch: 20 },  // Mother Name
        { wch: 10 },  // Siblings
        { wch: 15 },  // Region
        { wch: 10 },  // Porutham Score
        { wch: 15 }   // Created Date
      ];
      worksheet['!cols'] = columnWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Matching Profiles');

      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Set headers for download with enhanced browser compatibility
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${excelFilename}.xlsx"`);
      res.setHeader('Content-Length', excelBuffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', 'Thu, 01 Jan 1970 00:00:00 GMT');
      res.setHeader('ETag', `"${Date.now()}-${Math.random().toString(36)}"`);
      res.setHeader('Last-Modified', new Date().toUTCString());
      res.setHeader('Vary', 'Accept-Encoding, User-Agent');
      res.setHeader('X-Accel-Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      
      log.info('Excel download initiated', {
        filename: `${excelFilename}.xlsx`,
        size: excelBuffer.length,
        profileCount: sortedProfiles.length,
        userAgent: req.get('User-Agent')
      });
      
      res.send(excelBuffer);

    } else if (format === 'whatsapp') {
      // Add timestamp to WhatsApp text filename for uniqueness
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const whatsappTextFilename = `${filename}_${timestamp}`;
      
      // Sort profiles by Uthamam first, then Mathimam, then others
      const sortedProfiles = [...profiles].sort((a, b) => {
        const getOrder = (matchingSource) => {
          if (matchingSource === 'uthamam') return 1;
          if (matchingSource === 'mathimam') return 2;
          return 3;
        };
        return getOrder(a.matchingSource) - getOrder(b.matchingSource);
      });

      // Create a formatted text file optimized for WhatsApp sharing
      let whatsappText = `🔍 *MATRIMONY MATCHING PROFILES*\n`;
      
      // Only add seeker info if name is available
      if (seekerInfo && seekerInfo.name && seekerInfo.name !== 'null') {
        whatsappText += `👤 Seeker: ${seekerInfo.name} (${seekerInfo.serialNo || 'N/A'})\n`;
      }
      
      whatsappText += `📅 Generated: ${new Date().toLocaleDateString('en-IN')}\n`;
      whatsappText += `👥 Total Matches: ${sortedProfiles.length}\n`;
      whatsappText += `${'='.repeat(40)}\n\n`;

      sortedProfiles.forEach((profile, index) => {
        whatsappText += `*Profile ${index + 1}*\n`;
        whatsappText += ` Name: ${profile.name || 'N/A'} (${profile.serial_no || 'N/A'})\n`;
        whatsappText += `⚥ Gender: ${profile.gender}\n`;
        whatsappText += `🎂 Age: ${profile.age}\n`;
        whatsappText += `� Birth Date: ${profile.birth_date}\n`;
        whatsappText += `🎓 Qualification: ${profile.qualification}\n`;
        whatsappText += `💼 Job: ${profile.job_details}\n`;
        whatsappText += `💰 Income: ${formatIncome(profile.monthly_income)}\n`;
        whatsappText += `⭐ Nakshatra: ${getNakshatraName(profile.nakshatraid)}\n`;
        whatsappText += `️ Gothram: ${profile.gothram}\n`;
        whatsappText += `📞 Contact: ${profile.contact_no}\n`;
        whatsappText += `📍 Address: ${profile.address}\n`;
        whatsappText += `👨‍👩‍👧‍👦 Region: ${profile.region}\n`;
        if (profile.porutham) {
          whatsappText += `🎯 Porutham: ${formatPoruthamWithClassification(profile.porutham, profile.matchingSource)}\n`;
        }
        whatsappText += `${'─'.repeat(30)}\n\n`;
      });

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${whatsappTextFilename}.txt"`);
      res.setHeader('Content-Length', Buffer.byteLength(whatsappText, 'utf8'));
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.send(whatsappText);

    } else if (format === 'whatsapp-pdf') {
      // Add timestamp to WhatsApp PDF filename for uniqueness
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const whatsappPdfFilename = `${filename}_${timestamp}`;
      
      // Use unified PDF generation (standardized on Regular PDF format)
      const pdfBuffer = await generateProfilePDF(profiles, seekerInfo);
      
      // Enhanced headers for better browser compatibility
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${whatsappPdfFilename}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', 'Thu, 01 Jan 1970 00:00:00 GMT');
      res.setHeader('ETag', `"${Date.now()}-${Math.random().toString(36)}"`);
      res.setHeader('Last-Modified', new Date().toUTCString());
      res.setHeader('Vary', 'Accept-Encoding, User-Agent');
      res.setHeader('X-Accel-Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      
      log.info('WhatsApp PDF download initiated', {
        filename: `${whatsappPdfFilename}.pdf`,
        size: pdfBuffer.length,
        profileCount: profiles.length,
        userAgent: req.get('User-Agent')
      });
      
      res.send(pdfBuffer);

    } else if (format === 'pdf') {
      // Add timestamp to PDF filename for uniqueness
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const pdfFilename = `${filename}_${timestamp}`;
      
      log.info('PDF filename generation debug', {
        originalFilename: filename,
        timestamp: timestamp,
        finalPdfFilename: pdfFilename,
        fullDownloadName: `${pdfFilename}.pdf`
      });
      
      // Use unified PDF generation (standardized format)
      const pdfBuffer = await generateProfilePDF(profiles, seekerInfo);
      
      // Enhanced headers for better browser compatibility
      const finalFilename = `${pdfFilename}.pdf`;
      log.debug('PDF filename configuration', {
        source: 'ExportController',
        operation: 'exportMatchingProfiles',
        pdfFilename: pdfFilename,
        finalFilename: finalFilename,
        contentDisposition: `attachment; filename="${finalFilename}"`
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', 'Thu, 01 Jan 1970 00:00:00 GMT');
      res.setHeader('ETag', `"${Date.now()}-${Math.random().toString(36)}"`);
      res.setHeader('Last-Modified', new Date().toUTCString());
      res.setHeader('Vary', 'Accept-Encoding, User-Agent');
      res.setHeader('X-Accel-Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      
      log.info('PDF download initiated', {
        filename: `${pdfFilename}.pdf`,
        size: pdfBuffer.length,
        profileCount: profiles.length,
        userAgent: req.get('User-Agent')
      });
      
      res.send(pdfBuffer);

    } else {
      res.status(400).json({ error: 'Invalid format. Use "excel", "whatsapp", "whatsapp-pdf", or "pdf".' });
    }
    
    log.performance('Export processing completed', startTime, { 
      format, 
      profilesCount: profiles.length 
    });

  } catch (error) {
    log.error('Export processing failed', {
      format,
      profilesCount: profiles?.length,
      duration: `${Date.now() - startTime}ms`,
      errorType: error.name,
      errorMessage: error.message
    }, error);
    
    res.status(500).json({ 
      error: 'Failed to export profiles',
      details: error.message,
      type: error.name
    });
  }
};