/**
 * Web Audio API Manager for Dynamic Audio Ducking & WebRTC / Video Mixing
 *
 * Architecture:
 * - Separate Audio Paths:
 *    [Microphone/Peer Audio] -> [Voice Gain Node (Priority High: 1.0 - 1.25)] -> [Destination]
 *    [Video Element / Screen Tab] -> [Movie Gain Node (Ducks to 20% on speech)] -> [Destination]
 * - Dynamic Ducking:
 *    Uses AnalyserNode to detect speech in real time with hysteresis / hangover time.
 *    Smoothly ramps movie audio between 100% (or user set volume) and 20% (or pauses).
 */

export type DuckingMode = 'duck-volume' | 'talk-to-pause';

export interface AudioDuckingOptions {
  duckVolumeLevel?: number; // default 0.20 (20%)
  speechThreshold?: number; // 0-255 frequency average, default 15
  releaseDelayMs?: number; // default 900ms hang time
  duckingMode?: DuckingMode; // 'duck-volume' or 'talk-to-pause'
  onSpeakingChange?: (isSpeaking: boolean, level: number) => void;
  onDuckingChange?: (isDucking: boolean, currentGain: number) => void;
  onAutoPauseChange?: (shouldPause: boolean) => void;
}

// Keep a WeakMap of HTMLMediaElement to prevent "HTMLMediaElement already connected" errors
const mediaElementSourceMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

export class AudioDuckingManager {
  private audioCtx: AudioContext | null = null;
  private voiceGainNode: GainNode | null = null;
  private movieGainNode: GainNode | null = null;
  private micAnalyserNode: AnalyserNode | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private screenAudioSourceNode: MediaStreamAudioSourceNode | null = null;
  private videoSourceNode: MediaElementAudioSourceNode | null = null;

  private micStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;

  private isSpeaking = false;
  private isRemoteSpeaking = false;
  private isDucking = false;
  private isLocalMicMuted = false;
  private isVoiceDeafened = false;

  private baseVolume = 0.8;
  private duckVolumeLevel = 0.20; // Lower to 20%
  private speechThreshold = 10; // Responsive speech threshold
  private releaseDelayMs = 900;
  private duckingMode: DuckingMode = 'duck-volume';

  private releaseTimer: NodeJS.Timeout | null = null;
  private animationFrameId: number | null = null;

  private onSpeakingChange?: (isSpeaking: boolean, level: number) => void;
  private onDuckingChange?: (isDucking: boolean, currentGain: number) => void;
  private onAutoPauseChange?: (shouldPause: boolean) => void;

  constructor(options?: AudioDuckingOptions) {
    if (options) {
      if (options.duckVolumeLevel !== undefined) this.duckVolumeLevel = options.duckVolumeLevel;
      if (options.speechThreshold !== undefined) this.speechThreshold = options.speechThreshold;
      if (options.releaseDelayMs !== undefined) this.releaseDelayMs = options.releaseDelayMs;
      if (options.duckingMode !== undefined) this.duckingMode = options.duckingMode;
      this.onSpeakingChange = options.onSpeakingChange;
      this.onDuckingChange = options.onDuckingChange;
      this.onAutoPauseChange = options.onAutoPauseChange;
    }
  }

  /**
   * Initialize or resume the Web Audio Context and master nodes
   */
  public initContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();

      // Priority Voice Master Gain Node -> Destination
      this.voiceGainNode = this.audioCtx.createGain();
      this.voiceGainNode.gain.setValueAtTime(1.15, this.audioCtx.currentTime); // Slight voice clarity boost
      this.voiceGainNode.connect(this.audioCtx.destination);

      // Movie / Screen Share Master Gain Node -> Destination
      this.movieGainNode = this.audioCtx.createGain();
      this.movieGainNode.gain.setValueAtTime(this.baseVolume, this.audioCtx.currentTime);
      this.movieGainNode.connect(this.audioCtx.destination);

