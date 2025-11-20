// File Path: lib/fileScanner.ts

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export interface ScanResult {
  status: 'CLEAN' | 'THREAT_DETECTED' | 'ERROR';
  engine: string;
  details?: string;
  threatName?: string;
}

/**
 * Scans a file using Windows Defender (Windows Security)
 * @param filePath - Absolute path to the file to scan
 * @returns Promise<ScanResult>
 */
async function scanWithWindowsDefender(filePath: string): Promise<ScanResult> {
  try {
    // Windows Defender PowerShell command
    const command = `powershell -Command "Start-MpScan -ScanPath '${filePath}' -ScanType QuickScan"`;
    
    console.log(`Scanning file with Windows Defender: ${path.basename(filePath)}`);
    
    const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
    
    if (stderr && stderr.toLowerCase().includes('threat')) {
      return {
        status: 'THREAT_DETECTED',
        engine: 'Windows Defender',
        details: stderr,
        threatName: extractThreatName(stderr)
      };
    }
    
    // Check if scan completed successfully
    if (stdout || stderr === '') {
      return {
        status: 'CLEAN',
        engine: 'Windows Defender',
        details: 'File scanned successfully - no threats detected'
      };
    }
    
    return {
      status: 'ERROR',
      engine: 'Windows Defender',
      details: `Scan completed with unknown result: ${stderr || stdout}`
    };
    
  } catch (error: any) {
    console.error('Windows Defender scan error:', error);
    
    // Check if the error indicates a threat was found
    if (error.message && error.message.toLowerCase().includes('threat')) {
      return {
        status: 'THREAT_DETECTED',
        engine: 'Windows Defender',
        details: error.message,
        threatName: extractThreatName(error.message)
      };
    }
    
    return {
      status: 'ERROR',
      engine: 'Windows Defender',
      details: `Scan failed: ${error.message}`
    };
  }
}

/**
 * Alternative scanning using Windows Defender CLI (MpCmdRun.exe)
 * @param filePath - Absolute path to the file to scan
 * @returns Promise<ScanResult>
 */
async function scanWithDefenderCLI(filePath: string): Promise<ScanResult> {
  try {
    // Windows Defender command line utility
    const defenderPath = 'C:\\Program Files\\Windows Defender\\MpCmdRun.exe';
    const command = `"${defenderPath}" -Scan -ScanType 3 -File "${filePath}"`;
    
    console.log(`Scanning file with Windows Defender CLI: ${path.basename(filePath)}`);
    
    const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
    
    // Parse the output for results
    const output = stdout + stderr;
    
    if (output.includes('Threat detected') || output.includes('found threats')) {
      return {
        status: 'THREAT_DETECTED',
        engine: 'Windows Defender CLI',
        details: output,
        threatName: extractThreatName(output)
      };
    }
    
    if (output.includes('Scan finished') || output.includes('No threats detected')) {
      return {
        status: 'CLEAN',
        engine: 'Windows Defender CLI',
        details: 'File scanned successfully - no threats detected'
      };
    }
    
    return {
      status: 'ERROR',
      engine: 'Windows Defender CLI',
      details: `Unexpected scan result: ${output}`
    };
    
  } catch (error: any) {
    console.error('Windows Defender CLI scan error:', error);
    return {
      status: 'ERROR',
      engine: 'Windows Defender CLI',
      details: `Scan failed: ${error.message}`
    };
  }
}

/**
 * Extract threat name from scan output
 */
function extractThreatName(output: string): string {
  // Common patterns for threat names in Windows Defender output
  const patterns = [
    /Threat:\s*([^\r\n]+)/i,
    /detected:\s*([^\r\n]+)/i,
    /found:\s*([^\r\n]+)/i,
    /Trojan[:\s]*([^\r\n]+)/i,
    /Virus[:\s]*([^\r\n]+)/i,
    /Malware[:\s]*([^\r\n]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return 'Unknown threat detected';
}

/**
 * Main file scanning function - tries multiple methods
 * @param filePath - Absolute path to the file to scan
 * @returns Promise<ScanResult>
 */
export async function scanFile(filePath: string): Promise<ScanResult> {
  // Verify file exists
  if (!fs.existsSync(filePath)) {
    return {
      status: 'ERROR',
      engine: 'File Scanner',
      details: 'File does not exist or is not accessible'
    };
  }
  
  try {
    // Try Windows Defender PowerShell first
    const result = await scanWithWindowsDefender(filePath);
    
    // If PowerShell method fails, try CLI method
    if (result.status === 'ERROR') {
      console.log('PowerShell scan failed, trying CLI method...');
      return await scanWithDefenderCLI(filePath);
    }
    
    return result;
    
  } catch (error) {
    console.error('All scan methods failed:', error);
    return {
      status: 'ERROR',
      engine: 'File Scanner',
      details: 'All scanning methods failed - file may be safe but could not be verified'
    };
  }
}

/**
 * Quick hash-based scan for known malware signatures (basic implementation)
 * This is a fallback when Windows Defender is not available
 */
async function hashBasedScan(filePath: string): Promise<ScanResult> {
  try {
    const crypto = require('crypto');
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    // Known malicious file hashes (in a real implementation, this would be a comprehensive database)
    const knownMalwareHashes = new Set([
      // Add known malware SHA256 hashes here
      // This is just a placeholder - in production you'd use a threat intelligence feed
    ]);
    
    if (knownMalwareHashes.has(hash)) {
      return {
        status: 'THREAT_DETECTED',
        engine: 'Hash-based Scanner',
        details: `File matches known malware signature (SHA256: ${hash})`,
        threatName: 'Known malware'
      };
    }
    
    return {
      status: 'CLEAN',
      engine: 'Hash-based Scanner',
      details: 'File hash does not match any known threats'
    };
    
  } catch (error: any) {
    return {
      status: 'ERROR',
      engine: 'Hash-based Scanner',
      details: `Hash scan failed: ${error.message}`
    };
  }
}