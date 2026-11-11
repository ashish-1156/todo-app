const API_URL = "/api/tasks";

const elements = {
  form: document.querySelector("#task-form"),
  title: document.querySelector("#task-title"),
  description: document.querySelector("#task-description"),
  priority: document.querySelector("#task-priority"),
  dueDate: document.querySelector("#task-due-date"),
  list: document.querySelector("#task-list"),
  notice: document.querySelector("#notice"),
  search: document.querySelector("#task-search"),
  filters: [...document.querySelectorAll("[data-filter]")],
  total: document.querySelector("#total-count"),
  active: document.querySelector("#active-count"),
  completed: document.querySelector("#completed-count"),
  visibleCount: document.querySelector("#visible-count"),
  footerSummary: document.querySelector("#footer-summary"),
  clearCompleted: document.querySelector("#clear-completed"),
  todayDate: document.querySelector("#today-date"),
  dialog: document.querySelector("#edit-dialog"),
  editForm: document.querySelector("#edit-form"),
  editId: document.querySelector("#edit-id"),
  editTitle: document.querySelector("#edit-title"),
  editDescription: document.querySelector("#edit-description"),
  editPriority: document.querySelector("#edit-priority"),
  editDueDate: document.querySelector("#edit-due-date"),
  closeDialog: document.querySelector("#close-dialog"),
  cancelEdit: document.querySelector("#cancel-edit"),
};

let tasks = [];
let currentFilter = "all";
let noticeTimeout;

const todayISO = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

elements.todayDate.textContent = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
}).format(new Date());

