// Utility function to get form field values
function getFormFieldValue(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : '';
}

// Form validation functions
class FormValidator {
    static validateAppointmentForm() {
        const name = getFormFieldValue('name');
        const phone = getFormFieldValue('phone');
        const email = getFormFieldValue('email');
        const date = getFormFieldValue('date');
        const time = getFormFieldValue('time');
        const reason = getFormFieldValue('reason');

        if (!name || !phone || !email || !date || !time || !reason) {
            alert('Please fill in all fields');
            return false;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address');
            return false;
        }

        // Basic phone number validation
        const phoneRegex = /^[0-9\-\+]{10,}$/;
        if (!phoneRegex.test(phone)) {
            alert('Please enter a valid phone number');
            return false;
        }

        return true;
    }
}

// Appointment Form Management
class AppointmentForm {
    constructor(formId, dateId, timeId) {
        this.form = document.getElementById(formId);
        this.dateInput = document.getElementById(dateId);
        this.timeSelect = document.getElementById(timeId);
        
        if (!this.form) return;

        this.initializeDateInput();
        this.setupEventListeners();
    }

    initializeDateInput() {
        const today = new Date();
        const minDate = today.toISOString().split('T')[0];
        this.dateInput.min = minDate;
    }

    setupEventListeners() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!FormValidator.validateAppointmentForm()) return;

            const formData = {
                name: getFormFieldValue('name'),
                phone: getFormFieldValue('phone'),
                email: getFormFieldValue('email'),
                date: this.dateInput.value,
                time: this.timeSelect.value,
                reason: getFormFieldValue('reason')
            };

            try {
                const response = await fetch('/.netlify/functions/appointment-handler', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok) {
                    alert('Appointment booked successfully! We will contact you shortly.');
                    this.form.reset();
                } else {
                    throw new Error(result.message || 'Failed to book appointment');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error booking appointment: ' + error.message);
            }
        });
    }
}

// Navigation Management
class Navigation {
    static setupSmoothScroll() {
        // Handle both nav links and CTA button
        document.querySelectorAll('nav a, .cta-button').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    static setupScrollHighlight() {
        const sections = document.querySelectorAll('section');
        window.addEventListener('scroll', () => {
            let current = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                if (pageYOffset >= sectionTop - 60) {
                    current = section.getAttribute('id');
                }
            });

            document.querySelectorAll('nav a').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        });
    }
}

// Initialize smooth scrolling when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AppointmentForm('appointment-form', 'date', 'time');
    Navigation.setupSmoothScroll();
    Navigation.setupScrollHighlight();
    AnnouncementCards.setupAnimation();
});

// Mobile Menu Management
class MobileMenu {
    static toggle() {
        const nav = document.querySelector('nav ul');
        if (nav) {
            nav.classList.toggle('active');
        }
    }
}

// Announcement Cards Animation
class AnnouncementCards {
    static setupAnimation() {
        const cards = document.querySelectorAll('.announcement-card');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.2 });

        cards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            observer.observe(card);
        });
    }
}

// Initialize all components
document.addEventListener('DOMContentLoaded', () => {
    // Initialize appointment form
    new AppointmentForm('appointment-form', 'date', 'time');
    
    // Initialize navigation
    Navigation.setupSmoothScroll();
    Navigation.setupScrollHighlight();
    
    // Initialize announcement cards animation
    AnnouncementCards.setupAnimation();
});

// Export functions for external use
window.toggleMobileMenu = MobileMenu.toggle;
