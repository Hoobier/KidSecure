import { cookies } from "next/headers";
// src/app/api/parents/route.js
export async function GET(request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("kidsecure_token")?.value;

  if (!token) {
    return Response.json({ message: "You must be signed in." }, { status: 401 });
  }

  const { search } = new URL(request.url);

  try {
    const laravelResponse = await fetch(
      `${process.env.LARAVEL_API_URL}/api/parents${search}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await laravelResponse.json();
    return Response.json(data, { status: laravelResponse.status });
  } catch (error) {
    console.error("Parent directory fetch error:", error);
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 500 }
    );
  }
}