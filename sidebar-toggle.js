/**
 * BULLETPROOF SIDEBAR FIX - Back to basics that always works
 * This is the approach that worked before and will work again
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Bulletproof sidebar starting...');
    
    // Get elements
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    const hamburgerButtons = document.querySelectorAll('.sidebar-toggle');
    
    if (!sidebar || !mainContent || hamburgerButtons.length === 0) {
        console.error('❌ Missing required elements');
        return;
    }
    
    console.log('✅ Found elements:', {
        sidebar: !!sidebar,
        mainContent: !!mainContent,
        buttons: hamburgerButtons.length
    });
    
    // CRITICAL: Remove ALL CSS classes and start fresh
    function resetSidebar() {
        sidebar.className = 'sidebar'; // Keep only base class
        mainContent.className = 'main-content'; // Keep only base class
        
        // Clear all inline styles
        sidebar.style.cssText = '';
        mainContent.style.cssText = '';
        
        console.log('🧹 Reset all classes and styles');
    }
    
    // Show sidebar (desktop mode)
    function showSidebar() {
        console.log('👀 SHOWING sidebar');
        
        // Force styles that ALWAYS work
        sidebar.style.cssText = `
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 250px !important;
            height: 100vh !important;
            z-index: 1000 !important;
            transform: translateX(0px) !important;
            transition: transform 0.3s ease !important;
        `;
        
        mainContent.style.cssText = `
            margin-left: 250px !important;
            transition: margin-left 0.3s ease !important;
        `;
        
        // Update button states
        hamburgerButtons.forEach(btn => btn.classList.remove('active'));
    }
    
    // Hide sidebar (mobile mode)  
    function hideSidebar() {
        console.log('🙈 HIDING sidebar');
        
        // Force styles that ALWAYS work
        sidebar.style.cssText = `
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 250px !important;
            height: 100vh !important;
            z-index: 1000 !important;
            transform: translateX(-250px) !important;
            transition: transform 0.3s ease !important;
        `;
        
        mainContent.style.cssText = `
            margin-left: 0px !important;
            transition: margin-left 0.3s ease !important;
        `;
        
        // Update button states  
        hamburgerButtons.forEach(btn => btn.classList.add('active'));
    }
    
    // Toggle function
    let isVisible = true;
    function toggleSidebar() {
        console.log('🔄 Toggling sidebar. Currently:', isVisible ? 'VISIBLE' : 'HIDDEN');
        
        if (isVisible) {
            hideSidebar();
            isVisible = false;
        } else {
            showSidebar();
            isVisible = true;
        }
        
        console.log('🔄 Sidebar now:', isVisible ? 'VISIBLE' : 'HIDDEN');
    }
    
    // Initialize based on screen size
    function initializeSidebar() {
        resetSidebar();
        
        if (window.innerWidth <= 768) {
            // Mobile - start hidden
            hideSidebar();
            isVisible = false;
        } else {
            // Desktop - start visible
            showSidebar();
            isVisible = true;
        }
        
        console.log('🚀 Initialized for', window.innerWidth <= 768 ? 'MOBILE' : 'DESKTOP');
    }
    
    // Add click handlers to ALL hamburger buttons
    hamburgerButtons.forEach((button, index) => {
        console.log(`🎯 Adding handler to button ${index + 1}`);
        
        // Remove existing handlers
        button.onclick = null;
        
        // Add new handler
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log(`🎯 Button ${index + 1} clicked!`);
            toggleSidebar();
        });
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        console.log('📱 Window resized to:', window.innerWidth);
        initializeSidebar();
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 && isVisible) {
            const clickedInsideSidebar = sidebar.contains(e.target);
            const clickedHamburger = Array.from(hamburgerButtons).some(btn => btn.contains(e.target));
            
            if (!clickedInsideSidebar && !clickedHamburger) {
                console.log('👆 Clicked outside - closing sidebar');
                hideSidebar();
                isVisible = false;
            }
        }
    });
    
    // Initialize
    initializeSidebar();
    
    // Test functions
    window.sidebarTest = {
        show: showSidebar,
        hide: hideSidebar,
        toggle: toggleSidebar,
        reset: initializeSidebar,
        status: () => isVisible ? 'VISIBLE' : 'HIDDEN'
    };
    
    console.log('✅ Bulletproof sidebar ready!');
    console.log('🧪 Test commands:');
    console.log('   window.sidebarTest.toggle()');
    console.log('   window.sidebarTest.show()');
    console.log('   window.sidebarTest.hide()');
    console.log('   window.sidebarTest.status()');
});
