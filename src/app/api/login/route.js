export async function POST(request) {
  const { email, password } = await request.json();

  // Basic validation before we even bother calling Laravel
  if (!email || !password) {
    return Response.json(
      { message: "Please enter both email and password." },
      { status: 400 }
    );
  }

  try {
    // 1. Forward the login attempt to Laravel
    const laravelResponse = await fetch(`${process.env.LARAVEL_API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await laravelResponse.json();

    // 2. If Laravel rejected the login (wrong password, etc.)
    if (!laravelResponse.ok) {
      return Response.json(
        { message: data.message || "Invalid email or password." },
        { status: laravelResponse.status }
      );
    }

    // 3. Laravel gave us a Sanctum token — now we set it as an httpOnly cookie
    const token = data.token; // adjust this key if your /api/login returns it differently

    const response = Response.json({ message: "Login successful" }, { status: 200 });

    response.headers.set(
      "Set-Cookie",
      `kidsecure_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`
    );

    return response;
  } catch (error) {
    console.error("Login route error:", error);
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 500 }
    );
  }
}