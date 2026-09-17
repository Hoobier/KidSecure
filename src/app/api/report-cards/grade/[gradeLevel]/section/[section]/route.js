import { cookies } from "next/headers";

// src/app/api/report-cards/grade/[gradeLevel]/section/[section]/route.js

export async function GET(request, { params }) {
  const { gradeLevel, section } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("kidsecure_token")?.value;

  if (!token) {
    return Response.json({ message: "You must be signed in." }, { status: 401 });
  }

  try {
    const search = request.nextUrl?.search || "";
    const url = `${process.env.LARAVEL_API_URL}/api/report-cards/grade/${encodeURIComponent(gradeLevel)}/section/${encodeURIComponent(section)}${search}`;
    const laravelResponse = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await laravelResponse.json();
    return Response.json(data, { status: laravelResponse.status });
  } catch (error) {
    console.error("Report cards by section fetch error:", error);
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 500 }
    );
  }
}