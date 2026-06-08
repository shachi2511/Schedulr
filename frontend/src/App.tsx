import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const HOURS = Array.from({ length: 9 }, (_, i) => i + 9); // 9am to 5pm

interface Task {
  _id: string;
  name: string;
  priority: string;
  duration: number;
  deadline: string;
  category: string;
}

interface ScheduledBlock {
  task_id: string;
  task_name: string;
  priority: string;
  day: number;
  start: number;
  end: number;
  date: string;
}

interface NewTask {
  name: string;
  priority: string;
  duration: number;
  deadline: string;
  category: string;
}

const FIXED_EVENTS = [
  { title: "Standup", day: 0, start: 9, end: 9.5 },
  { title: "Sprint planning", day: 0, start: 14, end: 15.5 },
  { title: "Standup", day: 1, start: 9, end: 9.5 },
  { title: "Design sync", day: 1, start: 11, end: 12 },
  { title: "Standup", day: 2, start: 9, end: 9.5 },
  { title: "Standup", day: 3, start: 9, end: 9.5 },
  { title: "Architecture review", day: 3, start: 13, end: 14.5 },
  { title: "Standup", day: 4, start: 9, end: 9.5 },
  { title: "All-hands", day: 4, start: 16, end: 17 },
];

const priorityColor: Record<string, string> = {
  high: "#fee2e2",
  med: "#fef9c3",
  low: "#dcfce7",
};

const priorityBorder: Record<string, string> = {
  high: "#ef4444",
  med: "#eab308",
  low: "#22c55e",
};

function fmtTime(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const ampm = hh < 12 ? "am" : "pm";
  return `${hh > 12 ? hh - 12 : hh}${mm ? ":" + String(mm).padStart(2, "0") : ""}${ampm}`;
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledBlock[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState<NewTask>({
    name: "",
    priority: "med",
    duration: 1,
    deadline: "2026-06-12",
    category: "general",
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    const res = await axios.get(`${API}/tasks`);
    setTasks(res.data);
  }

  async function optimize() {
    const res = await axios.post(`${API}/optimize`, {
      week_start: "2026-06-09",
      fixed_events: FIXED_EVENTS,
    });
    setScheduled(res.data.scheduled);
  }

  async function addTask() {
    if (!newTask.name) return;
    await axios.post(`${API}/tasks`, newTask);
    setShowModal(false);
    setNewTask({ name: "", priority: "med", duration: 1, deadline: "2026-06-12", category: "general" });
    await fetchTasks();
    await optimize();
  }

  async function deleteTask(id: string) {
    await axios.delete(`${API}/tasks/${id}`);
    await fetchTasks();
    setScheduled((prev) => prev.filter((b) => b.task_id !== id));
  }

  const SLOT_H = 56;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
      {/* Topbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 52, background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
        <span style={{ fontWeight: 600, fontSize: 16 }}>⬡ Chrono</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={optimize} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontWeight: 500 }}>
            ⚡ Re-optimize
          </button>
          <button onClick={() => setShowModal(true)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#1e293b", color: "#fff", cursor: "pointer", fontWeight: 500 }}>
            + Add task
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{ width: 260, borderRight: "1px solid #e2e8f0", background: "#fff", overflowY: "auto", padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8", marginBottom: 12 }}>
            Tasks ({tasks.length})
          </div>
          {tasks.map((t) => (
            <div key={t._id} style={{ padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 8, borderLeft: `3px solid ${priorityBorder[t.priority] || "#94a3b8"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</span>
                <button onClick={() => deleteTask(t._id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{t.duration}h · {t.category} · due {t.deadline}</div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", marginTop: 32 }}>No tasks yet. Add one!</div>
          )}
        </div>

        {/* Calendar */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "52px repeat(5, 1fr)", position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #e2e8f0", zIndex: 10 }}>
            <div />
            {DAYS.map((d) => (
              <div key={d} style={{ padding: "10px 8px", textAlign: "center", fontSize: 13, fontWeight: 500, borderRight: "1px solid #e2e8f0" }}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "52px repeat(5, 1fr)" }}>
            {/* Time labels */}
            <div>
              {HOURS.map((h) => (
                <div key={h} style={{ height: SLOT_H, borderBottom: "1px solid #f1f5f9", fontSize: 11, color: "#94a3b8", padding: "4px 8px 0", textAlign: "right" }}>
                  {h > 12 ? h - 12 : h}{h < 12 ? "a" : "p"}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {DAYS.map((_, dayIdx) => (
              <div key={dayIdx} style={{ position: "relative", borderRight: "1px solid #e2e8f0" }}>
                {HOURS.map((h) => (
                  <div key={h} style={{ height: SLOT_H, borderBottom: "1px solid #f1f5f9" }} />
                ))}

                {/* Fixed events */}
                {FIXED_EVENTS.filter((e) => e.day === dayIdx).map((e, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    top: (e.start - 9) * SLOT_H + 2,
                    height: (e.end - e.start) * SLOT_H - 4,
                    left: 3, right: 3,
                    background: "#eff6ff",
                    borderLeft: "3px solid #3b82f6",
                    borderRadius: 4,
                    padding: "3px 6px",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#1e40af",
                    overflow: "hidden",
                  }}>
                    {e.title}
                  </div>
                ))}

                {/* Scheduled tasks */}
                {scheduled.filter((b) => b.day === dayIdx).map((b, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    top: (b.start - 9) * SLOT_H + 2,
                    height: (b.end - b.start) * SLOT_H - 4,
                    left: 3, right: 3,
                    background: priorityColor[b.priority] || "#f1f5f9",
                    borderLeft: `3px solid ${priorityBorder[b.priority] || "#94a3b8"}`,
                    borderRadius: 4,
                    padding: "3px 6px",
                    fontSize: 11,
                    overflow: "hidden",
                  }}>
                    <div style={{ fontWeight: 500 }}>{b.task_name}</div>
                    <div style={{ color: "#64748b" }}>{fmtTime(b.start)}–{fmtTime(b.end)}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 340 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>New task</div>
            {[
              { label: "Task name", key: "name", type: "text", placeholder: "e.g. Write API docs" },
              { label: "Deadline", key: "deadline", type: "date" },
              { label: "Duration (hours)", key: "duration", type: "number" },
              { label: "Category", key: "category", type: "text", placeholder: "e.g. eng, design" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#64748b", marginBottom: 4 }}>{label}</div>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={(newTask as any)[key]}
                  onChange={(e) => setNewTask({ ...newTask, [key]: type === "number" ? parseFloat(e.target.value) : e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#64748b", marginBottom: 4 }}>Priority</div>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13 }}
              >
                <option value="high">🔴 High</option>
                <option value="med">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}>Cancel</button>
              <button onClick={addTask} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#1e293b", color: "#fff", cursor: "pointer", fontWeight: 500 }}>Add task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}