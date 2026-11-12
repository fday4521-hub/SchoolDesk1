"use client";

import { useState } from "react";

type ClassItem = { id: number; name: string; teacher: string };

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([
    { id: 1, name: "JSS 1A", teacher: "Mrs. Adeyemi" },
    { id: 2, name: "JSS 2B", teacher: "Mr. Okafor" },
  ]);
  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  function save() {
    if (!name.trim()) return;
    if (editingId === null) {
      setClasses([...classes, { id: Date.now(), name, teacher }]);
    } else {
      setClasses(
        classes.map((c) => (c.id === editingId ? { ...c, name, teacher } : c))
      );
      setEditingId(null);
    }
    setName("");
    setTeacher("");
  }

  function edit(c: ClassItem) {
    setEditingId(c.id);
    setName(c.name);
    setTeacher(c.teacher);
  }

  function remove(id: number) {
    setClasses(classes.filter((c) => c.id !== id));
  }

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Classes</h1>

      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <input
          placeholder="Class name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ border: "1px solid #999", padding: 8, flex: 1 }}
        />
        <input
          placeholder="Class teacher"
          value={teacher}
          onChange={(e) => setTeacher(e.target.value)}
          style={{ border: "1px solid #999", padding: 8, flex: 1 }}
        />
        <button
          onClick={save}
          style={{ padding: "8px 16px", background: "#16a34a", color: "white" }}
        >
          {editingId === null ? "Add" : "Save"}
        </button>
      </div>

      <ul>
        {classes.map((c) => (
          <li
            key={c.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: "1px solid #ddd",
            }}
          >
            <span>
              <strong>{c.name}</strong> — {c.teacher}
            </span>
            <span style={{ display: "flex", gap: 8 }}>
              <button onClick={() => edit(c)}>Edit</button>
              <button onClick={() => remove(c.id)}>Delete</button>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}