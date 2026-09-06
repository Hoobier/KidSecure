import { cookies } from "next/headers";
// src/app/api/guest/enrollments/[id]/reject/route.js
export async function POST(request, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("kidsecure_token")?.value;
  if (!token) {
    return Response.json({ message: "You must be signed in." }, { status: 401 });
  }

  const id = (await params).id;

  // Read the reason from the admin's request instead of discarding it.
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  try {
    const res = await fetch(
      `${process.env.LARAVEL_API_URL}/api/guest/enrollments/${id}/reject`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      }
    );
    const data = await res.json().catch(() => ({ message: "Request failed" }));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("Reject guest enrollment error:", err);
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 500 }
    );
  }
}