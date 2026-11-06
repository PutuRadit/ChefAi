// Add glass background shade on navbar scroll
    window.addEventListener('scroll', () => {
      const header = document.querySelector('header');
      if (window.scrollY > 20) {
        header.classList.add('bg-[#060d1a]/95', 'shadow-lg');
      } else {
        header.classList.remove('bg-[#060d1a]/95', 'shadow-lg');
      }
    });
