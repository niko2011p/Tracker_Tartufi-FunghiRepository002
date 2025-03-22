export async function testOpenWeatherMapApiKey(apiKey: string): Promise<{ isValid: boolean; message: string }> {
  try {
    // Test location coordinates (Rome, Italy)
    const lat = 41.9028;
    const lon = 12.4964;

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    );

    if (response.ok) {
      const data = await response.json();
      return {
        isValid: true,
        message: 'API key is valid and working correctly'
      };
    } else {
      const errorData = await response.json();
      return {
        isValid: false,
        message: `API key validation failed: ${errorData.message || 'Unknown error'}`
      };
    }
  } catch (error) {
    return {
      isValid: false,
      message: `Error testing API key: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}