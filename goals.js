// goals.js - Enhanced Goals Frontend Logic
// Add this file to your project alongside the other JS files

// Additional utility functions for the goals system

// Format date for display
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

// Get days between two dates
function getDaysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Calculate completion percentage for a date range
function getCompletionPercentage(goal, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    
    let totalDays = 0;
    let completedDays = 0;
    
    for (let d = new Date(start); d <= Math.min(end, today); d.setDate(d.getDate() + 1)) {
        totalDays++;
        const dateStr = d.toISOString().split('T')[0];
        const dayCompletions = goal.completions?.[dateStr] || [];
        if (dayCompletions.length === goal.tasks.length) {
            completedDays++;
        }
    }
    
    return totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
}

// Generate motivational messages based on progress
function getMotivationalMessage(goal, stats) {
    const { currentStreak, completionRate } = stats;
    const messages = {
        high_performance: [
            `You're absolutely crushing your ${goal.area} goals! 🔥`,
            `Your consistency in ${goal.area} is inspiring! Keep it up!`,
            `You're building incredible momentum in ${goal.area}!`
        ],
        good_progress: [
            `Great progress on your ${goal.area} journey!`,
            `You're building solid habits in ${goal.area}!`,
            `Every day you're getting closer to your ${goal.area} goals!`
        ],
        needs_attention: [
            `Your ${goal.area} goal is waiting for you to take action!`,
            `Small steps in ${goal.area} today can lead to big changes!`,
            `Don't give up on your ${goal.area} goal - you've got this!`
        ],
        getting_started: [
            `Ready to start building amazing habits in ${goal.area}?`,
            `Every expert was once a beginner. Start your ${goal.area} journey today!`,
            `The best time to start was yesterday, the second best time is now!`
        ]
    };
    
    if (currentStreak >= 7 && completionRate >= 80) {
        return messages.high_performance[Math.floor(Math.random() * messages.high_performance.length)];
    } else if (completionRate >= 60) {
        return messages.good_progress[Math.floor(Math.random() * messages.good_progress.length)];
    } else if (completionRate >= 20) {
        return messages.needs_attention[Math.floor(Math.random() * messages.needs_attention.length)];
    } else {
        return messages.getting_started[Math.floor(Math.random() * messages.getting_started.length)];
    }
}

