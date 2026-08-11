'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import './students.css';

const GRADE_OPTIONS = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
const SECTION_OPTIONS = ['A', 'B', 'C'];

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      per_page: '20',
      ...(search ? { search } : {}),
      ...(grade ? { grade } : {}),
      ...(section ? { section } : {}),
      ...(status ? { status } : {}),
    });

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load students');
      const json = await res.json();
      setStudents(json.data);
      setMeta(json.meta);
    } catch (err) {
      console.error(err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, grade, section, status]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Reset to page 1 whenever a filter changes
  useEffect(() => {
    setPage(1);
  }, [search, grade, section, status]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Students</h1>
        <Link
          href="/students/enroll"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Student
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search by name or Student ID"
          className="flex-1 min-w-[240px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Grade Levels</option>
          {GRADE_OPTIONS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Sections</option>
          {SECTION_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Student ID</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Grade & Section</th>
              <th className="px-4 py-3 font-medium">RFID Tag</th>
              <th className="px-4 py-3 font-medium">Parent Linked</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-t border-gray-100 animate-pulse">
                  <td className="px-4 py-3" colSpan={7}>
                    <div className="h-4 bg-gray-100 rounded w-full" />
                  </td>
                </tr>
              ))
            )}

            {!loading && students.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                  No students found. Try adjusting your search or filters.
                </td>
              </tr>
            )}

            {!loading && students.map((s) => (
              <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700">{s.studentId}</td>
                <td className="px-4 py-3 text-gray-900 font-medium">{s.fullName}</td>
                <td className="px-4 py-3 text-gray-700">{s.gradeLevel} - {s.section}</td>
                <td className="px-4 py-3">
                  {s.hasRfidTag ? (
                    <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-xs">🟢 Assigned</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-xs">🟡 Not Assigned</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700">{s.hasParentLink ? '✓' : '—'}</td>
                <td className="px-4 py-3 text-gray-700 capitalize">{s.status}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/students/${s.id}`} className="text-blue-600 hover:underline font-medium">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && students.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>
            Showing {(meta.currentPage - 1) * meta.perPage + 1}
            –{Math.min(meta.currentPage * meta.perPage, meta.total)} of {meta.total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.currentPage <= 1}
              className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.lastPage, p + 1))}
              disabled={meta.currentPage >= meta.lastPage}
              className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}