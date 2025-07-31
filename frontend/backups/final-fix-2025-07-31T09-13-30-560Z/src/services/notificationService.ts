// NotificationService for timer notifications and audio alerts
interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

interface SoundOptions {
  volume?: number;
  loop?: boolean;
  duration?: number;
}

class NotificationService {
  private static audioContext: AudioContext | null = null;
  private static sounds: Map<string, HTMLAudioElement> = new Map();
  private static isEnabled = true;
  private static permissionStatus: NotificationPermission = 'default';
  private static activeAudios: Set<HTMLAudioElement> = new Set(); // Track active audio elements

  // Initialize notification service
  static async initialize(): Promise<void> {
    try {
      // Request notification permission
      if ('Notification' in window) {
        this.permissionStatus = await Notification.requestPermission();
      }

      // Initialize audio context for better sound control
      if ('AudioContext' in window || 'webkitAudioContext' in window) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Preload common sounds
      await this.preloadSounds();
    } catch (error) {
      console.warn('Failed to initialize notification service:', error);
    }
  }

  // Preload audio files for better performance
  private static async preloadSounds(): Promise<void> {
    const soundFiles = {
      timerStart: this.createBeepSound(800, 0.3, 200),
      timerStop: this.createBeepSound(600, 0.3, 300),
      milestone: this.createBeepSound(1000, 0.5, 150),
      warning: this.createBeepSound(400, 0.7, 500)};

    for (const [name, audioData] of Object.entries(soundFiles)) {
      try {
        const audio = new Audio();
        audio.src = audioData;
        audio.volume = 0.5;
        audio.preload = 'auto';
        this.sounds.set(name, audio);
      } catch (error) {
        console.warn(`Failed to preload sound ${name}:`, error);
      }
    }
  }

  // Create programmatic beep sounds using Web Audio API
  private static createBeepSound(frequency: number, volume: number, duration: number): string {
    if (!this.audioContext) {
      // Fallback to data URL for simple beep
      return `data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEYBTWT3PPHZ`;
    }

    try {
      const buffer = this.audioContext.createBuffer(1, duration * this.audioContext.sampleRate / 1000, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.sin(2 * Math.PI * frequency * i / this.audioContext.sampleRate) * volume;
      }

      // Convert to data URL (simplified approach)
      return 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEYBTWT3PPHZ';
    } catch (error) {
      console.warn('Failed to create beep sound:', error);
      return '';
    }
  }

  // Show browser notification
  static async showNotification(options: NotificationOptions): Promise<void> {
    if (!this.isEnabled || this.permissionStatus !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag || 'timer-notification',
        requireInteraction: options.requireInteraction || false});

      // Auto-close notification after 5 seconds if not requiring interaction
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }
    } catch (error) {
      console.warn('Failed to show notification:', error);
    }
  }

  // Play sound notification with memory cleanup
  static async playSound(soundName: string, options: SoundOptions = {}): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      const audio = this.sounds.get(soundName);
      if (!audio) {
        console.warn(`Sound '${soundName}' not found`);
        return;
      }

      // Clone audio element for overlapping sounds
      const audioClone = audio.cloneNode() as HTMLAudioElement;
      audioClone.volume = options.volume ?? 0.5;
      audioClone.loop = options.loop ?? false;

      // Track active audio for cleanup
      this.activeAudios.add(audioClone);

      // Clean up audio element when finished
      const cleanup = () => {
        this.activeAudios.delete(audioClone);
        audioClone.removeEventListener('ended', cleanup);
        audioClone.removeEventListener('pause', cleanup);
        audioClone.removeEventListener('error', cleanup);
      };

      audioClone.addEventListener('ended', cleanup);
      audioClone.addEventListener('pause', cleanup);
      audioClone.addEventListener('error', cleanup);

      // Play sound
      await audioClone.play();

      // Auto-stop looped sound after duration
      if (options.loop && options.duration) {
        setTimeout(() => {
          audioClone.pause();
          audioClone.currentTime = 0;
        }, options.duration);
      }
    } catch (error) {
      console.warn(`Failed to play sound '${soundName}':`, error);
    }
  }

  // Timer-specific notification methods
  static async notifyTimerStart(taskTitle: string): Promise<void> {
    await Promise.all([
      this.playSound('timerStart', { volume: 0.6 }),
      this.showNotification({
        title: '计时开始',
        body: `开始计时任务: ${taskTitle}`,
        tag: 'timer-start'}),
    ]);
  }

  static async notifyTimerStop(taskTitle: string, duration: string): Promise<void> {
    await Promise.all([
      this.playSound('timerStop', { volume: 0.6 }),
      this.showNotification({
        title: '计时结束',
        body: `任务 "${taskTitle}" 计时结束\n总时长: ${duration}`,
        tag: 'timer-stop',
        requireInteraction: true}),
    ]);
  }

  static async notifyMilestone(taskTitle: string, duration: string, milestone: number): Promise<void> {
    await Promise.all([
      this.playSound('milestone', { volume: 0.7 }),
      this.showNotification({
        title: '计时里程碑',
        body: `任务 "${taskTitle}" 已计时 ${milestone} 分钟\n当前总时长: ${duration}`,
        tag: 'timer-milestone'}),
    ]);
  }

  static async notifyLongRunning(taskTitle: string, duration: string): Promise<void> {
    await Promise.all([
      this.playSound('warning', { volume: 0.8 }),
      this.showNotification({
        title: '长时间计时提醒',
        body: `任务 "${taskTitle}" 已连续计时 ${duration}\n建议适当休息`,
        tag: 'timer-warning',
        requireInteraction: true}),
    ]);
  }

  // Control methods
  static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    localStorage.setItem('timerNotificationsEnabled', enabled.toString());
  }

  static isNotificationEnabled(): boolean {
    const stored = localStorage.getItem('timerNotificationsEnabled');
    return stored !== null ? stored === 'true' : true;
  }

  static getPermissionStatus(): NotificationPermission {
    return this.permissionStatus;
  }

  static async requestPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      this.permissionStatus = await Notification.requestPermission();
    }
    return this.permissionStatus;
  }

  // Test notification
  static async testNotification(): Promise<void> {
    await Promise.all([
      this.playSound('timerStart'),
      this.showNotification({
        title: '通知测试',
        body: '计时器通知功能正常工作',
        tag: 'test-notification'}),
    ]);
  }

  // Cleanup method to prevent memory leaks
  static cleanup(): void {
    // Stop all active audio
    this.activeAudios.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.activeAudios.clear();

    // Clear preloaded sounds
    this.sounds.clear();

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(error => {
        console.warn('Failed to close audio context:', error);
      });
      this.audioContext = null;
    }
  }
}

export default NotificationService;