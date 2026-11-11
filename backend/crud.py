from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Task
from .schemas import TaskCreate, TaskUpdate


def get_tasks(db: Session, completed: bool | None = None) -> list[Task]:
    statement = select(Task).order_by(Task.completed.asc(), Task.id.desc())
    if completed is not None:
        statement = statement.where(Task.completed.is_(completed))
    return list(db.scalars(statement).all())


def get_task(db: Session, task_id: int) -> Task | None:
    return db.get(Task, task_id)


def create_task(db: Session, task_data: TaskCreate) -> Task:
    task = Task(**task_data.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task: Task, task_data: TaskUpdate) -> Task:
    changes = task_data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task: Task) -> None:
    db.delete(task)
    db.commit()
