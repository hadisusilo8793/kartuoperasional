// Placeholder for /functions/api/kartu.js
// Full implementation will be in a later phase.
export const onRequest = async () => {
  return new Response(JSON.stringify({ message: "Kartu API endpoint" }), {
    headers: { 'Content-Type': 'application/json' },
  });
};