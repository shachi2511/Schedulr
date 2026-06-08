from datetime import datetime, timedelta
from typing import List, Dict, Any

WORK_START = 9
WORK_END = 18

def priority_score(priority: str) -> int:
    return {"high": 3, "med": 2, "low": 1}.get(priority, 1)

def get_free_slots(day_events: List[Dict], work_start: float, work_end: float) -> List[Dict]:
    busy = sorted(day_events, key=lambda x: x["start"])
    slots = []
    current = work_start

    for event in busy:
        if event["start"] > current:
            slots.append({"start": current, "end": event["start"]})
        current = max(current, event["end"])

    if current < work_end:
        slots.append({"start": current, "end": work_end})

    return slots

def schedule_tasks(tasks: List[Dict], fixed_events: List[Dict], week_start: str) -> List[Dict]:
    sorted_tasks = sorted(
        tasks,
        key=lambda t: (t["deadline"], -priority_score(t["priority"]))
    )

    scheduled = []
    unscheduled = []
    booked = {d: [] for d in range(5)}

    for event in fixed_events:
        if 0 <= event["day"] <= 4:
            booked[event["day"]].append({
                "start": event["start"],
                "end": event["end"]
            })

    week_start_date = datetime.strptime(week_start, "%Y-%m-%d")

    for task in sorted_tasks:
        placed = False
        deadline_date = datetime.strptime(task["deadline"], "%Y-%m-%d")

        for day in range(5):
            day_date = week_start_date + timedelta(days=day)

            if day_date > deadline_date:
                continue

            free_slots = get_free_slots(booked[day], WORK_START, WORK_END)

            for slot in free_slots:
                available = slot["end"] - slot["start"]
                if available >= task["duration"]:
                    booked[day].append({
                        "start": slot["start"],
                        "end": slot["start"] + task["duration"]
                    })
                    scheduled.append({
                        "task_id": str(task.get("_id", task.get("id", ""))),
                        "task_name": task["name"],
                        "priority": task["priority"],
                        "day": day,
                        "start": slot["start"],
                        "end": slot["start"] + task["duration"],
                        "date": day_date.strftime("%Y-%m-%d")
                    })
                    placed = True
                    break

            if placed:
                break

        if not placed:
            unscheduled.append({
                "task_id": str(task.get("_id", task.get("id", ""))),
                "task_name": task["name"],
                "reason": "No available slot before deadline"
            })

    return {"scheduled": scheduled, "unscheduled": unscheduled}
