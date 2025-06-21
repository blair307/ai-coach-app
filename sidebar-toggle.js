/**
 * Fixed Permanent Sidebar Toggle - Works on all pages
 * Replace entire sidebar-toggle.js file with this code
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing fixed sidebar toggle...');
    
    // Find elements
    const sidebar = document.querySelector('#sidebar');
    const mainContent = document.querySelector('.main-content');
    const sidebarHeader = document.querySelector('.sidebar-header');
    
    // Find ALL toggle buttons (there are two with same ID - we'll fix this)
    const toggleButtons = document.querySelectorAll('#sidebar-toggle, .sidebar-toggle');
    
    console.log('Found elements:', {
        sidebar: !!sidebar,
        mainContent: !!mainContent,
        sidebarHeader: !!sidebarHeader,
        toggleButtons: toggleButtons.length
    });
    
    if (!sidebar || !mainContent) {
        console.error('❌ Missing required elements for sidebar toggle');
        return;
    }
    
    // Create floating button if it doesn't exist
    let floatingButton = document.querySelector('#floating-toggle');
    if (!floatingButton) {
        floatingButton = document.createElement('button');
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
        console.log('✅ Created floating toggle button');
    }
    
    // Set initial state based on screen size
    let isOpen = window.innerWidth > 768; // Open on desktop, closed on mobile
    
    // Apply initial state
    function setInitialState() {
        if (isOpen) {
            // Sidebar open
            sidebar.classList.remove('sidebar-closed');
            sidebar.classList.add('sidebar-open');
            floatingButton.style.display = 'none';
            console.log('📱 Initial state: OPEN');
        } else {
            // Sidebar closed
            sidebar.classList.remove('sidebar-open');
            sidebar.classList.add('sidebar-closed');
            floatingButton.style.display = 'flex';
            console.log('📱 Initial state: CLOSED');
        }
        
        // Update ARIA attributes
        sidebar.setAttribute('aria-hidden', !isOpen);
        floatingButton.setAttribute('aria-expanded', isOpen);
    }
    
    // Toggle function
    function toggleSidebar() {
        console.log('🔄 Toggle clicked! Current state:', isOpen ? 'OPEN' : 'CLOSED');
        
        if (isOpen) {
            // Close sidebar
            console.log('🔒 Closing sidebar...');
            sidebar.classList.remove('sidebar-open');
            sidebar.classList.add('sidebar-closed');
            floatingButton.style.display = 'flex';
            isOpen = false;
            console.log('✅ Sidebar closed, floating button visible');
        } else {
            // Open sidebar
            console.log('🔓 Opening sidebar...');
            sidebar.classList.remove('sidebar-closed');
            sidebar.classList.add('sidebar-open');
            floatingButton.style.display = 'none';
            isOpen = true;
            console.log('✅ Sidebar opened, floating button hidden');
        }
        
        // Update ARIA attributes
        sidebar.setAttribute('aria-hidden', !isOpen);
        floatingButton.setAttribute('aria-expanded', isOpen);
        
        // Update all toggle buttons
        toggleButtons.forEach(btn => {
            btn.setAttribute('aria-expanded', isOpen);
        });
    }
    
    // Attach click handlers to ALL toggle buttons
    toggleButtons.forEach((button, index) => {
        console.log(`🎯 Attaching handler to button ${index + 1}`);
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log(`🖱️ Button ${index + 1} clicked!`);
            toggleSidebar();
        });
    });
    
    // Attach handler to floating button
    floatingButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🎯 Floating button clicked!');
        toggleSidebar();
    });
    
    // Handle escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isOpen && window.innerWidth <= 768) {
            console.log('⌨️ Escape key pressed - closing sidebar');
            toggleSidebar();
        }
    });
    
    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const shouldBeOpen = window.innerWidth > 768;
            if (shouldBeOpen !== isOpen) {
                console.log(`📏 Screen size changed - ${shouldBeOpen ? 'opening' : 'closing'} sidebar`);
                isOpen = !shouldBeOpen; // Flip it so toggle() will set it correctly
                toggleSidebar();
            }
        }, 100);
    });
    
    // Set initial state
    setInitialState();
    
    console.log('🎉 Sidebar toggle initialized successfully!');
    console.log('🔍 Debug info:', {
        isOpen,
        sidebarClasses: sidebar.className,
        floatingButtonDisplay: floatingButton.style.display,
        screenWidth: window.innerWidth
    });
});
