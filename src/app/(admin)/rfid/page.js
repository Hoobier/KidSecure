"use client";

import { useEffect, useState } from "react";
import "./rfid.css";

function getRfidLogs() {
  return JSON.parse(window.localStorage.getItem("rfidLogs")) || [];
}

export default function RfidPage() {
  const [rfidLogs, setRfidLogs] = useState([]);
  const [dateFilter, setDateFilter] = useState("");
  const [nameSearch, setNameSearch] = useState("");

  useEffect(() => {
    setRfidLogs(getRfidLogs());
  }, []);

  const filteredLogs = rfidLogs.filter((log) => {
    const dateMatches = dateFilter
      ? (log.timeIn ? log.timeIn.split(" ")[0] : "") === dateFilter
      : true;
    const nameMatches = nameSearch
      ? (log.name || "").toLowerCase().includes(nameSearch.toLowerCase())
      : true;
    return dateMatches && nameMatches;
  });

  function clearFilters() {
    setDateFilter("");
    setNameSearch("");
    setRfidLogs(getRfidLogs());
  }

  return (
    <main className="log-section">
      <div className="section-header">
        <h2>RFID Attendance Logs</h2>
        <div className="filter-container">
          <input
            type="date"
            id="dateFilter"
            className="filter-input"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          <input
            type="text"
            id="nameSearch"
            className="filter-input"
            placeholder="Search by name"
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
          />
          <button className="refresh-btn" type="button" onClick={() => setRfidLogs(getRfidLogs())}>
            Refresh
          </button>
          <button className="refresh-btn" type="button" onClick={clearFilters} style={{ backgroundColor: "#f44336" }}>
            Clear Filters
          </button>
        </div>
      </div>
      <div className="log-table-container">
        <table className="log-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Name</th>
              <th>Time In</th>
              <th>Time Out</th>
            </tr>
          </thead>
          <tbody id="rfidTableBody">
            {filteredLogs.map((log, index) => (
              <tr key={`rfid-${index}`}>
                <td>{log.studentId || "-"}</td>
                <td>{log.name || "-"}</td>
                <td>{log.timeIn || "-"}</td>
                <td>{log.timeOut || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