      // Analyser Node for Microphone VAD
      this.micAnalyserNode = this.audioCtx.createAnalyser();
      this.micAnalyserNode.fftSize = 256;
      this.micAnalyserNode.smoothingTimeConstant = 0.3;
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch((err) => console.warn('AudioContext resume error:', err));
    }

    return this.audioCtx;
  }

  /**
   * Route HTML5 Video element audio through the movie gain node
   */
  public attachVideo(video: HTMLVideoElement) {
    this.videoElement = video;
    const ctx = this.initContext();

    try {
      let sourceNode = mediaElementSourceMap.get(video);
      if (!sourceNode) {
        sourceNode = ctx.createMediaElementSource(video);
        mediaElementSourceMap.set(video, sourceNode);
      }

      this.videoSourceNode = sourceNode;
      if (this.movieGainNode) {
        // Disconnect previous connections safely to avoid duplicate routes
        try {
          sourceNode.disconnect();
        } catch {
          // safe to ignore
        }
        sourceNode.connect(this.movieGainNode);
      }
    } catch (err) {
      console.warn('Could not attach video element to Web Audio API:', err);
    }
  }

  /**
   * Route Microphone audio through AnalyserNode & Voice Gain Node
   */
  public attachMicStream(stream: MediaStream) {
    this.micStream = stream;
    const ctx = this.initContext();

    if (stream.getAudioTracks().length === 0) return;

    try {
      if (this.micSourceNode) {
        try {
          this.micSourceNode.disconnect();
        } catch {}
      }

      this.micSourceNode = ctx.createMediaStreamSource(stream);

      // Connect to AnalyserNode for real-time speech detection
      if (this.micAnalyserNode) {
        this.micSourceNode.connect(this.micAnalyserNode);
      }

      // Route mic audio to voice gain node (with feedback suppression if needed)
      // Note: for local mic, we don't loop it back to own speakers to avoid echo,
      // but remote peer streams connect to voiceGainNode directly.
      this.startVADLoop();
    } catch (err) {
      console.warn('Error attaching mic stream to Web Audio API:', err);
    }
  }

  /**
   * Route remote WebRTC peer audio stream through the high-priority voiceGainNode
   */
  public attachRemotePeerAudio(stream: MediaStream): MediaStreamAudioSourceNode | null {
    const ctx = this.initContext();
    if (stream.getAudioTracks().length === 0) return null;

    try {
      const peerSource = ctx.createMediaStreamSource(stream);
      if (this.voiceGainNode) {
        peerSource.connect(this.voiceGainNode);
      }
      return peerSource;
    } catch (err) {
      console.warn('Error routing peer audio:', err);
      return null;
    }
  }

  /**
   * Route Tab / Screen Share audio into the movie gain node so it ducks along with movie
   */
  public attachScreenStream(stream: MediaStream) {
    this.screenStream = stream;
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    const ctx = this.initContext();

    try {
      if (this.screenAudioSourceNode) {
        try {
          this.screenAudioSourceNode.disconnect();
        } catch {}
      }

      this.screenAudioSourceNode = ctx.createMediaStreamSource(stream);
      if (this.movieGainNode) {
        this.screenAudioSourceNode.connect(this.movieGainNode);
      }
    } catch (err) {
      console.warn('Error attaching screen stream audio:', err);
    }
  }

  /**
   * Detach screen audio
   */
  public detachScreenStream() {
    if (this.screenAudioSourceNode) {
      try {
        this.screenAudioSourceNode.disconnect();
      } catch {}
      this.screenAudioSourceNode = null;
    }
    this.screenStream = null;
  }

  /**
   * Update base user movie volume (0.0 to 1.0)
   */
  public setBaseVolume(vol: number) {
    this.baseVolume = Math.max(0, Math.min(1, vol));
    if (!this.isDucking && this.movieGainNode && this.audioCtx) {
      this.movieGainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
      this.movieGainNode.gain.linearRampToValueAtTime(
        this.isVoiceDeafened ? 0 : this.baseVolume,
        this.audioCtx.currentTime + 0.05
      );
    }
  }

  /**
   * Set local mic mute state
   */
  public setLocalMicMuted(isMuted: boolean) {
    this.isLocalMicMuted = isMuted;
    if (isMuted && this.isSpeaking) {
      this.handleSpeechStop();
    }
  }

  /**
   * Set voice deafened state (mutes movie + voice audio)
   */
  public setVoiceDeafened(isDeafened: boolean) {
    this.isVoiceDeafened = isDeafened;
    if (this.audioCtx && this.voiceGainNode && this.movieGainNode) {
      const now = this.audioCtx.currentTime;
      this.voiceGainNode.gain.cancelScheduledValues(now);
      this.movieGainNode.gain.cancelScheduledValues(now);

      if (isDeafened) {
        this.voiceGainNode.gain.linearRampToValueAtTime(0, now + 0.05);
        this.movieGainNode.gain.linearRampToValueAtTime(0, now + 0.05);
      } else {
        this.voiceGainNode.gain.linearRampToValueAtTime(1.15, now + 0.05);
        const targetMovieVol = this.isDucking ? this.baseVolume * this.duckVolumeLevel : this.baseVolume;
        this.movieGainNode.gain.linearRampToValueAtTime(targetMovieVol, now + 0.05);
      }
    }
  }

  /**
   * Inform ducking manager if any remote peer is speaking
   */
  public setRemoteSpeaking(isRemoteSpeaking: boolean) {
    this.isRemoteSpeaking = isRemoteSpeaking;
    this.evaluateDucking();
  }

  /**
   * Toggle between Ducking Mode ('duck-volume' vs 'talk-to-pause')
   */
  public setDuckingMode(mode: DuckingMode) {
    this.duckingMode = mode;
  }

  public getDuckingMode(): DuckingMode {
    return this.duckingMode;
  }

  public getIsDucking(): boolean {
    return this.isDucking;
  }

  /**
   * Voice Activity Detection (VAD) Loop using AnalyserNode
   */
  private startVADLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const dataArray = new Uint8Array(this.micAnalyserNode?.frequencyBinCount || 128);

    const checkAudio = () => {
      if (!this.micAnalyserNode || this.isLocalMicMuted) {
        if (this.isSpeaking) {
          this.handleSpeechStop();
        }
        this.animationFrameId = requestAnimationFrame(checkAudio);
        return;
      }

      this.micAnalyserNode.getByteFrequencyData(dataArray);

      // Compute average speech energy
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;

      const isVoiceActive = avg >= this.speechThreshold;

      if (isVoiceActive) {
        this.handleSpeechStart(avg);
      } else if (this.isSpeaking) {
        // Debounce release
        if (!this.releaseTimer) {
          this.releaseTimer = setTimeout(() => {
            this.handleSpeechStop();
            this.releaseTimer = null;
          }, this.releaseDelayMs);
        }
      }

      this.onSpeakingChange?.(this.isSpeaking, avg);
      this.animationFrameId = requestAnimationFrame(checkAudio);
    };

    this.animationFrameId = requestAnimationFrame(checkAudio);
  }

  private handleSpeechStart(level: number) {
    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }

    if (!this.isSpeaking) {
      this.isSpeaking = true;
      this.evaluateDucking();
    }
  }

  private handleSpeechStop() {
    if (this.isSpeaking) {
      this.isSpeaking = false;
      this.evaluateDucking();
    }
  }

  /**
   * Resume audio context if suspended
   */
  public resumeContext(): Promise<void> {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      return this.audioCtx.resume().catch(() => {});
    }
    return Promise.resolve();
  }

  /**
   * Trigger a temporary speech test (useful for users to verify ducking works)
   */
  public triggerTestSpeech(durationMs = 2500) {
    this.resumeContext();
    this.handleSpeechStart(85);
    this.onSpeakingChange?.(true, 85);

    setTimeout(() => {
      this.handleSpeechStop();
      this.onSpeakingChange?.(false, 0);
    }, durationMs);
  }

  /**
   * Evaluate whether movie should be ducked or paused based on local/remote speech
   */
  private evaluateDucking() {
    const shouldDuck = (this.isSpeaking && !this.isLocalMicMuted) || this.isRemoteSpeaking;

    if (shouldDuck === this.isDucking) return;
    this.isDucking = shouldDuck;

    const targetVol = shouldDuck
      ? (this.isVoiceDeafened ? 0 : this.baseVolume * this.duckVolumeLevel)
      : (this.isVoiceDeafened ? 0 : this.baseVolume);

    // Notify UI immediately (sets isDuckingActive badge and triggers animation)
    this.onDuckingChange?.(shouldDuck, targetVol);

    // Directly modulate video element volume smoothly
    // Guarantees reliable ducking even if CORS restricts media element source
    if (this.videoElement) {
      if (shouldDuck && this.duckingMode === 'talk-to-pause') {
        this.onAutoPauseChange?.(true);
      } else if (!shouldDuck && this.duckingMode === 'talk-to-pause') {
        this.onAutoPauseChange?.(false);
      } else {
        try {
          this.videoElement.volume = Math.max(0, Math.min(1, targetVol));
        } catch {}
      }
    }

    if (!this.audioCtx || !this.movieGainNode) return;
    const now = this.audioCtx.currentTime;
    this.movieGainNode.gain.cancelScheduledValues(now);

    if (shouldDuck) {
      if (this.duckingMode === 'talk-to-pause') {
        this.onAutoPauseChange?.(true);
      } else {
        // Discord style dynamic ducking: lower movie volume to 20%
        this.movieGainNode.gain.linearRampToValueAtTime(targetVol, now + 0.12);
      }
    } else {
      if (this.duckingMode === 'talk-to-pause') {
        this.onAutoPauseChange?.(false);
      } else {
        // Smoothly restore volume back to 100% / user base volume
        this.movieGainNode.gain.linearRampToValueAtTime(targetVol, now + 0.35);
      }
    }
  }

  /**
   * Cleanup all nodes and event loops on unmount
   */
  public destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }

    try {
      this.micSourceNode?.disconnect();
      this.screenAudioSourceNode?.disconnect();
      this.voiceGainNode?.disconnect();
      this.movieGainNode?.disconnect();
      this.micAnalyserNode?.disconnect();
    } catch {}

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }

    this.audioCtx = null;
    this.videoElement = null;
    this.micStream = null;
    this.screenStream = null;
  }
}
