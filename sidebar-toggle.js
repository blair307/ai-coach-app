/**
 * Final Working Sidebar Toggle - Ensures buttons always work
 * Replace entire sidebar-toggle.js file with this code
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing final sidebar toggle...');
    
    // Find elements
    const sidebar = document.querySelector('#sidebar');
    const mainContent = document.querySelector('.main-content');
    
    console.log('Found elements:', {
        sidebar: !!sidebar,
        mainContent: !!mainContent
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
        floatingButton.style.display = 'none';
        
        document.body.appendChild(floatingButton);
        console.log('✅ Created floating toggle button');
    }
    
    // Start with sidebar open on desktop, closed on mobile
    let isOpen = window.innerWidth > 768;
    
    // Set initial state
    function setInitialState() {
        if (isOpen) {
            sidebar.classList.remove('sidebar-closed');
            sidebar.classList.add('sidebar-open');
            floatingButton.style.display = 'none';
            console.log('📱 Initial state: SIDEBAR OPEN');
        } else {
            sidebar.classList.remove('sidebar-open');
            sidebar.classList.add('sidebar-closed');
            floatingButton.style.display = 'flex';
            console.log('📱 Initial state: SIDEBAR CLOSED');
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
            console.log('✅ Sidebar closed, floating button now visible');
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
        
        // Re-attach handlers to make sure they persist
        attachHandlers();
    }
    
    // Function to attach click handlers
    function attachHandlers() {
        // Find hamburger button in sidebar (may change during transitions)
        const sidebarButton = document.querySelector('.sidebar-toggle');
        
        if (sidebarButton) {
            // Remove any existing handlers to prevent duplicates
            sidebarButton.removeEventListener('click', toggleSidebar);
            // Add fresh handler
            sidebarButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ Sidebar hamburger clicked!');
                toggleSidebar();
            });
            console.log('🎯 Attached handler to sidebar button');
        }
        
        // Floating button handler
        floatingButton.removeEventListener('click', toggleSidebar);
        floatingButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎯 Floating button clicked!');
            toggleSidebar();
        });
        console.log('🎯 Attached handler to floating button');
    }
    
    // Handle escape key (close sidebar on mobile)
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
    
    // Use MutationObserver to watch for changes in the sidebar
    // This ensures our handlers persist even if the DOM changes
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' || mutation.type === 'attributes') {
                // Re-attach handlers when DOM changes
                setTimeout(attachHandlers, 10);
            }
        });
    });
    
    // Start observing the sidebar for changes
    observer.observe(sidebar, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });
    
    // Set initial state and attach handlers
    setInitialState();
    attachHandlers();
    
    // Also attach handlers periodically to ensure they persist
    setInterval(attachHandlers, 2000);
    
    console.log('🎉 Sidebar toggle initialized successfully!');
    console.log('🔍 Debug info:', {
        isOpen,
        sidebarClasses: sidebar.className,
        floatingButtonDisplay: floatingButton.style.display,
        screenWidth: window.innerWidth
    });
});
