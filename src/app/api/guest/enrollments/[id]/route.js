import { cookies } from "next/headers";

function needsAuth() {
  return Response.json({ message: "You must be signed in." }, { status: 401 });
}

export async function GET(request, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("kidsecure_token")?.value;
  if (!token) return needsAuth();

  const id = (await params).id;
  try {
    const res = await fetch(
      `${process.env.LARAVEL_API_URL}/api/guest/enrollments/${id}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("Guest enrollment detail error:", err);
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("kidsecure_token")?.value;
  if (!token) return needsAuth();

  const id = (await params).id;
  const url = new URL(request.url);
  const action = url.pathname.split("/").slice(-1)[0];

  let laravelUrl;
  let method = "PATCH";
  let bodyInit;

  if (action === "convert-to-student") {
    laravelUrl = `${process.env.LARAVEL_API_URL}/api/guest/enrollments/${id}/convert-to-student`;
    method = "POST";
    const json = await request.json().catch(() => ({}));
    bodyInit = JSON.stringify(json);
  } else if (action === "reject") {
    laravelUrl = `${process.env.LARAVEL_API_URL}/api/guest/enrollments/${id}/reject`;
    method = "POST";
    bodyInit = "{}";
  } else {
    laravelUrl = `${process.env.LARAVEL_API_URL}/api/guest/enrollments/${id}`;
    const json = await request.json().catch(() => ({}));
    bodyInit = JSON.stringify(json);
  }

  try {
    const res = await fetch(laravelUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: bodyInit,
    });
    const data = await res.json().catch(() => ({ message: "Request failed" }));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("Guest enrollment update error:", err);
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 500 }
    );
  }
}
