import SceneManager from './scene.js';
import LyricsManager from './lyrics.js';
import LLMAnalyzer from './analyzer.js';
import VideoExporter from './exporter.js';

// DOM 元素
const audioInput = document.getElementById('audio-input');
const lyricsInput = document.getElementById('lyrics-input');
const audioPlayer = document.getElementById('audio-player');
const playBtn = document.getElementById('play-btn');
const stopBtn = document.getElementById('stop-btn');
const analyzeBtn = document.getElementById('analyze-btn');
const exportBtn = document.getElementById('export-btn');
const progressBar = document.getElementById('progress-bar');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const audioNameEl = document.getElementById('audio-name');
const lyricsNameEl = document.getElementById('lyrics-name');
const analysisResultEl = document.getElementById('analysis-result');
const exportStatusEl = document.getElementById('export-status');
const apiKeyInput = document.getElementById('api-key-input');
const modelSelect = document.getElementById('model-select');
const particleCountInput = document.getElementById('particle-count');
const introOverlay = document.getElementById('intro-overlay');

// 初始化管理器
const sceneManager = new SceneManager();
const lyricsManager = new LyricsManager();
const llmAnalyzer = new LLMAnalyzer();
const videoExporter = new VideoExporter(sceneManager);

// 音频分析器
let audioContext, analyser, dataArray;

// 开场动画标记
let introShown = false;

// 初始化
function init() {
  setupEventListeners();
  loadSavedSettings();
  setupAudioAnalyser();
  setupExporter();
}

// 设置音频分析器
function setupAudioAnalyser() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  dataArray = new Uint8Array(analyser.frequencyBinCount);
  
  const source = audioContext.createMediaElementSource(audioPlayer);
  source.connect(analyser);
  analyser.connect(audioContext.destination);
}

// 加载保存的设置
function loadSavedSettings() {
  const savedKey = localStorage.getItem('llm_api_key');
  if (savedKey) {
    apiKeyInput.value = savedKey;
    llmAnalyzer.setApiKey(savedKey);
    analyzeBtn.disabled = false;
  }
  
  const savedModel = localStorage.getItem('llm_model');
  if (savedModel) {
    modelSelect.value = savedModel;
    llmAnalyzer.setModel(savedModel);
  }
  
  // 加载背景风格
  const savedBgStyle = localStorage.getItem('bg_style');
  if (savedBgStyle) {
    setBackgroundStyle(savedBgStyle);
  }
  
  // 加载颜色预设
  const savedColors = localStorage.getItem('colors');
  if (savedColors) {
    const colors = savedColors.split(',');
    sceneManager.params.colors.forEach((c, i) => {
      if (colors[i]) c.set(colors[i]);
    });
    sceneManager.updateColors();
    setActiveColorPreset(savedColors);
  }
  
  // 加载效果强度
  const savedIntensity = localStorage.getItem('intensity');
  if (savedIntensity) {
    particleCountInput.value = savedIntensity;
    const intensity = parseInt(savedIntensity) / 100;
    sceneManager.intensity = intensity;
    sceneManager.params.intensity = intensity;
  }
  
  // 加载歌词切换速度
  const savedLyricsSpeed = localStorage.getItem('lyrics_speed');
  if (savedLyricsSpeed) {
    document.getElementById('lyrics-speed').value = savedLyricsSpeed;
    lyricsManager.setTransitionSpeed(parseInt(savedLyricsSpeed));
  }
  
  // 加载歌词跟随模式
  const savedLyricsMode = localStorage.getItem('lyrics_mode');
  if (savedLyricsMode) {
    document.querySelectorAll('.effect-btn[data-mode]').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === savedLyricsMode);
    });
    lyricsManager.setFollowMode(savedLyricsMode);
  }
  
  // 加载字体
  const savedFont = localStorage.getItem('lyrics_font');
  if (savedFont) {
    document.querySelectorAll('.effect-btn[data-font]').forEach(b => {
      b.classList.toggle('active', b.dataset.font === savedFont);
    });
    lyricsManager.setFontFamily(savedFont);
  }
}

