import { cookies } from "next/headers";

// src/app/api/students/route.js

export async function POST(request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("kidsecure_token")?.value;

  if (!token) {
    return Response.json({ message: "You must be signed in." }, { status: 401 });
  }

  const body = await request.json();

  try {
    const laravelResponse = await fetch(`${process.env.LARAVEL_API_URL}/api/students`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await laravelResponse.json();

    return Response.json(data, { status: laravelResponse.status });
  } catch (error) {
    console.error("Enrollment submit error:", error);
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("kidsecure_token")?.value;

  if (!token) {
    return Response.json({ message: "You must be signed in." }, { status: 401 });
  }

  const { search } = new URL(request.url);

  try {
    const laravelResponse = await fetch(`${process.env.LARAVEL_API_URL}/api/students${search}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await laravelResponse.json();

    return Response.json(data, { status: laravelResponse.status });
  } catch (error) {
    console.error("Students list fetch error:", error);
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 500 }
    );
  }
}