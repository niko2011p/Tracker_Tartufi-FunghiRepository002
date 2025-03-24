import * as fs from 'fs';
import * as path from 'path';

class Logger {
  private logDir: string;
  private currentLogFile: string;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
    this.currentLogFile = this.getLogFilePath();
  }

  private ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogFilePath(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `api_${date}.log`);
  }

  private formatLogMessage(level: string, message: string, details?: any): string {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] ${level}: ${message}`;
    
    if (details) {
      logMessage += '\nDetails: ' + JSON.stringify(details, null, 2);
    }
    
    return logMessage + '\n';
  }

  private writeToFile(message: string) {
    try {
      fs.appendFileSync(this.currentLogFile, message);
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }

  public logApiRequest(url: string, options: any) {
    const message = this.formatLogMessage('API_REQUEST', url, {
      method: options.method || 'GET',
      headers: options.headers,
    });
    
    console.log('API Request:', {
      url,
      method: options.method || 'GET',
      headers: options.headers,
      timestamp: new Date().toISOString()
    });
    
    this.writeToFile(message);
  }

  public logApiResponse(response: Response, data?: any) {
    const message = this.formatLogMessage('API_RESPONSE', `Status: ${response.status} - ${response.statusText}`, {
      headers: Object.fromEntries(response.headers.entries()),
      data: data
    });
    
    console.log('API Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: data,
      timestamp: new Date().toISOString()
    });
    
    this.writeToFile(message);
  }

  public logApiError(error: any, context: string) {
    const message = this.formatLogMessage('API_ERROR', context, {
      message: error.message,
      stack: error.stack,
    });
    
    console.error('API Error:', {
      context,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    this.writeToFile(message);
  }
}

export const logger = new Logger();