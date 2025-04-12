export async function readVersion(): Promise<string> {
  try {
    const response = await fetch('/version.txt');
    if (!response.ok) {
      throw new Error('Failed to read version file');
    }
    const version = await response.text();
    return version.trim();
  } catch (error) {
    console.error('Error reading version:', error);
    return '0.0.0'; // Fallback version
  }
} 