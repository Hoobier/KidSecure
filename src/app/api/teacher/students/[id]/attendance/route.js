import { cookies } from "next/headers";
// src/app/api/teacher/students/[id]/attendance/route.js

async function proxy(request, params) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("kidsecure_teacher_token")?.value;
  if (!token) {
    return Response.json({ message: "You must be signed in." }, { status: 401 });
  }
  const method = request.method;
  const body = method === "POST" ? await request.text() : undefined;
  try {
    const laravelResponse = await fetch(
      `${process.env.LARAVEL_API_URL}/api/teacher/students/${id}/attendance`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body,
      }
    );
    const data = await laravelResponse.json().catch(() => ({}));
    return Response.json(data, { status: laravelResponse.status });
  } catch (error) {
    console.error("Teacher attendance proxy error:", error);
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  return proxy(request, params);
}

export async function POST(request, { params }) {
  return proxy(request, params);
}
