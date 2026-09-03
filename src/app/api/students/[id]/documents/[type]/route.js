import { cookies } from "next/headers";

// src/app/api/students/[id]/documents/[type]/route.js

export async function GET(request, { params }) {
  const { id, type } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("kidsecure_token")?.value;

  if (!token) {
    return Response.json({ message: "You must be signed in." }, { status: 401 });
  }

  try {
    const laravelResponse = await fetch(
      `${process.env.LARAVEL_API_URL}/api/students/${id}/documents/${type}`,
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
    console.error("Student document view error:", error);
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 500 }
    );
  }
}