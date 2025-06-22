let userToken = localStorage.getItem("token");

async function loadGoals() {
  const res = await fetch("/api/goals", {
    headers: { Authorization: `Bearer ${userToken}` }
  });

  if (!res.ok) {
    console.error("Failed to fetch goals");
    return;
  }

  const data = await res.json();
  const grouped = { Breakthrough: [], "Micro Win": [] };

  data.goals.forEach((goal) => {
    const type = goal.type || "Micro Win";
    grouped[type].push(goal);
  });

  const container = document.getElementById("goalCategories");
  container.innerHTML = "";

  Object.keys(grouped).forEach((category) => {
    const section = document.createElement("div");
    section.className = "category-card";
    section.innerHTML = `<h3>${category}</h3><div class="goal-list"></div>`;

    grouped[category].forEach((goal) => {
      const item = document.createElement("div");
      item.className = "goal-item";
    item.innerHTML = `
  <input type="checkbox" ${goal.completed ? "checked" : ""} onchange="toggleGoal('${goal._id}', this.checked)">
  <div class="goal-details">
    <span class="goal-title">${goal.title}</span>
    <div class="streak-track">
      🔥 <span>${goal.streak || 0}</span> day streak
    </div>
  </div>
`;

      section.querySelector(".goal-list").appendChild(item);
    });

    container.appendChild(section);
  });
}

async function toggleGoal(id, completed) {
  await fetch(`/api/goals/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`
    },
    body: JSON.stringify({ completed })
  });
  loadGoals();
}

function showAddGoal() {
  document.getElementById("goalModal").style.display = "block";
}

function closeAddGoal() {
  document.getElementById("goalModal").style.display = "none";
  document.getElementById("goalForm").reset();
}

async function addGoal(e) {
  e.preventDefault();
  const title = document.getElementById("goalTitle").value;
  const frequency = document.getElementById("goalFrequency").value;
  const type = document.getElementById("goalType").value;

  await fetch("/api/goals", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`
    },
    body: JSON.stringify({ title, frequency, type })
  });

  closeAddGoal();
  loadGoals();
}

document.addEventListener("DOMContentLoaded", loadGoals);
