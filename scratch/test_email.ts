import { sendRawEmail } from "../lib/email";
import * as dotenv from "dotenv";
dotenv.config();


async function main() {
  const res = await sendRawEmail({
    to: "muhammad.eshan.8.2.4@gmail.com",
    subject: "Test Email from Todo App",
    html: "<h1>Test</h1><p>If you see this, email is working.</p>"
  });
  console.log("Result:", res);
}
main().catch(console.error);
