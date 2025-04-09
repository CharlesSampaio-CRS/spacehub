const fs = require("fs");
const path = require("path");
require("dotenv").config();

const outputPath = path.resolve(__dirname, "../src/config.js");

const configContent = `
/**
 * Arquivo gerado automaticamente a partir do .env
 */
module.exports = {
  API_URL: "${process.env.API_URL}",
  BACKEND_URL: "${process.env.BACKEND_URL}",
  GOOGLE_CLIENT_ID: "${process.env.GOOGLE_CLIENT_ID}",
  GOOGLE_CLIENT_SECRET: "${process.env.GOOGLE_CLIENT_SECRET}",
  GOOGLE_REDIRECT_URI: "${process.env.GOOGLE_REDIRECT_URI}"
};
`;

fs.writeFileSync(outputPath, configContent.trim());
console.log("✅ config.js gerado com sucesso em src/config.js");
