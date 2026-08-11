export async function GET(request) {
  const token = request.cookies.get("kidsecure_token")?.value;

  if (!token) {
    return Response.json({ message: "Not authenticated." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";

  try {
    const laravelResponse = await fetch(
      `${process.env.LARAVEL_API_URL}/api/parents/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await laravelResponse.json();

    if (!laravelResponse.ok) {
      return Response.json(
        { message: data.message || "Unable to search parents/guardians." },
        { status: laravelResponse.status }
      );
    }

    return Response.json(data, { status: 200 });
  } catch (error) {
    console.error("Parent search route error:", error);
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 500 }
    );
  }
}