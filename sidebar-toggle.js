/**
 * Sidebar Toggle Implementation for EEH Platform
 * This file handles all sidebar toggle functionality with improved error handling
 */

class SidebarToggle {
    constructor() {
        this.sidebar = null;
        this.toggleButton = null;
        this.overlay = null;
        this.isOpen = false;
        this.init();
    }

    init() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        console.log('Setting up sidebar toggle...');
        
        // Find sidebar elements with multiple possible selectors
        this.sidebar = this.findElement([
            '#sidebar',
            '.sidebar',
            '#sidebar-wrapper',
            '.sidebar-wrapper',
            '[data-sidebar]'
        ]);

        this.toggleButton = this.findElement([
            '#sidebar-toggle',
            '.sidebar-toggle',
            '#menu-toggle',
            '.menu-toggle',
            '[data-toggle="sidebar"]',
            '.hamburger',
            '.nav-toggle'
        ]);

        this.overlay = this.findElement([
            '#sidebar-overlay',
            '.sidebar-overlay',
            '.overlay'
        ]);

        if (!this.sidebar) {
            console.error('Sidebar element not found. Expected selectors: #sidebar, .sidebar, etc.');
            return;
        }

        if (!this.toggleButton) {
            console.error('Toggle button not found. Expected selectors: #sidebar-toggle, .sidebar-toggle, etc.');
            return;
        }

        this.attachEventListeners();
        this.setupKeyboardNavigation();
        console.log('Sidebar toggle initialized successfully');
    }

    findElement(selectors) {
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                console.log(`Found element with selector: ${selector}`);
                return element;
            }
        }
        return null;
    }

    attachEventListeners() {
        // Toggle button click
        this.toggleButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
        });

        // Overlay click to close
        if (this.overlay) {
            this.overlay.addEventListener('click', () => {
                this.close();
            });
        }

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && 
                !this.sidebar.contains(e.target) && 
                !this.toggleButton.contains(e.target)) {
                this.close();
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    setupKeyboardNavigation() {
        // Make sidebar focusable and add ARIA attributes
        this.sidebar.setAttribute('aria-hidden', 'true');
        this.sidebar.setAttribute('role', 'navigation');
        this.toggleButton.setAttribute('aria-expanded', 'false');
        this.toggleButton.setAttribute('aria-controls', this.sidebar.id || 'sidebar');
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        console.log('Opening sidebar...');
        this.isOpen = true;
        
        // Add classes
        this.sidebar.classList.add('sidebar-open', 'active');
        document.body.classList.add('sidebar-active');
        
        if (this.overlay) {
            this.overlay.classList.add('active');
        }

        // Update ARIA attributes
        this.sidebar.setAttribute('aria-hidden', 'false');
        this.toggleButton.setAttribute('aria-expanded', 'true');

        // Focus management
        this.trapFocus();

        // Trigger custom event
        this.dispatchEvent('sidebar:opened');
    }

    close() {
        console.log('Closing sidebar...');
        this.isOpen = false;
        
        // Remove classes
        this.sidebar.classList.remove('sidebar-open', 'active');
        document.body.classList.remove('sidebar-active');
        
        if (this.overlay) {
            this.overlay.classList.remove('active');
        }

        // Update ARIA attributes
        this.sidebar.setAttribute('aria-hidden', 'true');
        this.toggleButton.setAttribute('aria-expanded', 'false');

        // Return focus to toggle button
        this.toggleButton.focus();

        // Trigger custom event
        this.dispatchEvent('sidebar:closed');
    }

    trapFocus() {
        const focusableElements = this.sidebar.querySelectorAll(
            'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }

    handleResize() {
        // Close sidebar on larger screens if desired
        if (window.innerWidth > 768 && this.isOpen) {
            this.close();
        }
    }

    dispatchEvent(eventName) {
        const event = new CustomEvent(eventName, {
            detail: { sidebar: this.sidebar, isOpen: this.isOpen }
        });
        document.dispatchEvent(event);
    }

    // Public API methods
    forceOpen() {
        this.open();
    }

    forceClose() {
        this.close();
    }

    isOpened() {
        return this.isOpen;
    }

    destroy() {
        // Cleanup event listeners if needed
        this.close();
        console.log('Sidebar toggle destroyed');
    }
}

// CSS classes that should be in your CSS file
const requiredCSS = `
/* Add these styles to your main CSS file */
.sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s ease-in-out;
}

.sidebar.sidebar-open,
.sidebar.active {
    transform: translateX(0);
}

.sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 998;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
}

.sidebar-overlay.active {
    opacity: 1;
    visibility: visible;
}

/* Prevent body scroll when sidebar is open */
body.sidebar-active {
    overflow: hidden;
}

/* Responsive behavior */
@media (max-width: 768px) {
    .sidebar {
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        width: 280px;
        z-index: 999;
    }
}
`;

// Initialize the sidebar toggle when DOM is ready
let sidebarToggle;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        sidebarToggle = new SidebarToggle();
    });
} else {
    sidebarToggle = new SidebarToggle();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SidebarToggle;
}

// Make available globally
window.SidebarToggle = SidebarToggle;

// Debug helper
window.debugSidebar = function() {
    console.log('Sidebar toggle instance:', sidebarToggle);
    console.log('Sidebar element:', sidebarToggle?.sidebar);
    console.log('Toggle button:', sidebarToggle?.toggleButton);
    console.log('Is open:', sidebarToggle?.isOpen);
    console.log('Required CSS:', requiredCSS);
};

console.log('Sidebar toggle script loaded. Use window.debugSidebar() to debug.');
