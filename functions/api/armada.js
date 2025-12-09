// Placeholder for /functions/api/armada.js
export const onRequest = async () => {
  return new Response(JSON.stringify({ message: "Armada API endpoint" }), {
    headers: { 'Content-Type': 'application/json' },
  });
};