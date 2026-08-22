import { cookies } from "next/headers";

// src/app/api/students/[id]/route.js

export async function GET(request, { params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("kidsecure_token")?.value;

  if (!token) {
    return Response.json({ message: "You must be signed in." }, { status: 401 });
  }

  try {
    const laravelResponse = await fetch(`${process.env.LARAVEL_API_URL}/api/students/${id}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await laravelResponse.json();

    return Response.json(data, { status: laravelResponse.status });
  } catch (error) {
    console.error("Student detail fetch error:", error);
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 500 }
    );
  }

  
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("kidsecure_token")?.value;

  if (!token) {
    return Response.json({ message: "You must be signed in." }, { status: 401 });
  }

  const body = await request.json();

  try {
    const laravelResponse = await fetch(`${process.env.LARAVEL_API_URL}/api/students/${id}`, {
      method: "PATCH",
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
    console.error("Update student error:", error);
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("kidsecure_token")?.value;

  if (!token) {
    return Response.json({ message: "You must be signed in." }, { status: 401 });
  }

  try {
    const laravelResponse = await fetch(
      `${process.env.LARAVEL_API_URL}/api/students/${id}/delete`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const ct = laravelResponse.headers.get("content-type") || "";
    const status = laravelResponse.status;
    let payload;

    if (status === 204) {
      payload = { success: true };
    } else if (ct.includes("application/json")) {
      try {
        payload = await laravelResponse.json();
      } catch {
        payload = { message: "Server returned an invalid response." };
      }
    } else {
      try {
        const text = await laravelResponse.text();
        payload = { message: (text || "").slice(0, 500) || "Request failed." };
      } catch {
        payload = { message: "Request failed." };
      }
    }

    if (status >= 200 && status < 300) {
      return Response.json(
        { success: true, ...(payload || {}) },
        { status: status === 204 ? 200 : status }
      );
    }

    return Response.json(payload, { status });
  } catch (error) {
    console.error("Soft-delete student error:", error);
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 500 }
    );
  }
}