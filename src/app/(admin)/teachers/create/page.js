"use client";
// src/app/(admin)/teachers/create/page.js
import TeacherForm from "../TeacherForm";
import "../[id]/edit/edit-teacher.css";

export default function CreateTeacherPage() {
  return <TeacherForm mode="create" />;
}