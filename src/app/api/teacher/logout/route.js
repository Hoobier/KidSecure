export async function POST() {
  const response = Response.json({ message: "Logged out successfully" }, { status: 200 });
  response.headers.set(
    "Set-Cookie",
    `kidsecure_teacher_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );
  return response;
}