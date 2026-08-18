import { formatInTimeZone } from "date-fns-tz";
import { localMinutesSinceMidnight } from "../lib/reportTimeZone";

const tz = "Asia/Karachi";
const now = new Date();
const hh = formatInTimeZone(now, tz, "HH");
const mm = formatInTimeZone(now, tz, "mm");
const mins = localMinutesSinceMidnight(tz);

console.log("Current Date:", now.toISOString());
console.log("TZ:", tz);
console.log("HH:", hh);
console.log("mm:", mm);
console.log("Minutes since midnight:", mins);
console.log("Is 02:00 passed (120)?", mins >= 120);
