function switchState(stateName) {
      const states = ['upload', 'preview', 'loading'];
      states.forEach(s => {
        const el = document.getElementById('state-' + s);
        if (el) {
          if (s === stateName) {
            el.classList.remove('hidden');
            el.classList.add('flex');
          } else {
            el.classList.add('hidden');
            el.classList.remove('flex');
          }
        }
      });
    }

    function handleFileSelect(event) {
      if (event.target.files && event.target.files[0]) {
        switchState('preview');
      }
    }

    // Drag-and-drop feedback
    const dropzone = document.getElementById('dropzone');
    if (dropzone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropzone.classList.add('border-[#FF5E14]', 'bg-[#102444]');
        }, false);
      });
      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropzone.classList.remove('border-[#FF5E14]', 'bg-[#102444]');
          if (eventName === 'drop' && e.dataTransfer.files.length > 0) {
            switchState('preview');
          }
        }, false);
      });
    }
