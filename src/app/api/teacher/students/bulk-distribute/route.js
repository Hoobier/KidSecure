import { cookies } from "next/headers";

// src/app/api/teacher/students/bulk-distribute/route.js
// POST → distribute several admin-approved report cards to parents in one request.

export async function POST(request) {
  const token = (await cookies()).get("kidsecure_teacher_token")?.value;
  if (!token) {
    return Response.json({ message: "You must be signed in." }, { status: 401 });
  }

  try {
    const body = await request.text();
    const laravelResponse = await fetch(
      `${process.env.LARAVEL_API_URL}/api/teacher/students/bulk-distribute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body,
      }
    );

    const data = await laravelResponse.json();
    return Response.json(data, { status: laravelResponse.status });
  } catch (error) {
    console.error("Teacher bulk distribute proxy error:", error);
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 500 }
    );
  }
}
