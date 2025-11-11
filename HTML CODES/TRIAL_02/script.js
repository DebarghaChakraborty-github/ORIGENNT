// ============================================
// ORIGENNT - INTERACTIVE JAVASCRIPT
// ============================================

// ----- GLOBAL STATE -----
let currentRegion = 'IN';
let currentCurrency = 'INR';
let currentSymbol = '₹';

// Currency conversion rat5es (base: INR)
const exchangeRates = {
    INR: 1,
    USD: 0.012,
    GBP: 0.0096,
    EUR: 0.011,
    AED: 0.044,
    SGD: 0.016,
    AUD: 0.018
};

// ----- INITIALIZATION -----
document.addEventListener('DOMContentLoaded', function() {
    initializeMobileMenu();
    initializeRegionSelector();
    initializeScrollFade();
    initializeCharts();
    initializeBookingFlow();
    initializeTypingEffect();
    detectUserRegion();
});

// ----- MOBILE MENU TOGGLE -----
function initializeMobileMenu() {
    const menuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (menuButton && mobileMenu) {
        menuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
        
        // Close menu when clicking on links
        const mobileLinks = mobileMenu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
            });
        });
    }
    
    // Mobile region selector
    const mobileRegionSelect = document.getElementById('mobile-region-select');
    if (mobileRegionSelect) {
        mobileRegionSelect.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            changeRegion(e.target.value, getCurrencyForRegion(e.target.value));
        });
    }
}

// ----- REGION SELECTOR -----
function initializeRegionSelector() {
    const regionBtn = document.getElementById('region-btn');
    const regionDropdown = document.getElementById('region-dropdown');
    const regionOptions = document.querySelectorAll('.region-option');
    
    if (regionBtn && regionDropdown) {
        // Toggle dropdown
        regionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            regionDropdown.classList.toggle('hidden');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            regionDropdown.classList.add('hidden');
        });
        
        // Handle region selection
        regionOptions.forEach(option => {
            option.addEventListener('click', () => {
                const region = option.dataset.region;
                const flag = option.dataset.flag;
                const currency = option.dataset.currency;
                const symbol = option.dataset.symbol;
                
                changeRegion(region, currency, symbol, flag);
                regionDropdown.classList.add('hidden');
            });
        });
    }
}

// ----- CHANGE REGION FUNCTION -----
function changeRegion(region, currency, symbol, flag) {
    currentRegion = region;
    currentCurrency = currency;
    currentSymbol = symbol || getCurrencySymbol(currency);
    
    // Update header display
    const regionName = document.getElementById('region-name');
    const regionFlag = document.getElementById('region-flag');
    
    if (regionName) regionName.textContent = getRegionName(region);
    if (regionFlag) regionFlag.textContent = flag || '🌐';
    
    // Update all prices
    updateAllPrices();
    
    // Update currency display text
    const pricingCurrency = document.getElementById('pricing-currency');
    if (pricingCurrency) {
        pricingCurrency.textContent = `${currentCurrency} (${currentSymbol})`;
    }
    
    console.log(`Region changed to: ${region} (${currency})`);
}

// ----- AUTO-DETECT USER REGION -----
async function detectUserRegion() {
    try {
        // Try to detect user's region via timezone
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        if (timezone.includes('Asia/Kolkata') || timezone.includes('Asia/Calcutta')) {
            changeRegion('IN', 'INR', '₹', '🇮🇳');
        } else if (timezone.includes('America/')) {
            changeRegion('US', 'USD', '$', '🇺🇸');
        } else if (timezone.includes('Europe/London')) {
            changeRegion('GB', 'GBP', '£', '🇬🇧');
        } else if (timezone.includes('Europe/')) {
            changeRegion('EU', 'EUR', '€', '🇪🇺');
        } else if (timezone.includes('Asia/Dubai')) {
            changeRegion('AE', 'AED', 'AED', '🇦🇪');
        } else if (timezone.includes('Asia/Singapore')) {
            changeRegion('SG', 'SGD', 'S$', '🇸🇬');
        } else if (timezone.includes('Australia/')) {
            changeRegion('AU', 'AUD', 'A$', '🇦🇺');
        }
        
        // Update timezone display in booking
        const userTimezone = document.getElementById('user-timezone');
        if (userTimezone) {
            userTimezone.textContent = timezone.split('/')[1] || 'your timezone';
        }
        
    } catch (error) {
        console.log('Could not detect region:', error);
        // Default to India
        changeRegion('IN', 'INR', '₹', '🇮🇳');
    }
}

