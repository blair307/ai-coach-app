/**
 * Fixed Sidebar Toggle - Uses the same method as the working red button
 * Replace entire sidebar-toggle.js file with this code
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Fixed sidebar toggle with working floating button...');
    
    const sidebar = document.querySelector('#sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (!sidebar || !mainContent) {
        console.error('❌ Missing sidebar or main content');
        return;
    }
    
    let isOpen = true;
    let floatingButton = null;
    
    // Create floating button using the EXACT method that worked for the red button
    function createFloatingButton() {
        // Remove any existing floating button
        if (floatingButton) {
            floatingButton.remove();
        }
        
        // Create button exactly like the working red one
        floatingButton = document.createElement('button');
        floatingButton.innerHTML = `
            <span style="display: block; width: 20px; height: 3px; background: white; margin: 3px 0; border-radius: 2px;"></span>
            <span style="display: block; width: 20px; height: 3px; background: white; margin: 3px 0; border-radius: 2px;"></span>
            <span style="display: block; width: 20px; height: 3px; background: white; margin: 3px 0; border-radius: 2px;"></span>
        `;
        
        // Use the EXACT same CSS technique that worked for the red button
        floatingButton.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            left: 20px !important;
            width: 50px !important;
            height: 50px !important;
            background: #6366f1 !important;
            color: white !important;
            border: none !important;
            border-radius: 10px !important;
            cursor: pointer !important;
            z-index: 999999 !important;
            display: none !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4) !important;
            transition: all 0.3s ease !important;
        `;
        
        // Add click handler using the same method
        floatingButton.onclick = function() {
            console.log('🎯 FLOATING BUTTON CLICKED!');
            openSidebar();
        };
        
        // Append to body (not sidebar!)
        document.body.appendChild(floatingButton);
        console.log('✅ Floating button created with working method');
    }
    
    // Function to open sidebar
    function openSidebar() {
        console.log('🔓 OPENING SIDEBAR...');
        sidebar.classList.remove('sidebar-closed');
        sidebar.classList.add('sidebar-open');
        
        if (floatingButton) {
            floatingButton.style.display = 'none';
        }
        
        isOpen = true;
        console.log('✅ SIDEBAR OPENED');
    }
    
    // Function to close sidebar
    function closeSidebar() {
        console.log('🔒 CLOSING SIDEBAR...');
        sidebar.classList.remove('sidebar-open');
        sidebar.classList.add('sidebar-closed');
        
        // Show floating button using the working method
        if (floatingButton) {
            floatingButton.style.display = 'flex';
        }
        
        isOpen = false;
        console.log('✅ SIDEBAR CLOSED - FLOATING BUTTON VISIBLE');
    }
    
    // Handle hamburger button in sidebar
    function handleHamburgerClick(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🎯 HAMBURGER CLICKED!');
        
        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }
    
    // Attach handler to sidebar hamburger button
    function attachHamburgerHandler() {
        const hamburger = sidebar.querySelector('.sidebar-toggle');
        if (hamburger) {
            hamburger.removeEventListener('click', handleHamburgerClick);
            hamburger.addEventListener('click', handleHamburgerClick);
            console.log('🎯 Hamburger handler attached');
        }
    }
    
    // Initialize
    createFloatingButton();
    
    // Set initial state
    sidebar.classList.add('sidebar-open');
    isOpen = true;
    
    // Attach hamburger handler
    attachHamburgerHandler();
    
    // Re-attach handler periodically to ensure it persists
    setInterval(attachHamburgerHandler, 2000);
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth <= 768 && isOpen) {
            closeSidebar();
        } else if (window.innerWidth > 768 && !isOpen) {
            openSidebar();
        }
    });
    
    console.log('🎉 Fixed sidebar toggle ready!');
    
  
// Test the floating button visibility after 5 seconds
setTimeout(() => {
    console.log('🧪 TEST: Showing floating button for 3 seconds...');
    const originalDisplay = floatingButton.style.display;
    floatingButton.style.display = 'flex';
    
    setTimeout(() => {
        floatingButton.style.display = originalDisplay;
        console.log('🧪 TEST: Floating button test complete');
    }, 3000);
}, 5000);
