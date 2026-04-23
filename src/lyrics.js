// LRC 歌词解析与渲染 - 精确同步版

class LyricsManager {
  constructor() {
    this.lyrics = [];
    this.currentIndex = -1;
    this.transitionDuration = 400;
    this.transitionSpeed = 6;
    this.transitionMode = 'slide';
    this.followMode = 'karaoke'; // karaoke, normal, progress, none
    this.fontFamily = 'yaihei';
    
    // DOM 元素
    this.prevEl = document.getElementById('lyrics-prev');
    this.currentEl = document.getElementById('lyrics-current');
    this.nextEl = document.getElementById('lyrics-next');
    this.next2El = document.getElementById('lyrics-next2');
    this.glowEl = document.getElementById('lyrics-glow');
    this.displayEl = document.getElementById('lyrics-display');
    
    // 卡拉OK状态
    this.charElements = [];
    this.highlightedChars = 0;
    this.currentLyric = null;
    
    // 当前特效风格
    this.currentStyle = 'gradient';
    
    // 歌词变化回调
    this.onLyricChange = null;
    this.onClimax = null;
    
    this.init();
  }

  init() {
    this.setTransitionSpeed(this.transitionSpeed);
    this.setLyricsStyle('gradient');
    this.setTransitionMode('fade');
    this.setFollowMode('karaoke');
    this.setFontFamily('yaihei');
  }

  parseLRC(lrcText) {
    this.lyrics = [];
    const lines = lrcText.split('\n');
    const timeRegex = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]/g;

