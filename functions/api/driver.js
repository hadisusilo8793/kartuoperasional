// Placeholder for /functions/api/driver.js
export const onRequest = async () => {
  return new Response(JSON.stringify({ message: "Driver API endpoint" }), {
    headers: { 'Content-Type': 'application/json' },
  });
};