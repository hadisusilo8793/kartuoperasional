// Placeholder for /functions/api/transaksi.js
export const onRequest = async () => {
  return new Response(JSON.stringify({ message: "Transaksi API endpoint" }), {
    headers: { 'Content-Type': 'application/json' },
  });
};