interface ApiTestResult {
  isValid: boolean;
  message: string;
}

export async function testCoopsApi(): Promise<ApiTestResult> {
  try {
    // Test con la stazione di Providence, RI come esempio
    const stationId = '8454000';
    const response = await fetch(
      `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=${stationId}&date=latest&time_zone=lst_ldt&units=metric&format=json&product=water_level`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.error) {
        return {
          isValid: false,
          message: `Errore API CO-OPS: ${data.error.message || 'Errore sconosciuto'}`
        };
      }
      return {
        isValid: true,
        message: 'API CO-OPS funzionante correttamente'
      };
    } else {
      const errorData = await response.json();
      return {
        isValid: false,
        message: `Test API CO-OPS fallito: ${errorData.error?.message || 'Errore sconosciuto'}`
      };
    }
  } catch (error) {
    return {
      isValid: false,
      message: `Errore nel test API CO-OPS: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
    };
  }
}

export async function testNcdcApi(token: string): Promise<ApiTestResult> {
  try {
    // Test con una richiesta di dati storici di esempio
    const response = await fetch(
      `https://www.ncdc.noaa.gov/cdo-web/api/v2/datasets`,
      {
        headers: {
          'token': token
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      return {
        isValid: true,
        message: 'API NCDC CDO funzionante correttamente'
      };
    } else {
      const errorData = await response.json();
      return {
        isValid: false,
        message: `Test API NCDC CDO fallito: ${errorData.message || 'Errore sconosciuto'}`
      };
    }
  } catch (error) {
    return {
      isValid: false,
      message: `Errore nel test API NCDC CDO: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
    };
  }
}