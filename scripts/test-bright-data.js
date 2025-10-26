const axios = require('axios');
require('dotenv/config');

const BRIGHT_DATA_API_KEY = process.env.BRIGHT_DATA_API_KEY;
const BRIGHT_DATA_CUSTOMER_ID = process.env.BRIGHT_DATA_CUSTOMER_ID;

async function testBrightDataCredentials() {
  console.log('🔍 Testing Bright Data API Credentials...\n');

  // Check if credentials exist
  if (!BRIGHT_DATA_API_KEY) {
    console.error('❌ BRIGHT_DATA_API_KEY not found in .env.local');
    return false;
  }
  if (!BRIGHT_DATA_CUSTOMER_ID) {
    console.error('❌ BRIGHT_DATA_CUSTOMER_ID not found in .env.local');
    return false;
  }

  console.log('✅ Credentials found');
  console.log(`   Customer ID: ${BRIGHT_DATA_CUSTOMER_ID}`);
  console.log(`   API Key: ${BRIGHT_DATA_API_KEY.substring(0, 10)}...`);
  console.log('');

  // Create Bright Data client
  const brightDataClient = axios.create({
    baseURL: 'https://api.brightdata.com',
    headers: {
      Authorization: `Bearer ${BRIGHT_DATA_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  try {
    console.log('🌐 Testing API connection...');

    const testUrl = 'https://www.amazon.com/dp/B08N5WRWNW';
    console.log(`   Test URL: ${testUrl}`);
    console.log('');

    const response = await brightDataClient.post(
      `/datasets/v3/trigger`,
      {
        dataset_id: 'gd_web_scraper_api',
        endpoint: 'product',
        data: [{ url: testUrl }],
      },
      { timeout: 15000 }
    );

    console.log('✅ API Request Successful!');
    console.log('   Response Status:', response.status);
    console.log('   Snapshot ID:', response.data.snapshot_id);
    console.log('');
    console.log('✅ BRIGHT DATA CREDENTIALS ARE VALID!');

    return true;
  } catch (error) {
    console.error('❌ API Request Failed!');
    console.error('');

    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Status Text:', error.response.statusText);
      console.error('   Error Data:', JSON.stringify(error.response.data, null, 2));
      console.error('');

      if (error.response.status === 401) {
        console.error('🔒 INVALID CREDENTIALS - Check your API Key');
      } else if (error.response.status === 403) {
        console.error('🚫 ACCESS FORBIDDEN - Check your subscription');
      }
    } else {
      console.error('   Error:', error.message);
    }

    return false;
  }
}

testBrightDataCredentials()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
