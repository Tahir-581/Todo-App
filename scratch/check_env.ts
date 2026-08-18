require('dotenv').config();
console.log("CRON_SECRET Raw:", JSON.stringify(process.env.CRON_SECRET));

console.log("Trimmed:", JSON.stringify(process.env.CRON_SECRET?.trim()));
