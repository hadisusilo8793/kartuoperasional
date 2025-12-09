// Placeholder for /functions/api/gate.js
export const onRequest = async () => {
  return new Response(JSON.stringify({ message: "Gate API endpoint" }), {
    headers: { 'Content-Type': 'application/json' },
  });
};