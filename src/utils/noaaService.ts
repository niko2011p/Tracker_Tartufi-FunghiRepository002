const NOAA_API_TOKEN = 'QabcioeyxNaiJqZUCnvxOUhoaIQMEuCs';
const NOAA_API_BASE_URL = 'https://www.ncdc.noaa.gov/cdo-web/api/v2';
const COOPS_API_BASE_URL = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';

interface NOAAStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  mindate: string;
  maxdate: string;
}

interface COOPSStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  state?: string;
  distance?: number;
}

interface COOPSData {
  t: string; // Timestamp
  v: string; // Value
  s?: string; // Speed (for wind)
  d?: string; // Direction (for wind)
  dr?: string; // Direction in degrees (for wind)
}

interface COOPSResponse {
  data: COOPSData[];
  metadata?: {
    id: string;
    name: string;
    lat: string;
    lon: string;
  };
}

interface NOAADataset {
  id: string;
  name: string;
  datacoverage: number;
  mindate: string;
  maxdate: string;
}

interface NOAAData {
  date: string;
  datatype: string;
  station: string;
  value: number;
}

interface NOAAResponse<T> {
  metadata: {
    resultset: {
      offset: number;
      count: number;
      limit: number;
    };
  };
  results: T[];
}

const headers = {
  'token': NOAA_API_TOKEN
};

export async function findNearestStations(lat: number, lon: number, radius: number = 25): Promise<NOAAStation[]> {
  try {
    const response = await fetch(
      `${NOAA_API_BASE_URL}/stations?extent=${lat - radius},${lon - radius},${lat + radius},${lon + radius}&limit=5`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`NOAA API error: ${response.statusText}`);
    }

    const data: NOAAResponse<NOAAStation> = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error fetching NOAA stations:', error);
    throw error;
  }
}

export async function getHistoricalData(
  stationId: string,
  startDate: string,
  endDate: string,
  dataTypes: string[] = ['TMAX', 'TMIN', 'PRCP']
): Promise<NOAAData[]> {
  try {
    const response = await fetch(
      `${NOAA_API_BASE_URL}/data?datasetid=GHCND&stationid=${stationId}&startdate=${startDate}&enddate=${endDate}&datatypeid=${dataTypes.join(',')}&limit=1000`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`NOAA API error: ${response.statusText}`);
    }

    const data: NOAAResponse<NOAAData> = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error fetching NOAA historical data:', error);
    throw error;
  }
}

export async function findNearestCOOPSStations(lat: number, lon: number, radius: number = 50): Promise<COOPSStation[]> {
  // Lista statica delle stazioni COOPS più comuni
  const commonStations: COOPSStation[] = [
    { id: '8454000', name: 'Providence, RI', lat: 41.8071, lng: -71.4012 },
    { id: '8447930', name: 'Woods Hole, MA', lat: 41.5236, lng: -70.6711 },
    { id: '8449130', name: 'Nantucket Island, MA', lat: 41.2850, lng: -70.0967 },
    // Aggiungi altre stazioni secondo necessità
  ];

  return commonStations
    .map(station => {
      const R = 6371; // Raggio della Terra in km
      const dLat = (station.lat - lat) * Math.PI / 180;
      const dLon = (station.lng - lon) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat * Math.PI / 180) * Math.cos(station.lat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      return { ...station, distance };
    })
    .filter(station => station.distance <= radius)
    .sort((a, b) => (a.distance || 0) - (b.distance || 0));
}

export async function getCOOPSData(
  stationId: string,
  product: string,
  date: string = 'today',
  options: {
    datum?: string;
    units?: 'metric' | 'english';
    timeZone?: 'gmt' | 'lst' | 'lst_ldt';
    interval?: string;
    application?: string;
  } = {}
): Promise<COOPSResponse> {
  const params = new URLSearchParams({
    station: stationId,
    product,
    date,
    datum: options.datum || 'MLLW',
    units: options.units || 'metric',
    time_zone: options.timeZone || 'gmt',
    format: 'json',
    interval: options.interval || '6',
    application: options.application || 'FunghiTrackerLogger'
  });

  try {
    const response = await fetch(`${COOPS_API_BASE_URL}?${params}`);
    if (!response.ok) {
      throw new Error(`COOPS API error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching COOPS data:', error);
    throw error;
  }
}

export function convertNOAADataToWeatherData(noaaData: NOAAData[]): WeatherData[] {
  const groupedByDate = noaaData.reduce((acc, curr) => {
    const date = curr.date.split('T')[0];
    if (!acc[date]) {
      acc[date] = {};
    }
    acc[date][curr.datatype] = curr.value;
    return acc;
  }, {} as Record<string, Record<string, number>>);

  return Object.entries(groupedByDate).map(([date, values]) => ({
    date,
    temp_max: values['TMAX'] ? values['TMAX'] / 10 : null,
    temp_min: values['TMIN'] ? values['TMIN'] / 10 : null,
    precip_mm: values['PRCP'] ? values['PRCP'] / 10 : 0,
    humidity: null,
    wind_kph: null,
    wind_dir: '',
    condition: '',
  }));
}

export async function convertCOOPSDataToWeatherData(
  stationId: string,
  date: string = 'today'
): Promise<WeatherData> {
  const [tempData, windData, waterData] = await Promise.all([
    getCOOPSData(stationId, 'air_temperature', date, { interval: 'h' }),
    getCOOPSData(stationId, 'wind', date, { interval: 'h' }),
    getCOOPSData(stationId, 'water_level', date, { datum: 'MLLW', interval: '6' })
  ]);

  const latestTemp = tempData.data?.[0]?.v ? parseFloat(tempData.data[0].v) : null;
  const latestWind = windData.data?.[0];
  const latestWater = waterData.data?.[0]?.v ? parseFloat(waterData.data[0].v) : null;

  return {
    date: new Date().toISOString(),
    temp_c: latestTemp,
    temp_min: latestTemp,
    temp_max: latestTemp,
    humidity: null,
    wind_kph: latestWind?.s ? parseFloat(latestWind.s) * 1.852 : null, // Convert knots to km/h
    wind_dir: latestWind?.d || '',
    condition: '',
    water_level: latestWater,
    station_name: tempData.metadata?.name || ''
  };
}

export async function getTidalData(
  stationId: string,
  startDate: string,
  endDate: string
): Promise<{
  predictions: Array<{ time: string; height: number; type?: 'H' | 'L' }>
}> {
  const params = new URLSearchParams({
    station: stationId,
    product: 'predictions',
    begin_date: startDate,
    end_date: endDate,
    datum: 'MLLW',
    units: 'metric',
    time_zone: 'gmt',
    format: 'json',
    interval: 'hilo'
  });

  try {
    const response = await fetch(`${COOPS_API_BASE_URL}?${params}`);
    if (!response.ok) {
      throw new Error(`COOPS API error: ${response.statusText}`);
    }
    const data = await response.json();
    return {
      predictions: data.predictions.map((pred: any) => ({
        time: pred.t,
        height: parseFloat(pred.v),
        type: pred.type // 'H' per alta marea, 'L' per bassa marea
      }))
    };
  } catch (error) {
    console.error('Error fetching tidal predictions:', error);
    throw error;
  }
}
}