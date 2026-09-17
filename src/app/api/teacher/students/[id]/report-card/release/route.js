import { cookies } from "next/headers";
export async function POST(request, { params }) {
  const token = (await cookies()).get("kidsecure_teacher_token")?.value; const { id } = await params;
  if (!token) return Response.json({ message: "You must be signed in." }, { status: 401 });
  try { const response = await fetch(`${process.env.LARAVEL_API_URL}/api/teacher/students/${id}/report-card/release`, { method: "POST", headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }); return Response.json(await response.json(), { status: response.status }); } catch { return Response.json({ message: "Unable to reach the server. Please try again." }, { status: 500 }); }
}