function showNotice(message) {
  elements.notice.textContent = message;
  elements.notice.hidden = false;
  clearTimeout(noticeTimeout);
  noticeTimeout = setTimeout(() => {
    elements.notice.hidden = true;
  }, 5000);
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const payload = await response.json();
      message = Array.isArray(payload.detail)
        ? payload.detail.map((item) => item.msg).join(" ")
        : payload.detail || message;
    } catch {
      // Keep the generic message when the response isn't JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function loadTasks() {
  elements.list.innerHTML = '<div class="loading-state">Loading your tasks…</div>';
  try {
    tasks = await apiRequest(API_URL);
    render();
  } catch (error) {
    elements.list.innerHTML = `
      <div class="empty-state">
        <strong>Couldn't load your tasks</strong>
        <span>${escapeHTML(error.message)} Make sure the FastAPI server is running.</span>
      </div>`;
  }
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function formatDate(dateString) {
  if (!dateString) return "";
  // Parse date-only values locally to avoid timezone shifting.
  const [year, month, day] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function visibleTasks() {
  const query = elements.search.value.trim().toLowerCase();
  return tasks.filter((task) => {
    const matchesFilter =
      currentFilter === "all" ||
      (currentFilter === "active" && !task.completed) ||
      (currentFilter === "completed" && task.completed);
    const matchesSearch =
      !query ||
      task.title.toLowerCase().includes(query) ||
      (task.description || "").toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });
}

function render() {
  const completedCount = tasks.filter((task) => task.completed).length;
  const activeCount = tasks.length - completedCount;
  elements.total.textContent = tasks.length;
  elements.active.textContent = activeCount;
  elements.completed.textContent = completedCount;

  const filtered = visibleTasks();
  elements.visibleCount.textContent = `${filtered.length} ${filtered.length === 1 ? "task" : "tasks"}`;
  elements.footerSummary.textContent = activeCount
    ? `${activeCount} task${activeCount === 1 ? "" : "s"} left to focus on.`
    : "You're all caught up. Great work!";

  elements.clearCompleted.disabled = completedCount === 0;
  elements.clearCompleted.style.opacity = completedCount === 0 ? ".45" : "1";

  if (!filtered.length) {
    const isEmpty = tasks.length === 0;
    elements.list.innerHTML = `
      <div class="empty-state">
        <strong>${isEmpty ? "Your list is a blank canvas" : "No matching tasks"}</strong>
        <span>${isEmpty ? "Add your first task above and build some momentum." : "Try another filter or search term."}</span>
      </div>`;
    return;
  }

  elements.list.innerHTML = filtered.map((task) => {
    const overdue = task.due_date && task.due_date < todayISO() && !task.completed;
    return `
      <article class="task-item ${task.completed ? "is-completed" : ""}" data-id="${task.id}">
        <input class="task-check" type="checkbox" aria-label="Mark ${escapeHTML(task.title)} complete"
          ${task.completed ? "checked" : ""} data-action="toggle">
        <div class="task-content">
          <h3 class="task-title">${escapeHTML(task.title)}</h3>
          ${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ""}
          <div class="task-meta">
            <span class="priority priority-${task.priority}">${task.priority[0].toUpperCase() + task.priority.slice(1)} priority</span>
            ${task.due_date ? `<span class="due-date ${overdue ? "is-overdue" : ""}">${overdue ? "Overdue · " : "Due · "}${escapeHTML(formatDate(task.due_date))}</span>` : ""}
          </div>
        </div>
        <div class="task-actions">
          <button class="icon-button" type="button" data-action="edit" aria-label="Edit task" title="Edit">✎</button>
          <button class="icon-button delete" type="button" data-action="delete" aria-label="Delete task" title="Delete">×</button>
        </div>
      </article>`;
  }).join("");
}

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = elements.title.value.trim();
  if (!title) {
    showNotice("Please enter a task title.");
    elements.title.focus();
    return;
  }

  const payload = {
    title,
    description: elements.description.value.trim() || null,
    priority: elements.priority.value,
    due_date: elements.dueDate.value || null,
  };

  const submitButton = elements.form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const created = await apiRequest(API_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    tasks.unshift(created);
    elements.form.reset();
    elements.priority.value = "medium";
    currentFilter = "all";
    updateFilterButtons();
    render();
    elements.title.focus();
  } catch (error) {
    showNotice(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

function updateFilterButtons() {
  elements.filters.forEach((button) => {
    const active = button.dataset.filter === currentFilter;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

elements.filters.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    updateFilterButtons();
    render();
  });
});

elements.search.addEventListener("input", render);

elements.list.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const item = button.closest("[data-id]");
  if (!item) return;
  const task = tasks.find((entry) => entry.id === Number(item.dataset.id));
  if (!task) return;

  if (button.dataset.action === "edit") {
    openEditDialog(task);
  } else if (button.dataset.action === "delete") {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    button.disabled = true;
    try {
      await apiRequest(`${API_URL}/${task.id}`, { method: "DELETE" });
      tasks = tasks.filter((entry) => entry.id !== task.id);
      render();
    } catch (error) {
      showNotice(error.message);
      button.disabled = false;
    }
  }
});

elements.list.addEventListener("change", async (event) => {
  const checkbox = event.target.closest('[data-action="toggle"]');
  if (!checkbox) return;
  const item = checkbox.closest("[data-id]");
  const task = tasks.find((entry) => entry.id === Number(item.dataset.id));
  if (!task) return;

  checkbox.disabled = true;
  try {
    const updated = await apiRequest(`${API_URL}/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed: checkbox.checked }),
    });
    tasks = tasks.map((entry) => entry.id === updated.id ? updated : entry);
    render();
  } catch (error) {
    checkbox.checked = task.completed;
    showNotice(error.message);
  } finally {
    checkbox.disabled = false;
  }
});

function openEditDialog(task) {
  elements.editId.value = task.id;
  elements.editTitle.value = task.title;
  elements.editDescription.value = task.description || "";
  elements.editPriority.value = task.priority;
  elements.editDueDate.value = task.due_date || "";
  elements.dialog.showModal();
  elements.editTitle.focus();
}

function closeEditDialog() {
  elements.dialog.close();
}

elements.closeDialog.addEventListener("click", closeEditDialog);
elements.cancelEdit.addEventListener("click", closeEditDialog);

elements.editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = Number(elements.editId.value);
  const title = elements.editTitle.value.trim();
  if (!title) {
    showNotice("Task title cannot be blank.");
    elements.editTitle.focus();
    return;
  }

  const saveButton = elements.editForm.querySelector('button[type="submit"]');
  saveButton.disabled = true;
  try {
    const updated = await apiRequest(`${API_URL}/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title,
        description: elements.editDescription.value.trim() || null,
        priority: elements.editPriority.value,
        due_date: elements.editDueDate.value || null,
      }),
    });
    tasks = tasks.map((task) => task.id === updated.id ? updated : task);
    closeEditDialog();
    render();
  } catch (error) {
    showNotice(error.message);
  } finally {
    saveButton.disabled = false;
  }
});

elements.clearCompleted.addEventListener("click", async () => {
  const completedTasks = tasks.filter((task) => task.completed);
  if (!completedTasks.length) return;
  if (!window.confirm(`Delete all ${completedTasks.length} completed tasks?`)) return;

  elements.clearCompleted.disabled = true;
  try {
    await Promise.all(completedTasks.map((task) =>
      apiRequest(`${API_URL}/${task.id}`, { method: "DELETE" })
    ));
    const completedIds = new Set(completedTasks.map((task) => task.id));
    tasks = tasks.filter((task) => !completedIds.has(task.id));
    render();
  } catch (error) {
    showNotice(`${error.message} Refreshing the task list to sync changes.`);
    await loadTasks();
  } finally {
    elements.clearCompleted.disabled = false;
  }
});

loadTasks();