// Export goal data for sharing or backup
async function exportGoalData(goalId) {
    try {
        const response = await apiCall(`/api/goals/enhanced`);
        if (response) {
            const goal = response.find(g => g._id === goalId);
            if (goal) {
                const exportData = {
                    area: goal.area,
                    description: goal.description,
                    tasks: goal.tasks,
                    completions: goal.completions,
                    createdAt: goal.createdAt,
                    stats: calculateGoalStats(goal),
                    exportedAt: new Date().toISOString()
                };
                
                const dataStr = JSON.stringify(exportData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                
                const link = document.createElement('a');
                link.href = URL.createObjectURL(dataBlob);
                link.download = `${goal.area}-goal-data-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                
                showToast('Goal data exported successfully!');
            }
        }
    } catch (error) {
        showToast('Failed to export goal data', 'error');
    }
}

// Generate weekly summary
function generateWeeklySummary(goal) {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6); // Last 7 days
    
    const weekData = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayCompletions = goal.completions?.[dateStr] || [];
        
        weekData.push({
            date: dateStr,
            dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
            completed: dayCompletions.length,
            total: goal.tasks.length,
            percentage: Math.round((dayCompletions.length / goal.tasks.length) * 100)
        });
    }
    
    const totalPossible = 7 * goal.tasks.length;
    const totalCompleted = weekData.reduce((sum, day) => sum + day.completed, 0);
    const weeklyPercentage = Math.round((totalCompleted / totalPossible) * 100);
    
    return {
        weekData,
        weeklyPercentage,
        totalCompleted,
        totalPossible,
        bestDay: weekData.reduce((best, day) => day.percentage > best.percentage ? day : best, weekData[0]),
        streak: calculateCurrentWeekStreak(weekData)
    };
}

function calculateCurrentWeekStreak(weekData) {
    let streak = 0;
    for (let i = weekData.length - 1; i >= 0; i--) {
        if (weekData[i].percentage === 100) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

// Smart goal suggestions based on area
function getGoalSuggestions(area) {
    const suggestions = {
        mind: [
            "Read for 20 minutes daily",
            "Practice meditation for 10 minutes",
            "Learn something new for 15 minutes",
            "Write in a journal for 10 minutes",
            "Do a brain training exercise"
        ],
        spirit: [
            "Practice gratitude - write 3 things daily",
            "Meditate for 15 minutes",
            "Read spiritual/philosophical content",
            "Practice deep breathing exercises",
            "Spend time in nature"
        ],
        body: [
            "Exercise for 30 minutes",
            "Take 10,000 steps",
            "Drink 8 glasses of water",
            "Get 7-8 hours of sleep",
            "Eat 5 servings of fruits/vegetables"
        ],
        work: [
            "Focus on most important task for 2 hours",
            "Learn a new skill for 30 minutes",
            "Network with one new person",
            "Review and plan tomorrow's priorities",
            "Practice a presentation or pitch"
        ],
        relationships: [
            "Have a meaningful conversation with someone",
            "Reach out to an old friend",
            "Express appreciation to someone",
            "Spend quality time with family",
            "Practice active listening"
        ],
        fun: [
            "Engage in a hobby for 30 minutes",
            "Try something new and exciting",
            "Watch or read something entertaining",
            "Play a game or sport",
            "Create or make something"
        ],
        finances: [
            "Track daily expenses",
            "Read about investing for 15 minutes",
            "Review budget and financial goals",
            "Save a specific amount",
            "Learn about a new financial tool"
        ]
    };
    
    return suggestions[area] || [];
}

// Create goal reminder notifications
async function setGoalReminders(goalId, reminderTime = '09:00') {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            // This would typically be handled by a service worker
            // For now, we'll just show a confirmation
            showToast(`Reminders set for ${reminderTime} daily!`);
        }
    }
}

// Analyze goal patterns and provide insights
function analyzeGoalPatterns(goal) {
    const completions = goal.completions || {};
    const dates = Object.keys(completions).sort();
    
    if (dates.length < 7) {
        return {
            insights: ["You need more data to generate meaningful insights. Keep tracking for at least a week!"],
            patterns: []
        };
    }
    
    const insights = [];
    const patterns = [];
    
    // Analyze day-of-week patterns
    const dayPattern = {
        0: { name: 'Sunday', completed: 0, total: 0 },
        1: { name: 'Monday', completed: 0, total: 0 },
        2: { name: 'Tuesday', completed: 0, total: 0 },
        3: { name: 'Wednesday', completed: 0, total: 0 },
        4: { name: 'Thursday', completed: 0, total: 0 },
        5: { name: 'Friday', completed: 0, total: 0 },
        6: { name: 'Saturday', completed: 0, total: 0 }
    };
    
    dates.forEach(dateStr => {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        const dayCompletions = completions[dateStr] || [];
        
        dayPattern[dayOfWeek].total++;
        if (dayCompletions.length === goal.tasks.length) {
            dayPattern[dayOfWeek].completed++;
        }
    });
    
    // Find best and worst days
    const dayStats = Object.values(dayPattern).map(day => ({
        ...day,
        percentage: day.total > 0 ? (day.completed / day.total) * 100 : 0
    }));
    
    const bestDay = dayStats.reduce((best, day) => 
        day.percentage > best.percentage ? day : best
    );
    const worstDay = dayStats.reduce((worst, day) => 
        day.percentage < worst.percentage ? day : worst
    );
    
    if (bestDay.percentage > 70) {
        insights.push(`You're most consistent on ${bestDay.name}s (${Math.round(bestDay.percentage)}% completion rate)`);
    }
    
    if (worstDay.percentage < 30 && worstDay.total > 2) {
        insights.push(`${worstDay.name}s are challenging for you (${Math.round(worstDay.percentage)}% completion rate). Consider adjusting your approach.`);
    }
    
    // Analyze recent trends
    const recentDates = dates.slice(-14); // Last 2 weeks
    const firstWeek = recentDates.slice(0, 7);
    const secondWeek = recentDates.slice(7);
    
    const firstWeekScore = firstWeek.reduce((sum, date) => {
        const dayCompletions = completions[date] || [];
        return sum + (dayCompletions.length === goal.tasks.length ? 1 : 0);
    }, 0);
    
    const secondWeekScore = secondWeek.reduce((sum, date) => {
        const dayCompletions = completions[date] || [];
        return sum + (dayCompletions.length === goal.tasks.length ? 1 : 0);
    }, 0);
    
    if (secondWeekScore > firstWeekScore) {
        insights.push("You're improving! Your performance increased from last week.");
    } else if (firstWeekScore > secondWeekScore) {
        insights.push("Your performance dipped this week. Let's get back on track!");
    }
    
    return { insights, patterns: dayStats };
}

// Initialize advanced features
function initializeAdvancedFeatures() {
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'n':
                    e.preventDefault();
                    // Focus on the first area card
                    document.querySelector('.area-card')?.focus();
                    break;
                case 'e':
                    e.preventDefault();
                    // Export data for the first goal
                    if (goals.length > 0) {
                        exportGoalData(goals[0]._id);
                    }
                    break;
            }
        }
    });
    
    // Add swipe gestures for mobile
    if ('ontouchstart' in window) {
        let startX, startY;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchend', (e) => {
            if (!startX || !startY) return;
            
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            
            const diffX = startX - endX;
            const diffY = startY - endY;
            
            // Swipe left/right to change months
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    changeMonth(1); // Swipe left = next month
                } else {
                    changeMonth(-1); // Swipe right = previous month
                }
            }
            
            startX = startY = null;
        });
    }
}

// Call this when the page loads
document.addEventListener('DOMContentLoaded', initializeAdvancedFeatures);
