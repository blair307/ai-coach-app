<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Growth Goals</title>
  <link rel="stylesheet" href="styles.css">
  <script defer src="goals.js"></script>
</head>
<body>
  <div class="app-container">
    <!-- Sidebar -->
    <nav class="sidebar">
      <div class="sidebar-header">
        <h2>EEH</h2>
      </div>
      <ul class="sidebar-menu">
        <li><a href="dashboard.html" class="menu-item">Dashboard</a></li>
        <li><a href="ai-coach.html" class="menu-item">AI Coach</a></li>
        <li><a href="goals.html" class="menu-item active">Growth Goals</a></li>
        <li><a href="community.html" class="menu-item">Community</a></li>
        <li><a href="#" class="menu-item" onclick="logout()">Logout</a></li>
      </ul>
    </nav>

    <!-- Main -->
    <main class="main-content">
      <header class="content-header">
        <h1>Growth Goals</h1>
        <button class="btn btn-primary" onclick="showAddGoalModal()">Set a New Goal</button>
      </header>

      <section class="goal-categories">
        <div class="category-card" id="bigGoals">
          <h3>🎯 Breakthrough Goals</h3>
          <p>Stretch goals to transform your emotional health.</p>
          <div class="goal-list" id="breakthroughList"></div>
        </div>

        <div class="category-card" id="smallGoals">
          <h3>🌱 Micro Wins</h3>
          <p>Small, consistent actions that create momentum.</p>
          <div class="goal-list" id="microList"></div>
        </div>
      </section>

      <div class="empty-state" id="noGoals" style="display:none">
        <h3>No goals yet</h3>
        <p>Start small. Dream big. Let’s make growth feel doable.</p>
        <button class="btn btn-outline" onclick="showAddGoalModal()">Create Your First Goal</button>
      </div>
    </main>
  </div>

  <!-- Add Goal Modal -->
  <div class="modal-overlay" id="goalModal" style="display:none;">
    <div class="modal-content">
      <h2>Set a New Goal</h2>
      <form id="goalForm" onsubmit="createGoal(event)">
        <div class="form-group">
          <label for="goalText">What's the goal?</label>
          <input type="text" id="goalText" required placeholder="e.g., Meditate 5 minutes daily">
        </div>

        <div class="form-group">
          <label for="goalSize">Type of goal:</label>
          <select id="goalSize" required>
            <option value="">Select</option>
            <option value="big">Breakthrough</option>
            <option value="small">Micro Win</option>
          </select>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeAddGoalModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Goal</button>
        </div>
      </form>
    </div>
  </div>
</body>
</html>
