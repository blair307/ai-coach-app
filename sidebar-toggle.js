/* Add this to the END of your styles.css file for collapsible sidebar */

/* Sidebar toggle button */
.sidebar-toggle {
    position: fixed;
    top: 1rem;
    left: 1rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 8px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    z-index: 1001;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
    font-size: 1.2rem;
}

.sidebar-toggle:hover {
    background: var(--primary-dark);
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.35);
}

/* Sidebar transitions */
.sidebar {
    transition: all 0.3s ease;
    width: 280px;
}

.sidebar.collapsed {
    width: 60px;
    overflow: hidden;
}

/* Hide text when collapsed */
.sidebar.collapsed .sidebar-header h2,
.sidebar.collapsed .menu-item,
.sidebar.collapsed .notification-badge {
    opacity: 0;
    visibility: hidden;
}

.sidebar.collapsed .sidebar-header {
    text-align: center;
    padding: 1rem 0.5rem;
}

.sidebar.collapsed .menu-item {
    justify-content: center;
    padding: 1rem 0.5rem;
    border-left: none;
}

/* Show only icons when collapsed */
.sidebar.collapsed .menu-item::before {
    content: '';
    width: 20px;
    height: 20px;
    background: currentColor;
    mask: var(--menu-icon);
    -webkit-mask: var(--menu-icon);
    opacity: 1;
    visibility: visible;
}

/* Icon definitions for menu items */
.menu-item[href*="dashboard"]::before {
    --menu-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='currentColor' viewBox='0 0 24 24'%3E%3Cpath d='M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z'/%3E%3C/svg%3E");
}

.menu-item[href*="ai-coach"]::before {
    --menu-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='currentColor' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/%3E%3C/svg%3E");
}

.menu-item[href*="community"]::before {
    --menu-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='currentColor' viewBox='0 0 24 24'%3E%3Cpath d='M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A2.996 2.996 0 0 0 17.08 7h-1.16c-1.18 0-2.25.69-2.75 1.76L12 12l-1.17-3.24C10.33 7.69 9.26 7 8.08 7H6.92c-1.29 0-2.44.8-2.88 2.01L1.5 16H4v6h2v-6h2.5l-.9-2.7L9 12l1.4 1.3-.9 2.7H12v6h4z'/%3E%3C/svg%3E");
}

.menu-item[href*="notifications"]::before {
    --menu-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='currentColor' viewBox='0 0 24 24'%3E%3Cpath d='M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z'/%3E%3C/svg%3E");
}

.menu-item[href*="billing"]::before {
    --menu-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='currentColor' viewBox='0 0 24 24'%3E%3Cpath d='M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z'/%3E%3C/svg%3E");
}

.menu-item[onclick*="logout"]::before {
    --menu-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='currentColor' viewBox='0 0 24 24'%3E%3Cpath d='M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z'/%3E%3C/svg%3E");
}

/* Adjust main content when sidebar is collapsed */
.main-content {
    transition: all 0.3s ease;
    margin-left: 280px;
}

.sidebar.collapsed + .main-content,
.app-container:has(.sidebar.collapsed) .main-content {
    margin-left: 60px;
}

/* Mobile responsive */
@media (max-width: 768px) {
    .sidebar {
        position: fixed;
        z-index: 1000;
        height: 100vh;
        transform: translateX(-100%);
    }
    
    .sidebar.open {
        transform: translateX(0);
    }
    
    .sidebar.collapsed {
        transform: translateX(-100%);
    }
    
    .main-content {
        margin-left: 0;
    }
    
    .sidebar-toggle {
        display: block;
    }
    
    /* Mobile overlay */
    .sidebar-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
        display: none;
    }
    
    .sidebar-overlay.active {
        display: block;
    }
}

/* Desktop - hide toggle by default, show when collapsed */
@media (min-width: 769px) {
    .sidebar-toggle {
        display: none;
    }
    
    .sidebar.collapsed ~ .sidebar-toggle,
    .app-container:has(.sidebar.collapsed) .sidebar-toggle {
        display: flex;
        left: 70px;
    }
}
