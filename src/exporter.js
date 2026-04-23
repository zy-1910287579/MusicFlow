// 视频导出模块

class VideoExporter {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.mediaRecorder = null;
    this.chunks = [];
    this.isRecording = false;
    this.onStatusUpdate = null;
  }

  setStatusCallback(callback) {
    this.onStatusUpdate = callback;
  }

  updateStatus(message) {
    if (this.onStatusUpdate) {
      this.onStatusUpdate(message);
    }
  }

  async startRecording(audioElement) {
    if (this.isRecording) {
      throw new Error('正在录制中');
    }

    const canvas = this.sceneManager.getCanvas();
    
    // 获取音频和视频流
    const audioStream = audioElement.captureStream();
    const canvasStream = canvas.captureStream(30);

    // 合并流
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioStream.getAudioTracks()
    ]);

    // 创建 MediaRecorder
    const options = {
      mimeType: 'video/webm;codecs=vp9,opus'
    };

    // 尝试不同格式
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'video/webm;codecs=vp8,opus';
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'video/webm';
    }

    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(combinedStream, options);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.createDownloadLink();
    };

    this.mediaRecorder.onerror = (e) => {
      this.updateStatus('录制出错: ' + e.error?.message);
    };

    this.isRecording = true;
    this.updateStatus('开始录制...');
    this.mediaRecorder.start(100);
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.isRecording = false;
      this.updateStatus('正在处理视频...');
      this.mediaRecorder.stop();
    }
  }

  createDownloadLink() {
    const blob = new Blob(this.chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `musicflow_${Date.now()}.webm`;
    a.click();

    URL.revokeObjectURL(url);
    this.updateStatus('视频已导出！');
  }

  isCurrentlyRecording() {
    return this.isRecording;
  }
}

export default VideoExporter;
