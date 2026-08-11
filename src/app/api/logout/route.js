export async function POST() {
  const response = Response.json({ message: "Logged out successfully" }, { status: 200 });

  // Overwrite the cookie with an already-expired one — this is how you "delete" a cookie
  response.headers.set(
    "Set-Cookie",
    `kidsecure_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );

  return response;
}