import { cookies } from "next/headers";

// src/app/api/subjects-by-grade/route.js

export async function GET() {
  const cookieStore = await cookies();
  // Accept either the admin or teacher cookie — the endpoint works for both.
  const adminToken = cookieStore.get("kidsecure_token")?.value;
  const teacherToken = cookieStore.get("kidsecure_teacher_token")?.value;
  const token = adminToken || teacherToken;

  if (!token) {
    return Response.json({ message: "You must be signed in." }, { status: 401 });
  }

  try {
    const laravelResponse = await fetch(
      `${process.env.LARAVEL_API_URL}/api/subjects-by-grade`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await laravelResponse.json();
    return Response.json(data, { status: laravelResponse.status });
  } catch (error) {
    console.error("Subjects-by-grade fetch error:", error);
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 500 }
    );
  }
}