# 🚀 Nakshatra Matching Matrimony Platform - Client Executable Guide

## 📋 Overview
This guide provides step-by-step instructions for running the Nakshatra Matching Matrimony Platform executable on Windows systems.

---

## 💻 System Requirements

### ✅ **Minimum Requirements**
- **Operating System**: Windows 10 or Windows 11 (64-bit)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 200MB free disk space
- **Internet**: Not required for basic operation
- **Browser**: Chrome, Edge, or Firefox (for web interface)

### ⚠️ **Important Notes**
- No Node.js installation required
- No additional software dependencies needed
- Runs as a standalone executable

---

## 📦 Installation & Setup

### **Step 1: Download the Executable**
1. Locate the file: `nakshatra-matrimony-win64.exe`
2. File size should be approximately **89MB**
3. Ensure the file is not corrupted (complete download)

### **Step 2: Security Configuration**
Since this is an unsigned executable, Windows may show security warnings:

#### **For Windows Defender:**
1. If blocked, click **"More info"**
2. Click **"Run anyway"**
3. Or add the executable to Windows Defender exclusions

#### **For Antivirus Software:**
1. Add the executable to your antivirus whitelist
2. Some antivirus programs may quarantine the file initially

### **Step 3: File Placement**
1. Create a dedicated folder: `C:\NakshatraMatrimony\`
2. Place the executable in this folder
3. **DO NOT** place it in system directories (Program Files, etc.)

---

## 🏃‍♂️ Running the Application

### **Method 1: Double-Click (Recommended)**
1. Navigate to the folder containing `nakshatra-matrimony-win64.exe`
2. Double-click the executable file
3. Wait 5-10 seconds for initialization
4. The application will automatically open in your default browser

### **Method 2: Command Line**
1. Open Command Prompt or PowerShell
2. Navigate to the executable directory:
   ```cmd
   cd C:\NakshatraMatrimony\
   ```
3. Run the executable:
   ```cmd
   nakshatra-matrimony-win64.exe
   ```

### **Method 3: Windows Run Dialog**
1. Press `Win + R`
2. Browse to the executable location
3. Click OK to run

---

## 🌐 Accessing the Application

### **Automatic Browser Launch**
- The application automatically opens Chrome in app mode (enabled by default)
- If Chrome is not available, it will use your default browser
- URL: `http://localhost:3131`
- **Note**: Browser opens automatically unless explicitly disabled

### **Manual Browser Access**
If the browser doesn't open automatically:
1. Open any web browser
2. Navigate to: `http://localhost:3131`
3. The matrimony platform will load

### **Application Interface**
Once loaded, you'll see the main menu with options:
- 🏠 **Home** - Welcome page and overview
- ➕ **Create Profile** - Add new matrimonial profiles
- ⭐ **Find Matching** - Search for compatible matches
- 🔍 **Search Profiles** - Browse all profiles
- 💾 **Data Backup** - Backup and restore data

---

## 📊 Using Export Features

### **PDF Export**
1. Navigate to "Find Matching" or "Search Profiles"
2. Select profiles you want to export
3. Click **"Export as PDF"**
4. File will be saved to your Downloads folder

### **Excel Export**
1. Follow same steps as PDF export
2. Click **"Export as Excel"**
3. Opens in Microsoft Excel or compatible application

### **WhatsApp Sharing**
1. Use **"WhatsApp Text"** for text-based sharing
2. Use **"WhatsApp PDF"** for PDF sharing
3. Content is optimized for mobile viewing

---

## 🛠️ Troubleshooting

### **Application Won't Start**

#### **Error: "Cannot create directory"**
- **Solution**: Run as Administrator (right-click → "Run as administrator")
- **Cause**: Insufficient permissions to create working directories

#### **Error: Port 3131 is already in use**
- **Solution**: 
  1. Close other instances of the application
  2. Restart your computer if needed
  3. Check Task Manager for running processes

#### **Browser Doesn't Open**
- **Solution**: 
  1. Manually open browser and go to `http://localhost:3131`
  2. Check if Windows Firewall is blocking the application
  3. Temporarily disable antivirus and try again

### **Export Features Not Working**

#### **PDF Export Fails**
- **Cause**: Insufficient memory or disk space
- **Solution**: 
  1. Close other applications to free memory
  2. Ensure at least 100MB free disk space
  3. Try exporting fewer profiles at once

#### **Excel Export Issues**
- **Cause**: Missing Microsoft Office or compatible application
- **Solution**: 
  1. Install LibreOffice (free alternative)
  2. Or use Google Sheets to open the file

#### **Backup/Restore Issues**
- **Cause**: Directory permission issues in executable mode
- **Solution**: 
  1. Run as Administrator if backup/restore fails
  2. Ensure adequate disk space for temporary files
  3. Check that backup ZIP file is valid and complete

### **Performance Issues**

#### **Slow Response**
- **Cause**: Large number of profiles or limited system resources
- **Solution**:
  1. Close unnecessary applications
  2. Restart the executable
  3. Consider upgrading system RAM

#### **High Memory Usage**
- **Normal**: Application may use 100-200MB of RAM
- **Excessive**: If over 500MB, restart the application

---

## 🔒 Security & Privacy

### **Data Storage**
- All data is stored locally on your computer
- No data is sent to external servers
- Data files are located in the application directory

### **Network Access**
- Application only uses local network (localhost)
- No internet connection required
- Firewall may request permission (allow for local access)

### **File Permissions**
- Application creates folders: `uploads/backups/`
- Requires write permissions in application directory
- Does not modify system files

---

## 🆘 Getting Help

### **Log Files**
If you encounter issues:
1. Look for log files in the application directory
2. Files are named with timestamps (e.g., `application-2025-11-21.log`)
3. Share these logs when reporting issues

### **Common Solutions**
1. **Restart** the application
2. **Run as Administrator** if permission errors occur
3. **Check Windows Firewall** settings
4. **Disable antivirus** temporarily for testing
5. **Clear browser cache** if interface issues occur

### **Support Information**
- Application Version: 1.0.2
- Build Date: 22nd November 2025nd November 2025nd November 2025nd November 2025nd November 2025ndows 64-bit
- Node.js Runtime: v18 (embedded)

---

## 📝 Usage Tips

### **Best Practices**
1. **Regular Backups**: Use the built-in backup feature regularly
2. **Profile Management**: Keep profile data organized and updated
3. **Export Management**: Export data periodically for external use
4. **System Maintenance**: Keep Windows updated for best performance

### **Performance Optimization**
1. Close unnecessary browser tabs
2. Run application on SSD for faster performance
3. Ensure adequate free disk space (>1GB recommended)
4. Regular system restarts help maintain performance

---

## 🔄 Updates & Maintenance

### **Version Checking**
- Click the version badge in the footer to see current version
- No automatic updates - new versions must be downloaded manually

### **Data Migration**
- Use the backup feature before updating to new versions
- Export important data as Excel files for safety

### **Uninstalling**
1. Close the application
2. Delete the executable file
3. Remove application directory if desired
4. No registry entries to clean

---

**📞 Need Additional Help?**
Contact your system administrator or the application provider with:
- Your Windows version
- Error messages (exact text)
- Log files from the application directory
- Steps you followed before the issue occurred

---

*This guide covers the standard installation and usage. For advanced configurations or enterprise deployment, consult the technical documentation.*

---

**Version 1.0.1** | **Build Date**: November 22, 2025 | **Status**: Production Ready