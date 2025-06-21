// Sidebar Toggle Functionality - Clean Version

// Initialize sidebar toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeSidebarToggle();
});

function initializeSidebarToggle() {
    // Create toggle button if it doesn't exist
    if (!document.querySelector('.sidebar-toggle')) {
        createSidebarToggle();
    }
    
    // Load saved sidebar state
    loadSidebarState();
    
    // Add keyboard shortcut (Ctrl/Cmd + B)
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            toggleSidebar();
        }
    });
}

function createSidebarToggle() {
    const toggleButton = document.createElement('button');
    toggleButton.className = 'sidebar-toggle';
    toggleButton.innerHTML = '☰';
    toggleButton.onclick = toggleSidebar;
    toggleButton.title = 'Toggle Sidebar (Ctrl+B)';
    
    document.body.appendChild(toggleButton);
}

function toggleSidebar() {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        handleMobileToggle();
        return;
    }
    
    const sidebar = document.querySelector('.sidebar');
    const toggleButton = document.querySelector('.sidebar-toggle');
    
    if (!sidebar) return;
    
    const isCollapsed = sidebar.classList.contains('collapsed');
    
    if (isCollapsed) {
        // Expand sidebar
        sidebar.classList.remove('collapsed');
        toggleButton.innerHTML = '☰';
        toggleButton.title = 'Collapse Sidebar (Ctrl+B)';
        saveSidebarState(false);
        
        // Show text with animation delay
        setTimeout(function() {
            const menuItems = sidebar.querySelectorAll('.menu-item, .sidebar-header h2');
            menuItems.forEach(function(item) {
                item.style.opacity = '1';
                item.style.visibility = 'visible';
            });
        }, 150);
        
    } else {
        // Collapse sidebar
        sidebar.classList.add('collapsed');
        toggleButton.innerHTML = '→';
        toggleButton.title = 'Expand Sidebar (Ctrl+B)';
        saveSidebarState(true);
        
        // Hide text immediately
        const menuItems = sidebar.querySelectorAll('.menu-item, .sidebar-header h2');
        menuItems.forEach(function(item) {
            item.style.opacity = '0';
            item.style.visibility = 'hidden';
        });
    }
    
    // Trigger a custom event for other components to react
    window.dispatchEvent(new CustomEvent('sidebarToggle', { 
        detail: { collapsed: !isCollapsed } 
    }));
}

function saveSidebarState(collapsed) {
    localStorage.setItem('eeh_sidebar_collapsed', collapsed.toString());
}

function loadSidebarState() {
    const sidebar = document.querySelector('.sidebar');
    const toggleButton = document.querySelector('.sidebar-toggle');
    
    if (!sidebar || !toggleButton) return;
    
    const savedState = localStorage.getItem('eeh_sidebar_collapsed');
    const isCollapsed = savedState === 'true';
    
    if (isCollapsed) {
        sidebar.classList.add('collapsed');
        toggleButton.innerHTML = '→';
        toggleButton.title = 'Expand Sidebar (Ctrl+B)';
        
        // Hide text
        const menuItems = sidebar.querySelectorAll('.menu-item, .sidebar-header h2');
        menuItems.forEach(function(item) {
            item.style.opacity = '0';
            item.style.visibility = 'hidden';
        });
    } else {
        sidebar.classList.remove('collapsed');
        toggleButton.innerHTML = '☰';
        toggleButton.title = 'Collapse Sidebar (Ctrl+B)';
    }
}

// Mobile-specific functions
function handleMobileToggle() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay') || createSidebarOverlay();
    
    if (!sidebar) return;
    
    const isOpen = sidebar.classList.contains('open');
    
    if (isOpen) {
        closeMobileSidebar();
    } else {
        openMobileSidebar();
    }
}

function createSidebarOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.onclick = closeMobileSidebar;
    document.body.appendChild(overlay);
    return overlay;
}

function openMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('active');
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

function closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    
    // Restore body scroll
    document.body.style.overflow = '';
}

// Handle window resize
window.addEventListener('resize', function() {
    const sidebar = document.querySelector('.sidebar');
    const isMobile = window.innerWidth <= 768;
    
    if (!isMobile && sidebar) {
        // Reset mobile classes when switching to desktop
        sidebar.classList.remove('open');
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
});

console.log('Sidebar toggle loaded successfully');