// ----- UPDATE ALL PRICES -----
function updateAllPrices() {
    const priceElements = document.querySelectorAll('.price');
    const currencySymbols = document.querySelectorAll('.currency-symbol');
    
    priceElements.forEach(el => {
        const basePrice = parseFloat(el.dataset.inr);
        const convertedPrice = convertCurrency(basePrice, 'INR', currentCurrency);
        el.textContent = formatPrice(convertedPrice);
    });
    
    currencySymbols.forEach(el => {
        el.textContent = currentSymbol;
    });
}

// ----- CURRENCY CONVERSION -----
function convertCurrency(amount, fromCurrency, toCurrency) {
    const inrAmount = amount / exchangeRates[fromCurrency];
    const convertedAmount = inrAmount * exchangeRates[toCurrency];
    return convertedAmount;
}

// ----- FORMAT PRICE -----
function formatPrice(price) {
    if (price >= 1000) {
        return price.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }
    return Math.round(price).toString();
}

// ----- HELPER FUNCTIONS -----
function getRegionName(code) {
    const names = {
        'IN': 'India',
        'US': 'United States',
        'GB': 'United Kingdom',
        'EU': 'Europe',
        'AE': 'Middle East',
        'SG': 'Singapore/APAC',
        'AU': 'Australia'
    };
    return names[code] || 'Global';
}

function getCurrencyForRegion(region) {
    const currencies = {
        'IN': 'INR',
        'US': 'USD',
        'GB': 'GBP',
        'EU': 'EUR',
        'AE': 'AED',
        'SG': 'SGD',
        'AU': 'AUD'
    };
    return currencies[region] || 'INR';
}

function getCurrencySymbol(currency) {
    const symbols = {
        'INR': '₹',
        'USD': '$',
        'GBP': '£',
        'EUR': '€',
        'AED': 'AED',
        'SGD': 'S$',
        'AUD': 'A$'
    };
    return symbols[currency] || currency;
}

// ----- TYPING EFFECT -----
function initializeTypingEffect() {
    const text = 'Applying Predictive Talent Science to Global Markets.';
    const targetId = 'typing-text';
    const speed = 50;
    
    const target = document.getElementById(targetId);
    if (!target) return;
    
    let i = 0;
    target.textContent = '';
    
    function type() {
        if (i < text.length) {
            target.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// ----- SCROLL FADE-IN ANIMATION -----
function initializeScrollFade() {
    const fadeElements = document.querySelectorAll('[data-scroll-fade]');
    
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('faded-in');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '0px 0px -15% 0px',
            threshold: 0.1
        });
        
        fadeElements.forEach(el => observer.observe(el));
    } else {
        // Fallback for browsers without IntersectionObserver
        fadeElements.forEach(el => el.classList.add('faded-in'));
    }
}

// ----- CHART.JS SETUP -----
function initializeCharts() {
    // Set global Chart.js defaults
    if (typeof Chart !== 'undefined') {
        Chart.defaults.color = '#E5E7EB';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
    }
    
    // Use Intersection Observer to load charts when visible
    const pieCanvas = document.getElementById('pieChart');
    const barCanvas = document.getElementById('barChart');
    
    if ('IntersectionObserver' in window) {
        const chartObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (entry.target.id === 'pieChart') createPieChart();
                    if (entry.target.id === 'barChart') createBarChart();
                    chartObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        if (pieCanvas) chartObserver.observe(pieCanvas);
        if (barCanvas) chartObserver.observe(barCanvas);
    } else {
        // Fallback: load charts immediately
        if (pieCanvas) createPieChart();
        if (barCanvas) createBarChart();
    }
}

