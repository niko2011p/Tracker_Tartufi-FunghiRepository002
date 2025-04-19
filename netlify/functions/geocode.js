const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    // Extract query parameters from the request
    const { lat, lon, zoom, addressdetails } = event.queryStringParameters || {};
    
    if (!lat || !lon) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Latitude and longitude are required parameters' })
      };
    }

    // Call the Nominatim API with proper User-Agent to respect their usage policy
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=${zoom || 18}&addressdetails=${addressdetails || 1}`,
      {
        headers: {
          'User-Agent': 'FunghiTrackerLogger/1.0 (https://fungotrackerlogger.netlify.app)'
        }
      }
    );

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: `Nominatim API responded with status ${response.status}` })
      };
    }

    const data = await response.json();

    // Return the data with CORS headers
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Error in geocode function:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
}; 