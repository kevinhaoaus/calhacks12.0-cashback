import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

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

  console.log('✅ Credentials found in .env.local');
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
    console.log('🌐 Testing API connection to Bright Data...');

    // Test 1: Try to trigger a simple web scrape
    const testUrl = 'https://www.amazon.com/dp/B08N5WRWNW'; // Amazon Echo Dot

    console.log(`   Test URL: ${testUrl}`);
    console.log('   Using dataset: gd_web_scraper_api');
    console.log('');

    const response = await brightDataClient.post(
      `/datasets/v3/trigger`,
      {
        dataset_id: 'gd_web_scraper_api',
        endpoint: 'product',
        data: [{ url: testUrl }],
      },
      {
        timeout: 15000, // 15 second timeout
      }
    );

    console.log('✅ API Request Successful!');
    console.log('   Response Status:', response.status);
    console.log('   Snapshot ID:', response.data.snapshot_id);
    console.log('');

    // Test 2: Check snapshot status
    const snapshotId = response.data.snapshot_id;
    console.log('🔄 Checking snapshot status...');

    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

    const statusResponse = await brightDataClient.get(
      `/datasets/v3/snapshot/${snapshotId}`,
      { timeout: 10000 }
    );

    console.log('   Snapshot Status:', statusResponse.data.status);
    console.log('');

    if (statusResponse.data.status === 'ready') {
      console.log('✅ Data collection completed successfully!');
      console.log('   Bright Data credentials are VALID and working.');
    } else if (statusResponse.data.status === 'running') {
      console.log('⏳ Data collection in progress (this is normal)');
      console.log('   Bright Data credentials are VALID and working.');
    } else if (statusResponse.data.status === 'failed') {
      console.log('⚠️  Data collection failed, but API is accessible');
      console.log('   Credentials are valid, but scraping may have issues.');
    }

    return true;
  } catch (error: any) {
    console.error('❌ API Request Failed!');
    console.error('');

    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Status Text:', error.response.statusText);
      console.error('   Error Data:', JSON.stringify(error.response.data, null, 2));
      console.error('');

      if (error.response.status === 401) {
        console.error('🔒 Authentication Failed - Invalid API Key or Customer ID');
      } else if (error.response.status === 403) {
        console.error('🚫 Access Forbidden - Check your Bright Data subscription');
      } else if (error.response.status === 429) {
        console.error('⏱️  Rate Limit Exceeded - Too many requests');
      }
    } else if (error.request) {
      console.error('   Network Error - No response received');
      console.error('   Check your internet connection');
    } else {
      console.error('   Error:', error.message);
    }

    return false;
  }
}

// Run the test
testBrightDataCredentials()
  .then(success => {
    console.log('');
    console.log('='.repeat(50));
    if (success) {
      console.log('✅ BRIGHT DATA TEST PASSED');
    } else {
      console.log('❌ BRIGHT DATA TEST FAILED');
    }
    console.log('='.repeat(50));
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