// ----- PIE CHART -----
function createPieChart() {
    const ctx = document.getElementById('pieChart')?.getContext('2d');
    if (!ctx || typeof Chart === 'undefined') return;
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Gen Z (20-30)', 'Millennial (31-45)', 'Gen X (46-60)', 'Boomer (60+)'],
            datasets: [{
                label: 'Talent Pool',
                data: [35, 40, 20, 5],
                backgroundColor: [
                    'rgba(140, 82, 255, 0.8)',
                    'rgba(140, 82, 255, 0.6)',
                    'rgba(140, 82, 255, 0.4)',
                    'rgba(140, 82, 255, 0.2)'
                ],
                borderColor: '#111827',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'bottom',
                    labels: { color: '#E5E7EB', padding: 15 }
                },
                tooltip: {
                    backgroundColor: '#0d0d0d',
                    titleColor: '#8c52ff',
                    bodyColor: '#E5E7EB',
                    padding: 12,
                    borderColor: '#8c52ff',
                    borderWidth: 1
                }
            },
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
            },
            hoverOffset: 20
        }
    });
}

// ----- BAR CHART -----
function createBarChart() {
    const ctx = document.getElementById('barChart')?.getContext('2d');
    if (!ctx || typeof Chart === 'undefined') return;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['AI/ML', 'Cybersecurity', 'Data Science', 'Cloud Arch.', 'Quantum'],
            datasets: [{
                label: 'YoY Skill Demand Growth (%)',
                data: [45, 38, 30, 25, 10],
                backgroundColor: 'rgba(140, 82, 255, 0.6)',
                borderColor: 'rgba(140, 82, 255, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
                x: { 
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#E5E7EB' }
                },
                y: { 
                    grid: { display: false },
                    ticks: { color: '#E5E7EB' }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0d0d0d',
                    titleColor: '#8c52ff',
                    bodyColor: '#E5E7EB',
                    padding: 12,
                    borderColor: '#8c52ff',
                    borderWidth: 1
                }
            }
        }
    });
}

// ----- BOOKING FLOW -----
let currentStep = 1;

function initializeBookingFlow() {
    showStep(1);
    
    const detailsForm = document.getElementById('details-form');
    if (detailsForm) {
        detailsForm.addEventListener('submit', handleFormSubmit);
    }
}

function showStep(step) {
    // Hide all steps
    document.querySelectorAll('.booking-step').forEach(el => {
        el.classList.add('hidden');
    });
    
    // Show current step
    const currentStepEl = document.getElementById(`step-${step}`);
    if (currentStepEl) {
        currentStepEl.classList.remove('hidden');
    }
    
    // Update step indicators
    for (let i = 1; i <= 3; i++) {
        const indicator = document.getElementById(`step-${i}-indicator`);
        if (indicator) {
            const span = indicator.querySelector('span');
            const line = indicator.querySelector('div');
            
            if (i <= step) {
                span?.classList.remove('text-gray-500');
                span?.classList.add('text-purple-accent');
                line?.classList.remove('bg-gray-700');
                line?.classList.add('bg-purple-accent');
            } else {
                span?.classList.remove('text-purple-accent');
                span?.classList.add('text-gray-500');
                line?.classList.remove('bg-purple-accent');
                line?.classList.add('bg-gray-700');
            }
        }
    }
    
    currentStep = step;
}

function nextStep(step) {
    showStep(step);
    // Scroll to top of booking section
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function prevStep(step) {
    showStep(step);
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get form values
    const name = document.getElementById('contact-name')?.value;
    const email = document.getElementById('contact-email')?.value;
    const focusRadio = document.querySelector('input[name="focus"]:checked');
    const focus = focusRadio ? focusRadio.value : 'N/A';
    const scheduleRadio = document.querySelector('input[name="schedule"]:checked');
    const scheduleLabel = scheduleRadio?.parentElement.querySelector('.schedule-time')?.textContent;
    
    // Update confirmation step
    const confName = document.getElementById('conf-name');
    const confEmail = document.getElementById('conf-email');
    const confFocus = document.getElementById('conf-focus');
    const confSchedule = document.getElementById('conf-schedule');
    
    if (confName) confName.textContent = name;
    if (confEmail) confEmail.textContent = email;
    if (confFocus) confFocus.textContent = focus === 'enterprise' ? 'ENTERPRISE STRATEGY (B2B)' : 'CAREER BLUEPRINTING (B2C)';
    if (confSchedule) confSchedule.textContent = scheduleLabel || 'TBD';
    
    // In a real application, you would send this data to a backend
    console.log('Booking submitted:', { name, email, focus, schedule: scheduleLabel });
    
    // Show confirmation step
    nextStep(3);
}

// Make functions available globally for onclick handlers
window.nextStep = nextStep;
window.prevStep = prevStep;
