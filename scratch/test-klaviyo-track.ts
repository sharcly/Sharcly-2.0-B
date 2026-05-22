import dotenv from 'dotenv';
dotenv.config();
import { KlaviyoService } from '../src/modules/marketing/klaviyo.service';

async function run() {
  console.log("Initializing Klaviyo with key:", process.env.KLAVIYO_PRIVATE_API_KEY);
  KlaviyoService.init(process.env.KLAVIYO_PRIVATE_API_KEY);
  
  console.log("Attempting to track dummy event...");
  await KlaviyoService.trackEvent("test@example.com", "Test Event", { test: true });
  console.log("Done.");
}

run();
