export async function POST(request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return Response.json(
      { message: "Please enter both email and password." },
      { status: 400 }
    );
  }

  try {
    const laravelResponse = await fetch(`${process.env.LARAVEL_API_URL}/api/teacher/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await laravelResponse.json();

    if (!laravelResponse.ok) {
      return Response.json(
        { message: data.message || "Invalid email or password." },
        { status: laravelResponse.status }
      );
    }

    const response = Response.json(
      { message: "Login successful", teacher: data.teacher },
      { status: 200 }
    );
    response.headers.set(
      "Set-Cookie",
      `kidsecure_teacher_token=${data.token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`
    );
    return response;
  } catch (error) {
    console.error("Teacher login route error:", error);
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 500 }
    );
  }
}