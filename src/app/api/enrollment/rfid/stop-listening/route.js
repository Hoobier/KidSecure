import { cookies } from "next/headers";

// src/app/api/enrollment/rfid/stop-listening/route.js

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("kidsecure_token")?.value;

  if (!token) {
    return Response.json({ message: "You must be signed in." }, { status: 401 });
  }

  try {
    const laravelResponse = await fetch(
      `${process.env.LARAVEL_API_URL}/api/enrollment/rfid/stop-listening`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await laravelResponse.json();
    return Response.json(data, { status: laravelResponse.status });
  } catch (error) {
    console.error("RFID stop-listening error:", error);
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 500 }
    );
  }
}