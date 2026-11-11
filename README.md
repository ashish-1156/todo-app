# TaskFlow — To-Do App

A simple full-stack task manager built with HTML, CSS, vanilla JavaScript, FastAPI, SQLAlchemy, and SQLite.

## Features
- Create, edit, complete, and delete tasks
- Filter by all, active, and completed
- Priority and optional due date
- SQLite persistence
- Input validation and API error handling

## Requirements
- Python 3.10+
- pip

## Run on Windows

Open PowerShell in the `todo-app` folder:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn backend.main:app --reload
```

If PowerShell blocks activation, run the commands below instead, without activating the environment:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload
```

Open http://127.0.0.1:8000 in your browser. API documentation is at http://127.0.0.1:8000/docs.

The SQLite database (`tasks.db`) is created automatically in the project root on first launch.

## Project structure

```text
todo-app/
├── backend/
│   ├── __init__.py
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   └── crud.py
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── requirements.txt
├── .gitignore
└── README.md
```

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create a task |
| GET | `/api/tasks/{task_id}` | Get one task |
| PATCH | `/api/tasks/{task_id}` | Update task fields |
| DELETE | `/api/tasks/{task_id}` | Delete a task |

For this starter project, the app is intended to run locally. Before public deployment, add authentication, database migrations, automated tests, and production server configuration.
