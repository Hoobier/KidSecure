// src/app/api/guest/enrollments/lookup/route.js
export async function GET(request) {
  const { search } = new URL(request.url);

  try {
    const laravelResponse = await fetch(
      `${process.env.LARAVEL_API_URL}/api/guest/enrollments/lookup${search}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    );
    const data = await laravelResponse.json();
    return Response.json(data, { status: laravelResponse.status });
  } catch (error) {
    console.error("Guest enrollment lookup error:", error);
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 500 }
    );
  }
}