// Three.js 场景管理 - 多风格华丽背景
import * as THREE from 'three';

class SceneManager {
  constructor() {
    this.canvas = document.getElementById('three-canvas');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    
    // 当前背景风格
    this.currentBackgroundStyle = 'aurora';
    this.backgroundElements = {};
    
    // 光斑
    this.lightBlobs = [];
    this.lightBlobCount = 20;
    this.aurora = null;
    
    // 雨滴
    this.rainDrops = [];
    this.rainCount = 5000;
    
    // 星星
    this.stars = null;
    this.starCount = 1000;
    
    // 雪花
    this.snow = null;
    this.snowCount = 1000;
    
    // 漂浮粒子
    this.particles = 1000;
    
    this.currentStyle = 'normal';
    this.intensity = 1;
    this.targetIntensity = 1;
    
    this.params = {
      colors: [
        new THREE.Color(0x667eea),
        new THREE.Color(0x764ba2),
        new THREE.Color(0xf093fb)
      ],
      climaxColors: [
        new THREE.Color(0xffd700),
        new THREE.Color(0xff6b6b)
      ],
      speed: 1,
      intensity: 1,
      streamerSpeed: 0.4
    };
    
    this.audioLevel = 0;
    this.time = 0;
    this.isClimax = false;
    this.climaxTimer = 0;
    
    this.init();
  }

  init() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.camera.position.z = 50;
    this.camera.position.y = 0;

    // 创建所有背景元素
    this.createBackground();
    this.createAurora();
    this.createLightBlobs();
    this.createFloatingParticles();
    this.createRain();
    this.createStars();
    this.createSnow();
    
    // 默认显示极光
    this.setBackgroundStyle('aurora');

