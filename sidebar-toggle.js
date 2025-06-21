/**
 * Permanent Sidebar Toggle - Works on all pages
 * Replace entire sidebar-toggle.js file with this code
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing permanent sidebar toggle...');
    
    // Find elements
    const sidebar = document.querySelector('#sidebar');
    const mainContent = document.querySelector('.main-content');
    const sidebarHeader = document.querySelector('.sidebar-header');
    const button = document.querySelector('#sidebar-toggle');
    
    console.log('Found elements:', {
        sidebar: !!sidebar,
        mainContent: !!mainContent,
        sidebarHeader: !!sidebarHeader,
        button: !!button
    });
    
    if (!sidebar || !mainContent || !sidebarHeader) {
        console.log('Missing required elements for sidebar toggle');
        return;
    }
    
    // Create floating button for when sidebar is closed
    const floatingButton = document.createElement('button');
    floatingButton.id = 'floating-toggle';
    floatingButton.innerHTML = `
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
    `;
    floatingButton.className = 'floating-toggle';
    floatingButton.setAttribute('aria-label', 'Open navigation menu');
    floatingButton.style.display = 'none'; // Hidden initially
    
    document.body.appendChild(floatingButton);
    
    // Set initial state
    let isOpen = true;
    
    // Toggle function
    function toggleSidebar() {
        console.log('Toggle clicked! Current state:', isOpen ? 'OPEN' : 'CLOSED');
        
        if (isOpen) {
            // Close sidebar
            console.log('Closing sidebar...');
            sidebar.classList.remove('sidebar-open', 'active');
            sidebar.classList.add('sidebar-closed');
            
            // Show floating button
            floatingButton.style.display = 'flex';
            
            isOpen = false;
            console.log('✅ Sidebar closed, floating button visible');
        } else {
            // Open sidebar
            console.log('Opening sidebar...');
            sidebar.classList.remove('sidebar-closed');
            sidebar.classList.add('sidebar-open', 'active');
            
            // Hide floating button
            floatingButton.style.display = 'none';
            
            isOpen = true;
            console.log('✅ Sidebar opened, floating button hidden');
        }
        
        // Update ARIA attributes
        sidebar.setAttribute('aria-hidden', !isOpen);
        if (button) button.setAttribute('aria-expanded', isOpen);
        floatingButton.setAttribute('aria-expanded', isOpen);
    }
    
    // Attach click handlers
    if (button) {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleSidebar();
        });
    }
    
    floatingButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
    });
    
    // Handle escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isOpen) {
            toggleSidebar();
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        // On mobile, close sidebar by default
        if (window.innerWidth <= 768 && isOpen) {
            toggleSidebar();
        }
        // On desktop, open sidebar by default
        else if (window.innerWidth > 768 && !isOpen) {
            toggleSidebar();
        }
    });
    
    // Set initial state based on screen size
    if (window.innerWidth <= 768) {
        // Start closed on mobile
        toggleSidebar();
    }
    
    console.log('🎉 Sidebar toggle initialized successfully!');
});
