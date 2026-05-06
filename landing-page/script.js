document.addEventListener('DOMContentLoaded', () => {

    // Optional: Intersection Observer for scroll animations (Fade in Bento boxes)
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const bentoItems = document.querySelectorAll('.bento-item');
    
    // Initial style for animation
    bentoItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out, box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    });

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    bentoItems.forEach(item => observer.observe(item));
});