    for (const line of lines) {
      const matches = [...line.matchAll(timeRegex)];
      
      if (matches.length > 0) {
        const text = line.replace(timeRegex, '').trim();
        
        if (text) {
          for (const match of matches) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const centiseconds = parseInt(match[3].padEnd(3, '0'));
            const time = minutes * 60 + seconds + centiseconds / 1000;
            
            this.lyrics.push({ time, text });
          }
        }
      }
    }

    this.lyrics.sort((a, b) => a.time - b.time);
    
    for (let i = 0; i < this.lyrics.length; i++) {
      const current = this.lyrics[i];
      const next = this.lyrics[i + 1];
      const duration = next ? next.time - current.time : 5;
      current.duration = Math.max(duration, current.text.length * 0.3);
    }
    
    return this.lyrics;
  }

  async loadFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.parseLRC(e.target.result);
        this.initDisplay();
        resolve(this.lyrics);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  setLyricChangeCallback(callback) {
    this.onLyricChange = callback;
  }
  
  setClimaxCallback(callback) {
    this.onClimax = callback;
  }

  initDisplay() {
    this.prevEl.textContent = '';
    this.currentEl.innerHTML = '<span class="char-container"></span>';
    this.nextEl.textContent = '';
    this.next2El.textContent = '';
    if (this.glowEl) this.glowEl.classList.remove('active');
    
    this.setLyricsStyle(this.currentStyle);
    this.setTransitionMode(this.transitionMode);
    this.setFollowMode(this.followMode);
    this.setFontFamily(this.fontFamily);
  }

  // 设置跟随模式
  setFollowMode(mode) {
    this.followMode = mode;
    this.displayEl.classList.remove('lyrics-mode-karaoke', 'lyrics-mode-normal', 'lyrics-mode-progress', 'lyrics-mode-none');
    this.displayEl.classList.add(`lyrics-mode-${mode}`);
  }
  
  // 设置字体
  setFontFamily(font) {
    this.fontFamily = font;
    const fontClasses = ['font-yaihei', 'font-heiti', 'font-noto', 'font-zcool', 'font-hans', 'font-brutal'];
    const newClass = `font-${font}`;
    
    // 移除所有字体类并添加新的
    fontClasses.forEach(c => this.displayEl.classList.remove(c));
    this.displayEl.classList.add(newClass);
    
    // 同时更新歌词行元素
    this.prevEl.className = `lyrics-line prev ${newClass}`;
    this.currentEl.className = `lyrics-line current ${newClass}`;
    this.nextEl.className = `lyrics-line next ${newClass}`;
    this.next2El.className = `lyrics-line next2 ${newClass}`;
  }

  showLyric(index) {
    if (this.lyrics.length === 0) return;
    
    if (this.onLyricChange && index >= 0) {
      const lyric = this.lyrics[index];
      this.onLyricChange({
        index,
        text: lyric?.text,
        style: lyric?.style || 'normal'
      });
    }
    
    this.animateTransition(index);
  }

  setTransitionMode(mode) {
    this.transitionMode = mode;
    
    const modes = ['fade', 'scale', 'blur', 'karaoke'];
    modes.forEach(m => {
      this.prevEl.classList.remove(`enter-${m}`, `exit-${m}`);
      this.currentEl.classList.remove(`enter-${m}`, `exit-${m}`);
      this.nextEl.classList.remove(`enter-${m}`, `exit-${m}`);
      this.next2El.classList.remove(`enter-${m}`, `exit-${m}`);
    });
  }

  animateTransition(newIndex) {
    const mode = this.transitionMode;
    
    this.currentEl.classList.add(`exit-${mode}`);
    this.nextEl.classList.add(`exit-${mode}`);
    this.next2El.classList.add(`exit-${mode}`);
    
    setTimeout(() => {
      this.applyLyrics(newIndex);
      this.setLyricsStyle(this.currentStyle);
      
      this.prevEl.classList.remove(`exit-${mode}`);
      this.currentEl.classList.remove(`exit-${mode}`);
      this.nextEl.classList.remove(`exit-${mode}`);
      this.next2El.classList.remove(`exit-${mode}`);
      
      this.prevEl.classList.add(`enter-${mode}`);
      this.currentEl.classList.add(`enter-${mode}`);
      this.nextEl.classList.add(`enter-${mode}`);
      this.next2El.classList.add(`enter-${mode}`);
      
      this.prevEl.classList.add('show');
      this.currentEl.classList.add('show');
      this.nextEl.classList.add('show');
      this.next2El.classList.add('show');
      
      setTimeout(() => {
        this.prevEl.classList.remove(`enter-${mode}`);
        this.currentEl.classList.remove(`enter-${mode}`);
        this.nextEl.classList.remove(`enter-${mode}`);
        this.next2El.classList.remove(`enter-${mode}`);
      }, this.transitionDuration);
    }, this.transitionDuration * 0.5);
  }

  applyLyrics(index) {
    this.prevEl.textContent = index > 0 ? this.lyrics[index - 1]?.text || '' : '';
    
    const currentText = index >= 0 ? this.lyrics[index]?.text || '' : '';
    this.currentLyric = this.lyrics[index] || null;
    this.renderChars(currentText);
    
    this.nextEl.textContent = this.lyrics[index + 1]?.text || '';
    this.next2El.textContent = this.lyrics[index + 2]?.text || '';
    
    if (this.glowEl) this.glowEl.classList.add('active');
    
    if (this.currentLyric?.isClimax) {
      this.currentEl.classList.add('climax');
      if (this.onClimax) this.onClimax();
    } else {
      this.currentEl.classList.remove('climax');
    }
  }

  renderChars(text) {
    this.currentEl.innerHTML = '';
    this.charElements = [];
    this.highlightedChars = 0;
    
    if (!text) return;
    
    const container = document.createElement('span');
    container.className = 'char-container';
    
    for (let i = 0; i < text.length; i++) {
      const charSpan = document.createElement('span');
      charSpan.className = `char unhighlighted style-${this.currentStyle}`;
      charSpan.textContent = text[i];
      container.appendChild(charSpan);
      this.charElements.push(charSpan);
    }
    
    this.currentEl.appendChild(container);
  }

  updateKaraoke(progress) {
    if (this.charElements.length === 0) return;
    
    const totalChars = this.charElements.length;
    const adjustedProgress = progress > 0.95 ? 1 : Math.pow(progress, 0.6);
    const targetHighlight = Math.floor(adjustedProgress * totalChars);
    
    // 根据跟随模式不同处理
    if (this.followMode === 'none') {
      // 无效果模式：直接全部高亮
      if (progress > 0) {
        this.charElements.forEach(char => {
          char.classList.remove('unhighlighted');
          char.classList.add('highlighted', `style-${this.currentStyle}`);
        });
        this.highlightedChars = totalChars;
      }
    } else {
      // 其他模式：逐字高亮
      while (this.highlightedChars < targetHighlight && this.highlightedChars < totalChars) {
        const charEl = this.charElements[this.highlightedChars];
        if (charEl) {
          charEl.classList.remove('unhighlighted');
          charEl.classList.add('highlighted', `style-${this.currentStyle}`);
          
          // 只有karaoke模式有弹跳动画
          if (this.followMode === 'karaoke') {
            charEl.style.animation = 'none';
            charEl.offsetHeight;
            charEl.style.animation = 'char-pop 0.2s ease forwards';
          }
        }
        this.highlightedChars++;
      }
    }
  }

  update(currentTime) {
    if (this.lyrics.length === 0) {
      this.initDisplay();
      return;
    }

    let newIndex = -1;
    for (let i = this.lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= this.lyrics[i].time) {
        newIndex = i;
        break;
      }
    }

    if (newIndex !== this.currentIndex) {
      this.currentIndex = newIndex;
      this.showLyric(newIndex);
    }

    if (newIndex >= 0 && newIndex < this.lyrics.length) {
      const currentLyric = this.lyrics[newIndex];
      const nextLyric = this.lyrics[newIndex + 1];
      
      if (currentLyric) {
        const startTime = currentLyric.time;
        const endTime = nextLyric ? Math.min(nextLyric.time - 0.05, startTime + currentLyric.duration) : startTime + currentLyric.duration;
        const duration = endTime - startTime;
        
        if (duration > 0) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(1, Math.max(0, elapsed / duration));
          this.updateKaraoke(progress);
        }
      }
    }
  }

  getCurrentLyric() {
    return this.currentLyric;
  }

  setColorTheme(colors) {
    if (this.glowEl && colors && colors.length >= 2) {
      this.glowEl.style.background = `radial-gradient(ellipse at center, 
        ${colors[0]}20 0%,
        ${colors[1]}10 40%,
        transparent 70%
      )`;
    }
  }

  setClimaxPoints(points) {
    if (!points || !Array.isArray(points)) return;
    
    points.forEach(point => {
      const lyric = this.lyrics.find(l => 
        Math.abs(l.time - point.time) < 2
      );
      if (lyric) {
        lyric.isClimax = true;
        lyric.style = 'climax';
      }
    });
  }

  clear() {
    this.lyrics = [];
    this.currentIndex = -1;
    this.currentLyric = null;
    this.initDisplay();
  }
  
  setLyricsStyle(style) {
    this.currentStyle = style;
    this.currentEl.classList.remove('style-gradient', 'style-glow', 'style-particle', 'style-minimal');
    this.currentEl.classList.add(`style-${style}`);
    
    this.charElements.forEach(char => {
      char.classList.remove('style-gradient', 'style-glow', 'style-particle', 'style-minimal');
      if (char.classList.contains('highlighted')) {
        char.classList.add('highlighted', `style-${style}`);
      } else {
        char.classList.add(`style-${style}`);
      }
    });
  }
  
  setTransitionSpeed(speed) {
    this.transitionSpeed = Math.max(1, Math.min(10, speed));
    this.transitionDuration = Math.round(1200 - (this.transitionSpeed - 1) * 117);
    
    const style = document.createElement('style');
    style.id = 'lyrics-speed-style';
    const existing = document.getElementById('lyrics-speed-style');
    if (existing) existing.remove();
    document.head.appendChild(style);
    
    const duration = this.transitionDuration;
    style.sheet.insertRule(`
      .lyrics-line.enter-scale {
        animation-duration: ${duration}ms !important;
      }
    `, 0);
    style.sheet.insertRule(`
      .lyrics-line.enter-fade, .lyrics-line.enter-blur {
        animation-duration: ${duration * 1.2}ms !important;
      }
    `, 1);
    style.sheet.insertRule(`
      .lyrics-line.exit-fade, .lyrics-line.exit-scale, .lyrics-line.exit-blur {
        transition-duration: ${duration * 0.8}ms !important;
      }
    `, 2);
  }
}

export default LyricsManager;
