/**
 * ORIGENNT - Strategic Talent Engineering
 * Master Script 2026: Apple-style Reveals + Halo Cursor
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. HALO SENSOR CURSOR ---
    const halo = document.createElement('div');
    halo.className = 'cursor-halo';
    document.body.appendChild(halo);

    let mouseX = 0, mouseY = 0; // Mouse position
    let ballX = 0, ballY = 0;   // Halo position
    let speed = 0.12;           // Lag speed for that fluid feel

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animateHalo() {
        let distX = mouseX - ballX;
        let distY = mouseY - ballY;
        ballX += distX * speed;
        ballY += distY * speed;
        
        halo.style.transform = `translate(${ballX}px, ${ballY}px)`;
        requestAnimationFrame(animateHalo);
    }
    animateHalo();

    // --- 2. APPLE-STYLE SCROLL DISSOLVE ---
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // --- 3. TYPING ANIMATION (Home Page Only) ---
    const typingElement = document.getElementById('typing-text');
    if (typingElement) {
        const phrases = [
            "Connecting India's top talent to the global stage.",
            "Precision-engineered recruitment for enterprises.",
            "Serving 25+ countries from the heart of Odisha."
        ];
        let i = 0, j = 0, isDeleting = false;
        function type() {
            const current = phrases[i];
            typingElement.textContent = isDeleting ? current.substring(0, j--) : current.substring(0, j++);
            if (!isDeleting && j > current.length) { isDeleting = true; setTimeout(type, 2000); }
            else if (isDeleting && j === 0) { isDeleting = false; i = (i + 1) % phrases.length; setTimeout(type, 500); }
            else { setTimeout(type, isDeleting ? 40 : 80); }
        }
        type();
    }

    // --- 4. NAVIGATION & REGION SELECTOR ---
    const menuBtn = document.getElementById('mobile-menu-button');
    const menu = document.getElementById('mobile-menu');
    const regionBtn = document.getElementById('region-btn');
    const regionDropdown = document.getElementById('region-dropdown');

    if(menuBtn) menuBtn.addEventListener('click', () => menu.classList.toggle('hidden'));
    
    if(regionBtn) {
        regionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            regionDropdown.classList.toggle('hidden');
        });
    }

    // Close dropdowns on outside click
    window.addEventListener('click', () => {
        if(regionDropdown) regionDropdown.classList.add('hidden');
    });

    // --- 5. B2B PRICING CURRENCY SWITCHER ---
    const regionOptions = document.querySelectorAll('.region-option');
    const prices = document.querySelectorAll('.price');
    const symbols = document.querySelectorAll('.currency-symbol');

    regionOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            const reg = opt.getAttribute('data-region').toLowerCase();
            const flag = opt.getAttribute('data-flag');
            const name = opt.innerText.split(' ')[1];
            
            // Update UI
            document.getElementById('region-flag').innerText = flag;
            document.getElementById('region-name').innerText = name;

            // Update Prices
            const mapping = { inr:'₹', us:'$', gb:'£', eu:'€', ae:'د.إ', sg:'S$', au:'A$' };
            const symbol = mapping[reg] || '₹';
            
            prices.forEach(p => {
                const targetPrice = p.getAttribute(`data-${reg}`) || p.getAttribute('data-inr');
                p.innerText = targetPrice;
            });
            symbols.forEach(s => s.innerText = symbol);
        });
    });
});
