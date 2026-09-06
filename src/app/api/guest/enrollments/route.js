import { cookies } from "next/headers";
// src/app/api/guest/enrollments/route.js
export async function POST(request) {
  const formData = await request.formData();

  try {
    const laravelResponse = await fetch(`${process.env.LARAVEL_API_URL}/api/guest/enrollments`, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData,
      cache: "no-store",
    });
    const contentType = laravelResponse.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await laravelResponse.json()
      : { message: await laravelResponse.text() };
    return Response.json(data, { status: laravelResponse.status });
  } catch (error) {
    console.error("Guest enrollment submit error:", error);
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
    const laravelResponse = await fetch(
      `${process.env.LARAVEL_API_URL}/api/guest/enrollments${search}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );
    const data = await laravelResponse.json();
    return Response.json(data, { status: laravelResponse.status });
  } catch (error) {
    console.error("Guest enrollments list error:", error);
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 500 }
    );
  }
}
