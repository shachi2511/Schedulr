import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://52.14.140.11:8000";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const HOURS = Array.from({ length: 10 }, (_, i) => i + 8);

interface Task {
  _id: string;
  name: string;
  priority: string;
  duration: number;
  deadline: string;
  category: string;
  done?: boolean;
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

interface FixedEvent {
  title: string;
  day: number;
  start: number;
  end: number;
}

interface NewTask {
  name: string;
  priority: string;
  duration: number;
  deadline: string;
  category: string;
}

const DEFAULT_EVENTS: FixedEvent[] = [
  { title: "Morning stretch", day: 0, start: 8, end: 8.5 },
  { title: "Lunch break", day: 0, start: 12, end: 13 },
  { title: "Morning stretch", day: 1, start: 8, end: 8.5 },
  { title: "Lunch break", day: 1, start: 12, end: 13 },
  { title: "Morning stretch", day: 2, start: 8, end: 8.5 },
  { title: "Lunch break", day: 2, start: 12, end: 13 },
  { title: "Morning stretch", day: 3, start: 8, end: 8.5 },
  { title: "Lunch break", day: 3, start: 12, end: 13 },
  { title: "Morning stretch", day: 4, start: 8, end: 8.5 },
  { title: "Lunch break", day: 4, start: 12, end: 13 },
  { title: "Hydrate + walk", day: 2, start: 15, end: 15.5 },
];

const PRIORITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  high: { bg: "#2d1f1f", border: "#ef4444", text: "#fca5a5" },
  med:  { bg: "#2d2a1f", border: "#f59e0b", text: "#fcd34d" },
  low:  { bg: "#1f2d22", border: "#22c55e", text: "#86efac" },
};

function fmtTime(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const ampm = hh < 12 ? "am" : "pm";
  return `${hh > 12 ? hh - 12 : hh}${mm ? ":" + String(mm).padStart(2, "0") : ""}${ampm}`;
}

const SLOT_H = 56;

