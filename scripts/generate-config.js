// scripts/generate-config.js
const fs = require('fs');
require('dotenv').config();

const config = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GH_TOKEN: process.env.GH_TOKEN
};

const content = `module.exports = ${JSON.stringify(config, null, 2)};`;

fs.writeFileSync('config.js', content);
console.log('Config.js gerado com sucesso!');