    window.addEventListener('resize', () => this.onResize());
    this.animate();
  }

  // 创建渐变背景
  createBackground() {
    const geometry = new THREE.PlaneGeometry(500, 300);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(0x0a0a1a) },
        uColor2: { value: new THREE.Color(0x1a1a3a) },
        uColor3: { value: new THREE.Color(0x0f0f2f) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        varying vec2 vUv;
        
        void main() {
          vec2 uv = vUv;
          uv.x += sin(uTime * 0.1) * 0.1;
          uv.y += cos(uTime * 0.08) * 0.05;
          
          float t = uv.y;
          vec3 color = mix(uColor1, uColor2, smoothstep(0.0, 0.5, t));
          color = mix(color, uColor3, smoothstep(0.5, 1.0, t));
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: false
    });

    this.backgroundMesh = new THREE.Mesh(geometry, material);
    this.backgroundMesh.position.z = -50;
    this.scene.add(this.backgroundMesh);
  }

  // 切换背景网格显示
  toggleBackgroundMesh(visible) {
    if (this.backgroundMesh) {
      this.backgroundMesh.visible = visible;
    }
  }

  // 创建极光效果
  createAurora() {
    const geometry = new THREE.PlaneGeometry(600, 40, 32, 128);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: this.params.colors[0] },
        uColor2: { value: this.params.colors[1] },
        uColor3: { value: this.params.colors[2] },
        uIntensity: { value: 1.0 }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;
        varying float vY;
        
        void main() {
          vUv = uv;
          vec3 pos = position;
          
          float wave = sin(pos.x * 0.1 + uTime * 0.5) * 3.0;
          wave += sin(pos.x * 0.05 + uTime * 0.3) * 5.0;
          pos.y += wave * uIntensity;
          
          vY = abs(uv.y - 0.5) * 2.0;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;
        varying float vY;
        
        void main() {
          float t = vUv.x;
          vec3 color = mix(uColor1, uColor2, sin(t * 3.14159 + uTime * 0.3) * 0.5 + 0.5);
          color = mix(color, uColor3, sin(t * 2.0 + uTime * 0.5) * 0.3 + 0.3);
          
          float alpha = (1.0 - pow(vY, 2.0)) * 0.5 * uIntensity;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.aurora = new THREE.Mesh(geometry, material);
    this.aurora.position.y = 0;
    this.aurora.position.z = -20;
    this.aurora.visible = true;
    this.scene.add(this.aurora);
  }

  // 创建光斑效果
  createLightBlobs() {
    this.lightBlobs.forEach(b => {
      this.scene.remove(b);
      b.geometry.dispose();
      b.material.dispose();
    });
    this.lightBlobs = [];

    for (let i = 0; i < this.lightBlobCount; i++) {
      const size = 8 + Math.random() * 15;
      const geometry = new THREE.CircleGeometry(size, 32);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: Math.random() * 100 },
          uColor: { value: this.params.colors[i % 3] },
          uAlpha: { value: 0.15 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uTime;
          uniform float uAlpha;
          varying vec2 vUv;
          void main() {
            float dist = distance(vUv, vec2(0.5));
            float alpha = uAlpha * (1.0 - smoothstep(0.0, 0.5, dist));
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const blob = new THREE.Mesh(geometry, material);
      blob.position.set(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 30,
        -15 - Math.random() * 20
      );
      blob.userData = {
        basePos: blob.position.clone(),
        speedOffset: Math.random() * Math.PI * 2,
        moveRange: 5 + Math.random() * 10
      };

      this.lightBlobs.push(blob);
      this.scene.add(blob);
    }
  }


  // 创建漂浮粒子
  createFloatingParticles() {
    const geometry = new THREE.BufferGeometry();
    const count = 500;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const randoms = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 2] = -10 - Math.random() * 40;
      sizes[i] = Math.random() * 4 + 1.5;
      randoms[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('random', new THREE.BufferAttribute(randoms, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: this.params.colors[0] },
        uIntensity: { value: 1.0 }
      },
      vertexShader: `
        attribute float size;
        attribute float random;
        uniform float uTime;
        uniform float uIntensity;
        varying float vAlpha;
        
        void main() {
          vec3 pos = position;
          pos.y += sin(uTime * 0.3 + random * 10.0) * 2.0;
          pos.x += cos(uTime * 0.2 + random * 8.0) * 1.5;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z) * uIntensity;
          gl_Position = projectionMatrix * mvPosition;
          
          vAlpha = 0.3 + sin(uTime + random * 6.28) * 0.2;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime;
        varying float vAlpha;
        
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * vAlpha;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  // 创建雨滴效果
  createRain() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.rainCount * 3);
    const randoms = new Float32Array(this.rainCount);

    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 500;
      positions[i * 3 + 1] = Math.random() * 300 - 150;
      positions[i * 3 + 2] = -10 - Math.random() * 30;
      randoms[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('random', new THREE.BufferAttribute(randoms, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: this.params.colors[0] },
        uIntensity: { value: 0.5 }
      },
      vertexShader: `
        attribute float random;
        uniform float uTime;
        uniform float uIntensity;
        varying float vAlpha;
        
        void main() {
          vec3 pos = position;
          pos.y -= mod(uTime * 30.0 * uIntensity + random * 60.0, 80.0) - 30.0;
          pos.x += sin(pos.y * 0.1 + random * 6.28) * 2.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = (2.0 + random * 2.0) * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          
          vAlpha = 0.3 + random * 0.4;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime;
        varying float vAlpha;
        
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * vAlpha;
          gl_FragColor = vec4(uColor, alpha * 0.6);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.rain = new THREE.Points(geometry, material);
    this.rain.visible = false;
    this.scene.add(this.rain);
  }

  // 创建星星效果
  createStars() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.starCount * 3);
    const sizes = new Float32Array(this.starCount);
    const randoms = new Float32Array(this.starCount);

    for (let i = 0; i < this.starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 500;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 300;
      positions[i * 3 + 2] = -30 - Math.random() * 40;
      sizes[i] = Math.random() * 3 + 1;
      randoms[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('random', new THREE.BufferAttribute(randoms, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xffffff) }
      },
      vertexShader: `
        attribute float size;
        attribute float random;
        uniform float uTime;
        varying float vAlpha;
        
        void main() {
          vec3 pos = position;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          
          // 固定柔和透明度
          vAlpha = 0.3 + random * 0.3;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * vAlpha;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.stars = new THREE.Points(geometry, material);
    this.stars.visible = false;
    this.scene.add(this.stars);
  }

  // 创建飘雪效果
  createSnow() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.snowCount * 3);
    const randoms = new Float32Array(this.snowCount);
    const sizes = new Float32Array(this.snowCount);

    for (let i = 0; i < this.snowCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 500;
      positions[i * 3 + 1] = Math.random() * 300 - 150;
      positions[i * 3 + 2] = -10 - Math.random() * 30;
      randoms[i] = Math.random();
      sizes[i] = 6 + Math.random() * 8;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('random', new THREE.BufferAttribute(randoms, 1));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xffffff) }
      },
      vertexShader: `
        attribute float random;
        attribute float size;
        uniform float uTime;
        varying float vAlpha;
        
        void main() {
          vec3 pos = position;
          // 缓慢下落，带轻微左右摆动
          float fallSpeed = 8.0 + random * 8.0;
          pos.y -= mod(uTime * fallSpeed + random * 300.0, 400.0) - 200.0;
          pos.x += sin(uTime * 0.5 + random * 6.28) * 2.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          
          vAlpha = 0.5 + random * 0.3;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * vAlpha;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.snow = new THREE.Points(geometry, material);
    this.snow.visible = false;
    this.scene.add(this.snow);
  }

  // 设置背景风格
  setBackgroundStyle(style) {
    this.currentBackgroundStyle = style;
    
    // 隐藏所有背景元素
    if (this.aurora) this.aurora.visible = false;
    if (this.rain) this.rain.visible = false;
    if (this.stars) this.stars.visible = false;
    if (this.snow) this.snow.visible = false;
    this.lightBlobs.forEach(b => b.visible = false);

    // 根据风格显示元素
    switch (style) {
      case 'aurora':
        // 极光风格：显示极光 + 光斑
        if (this.aurora) this.aurora.visible = true;
        this.lightBlobs.forEach(b => b.visible = true);
        break;
        
      case 'rain':
        // 雨滴风格
        if (this.rain) this.rain.visible = true;
        if (this.stars) this.stars.visible = true;
        this.lightBlobs.forEach(b => b.visible = true);
        break;
        
      case 'stars':
        // 星空风格
        if (this.stars) this.stars.visible = true;
        this.lightBlobs.forEach(b => b.visible = true);
        break;
        
      case 'snow':
        // 飘雪风格
        if (this.snow) this.snow.visible = true;
        this.lightBlobs.forEach(b => b.visible = true);
        break;
        
      case 'minimal':
        // 简约风格：只保留微弱光斑
        this.lightBlobs.forEach(b => b.visible = true);
        break;
    }
  }

  // 根据分析结果更新
  updateFromAnalysis(analysis) {
    if (analysis.suggestedColors && analysis.suggestedColors.length >= 2) {
      for (let i = 0; i < Math.min(analysis.suggestedColors.length, this.params.colors.length); i++) {
        this.params.colors[i].set(analysis.suggestedColors[i]);
      }
      this.updateColors();
    }
    
    if (analysis.climaxColors && analysis.climaxColors.length >= 2) {
      for (let i = 0; i < Math.min(analysis.climaxColors.length, this.params.climaxColors.length); i++) {
        this.params.climaxColors[i].set(analysis.climaxColors[i]);
      }
    }
    
    if (analysis.auroraSpeed) {
      this.params.speed = analysis.auroraSpeed;
    }
    if (analysis.lightIntensity) {
      this.params.intensity = analysis.lightIntensity;
    }
    if (analysis.particleIntensity) {
      this.intensity = analysis.particleIntensity;
    }
    if (analysis.backgroundStyle) {
      this.setBackgroundStyle(analysis.backgroundStyle);
    }
    
    this.updateAurora();
  }

  updateColors() {
    if (this.aurora) {
      this.aurora.material.uniforms.uColor1.value = this.params.colors[0];
      this.aurora.material.uniforms.uColor2.value = this.params.colors[1];
      this.aurora.material.uniforms.uColor3.value = this.params.colors[2] || this.params.colors[0];
    }
    
    if (this.rain) {
      this.rain.material.uniforms.uColor.value = this.params.colors[0];
    }
    
    if (this.particles) {
      this.particles.material.uniforms.uColor.value = this.params.colors[0];
    }
    
    this.lightBlobs.forEach((b, i) => {
      b.material.uniforms.uColor.value = this.params.colors[i % 3];
    });
  }

  updateAurora() {
    if (this.aurora) {
      this.aurora.material.uniforms.uIntensity.value = this.intensity;
    }
  }

  // 更新音频数据
  updateAudioData(audioData) {
    const target = (audioData / 255) * this.intensity * 1.5;
    this.audioLevel += (target - this.audioLevel) * 0.15;
  }

  // 触发高潮特效
  triggerClimax(duration = 3) {
    this.isClimax = true;
    this.climaxTimer = duration;
    
    if (this.aurora) {
      this.aurora.material.uniforms.uColor1.value = this.params.climaxColors[0];
      this.aurora.material.uniforms.uColor2.value = this.params.climaxColors[1];
      this.aurora.material.uniforms.uIntensity.value = this.params.climaxIntensity || 1.5;
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    this.time += 0.016;
    
    // 平滑强度过渡
    this.intensity += (this.targetIntensity - this.intensity) * 0.05;
    
    // 高潮结束检查
    if (this.isClimax) {
      this.climaxTimer -= 0.016;
      if (this.climaxTimer <= 0) {
        this.isClimax = false;
        this.updateColors();
        this.updateAurora();
      }
    }

    // 更新背景
    if (this.backgroundMesh) {
      this.backgroundMesh.material.uniforms.uTime.value = this.time;
    }

    // 更新极光
    if (this.aurora && this.aurora.visible) {
      this.aurora.material.uniforms.uTime.value = this.time * this.params.speed;
      this.aurora.material.uniforms.uIntensity.value = this.intensity;
    }

    // 更新光斑
    this.lightBlobs.forEach((b, i) => {
      if (!b.visible) return;
      b.material.uniforms.uTime.value = this.time;
      const data = b.userData;
      b.position.x = data.basePos.x + Math.sin(this.time * 0.2 + data.speedOffset) * data.moveRange;
      b.position.y = data.basePos.y + Math.cos(this.time * 0.15 + data.speedOffset) * data.moveRange * 0.5;
      
      const scale = 1 + this.audioLevel * 0.5;
      b.scale.set(scale, scale, 1);
    });

    // 更新雨滴
    if (this.rain && this.rain.visible) {
      this.rain.material.uniforms.uTime.value = this.time;
      this.rain.material.uniforms.uIntensity.value = 0.5 + this.audioLevel * 0.5;
    }

    // 更新星星
    if (this.stars && this.stars.visible) {
      this.stars.material.uniforms.uTime.value = this.time;
      this.stars.rotation.y += 0.0001 * this.params.speed;
    }

    // 更新飘雪
    if (this.snow && this.snow.visible) {
      this.snow.material.uniforms.uTime.value = this.time;
    }

    // 更新漂浮粒子
    if (this.particles) {
      this.particles.material.uniforms.uTime.value = this.time;
      this.particles.material.uniforms.uIntensity.value = this.intensity * (1 + this.audioLevel * 0.5);
      this.particles.rotation.y += 0.0002 * this.params.speed;
    }

    // 相机轻微运动
    this.camera.position.x = Math.sin(this.time * 0.2) * 1.5;
    this.camera.position.y = Math.cos(this.time * 0.15) * 0.8;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  getCanvas() {
    return this.canvas;
  }
}

export default SceneManager;