const s: Record<string, React.CSSProperties> = {
  app: { display: "flex", flexDirection: "column", height: "100vh", background: "#0f0f13" },
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 52, background: "#16161f", borderBottom: "1px solid #2d2d3d", flexShrink: 0 },
  logo: { fontWeight: 700, fontSize: 15, letterSpacing: "-0.3px", color: "#e2e8f0" },
  topRight: { display: "flex", gap: 8 },
  btnSecondary: { padding: "6px 14px", borderRadius: 7, border: "1px solid #2d2d3d", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 500 },
  btnPrimary: { padding: "6px 14px", borderRadius: 7, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  sidebar: { width: 268, borderRight: "1px solid #2d2d3d", background: "#16161f", display: "flex", flexDirection: "column", overflow: "hidden" },
  sidebarInner: { overflowY: "auto" as const, flex: 1, padding: "16px 12px" },
  sectionLabel: { fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1.2, color: "#475569", marginBottom: 10, padding: "0 4px" },
  taskCard: { padding: "10px 12px", borderRadius: 8, marginBottom: 6, cursor: "pointer", transition: "opacity 0.2s" },
  taskName: { fontSize: 13, fontWeight: 500, marginBottom: 4, lineHeight: 1.3 },
  taskMeta: { fontSize: 11, color: "#64748b" },
  calArea: { flex: 1, overflowY: "auto" as const, background: "#0f0f13" },
  calHeader: { display: "grid", gridTemplateColumns: "52px repeat(5, 1fr)", position: "sticky" as const, top: 0, background: "#16161f", borderBottom: "1px solid #2d2d3d", zIndex: 10 },
  calHeaderCell: { padding: "10px 8px", textAlign: "center" as const, fontSize: 12, fontWeight: 500, color: "#94a3b8", borderRight: "1px solid #2d2d3d" },
  calGrid: { display: "grid", gridTemplateColumns: "52px repeat(5, 1fr)" },
  timeLabel: { height: SLOT_H, fontSize: 10, color: "#475569", padding: "4px 8px 0", textAlign: "right" as const, borderBottom: "1px solid #1e1e2a", borderRight: "1px solid #2d2d3d", fontFamily: "monospace" },
  dayCol: { position: "relative" as const, borderRight: "1px solid #1e1e2a" },
  hourCell: { height: SLOT_H, borderBottom: "1px solid #1a1a24" },
  eventBase: { position: "absolute" as const, left: 3, right: 3, borderRadius: 5, padding: "4px 7px", fontSize: 11, overflow: "hidden", borderLeft: "3px solid" },
  fixedEvent: { background: "#1a2235", borderLeftColor: "#3b82f6", color: "#93c5fd" },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "#16161f", borderRadius: 12, border: "1px solid #2d2d3d", width: 360, padding: 24 },
  modalTitle: { fontSize: 16, fontWeight: 600, marginBottom: 18, color: "#e2e8f0" },
  fieldLabel: { fontSize: 11, fontWeight: 500, color: "#64748b", display: "block", marginBottom: 4 },
  input: { width: "100%", padding: "8px 10px", border: "1px solid #2d2d3d", borderRadius: 6, fontSize: 13, background: "#0f0f13", color: "#e2e8f0", marginBottom: 12 },
  modalActions: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 },
  celebration: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, flexDirection: "column" as const, gap: 16 },
};

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledBlock[]>([]);
  const [fixedEvents, setFixedEvents] = useState<FixedEvent[]>(DEFAULT_EVENTS);
  const [showModal, setShowModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  //const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState<NewTask>({ name: "", priority: "med", duration: 1, deadline: "2026-06-13", category: "general" });
  const [newEvent, setNewEvent] = useState<FixedEvent>({ title: "", day: 0, start: 9, end: 10 });

  useEffect(() => { fetchTasks(); }, []);

  async function fetchTasks() {
    const res = await axios.get(`${API}/tasks`);
    setTasks(res.data);
  }

  async function optimize(taskList = tasks) {
    if (taskList.length === 0) { setScheduled([]); return; }
    const res = await axios.post(`${API}/optimize`, { week_start: "2026-06-09", fixed_events: fixedEvents });
    setScheduled(res.data.scheduled);
  }

  async function addTask() {
    if (!newTask.name) return;
    await axios.post(`${API}/tasks`, newTask);
    setShowModal(false);
    setNewTask({ name: "", priority: "med", duration: 1, deadline: "2026-06-13", category: "general" });
    const res = await axios.get(`${API}/tasks`);
    setTasks(res.data);
    await optimize(res.data);
  }

  async function deleteTask(id: string) {
    await axios.delete(`${API}/tasks/${id}`);
    const updated = tasks.filter(t => t._id !== id);
    setTasks(updated);
    setScheduled(prev => prev.filter(b => b.task_id !== id));
  }

  function toggleDone(id: string) {
    const updated = tasks.map(t => t._id === id ? { ...t, done: !t.done } : t);
    setTasks(updated);
    const allDone = updated.every(t => t.done);
    if (allDone && updated.length > 0) setShowCelebration(true);
  }

  function addFixedEvent() {
    if (!newEvent.title) return;
    const updated = [...fixedEvents, newEvent];
    setFixedEvents(updated);
    setShowEventModal(false);
    setNewEvent({ title: "", day: 0, start: 9, end: 10 });
    optimize();
  }

  function removeFixedEvent(i: number) {
    const updated = fixedEvents.filter((_, idx) => idx !== i);
    setFixedEvents(updated);
  }

  return (
    <div style={s.app}>
      {/* Topbar */}
      <div style={s.topbar}>
        <span style={s.logo}>◈ Schedulr</span>
        <div style={s.topRight}>
          <button style={s.btnSecondary} onClick={() => setShowEventModal(true)}>+ Event</button>
          <button style={s.btnSecondary} onClick={() => optimize()}>⚡ Re-optimize</button>
          <button style={s.btnPrimary} onClick={() => setShowModal(true)}>+ Add task</button>
        </div>
      </div>

      <div style={s.body}>
        {/* Sidebar */}
        <div style={s.sidebar}>
          <div style={s.sidebarInner}>
            <div style={s.sectionLabel}>Tasks — {tasks.filter(t => !t.done).length} remaining</div>
            {tasks.map(t => {
              const c = PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.low;
              return (
                <div key={t._id} style={{ ...s.taskCard, background: c.bg, borderLeft: `3px solid ${c.border}`, opacity: t.done ? 0.45 : 1 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <input type="checkbox" checked={!!t.done} onChange={() => toggleDone(t._id)}
                      style={{ marginTop: 2, accentColor: c.border, cursor: "pointer" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ ...s.taskName, color: c.text, textDecoration: t.done ? "line-through" : "none" }}>{t.name}</div>
                      <div style={s.taskMeta}>{t.duration}h · {t.category} · due {t.deadline}</div>
                    </div>
                    <button onClick={() => deleteTask(t._id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
                  </div>
                </div>
              );
            })}
            {tasks.length === 0 && <div style={{ fontSize: 12, color: "#475569", textAlign: "center", marginTop: 40 }}>No tasks yet</div>}

            {/* Fixed events list */}
            <div style={{ ...s.sectionLabel, marginTop: 20 }}>Fixed events</div>
            {fixedEvents.map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", borderRadius: 6, marginBottom: 4, background: "#1a2235", fontSize: 12, color: "#93c5fd" }}>
                <span>{DAYS[e.day]} {fmtTime(e.start)} — {e.title}</span>
                <button onClick={() => removeFixedEvent(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", fontSize: 14 }}>×</button>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div style={s.calArea}>
          <div style={s.calHeader}>
            <div />
            {DAYS.map(d => <div key={d} style={s.calHeaderCell}>{d}</div>)}
          </div>
          <div style={s.calGrid}>
            <div>
              {HOURS.map(h => <div key={h} style={s.timeLabel}>{h > 12 ? h - 12 : h}{h < 12 ? "a" : "p"}</div>)}
            </div>
            {DAYS.map((_, di) => (
              <div key={di} style={s.dayCol}>
                {HOURS.map(h => <div key={h} style={s.hourCell} />)}
                {fixedEvents.filter(e => e.day === di).map((e, i) => (
                  <div key={i} style={{ ...s.eventBase, ...s.fixedEvent, top: (e.start - 8) * SLOT_H + 2, height: (e.end - e.start) * SLOT_H - 4 }}>
                    <div style={{ fontWeight: 500 }}>{e.title}</div>
                    <div style={{ opacity: 0.7 }}>{fmtTime(e.start)}–{fmtTime(e.end)}</div>
                  </div>
                ))}
                {scheduled.filter(b => b.day === di).map((b, i) => {
                  const c = PRIORITY_COLORS[b.priority] || PRIORITY_COLORS.low;
                  const task = tasks.find(t => t._id === b.task_id);
                  return (
                    <div key={i} style={{ ...s.eventBase, background: c.bg, borderLeftColor: c.border, color: c.text, top: (b.start - 8) * SLOT_H + 2, height: (b.end - b.start) * SLOT_H - 4, opacity: task?.done ? 0.4 : 1 }}>
                      <div style={{ fontWeight: 500, textDecoration: task?.done ? "line-through" : "none" }}>{b.task_name}</div>
                      <div style={{ opacity: 0.7, fontSize: 10 }}>{fmtTime(b.start)}–{fmtTime(b.end)}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Adding task modal */}
      {showModal && (
        <div style={s.overlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>New task</div>
            {(["name", "deadline", "duration", "category"] as const).map(key => (
              <div key={key}>
                <label style={s.fieldLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}{key === "duration" ? " (hours)" : ""}</label>
                <input style={s.input} type={key === "deadline" ? "date" : key === "duration" ? "number" : "text"}
                  placeholder={key === "name" ? "e.g. Write API docs" : key === "category" ? "e.g. eng, design" : ""}
                  value={(newTask as any)[key]}
                  onChange={e => setNewTask({ ...newTask, [key]: key === "duration" ? parseFloat(e.target.value) : e.target.value })} />
              </div>
            ))}
            <label style={s.fieldLabel}>Priority</label>
            <select style={s.input} value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}>
              <option value="high">🔴 High</option>
              <option value="med">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={s.btnPrimary} onClick={addTask}>Add task</button>
            </div>
          </div>
        </div>
      )}

      {/* Adding fixed event modal */}
      {showEventModal && (
        <div style={s.overlay} onClick={() => setShowEventModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>New fixed event</div>
            <label style={s.fieldLabel}>Title</label>
            <input style={s.input} placeholder="e.g. Team lunch" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} />
            <label style={s.fieldLabel}>Day</label>
            <select style={s.input} value={newEvent.day} onChange={e => setNewEvent({ ...newEvent, day: parseInt(e.target.value) })}>
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={s.fieldLabel}>Start (24h)</label>
                <input style={s.input} type="number" min={8} max={18} step={0.5} value={newEvent.start} onChange={e => setNewEvent({ ...newEvent, start: parseFloat(e.target.value) })} />
              </div>
              <div>
                <label style={s.fieldLabel}>End (24h)</label>
                <input style={s.input} type="number" min={8} max={18} step={0.5} value={newEvent.end} onChange={e => setNewEvent({ ...newEvent, end: parseFloat(e.target.value) })} />
              </div>
            </div>
            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={() => setShowEventModal(false)}>Cancel</button>
              <button style={s.btnPrimary} onClick={addFixedEvent}>Add event</button>
            </div>
          </div>
        </div>
      )}

      {/* Celebration */}
      {showCelebration && (
        <div style={s.celebration} onClick={() => setShowCelebration(false)}>
          <div style={{ fontSize: 64 }}>🎉</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#e2e8f0" }}>All done!</div>
          <div style={{ fontSize: 15, color: "#64748b" }}>You crushed your week. Great work.</div>
          <button style={{ ...s.btnPrimary, marginTop: 8, padding: "10px 24px", fontSize: 14 }}>Thanks 🙌</button>
        </div>
      )}
    </div>
  );
}