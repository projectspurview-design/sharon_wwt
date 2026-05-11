// src/config.js
const SHEET_ID = process.env.REACT_APP_SHEET_ID || '1qfCQnJkj-h51TdiCVWcRWmrtBdL0chW1';

export const config = {
  SHEET_ID: SHEET_ID,
  SITE_NAME: process.env.REACT_APP_SITE_NAME || 'Asset Dashboard'
};

export default config;