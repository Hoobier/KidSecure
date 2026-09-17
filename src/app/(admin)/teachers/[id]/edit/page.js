"use client";
// src/app/(admin)/teachers/[id]/edit/page.js
import { useState, useEffect, use } from "react";
import TeacherForm from "../../TeacherForm";
import "./edit-teacher.css";

export default function EditTeacherPage({ params }) {
  const { id } = use(params);
  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/teachers/${id}`, { credentials: "include" });
        const json = await res.json();
        if (res.ok) setInitial(json.data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="edit-page"><div className="edit-skeleton-title" /></div>;
  if (!initial) return <div className="edit-page"><p>Teacher not found.</p></div>;

  return <TeacherForm mode="edit" initial={initial} teacherId={id} />;
}