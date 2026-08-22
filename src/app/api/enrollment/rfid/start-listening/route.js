import { cookies } from "next/headers";

// src/app/api/enrollment/rfid/start-listening/route.js

export async function POST(request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("kidsecure_token")?.value;

  if (!token) {
    return Response.json({ message: "You must be signed in." }, { status: 401 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    // no body sent — that's fine, excludeStudentId is optional
  }

  try {
    const laravelResponse = await fetch(
      `${process.env.LARAVEL_API_URL}/api/enrollment/rfid/start-listening`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await laravelResponse.json();
    return Response.json(data, { status: laravelResponse.status });
  } catch (error) {
    console.error("RFID start-listening error:", error);
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 500 }
    );
  }
}