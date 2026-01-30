/* 
====================================================================
ORIGENNT - Interactive Animations & Effects
Handles cursor tracking, text glow, and card scroll animations
====================================================================
*/

(function() {
  'use strict';

  // ==================== CURSOR HALO TRACKING ====================
  const cursorHalo = document.querySelector('.cursor-halo');
  const cursorRing = document.querySelector('.cursor-ring');
  
  if (cursorHalo) {
    let mouseX = 0;
    let mouseY = 0;
    let haloX = 0;
    let haloY = 0;
    
    // Smooth cursor following with easing
    function updateCursor() {
      const ease = 0.15;
      haloX += (mouseX - haloX) * ease;
      haloY += (mouseY - haloY) * ease;
      
      cursorHalo.style.transform = `translate(${haloX}px, ${haloY}px) translate(-50%, -50%)`;
      
      if (cursorRing) {
        cursorRing.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
      }
      
      requestAnimationFrame(updateCursor);
    }
    
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
    
    // Expand halo on interactive elements
    const interactiveElements = document.querySelectorAll('a, button, .btn, input, select, textarea, .card, .linear-panel');
    
    interactiveElements.forEach(element => {
      element.addEventListener('mouseenter', () => {
        cursorHalo.classList.add('expanded');
        if (cursorRing) cursorRing.classList.add('active');
      });
      
      element.addEventListener('mouseleave', () => {
        cursorHalo.classList.remove('expanded');
        if (cursorRing) cursorRing.classList.remove('active');
      });
    });
    
    updateCursor();
  }

  // ==================== CARD SCROLL ANIMATIONS ====================
  
  // Intersection Observer for card animations
  const cardObserverOptions = {
    root: null,
    rootMargin: '0px',
    threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
  };
  
  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const card = entry.target;
      const ratio = entry.intersectionRatio;
      
      if (entry.isIntersecting) {
        // Card is entering viewport
        if (ratio > 0.1) {
          card.classList.add('in-view');
          card.classList.remove('out-of-view', 'far-out');
        }
      } else {
        // Card is leaving viewport
        card.classList.remove('in-view');
        
        // Check if card is above or below viewport
        const rect = card.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
          card.classList.add('out-of-view');
          
          // Completely out of view
          if (Math.abs(rect.top) > window.innerHeight || rect.top > window.innerHeight * 2) {
            card.classList.add('far-out');
          }
        }
      }
      
      // Dynamic opacity based on scroll position
      if (ratio > 0) {
        const opacity = Math.max(0.3, Math.min(1, ratio * 1.5));
        card.style.opacity = opacity;
      }
    });
  }, cardObserverOptions);
  
  // Observe all cards and panels
  function observeCards() {
    const cardsToObserve = document.querySelectorAll('.card, .linear-panel, .glass-panel, .gradient-panel, .card-fade');
    cardsToObserve.forEach(card => {
      cardObserver.observe(card);
    });
  }
  
  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeCards);
  } else {
    observeCards();
  }
  
  // Re-observe cards added dynamically
  const mutationObserver = new MutationObserver(() => {
    observeCards();
  });
  
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  // ==================== REVEAL ANIMATIONS ====================
  
  const revealObserverOptions = {
    root: null,
    rootMargin: '0px 0px -100px 0px',
    threshold: 0.15
  };
  
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        // Optional: unobserve after animation
        // revealObserver.unobserve(entry.target);
      } else {
        // Optional: remove active class when scrolling back up
        entry.target.classList.remove('active');
      }
    });
  }, revealObserverOptions);
  
  // Observe reveal elements
  function observeReveals() {
    const revealsToObserve = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    revealsToObserve.forEach(element => {
      revealObserver.observe(element);
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeReveals);
  } else {
    observeReveals();
  }

  // ==================== STAGGER ANIMATIONS ====================
  
  const staggerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const staggerItems = entry.target.querySelectorAll('.stagger-item');
        staggerItems.forEach((item, index) => {
          setTimeout(() => {
            item.classList.add('active');
          }, index * 100); // 100ms delay between each item
        });
        staggerObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  
  function observeStagger() {
    const staggerContainers = document.querySelectorAll('.stagger-container');
    staggerContainers.forEach(container => {
      staggerObserver.observe(container);
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeStagger);
  } else {
    observeStagger();
  }

  // ==================== HEADER SCROLL EFFECT ====================
  
  const header = document.querySelector('header');
  
  if (header) {
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
      const currentScroll = window.pageYOffset;
      
      if (currentScroll > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
      
      lastScroll = currentScroll;
    });
  }

  // ==================== THEME TOGGLE ====================
  
  const themeToggle = document.querySelector('.theme-toggle');
  
  if (themeToggle) {
    // Check for saved theme preference or default to light
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    themeToggle.addEventListener('click', () => {
      const theme = document.documentElement.getAttribute('data-theme');
      const newTheme = theme === 'light' ? 'dark' : 'light';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      
      // Optional: Add icon rotation animation
      themeToggle.style.transform = 'rotate(360deg)';
      setTimeout(() => {
        themeToggle.style.transform = 'rotate(0deg)';
      }, 300);
    });
  }

  // ==================== SMOOTH SCROLL FOR ANCHOR LINKS ====================
  
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      
      // Skip if it's just "#"
      if (href === '#') return;
      
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // ==================== PERFORMANCE OPTIMIZATIONS ====================
  
  // Disable animations on low-end devices
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  
  if (prefersReducedMotion.matches) {
    document.body.classList.add('reduce-motion');
    
    // Add CSS to disable animations
    const style = document.createElement('style');
    style.textContent = `
      .reduce-motion *,
      .reduce-motion *::before,
      .reduce-motion *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ==================== UTILITY FUNCTIONS ====================
  
  // Throttle function for performance
  function throttle(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Debounce function for performance
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // ==================== PARALLAX SCROLL EFFECT (OPTIONAL) ====================
  
  const parallaxElements = document.querySelectorAll('[data-parallax]');
  
  if (parallaxElements.length > 0) {
    const handleParallax = throttle(() => {
      parallaxElements.forEach(element => {
        const speed = element.getAttribute('data-parallax') || 0.5;
        const yPos = -(window.pageYOffset * speed);
        element.style.transform = `translateY(${yPos}px)`;
      });
    }, 10);
    
    window.addEventListener('scroll', handleParallax);
  }

  // ==================== CONSOLE EASTER EGG ====================
  
  console.log('%c🚀 ORIGENNT ', 'background: linear-gradient(135deg, #a855f7, #7e22ce); color: white; font-size: 20px; font-weight: bold; padding: 10px 20px; border-radius: 8px;');
  console.log('%cStrategic Talent Engineering Platform', 'color: #a855f7; font-size: 14px; font-weight: 600;');
  console.log('%cBuilt with passion ❤️', 'color: #6b7280; font-size: 12px;');

  // ==================== EXPORT FOR MODULE USE ====================
  
  window.ORIGENNT = {
    observeCards,
    observeReveals,
    observeStagger,
    throttle,
    debounce
  };

})();
