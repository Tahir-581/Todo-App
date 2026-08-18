async function main() {
  const res = await fetch("http://localhost:3111/api/cron/progress-tracker/daily-report", {
    method: "POST",
    headers: {
      "x-cron-secret": "cron_Lz6wM7pK8vQ2nR5tX9cD1hJ4sA3eF7gB"
    }
  });
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}
main().catch(console.error);
