// File: shared/js/theme-toggle.js

function initThemeToggle() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const moonIcon = document.getElementById('moon-icon');
    const sunIcon = document.getElementById('sun-icon');
    
    // Check local storage for theme, default to dark if not set
    const currentTheme = localStorage.getItem('theme') || 'dark';
    
    // Function to apply theme
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        if(!moonIcon || !sunIcon) return; // Prevent errors if icons don't exist

        if (theme === 'dark') {
            moonIcon.classList.add('hidden');
            sunIcon.classList.remove('hidden');
        } else {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        }
    }

    // Apply initial theme
    applyTheme(currentTheme);

    // Toggle event listener
    if(themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
}

// Eksekusi ketika DOM siap
document.addEventListener('DOMContentLoaded', initThemeToggle);
