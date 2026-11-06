tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: {
              dark: '#060d1a',
              navy: '#0b192e',
              card: '#10223d',
              accent: '#ff5e14',
              accentHover: '#e04e0b',
              gold: '#fbbf24',
              goldHover: '#f59e0b',
            }
          },
          fontFamily: {
            heading: ['Fredoka', 'sans-serif'],
            sans: ['Plus Jakarta Sans', 'sans-serif'],
          },
          boxShadow: {
            'glow-orange': '0 0 40px -10px rgba(255, 94, 20, 0.45)',
            'glow-gold': '0 0 40px -10px rgba(251, 191, 36, 0.35)',
            'card': '0 12px 30px -10px rgba(2, 8, 20, 0.6)',
          }
        }
      }
    }
