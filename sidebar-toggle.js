/* ADD THIS CSS TO THE END OF YOUR styles.css FILE - REPLACES PREVIOUS HAMBURGER CSS */

/* Remove the old hamburger from sidebar header */
.sidebar-header .sidebar-toggle {
    display: none !important;
}

/* Adjust sidebar header to move EEH to the right */
.sidebar-header {
    padding: 2rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: flex-end; /* Move EEH to the right */
    align-items: center;
}

.sidebar-header h2 {
    font-size: 1.25rem;
    font-weight: 800;
    background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.02em;
    margin: 0;
}

/* Universal Purple Hamburger Button - Always visible in top-left */
.universal-hamburger {
    position: fixed !important;
    top: 20px !important;
    left: 20px !important;
    width: 50px !important;
    height: 50px !important;
    background: #6366f1 !important;
    border: none !important;
    border-radius: 10px !important;
    cursor: pointer !important;
    z-index: 99999 !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important;
    align-items: center !important;
    gap: 4px !important;
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4) !important;
    transition: all 0.3s ease !important;
}

/* Hide any X or close elements that might appear */
.universal-hamburger::before,
.universal-hamburger::after {
    display: none !important;
}

/* Hide any child X elements */
.universal-hamburger > *:not(.hamburger-line) {
    display: none !important;
}

.universal-hamburger:hover {
    background: #4f46e5 !important;
    transform: scale(1.05) !important;
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.5) !important;
}

.universal-hamburger .hamburger-line {
    display: block !important;
    width: 20px !important;
    height: 3px !important;
    background: white !important;
    border-radius: 2px !important;
    transition: all 0.2s ease !important;
}

/* Sidebar positioning - always starts from left edge */
.sidebar {
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    width: 280px !important;
    height: 100vh !important;
    background: var(--background) !important;
    border-right: 1px solid var(--border) !important;
    overflow-y: auto !important;
    z-index: 1000 !important;
    transition: transform 0.3s ease !important;
    transform: translateX(-280px) !important; /* Start closed */
}

/* Sidebar open state */
.sidebar.open {
    transform: translateX(0) !important;
}

/* Main content adjustments */
.main-content {
    transition: margin-left 0.3s ease !important;
    padding: 2rem !important;
    background: var(--surface) !important;
    min-height: 100vh !important;
    margin-left: 0 !important; /* Start with no margin */
}

/* Main content when sidebar is open on desktop */
@media (min-width: 769px) {
    .main-content.shifted {
        margin-left: 280px !important;
    }
}

/* Mobile specific styles */
@media (max-width: 768px) {
    .main-content {
        margin-left: 0 !important; /* Always full width on mobile */
        padding: 1rem !important;
    }
    
    /* Mobile overlay when sidebar is open */
    .mobile-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0, 0, 0, 0.5) !important;
        z-index: 999 !important;
        display: none !important;
    }
    
    .mobile-overlay.active {
        display: block !important;
    }
}

/* Hide any old floating toggles */
.floating-toggle {
    display: none !important;
}