// 设置事件监听
function setupEventListeners() {
  // 音频文件选择
  audioInput.addEventListener('change', handleAudioSelect);
  
  // 歌词文件选择
  lyricsInput.addEventListener('change', handleLyricsSelect);
  
  // 播放控制
  playBtn.addEventListener('click', togglePlay);
  stopBtn.addEventListener('click', stopAudio);
  
  // 进度条
  progressBar.addEventListener('input', seekAudio);
  audioPlayer.addEventListener('timeupdate', updateProgress);
  audioPlayer.addEventListener('loadedmetadata', updateDuration);
  
  // AI 分析
  analyzeBtn.addEventListener('click', analyzeMusic);
  
  // 设置
  apiKeyInput.addEventListener('change', () => {
    llmAnalyzer.setApiKey(apiKeyInput.value);
    analyzeBtn.disabled = !apiKeyInput.value;
  });
  
  modelSelect.addEventListener('change', () => {
    llmAnalyzer.setModel(modelSelect.value);
  });
  
  particleCountInput.addEventListener('change', () => {
    const intensity = parseInt(particleCountInput.value) / 100;
    sceneManager.intensity = intensity;
    sceneManager.targetIntensity = intensity;
    sceneManager.params.intensity = intensity;
    sceneManager.updateAurora();
    llmAnalyzer.setManualSetting('intensity', intensity);
    localStorage.setItem('intensity', particleCountInput.value);
  });
  
  // 歌词切换速度
  const lyricsSpeedInput = document.getElementById('lyrics-speed');
  lyricsSpeedInput.addEventListener('change', () => {
    lyricsManager.setTransitionSpeed(parseInt(lyricsSpeedInput.value));
    localStorage.setItem('lyrics_speed', lyricsSpeedInput.value);
  });
  
  // 背景风格选择
  document.querySelectorAll('.effect-btn[data-style]').forEach(btn => {
    btn.addEventListener('click', () => {
      const style = btn.dataset.style;
      setBackgroundStyle(style);
      llmAnalyzer.setManualSetting('backgroundStyle', style);
      localStorage.setItem('bg_style', style);
    });
  });
  
  // 颜色预设选择
  document.querySelectorAll('.color-preset').forEach(preset => {
    preset.addEventListener('click', () => {
      const colors = preset.dataset.colors.split(',');
      sceneManager.params.colors.forEach((c, i) => {
        if (colors[i]) c.set(colors[i]);
      });
      sceneManager.updateColors();
      lyricsManager.setColorTheme(colors);
      llmAnalyzer.setManualSetting('colors', colors);
      setActiveColorPreset(preset.dataset.colors);
      localStorage.setItem('colors', preset.dataset.colors);
    });
  });
  
  // 歌词特效选择
  document.querySelectorAll('.effect-btn[data-lyrics]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.effect-btn[data-lyrics]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      lyricsManager.setLyricsStyle(btn.dataset.lyrics);
    });
  });
  
  // 歌词跟随模式选择
  document.querySelectorAll('.effect-btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.effect-btn[data-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      lyricsManager.setFollowMode(btn.dataset.mode);
      localStorage.setItem('lyrics_mode', btn.dataset.mode);
    });
  });
  
  // 字体选择
  document.querySelectorAll('.effect-btn[data-font]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.effect-btn[data-font]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      lyricsManager.setFontFamily(btn.dataset.font);
      localStorage.setItem('lyrics_font', btn.dataset.font);
    });
  });
  
  // 歌词切换动画选择
  document.querySelectorAll('.effect-btn[data-transition]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.effect-btn[data-transition]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      lyricsManager.setTransitionMode(btn.dataset.transition);
    });
  });
  
  // 歌词变化回调
  lyricsManager.setLyricChangeCallback((data) => {
    // 可以在此处理歌词变化时的特效
  });
  
  // 高潮回调
  lyricsManager.setClimaxCallback(() => {
    sceneManager.triggerClimax(3);
  });
}

// 设置背景风格
function setBackgroundStyle(style) {
  document.querySelectorAll('.effect-btn[data-style]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.style === style);
  });
  sceneManager.setBackgroundStyle(style);
}

// 设置颜色预设激活状态
function setActiveColorPreset(colorsStr) {
  document.querySelectorAll('.color-preset').forEach(preset => {
    preset.classList.toggle('active', preset.dataset.colors === colorsStr);
  });
}

// 处理音频文件选择
function handleAudioSelect(e) {
  const file = e.target.files[0];
  if (file) {
    const url = URL.createObjectURL(file);
    audioPlayer.src = url;
    audioNameEl.textContent = file.name;
    
    analyzeBtn.disabled = false;
    playBtn.disabled = false;
    stopBtn.disabled = false;
    
    audioPlayer.addEventListener('canplay', () => {
      exportBtn.disabled = false;
    }, { once: true });
  }
}

// 处理歌词文件选择
async function handleLyricsSelect(e) {
  const file = e.target.files[0];
  if (file) {
    try {
      await lyricsManager.loadFile(file);
      lyricsNameEl.textContent = file.name;
    } catch (error) {
      lyricsNameEl.textContent = '解析失败';
      console.error('歌词解析错误:', error);
    }
  }
}

// 切换播放/暂停
function togglePlay() {
  if (audioPlayer.paused) {
    // 确保音频上下文启动
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    audioPlayer.play();
    playBtn.textContent = '暂停';
    
    // 显示开场动画
    if (!introShown) {
      introOverlay.classList.remove('hidden');
      introShown = true;
      setTimeout(() => {
        introOverlay.classList.add('hidden');
      }, 2000);
    }
  } else {
    audioPlayer.pause();
    playBtn.textContent = '播放';
  }
}

