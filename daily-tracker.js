document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const trackerGrid = document.getElementById("trackerGrid");
  const today = new Date().toISOString().split("T")[0];

  async function fetchProgress() {
    try {
      const res = await fetch(`/api/daily_progress?date=${today}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      applyProgressToUI(data.goalProgress);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }

  async function saveProgress(goalProgress) {
    try {
      await fetch("/api/daily_progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ date: today, goalProgress }),
      });
    } catch (err) {
      console.error("Save error:", err);
    }
  }

  function applyProgressToUI(progress) {
    progress.forEach((p) => {
      const checkbox = document.querySelector(`[data-goalid="${p.goalId}"]`);
      if (checkbox && p.completed) {
        checkbox.classList.add("completed");
      }
    });
  }

  trackerGrid.addEventListener("click", (e) => {
    if (e.target.classList.contains("task-checkbox")) {
      e.target.classList.toggle("completed");
      const allGoals = Array.from(
        document.querySelectorAll(".task-checkbox")
      ).map((el) => ({
        goalId: el.dataset.goalid,
        completed: el.classList.contains("completed"),
        area: el.dataset.area,
      }));
      saveProgress(allGoals);
    }
  });

  fetchProgress();
});
