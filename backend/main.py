from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from . import crud, models, schemas
from .database import Base, engine, get_db

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Convenient for a starter project. Use migrations for production.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="TaskFlow To-Do API",
    description="API for creating and managing personal tasks.",
    version="1.0.0",
    lifespan=lifespan,
)

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/", include_in_schema=False)
def serve_frontend():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok"}


@app.get("/api/tasks", response_model=list[schemas.TaskRead], tags=["tasks"])
def list_tasks(
    completed: bool | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return crud.get_tasks(db, completed=completed)


@app.post(
    "/api/tasks",
    response_model=schemas.TaskRead,
    status_code=status.HTTP_201_CREATED,
    tags=["tasks"],
)
def create_task(task_data: schemas.TaskCreate, db: Session = Depends(get_db)):
    return crud.create_task(db, task_data)


@app.get("/api/tasks/{task_id}", response_model=schemas.TaskRead, tags=["tasks"])
def read_task(task_id: int, db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    return task


@app.patch("/api/tasks/{task_id}", response_model=schemas.TaskRead, tags=["tasks"])
def update_task(
    task_id: int,
    task_data: schemas.TaskUpdate,
    db: Session = Depends(get_db),
):
    task = crud.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    return crud.update_task(db, task, task_data)


@app.delete("/api/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["tasks"])
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    crud.delete_task(db, task)
    return None