// 停止播放
function stopAudio() {
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
  playBtn.textContent = '播放';
  lyricsManager.initDisplay();
}

// 更新进度
function updateProgress() {
  if (audioPlayer.duration) {
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progressBar.value = progress;
    currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
    
    // 更新歌词
    lyricsManager.update(audioPlayer.currentTime);
    
    // 更新音频可视化
    if (analyser) {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      sceneManager.updateAudioData(average);
    }
  }
}

// 更新时长显示
function updateDuration() {
  durationEl.textContent = formatTime(audioPlayer.duration);
}

// 跳转播放
function seekAudio() {
  const time = (progressBar.value / 100) * audioPlayer.duration;
  audioPlayer.currentTime = time;
}

// 格式化时间
function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// 分析音乐
async function analyzeMusic() {
  if (!audioPlayer.src) {
    analysisResultEl.textContent = '请先选择音频文件';
    return;
  }

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = '分析中...';
  analysisResultEl.textContent = '正在分析音乐，请稍候...';

  try {
    const response = await fetch(audioPlayer.src);
    const blob = await response.blob();
    const file = new File([blob], 'music', { type: blob.type });
    
    const result = await llmAnalyzer.analyzeMusic(file, lyricsManager.lyrics);
    
    // 更新 UI
    const keywords = result.keywords || [];
    const cacheTag = result.fromCache ? '<span class="source-tag">已缓存</span>' : '';
    const sourceTag = result.source === 'llm' ? '<span class="source-tag">AI分析</span>' : '<span class="source-tag">默认</span>';
    const note = result.note ? `<br><em style="color:#888;font-size:0.75rem">${result.note}</em>` : '';
    
    analysisResultEl.innerHTML = `
      <strong>风格:</strong> ${result.style} ${sourceTag} ${cacheTag}<br>
      <strong>氛围:</strong> ${result.description}<br>
      <strong>情绪:</strong> ${result.mood}<br>
      <strong>关键词:</strong> ${keywords.join(', ')}<br>
      <strong>背景:</strong> ${result.backgroundStyle || '-'}${note}
    `;
    
    // 更新场景
    if (result.suggestedColors && result.suggestedColors.length >= 2) {
      for (let i = 0; i < Math.min(result.suggestedColors.length, sceneManager.params.colors.length); i++) {
        sceneManager.params.colors[i].set(result.suggestedColors[i]);
      }
      sceneManager.updateColors();
      lyricsManager.setColorTheme(result.suggestedColors);
      setActiveColorPreset(result.suggestedColors.join(','));
    }
    
    // 更新背景风格
    if (result.backgroundStyle) {
      setBackgroundStyle(result.backgroundStyle);
    }
    
    // 更新详细参数
    if (result.auroraSpeed) {
      sceneManager.params.speed = result.auroraSpeed;
    }
    if (result.lightIntensity) {
      sceneManager.params.intensity = result.lightIntensity;
      sceneManager.intensity = result.lightIntensity;
    }
    if (result.particleIntensity) {
      particleCountInput.value = result.particleIntensity * 100;
      sceneManager.intensity = result.particleIntensity;
      sceneManager.targetIntensity = result.particleIntensity;
    }
    
    // 设置高潮点
    if (result.climaxPoints && result.climaxPoints.length > 0) {
      lyricsManager.setClimaxPoints(result.climaxPoints);
    }
    
    sceneManager.updateAurora();
    
  } catch (error) {
    analysisResultEl.innerHTML = `<span style="color:#ff6b6b">分析失败: ${error.message}</span>`;
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'AI 分析音乐';
  }
}

// 设置视频导出
function setupExporter() {
  videoExporter.setStatusCallback((message) => {
    exportStatusEl.textContent = message;
  });
  
  exportBtn.addEventListener('click', async () => {
    if (videoExporter.isCurrentlyRecording()) {
      videoExporter.stopRecording();
      exportBtn.textContent = '导出视频';
      exportBtn.disabled = false;
    } else {
      try {
        exportBtn.disabled = true;
        exportBtn.textContent = '录制中...';
        await videoExporter.startRecording(audioPlayer);
      } catch (error) {
        exportStatusEl.textContent = '录制失败: ' + error.message;
        exportBtn.textContent = '导出视频';
        exportBtn.disabled = false;
      }
    }
  });
  
  // 监听音频播放结束
  audioPlayer.addEventListener('ended', () => {
    if (videoExporter.isCurrentlyRecording()) {
      videoExporter.stopRecording();
      exportBtn.textContent = '导出视频';
      exportBtn.disabled = false;
    }
  });
}

// 启动
init();
