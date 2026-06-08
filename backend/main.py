from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv
from bson import ObjectId
import os
from scheduler import schedule_tasks

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = MongoClient(os.getenv("MONGO_URI"))
db = client.chrono
tasks_collection = db.tasks

class Task(BaseModel):
    name: str
    priority: str
    duration: float
    deadline: str
    category: Optional[str] = "general"

class CalendarEvent(BaseModel):
    title: str
    day: int
    start: float
    end: float

class OptimizeRequest(BaseModel):
    week_start: str
    fixed_events: Optional[List[CalendarEvent]] = []

@app.get("/")
def root():
    return {"message": "Chrono API running"}

@app.get("/tasks")
def get_tasks():
    tasks = []
    for task in tasks_collection.find():
        task["_id"] = str(task["_id"])
        tasks.append(task)
    return tasks

@app.post("/tasks")
def create_task(task: Task):
    result = tasks_collection.insert_one(task.dict())
    return {"id": str(result.inserted_id)}

@app.delete("/tasks/{task_id}")
def delete_task(task_id: str):
    tasks_collection.delete_one({"_id": ObjectId(task_id)})
    return {"deleted": task_id}

@app.post("/optimize")
def optimize(request: OptimizeRequest):
    tasks = []
    for task in tasks_collection.find():
        task["_id"] = str(task["_id"])
        tasks.append(task)
    fixed = [e.dict() for e in request.fixed_events]
    result = schedule_tasks(tasks, fixed, request.week_start)
    return result
