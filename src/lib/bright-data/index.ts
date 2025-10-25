import axios from 'axios';

const BRIGHT_DATA_API_KEY = process.env.BRIGHT_DATA_API_KEY!;
const BRIGHT_DATA_CUSTOMER_ID = process.env.BRIGHT_DATA_CUSTOMER_ID!;

export const brightDataClient = axios.create({
  baseURL: 'https://api.brightdata.com',
  headers: {
    Authorization: `Bearer ${BRIGHT_DATA_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

export { checkProductPrice } from './price-tracker';
