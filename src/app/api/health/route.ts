export async function GET() {
  return Response.json({
    status: true,
    service: "platanist-nest",
    timestamp: new Date().toISOString(),
  });
}
