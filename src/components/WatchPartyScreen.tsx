import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Movie, Room, User, VoiceParticipant, WatchPartyPlaybackState } from '../types';
import { usePeerVoice } from '../hooks/usePeerVoice';
import {
  AudioDuckingManager,
  DuckingMode,
} from '../utils/audioDucking';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Mic,
  MicOff,
  Headphones,
  Radio,
  Share2,
  Sparkles,
  Info,
  PhoneOff,
  Film,
  Zap,
  CheckCircle2,
  Activity,
  Database,
  Wifi,
  ScreenShare,
  ScreenShareOff,
  ExternalLink,
  Tv,
  Copy,
  Check,
  Laptop,
  Cast,
  Sliders,
} from 'lucide-react';

interface WatchPartyScreenProps {
  movie: Movie;
  room: Room;
  currentUser: User;
  watchPartyState: WatchPartyPlaybackState | null;
  voiceParticipants: VoiceParticipant[];
  isVoiceMuted: boolean;
  isVoiceDeafened: boolean;
  activeReactions: Array<{ id: string; emoji: string; userName: string; timestamp: number }>;
  onSyncPlayback: (isPlaying: boolean, currentTime: number, duration?: number) => void;
  onToggleVoiceMute: () => void;
  onToggleVoiceSpeaker: () => void;
  onSendReaction: (emoji: string) => void;
  onLeaveWatchParty: () => void;
  onOpen7Reels: (movieTitle: string) => void;
  onBroadcastScreenShare?: (isSharing: boolean, streamUrl?: string) => void;
  onSendWebRtcSignal?: (targetUserId: string, signal: any) => void;
  webRtcSignalData?: {
    targetUserId?: string;
    signal: any;
    fromUserId: string;
    fromUserName: string;
    timestamp: number;
  } | null;
  onUpdateVoiceSpeakingState?: (isSpeaking: boolean) => void;
}

// Cinematic royalty-free high-definition video trailers
const SAMPLE_VIDEOS = [
  {
    title: 'Cinematic Teaser (4K Tears of Steel)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    poster: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/TearsOfSteel.jpg',
  },
  {
    title: 'Sintel Animated Short (HD)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    poster: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg',
  },
  {
    title: 'Big Buck Bunny (HD Feature)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    poster: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg',
  },
];

export const WatchPartyScreen: React.FC<WatchPartyScreenProps> = ({
  movie,
  room,
  currentUser,
  watchPartyState,
  voiceParticipants,
  isVoiceMuted,
  isVoiceDeafened,
  activeReactions,
  onSyncPlayback,
  onToggleVoiceMute,
  onToggleVoiceSpeaker,
  onSendReaction,
  onLeaveWatchParty,
  onOpen7Reels,
  onBroadcastScreenShare,
  onSendWebRtcSignal,
  webRtcSignalData,
  onUpdateVoiceSpeakingState,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  const isHost = room.hostId === currentUser.id;
  const movieStreamUrl = `https://7reels.cc/search?q=${encodeURIComponent(movie.title)}`;

  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180);
  const [volume, setVolume] = useState(0.8);
  const [isLocalMuted, setIsLocalMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing'>('synced');
  const [lastSyncActionText, setLastSyncActionText] = useState<string>('Party room synchronized');
  const [showVoiceDetails, setShowVoiceDetails] = useState(true);
  const [simulatedAudioLevels, setSimulatedAudioLevels] = useState<number[]>([12, 28, 45, 60, 35, 18]);

  // Web Audio Dynamic Ducking & Priority Audio States
  const audioDuckingRef = useRef<AudioDuckingManager | null>(null);
  const localMicStreamRef = useRef<MediaStream | null>(null);
  const [duckingMode, setDuckingMode] = useState<DuckingMode>('duck-volume');
  const [isDuckingActive, setIsDuckingActive] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [localMicLevel, setLocalMicLevel] = useState(0);
  const [micPermissionState, setMicPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [showDuckingMenu, setShowDuckingMenu] = useState(false);

  // Screen Sharing States
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [showScreenShareModal, setShowScreenShareModal] = useState(false);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);
  const [hasTabAudio, setHasTabAudio] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const receiverPcRef = useRef<RTCPeerConnection | null>(null);

  const screenShareInfo = watchPartyState?.screenShare;
  const isRemoteScreenSharing = Boolean(
    screenShareInfo?.isSharing && screenShareInfo?.presenterId !== currentUser.id
  );
  const isScreenShareActive = isSharingScreen || isRemoteScreenSharing;

  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInternalUpdateRef = useRef(false);

  // Check if any remote peer is speaking
  const isAnyRemoteSpeaking = voiceParticipants.some(
    (p) => p.userId !== currentUser.id && p.isSpeaking && !p.isMuted
  );

  // Stop screen sharing helper
  const handleStopScreenShareLocally = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = SAMPLE_VIDEOS[selectedVideoIndex].url;
      videoRef.current.currentTime = currentTime;
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      }
    }
    setIsSharingScreen(false);
    audioDuckingRef.current?.detachScreenStream();
    setLastSyncActionText('Screen share ended, restored movie player');
  }, [selectedVideoIndex, currentTime, isPlaying]);

  // PeerJS WebRTC Voice Streaming & Screen Sharing Hook
  const {
    peerReady,
    localMicStream,
    activeVoiceCalls,
    remoteAudioStreams,
    requestLocalMicrophone,
    startScreenShare: peerStartScreenShare,
    stopScreenShare: peerStopScreenShare,
  } = usePeerVoice({
    roomCode: room.code,
    currentUser,
    roomUsers: room.users,
    isVoiceMuted,
    isVoiceDeafened,
    onRemoteScreenStream: (stream, presenterId) => {
      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
        if (stream.getAudioTracks().length > 0 && audioDuckingRef.current) {
          audioDuckingRef.current.attachScreenStream(stream);
        }
        setLastSyncActionText('Watching live movie screen stream');
      } else if (!stream) {
        handleStopScreenShareLocally();
      }
    },
    onScreenShareEnded: () => {
      handleStopScreenShareLocally();
    },
  });

  // Attach remote voice audio streams to audio ducking manager as well
  useEffect(() => {
    remoteAudioStreams.forEach((stream) => {
      audioDuckingRef.current?.attachRemotePeerAudio(stream);
    });
  }, [remoteAudioStreams]);

  // Initialize AudioDuckingManager with Web Audio API mixing
  useEffect(() => {
    const duckingMgr = new AudioDuckingManager({
      duckVolumeLevel: 0.20, // Lower to 20%
      speechThreshold: 8, // Sensitive VAD detection
      releaseDelayMs: 900,
      duckingMode,
      onSpeakingChange: (speaking, level) => {
        setIsUserSpeaking(speaking);
        setLocalMicLevel(level);
        onUpdateVoiceSpeakingState?.(speaking);
      },
      onDuckingChange: (ducking) => {
        setIsDuckingActive(ducking);
      },
      onAutoPauseChange: (shouldPause) => {
        if (!videoRef.current) return;
        if (shouldPause) {
          videoRef.current.pause();
          setIsPlaying(false);
          setLastSyncActionText('Talk-to-Pause: Movie paused for conversation');
        } else {
          videoRef.current.play().catch(() => {});
          setIsPlaying(true);
          setLastSyncActionText('Talk-to-Pause: Resumed movie playback');
        }
      },
    });

    audioDuckingRef.current = duckingMgr;

    if (videoRef.current) {
      duckingMgr.attachVideo(videoRef.current);
      duckingMgr.setBaseVolume(volume);
    }

    return () => {
      duckingMgr.destroy();
      audioDuckingRef.current = null;
    };
  }, []);

  // Sync ducking mode
  useEffect(() => {
    audioDuckingRef.current?.setDuckingMode(duckingMode);
  }, [duckingMode]);

  // Sync volume with Web Audio API movie gain node
  useEffect(() => {
    audioDuckingRef.current?.setBaseVolume(volume);
  }, [volume]);

  // Sync mic mute state
  useEffect(() => {
    if (localMicStreamRef.current) {
      localMicStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isVoiceMuted;
      });
    }
    audioDuckingRef.current?.setLocalMicMuted(isVoiceMuted);
  }, [isVoiceMuted]);

  // Sync voice deafened state
  useEffect(() => {
    audioDuckingRef.current?.setVoiceDeafened(isVoiceDeafened);
  }, [isVoiceDeafened]);

  // Notify ducking manager when remote peers speak
  useEffect(() => {
    audioDuckingRef.current?.setRemoteSpeaking(isAnyRemoteSpeaking);
  }, [isAnyRemoteSpeaking]);

  // Request actual microphone stream for Web Audio API & AnalyserNode VAD
  const initMicrophone = useCallback(async () => {
    try {
      if (localMicStreamRef.current) return;
      const stream = await requestLocalMicrophone();
      if (stream) {
        localMicStreamRef.current = stream;
        setMicPermissionState('granted');
        if (audioDuckingRef.current) {
          audioDuckingRef.current.attachMicStream(stream);
          audioDuckingRef.current.setLocalMicMuted(isVoiceMuted);
        }
      }
    } catch (err: any) {
      console.warn('Microphone permission not granted or device unavailable:', err);
      setMicPermissionState('denied');
    }
  }, [isVoiceMuted, requestLocalMicrophone]);

  useEffect(() => {
    initMicrophone();

    return () => {
      if (localMicStreamRef.current) {
        localMicStreamRef.current.getTracks().forEach((t) => t.stop());
        localMicStreamRef.current = null;
      }
    };
  }, [initMicrophone]);

  // Setup WebRTC peer connections to transmit host screen stream to peers in room
  const setupPeerConnectionsAndStream = useCallback(
    (stream: MediaStream) => {
      room.users.forEach((user) => {
        if (user.id === currentUser.id) return;
        try {
          const pc = new RTCPeerConnection({
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ],
          });

          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              onSendWebRtcSignal?.(user.id, {
                type: 'candidate',
                candidate: event.candidate,
              });
            }
          };

          pc.createOffer()
            .then((offer) => pc.setLocalDescription(offer).then(() => offer))
            .then((offer) => {
              onSendWebRtcSignal?.(user.id, {
                type: 'offer',
                sdp: offer,
              });
            })
            .catch((e) => console.warn('Offer error:', e));

          peerConnectionsRef.current.set(user.id, pc);
        } catch (e) {
          console.warn('Error initiating RTCPeerConnection for user:', user.name, e);
        }
      });
    },
    [room.users, currentUser.id, onSendWebRtcSignal]
  );

  // Stop screen sharing and restore normal player
  const handleStopScreenShare = useCallback(() => {
    peerStopScreenShare();
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach((track) => track.stop());
      localScreenStreamRef.current = null;
    }

    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    setIsSharingScreen(false);
    setHasTabAudio(false);
    audioDuckingRef.current?.detachScreenStream();

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = SAMPLE_VIDEOS[selectedVideoIndex].url;
      videoRef.current.currentTime = currentTime;
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      }
    }

    onBroadcastScreenShare?.(false);
    setLastSyncActionText('Screen sharing concluded');
  }, [peerStopScreenShare, selectedVideoIndex, currentTime, isPlaying, onBroadcastScreenShare]);

  // Start Screen Sharing with options (open redirected stream site first or directly capture)
  const handleStartScreenShare = async (openMovieSiteFirst = false) => {
    setScreenShareError(null);

    if (openMovieSiteFirst) {
      window.open(movieStreamUrl, '_blank', 'noopener,noreferrer');
    }

    try {
      // Prompt browser native tab / window display media picker
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          cursor: 'always',
        } as any,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      localScreenStreamRef.current = stream;
      setIsSharingScreen(true);
      setShowScreenShareModal(false);

      const hasAudio = stream.getAudioTracks().length > 0;
      setHasTabAudio(hasAudio);

      if (hasAudio && audioDuckingRef.current) {
        audioDuckingRef.current.attachScreenStream(stream);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      onBroadcastScreenShare?.(true, movieStreamUrl);
      setLastSyncActionText(`You are sharing your movie screen live`);

      // When host ends share using browser's top bar stop button
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          handleStopScreenShare();
        };
      }

      // Broadcast via PeerJS mesh and fallback WebRTC
      peerStartScreenShare(stream);
      setupPeerConnectionsAndStream(stream);
    } catch (err: any) {
      console.warn('Screen share request error:', err);
      if (err.name === 'NotAllowedError') {
        setScreenShareError(
          'Screen sharing was canceled or denied. Make sure to choose the Chrome Tab with the movie and allow audio sharing.'
        );
      } else {
        setScreenShareError(
          err.message || 'Screen capture could not be initiated on this device.'
        );
      }
    }
  };

  // Listen to incoming WebRTC P2P signals (offer, answer, candidate)
  useEffect(() => {
    if (!webRtcSignalData) return;
    const { targetUserId, signal, fromUserId } = webRtcSignalData;

    if (targetUserId && targetUserId !== currentUser.id && targetUserId !== 'all') {
      return;
    }

    if (signal?.type === 'offer') {
      try {
        if (receiverPcRef.current) {
          receiverPcRef.current.close();
        }

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        });

        pc.ontrack = (event) => {
          if (event.streams[0]) {
            const incomingStream = event.streams[0];
            if (incomingStream.getVideoTracks().length > 0 && videoRef.current) {
              videoRef.current.srcObject = incomingStream;
              videoRef.current.play().catch(() => {});
            }

            if (incomingStream.getAudioTracks().length > 0 && audioDuckingRef.current) {
              if (incomingStream.getVideoTracks().length > 0) {
                // Shared Tab/Screen movie audio -> ducking movie node
                audioDuckingRef.current.attachScreenStream(incomingStream);
              } else {
                // Pure WebRTC voice audio -> high priority voice layer
                audioDuckingRef.current.attachRemotePeerAudio(incomingStream);
              }
            }
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            onSendWebRtcSignal?.(fromUserId, {
              type: 'candidate',
              candidate: event.candidate,
            });
          }
        };

        pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => pc.createAnswer())
          .then((answer) => pc.setLocalDescription(answer).then(() => answer))
          .then((answer) => {
            onSendWebRtcSignal?.(fromUserId, {
              type: 'answer',
              sdp: answer,
            });
          })
          .catch((err) => console.warn('Error answering WebRTC offer:', err));

        receiverPcRef.current = pc;
      } catch (err) {
        console.warn('Error handling incoming WebRTC signal:', err);
      }
    } else if (signal?.type === 'answer') {
      const pc = peerConnectionsRef.current.get(fromUserId);
      if (pc) {
        pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).catch((e) =>
          console.warn('Error setting answer remote description:', e)
        );
      }
    } else if (signal?.type === 'candidate') {
      const pc = peerConnectionsRef.current.get(fromUserId) || receiverPcRef.current;
      if (pc && pc.remoteDescription) {
        pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch((e) =>
          console.warn('Error adding ICE candidate:', e)
        );
      }
    }
  }, [webRtcSignalData, currentUser.id, onSendWebRtcSignal]);

  // Clean up remote stream if host stops sharing
  useEffect(() => {
    if (!screenShareInfo?.isSharing && !isSharingScreen) {
      if (receiverPcRef.current) {
        receiverPcRef.current.close();
        receiverPcRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = SAMPLE_VIDEOS[selectedVideoIndex].url;
        videoRef.current.currentTime = currentTime;
        if (isPlaying) videoRef.current.play().catch(() => {});
      }
    }
  }, [screenShareInfo?.isSharing, isSharingScreen, selectedVideoIndex, currentTime, isPlaying]);

  // Teardown streams on unmount
  useEffect(() => {
    return () => {
      if (localScreenStreamRef.current) {
        localScreenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
      if (receiverPcRef.current) receiverPcRef.current.close();
    };
  }, []);

  // Audio level animation for speaking indicator
  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedAudioLevels([
        Math.floor(10 + Math.random() * 70),
        Math.floor(15 + Math.random() * 85),
        Math.floor(20 + Math.random() * 95),
        Math.floor(18 + Math.random() * 80),
        Math.floor(10 + Math.random() * 65),
      ]);
    }, 180);
    return () => clearInterval(interval);
  }, []);

  // Sync with incoming WebSocket / Firebase Realtime state
  useEffect(() => {
    if (!watchPartyState || !videoRef.current) return;
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    const video = videoRef.current;
    const timeDiff = Math.abs(video.currentTime - watchPartyState.currentTime);

    // If drift is greater than 0.8 seconds, hard seek to maintain synchronized viewing
    if (timeDiff > 0.8) {
      video.currentTime = watchPartyState.currentTime;
      setCurrentTime(watchPartyState.currentTime);
    }

    if (watchPartyState.isPlaying && video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
      setLastSyncActionText(`${watchPartyState.lastUpdatedBy} resumed playback`);
    } else if (!watchPartyState.isPlaying && !video.paused) {
      video.pause();
      setIsPlaying(false);
      setLastSyncActionText(`${watchPartyState.lastUpdatedBy} paused playback`);
    }

    setSyncStatus('synced');
  }, [watchPartyState]);

  // Handle Play/Pause synced across room
  const handleTogglePlay = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const nextIsPlaying = !isPlaying;

    if (nextIsPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }

    setIsPlaying(nextIsPlaying);
    isInternalUpdateRef.current = true;
    onSyncPlayback(nextIsPlaying, video.currentTime, video.duration || duration);
    setLastSyncActionText(`You ${nextIsPlaying ? 'played' : 'paused'} the video for everyone`);
  }, [isPlaying, duration, onSyncPlayback]);

  // Handle Seek Synced
  const handleSeek = (newTime: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    isInternalUpdateRef.current = true;
    onSyncPlayback(isPlaying, newTime, videoRef.current.duration || duration);
    setLastSyncActionText(`You seeked to ${formatTime(newTime)}`);
  };

  // Jump forwards or backwards by seconds
  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(videoRef.current.duration || duration, videoRef.current.currentTime + seconds));
    handleSeek(newTime);
  };

  // Resync button in case of network drift
  const handleForceResync = () => {
    setSyncStatus('syncing');
    if (watchPartyState && videoRef.current) {
      videoRef.current.currentTime = watchPartyState.currentTime;
      if (watchPartyState.isPlaying) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
    setTimeout(() => {
      setSyncStatus('synced');
      setLastSyncActionText('Resynced to room timeline');
    }, 400);
  };

  // Mouse activity for video controls visibility
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    hideControlsTimerRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const activeSpeaker = isUserSpeaking && !isVoiceMuted
    ? { userId: currentUser.id, name: `${currentUser.name} (You)`, avatar: currentUser.avatar, isSpeaking: true, isMuted: false }
    : voiceParticipants.find((p) => p.isSpeaking && !p.isMuted);

  const handleToggleMic = () => {
    audioDuckingRef.current?.resumeContext();
    if (!localMicStreamRef.current || micPermissionState !== 'granted') {
      initMicrophone();
    }
    onToggleVoiceMute();
  };

  const handleTestVoiceDucking = () => {
    audioDuckingRef.current?.triggerTestSpeech(2500);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 flex flex-col gap-4 pb-20 text-white animate-fade-in select-none">
      {/* Top Bar / Room Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1e2023] border border-[#2d3035] p-3.5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onLeaveWatchParty}
            type="button"
            className="w-9 h-9 rounded-xl bg-[#282a2e] hover:bg-[#333539] text-[#e2e2e8] flex items-center justify-center transition-colors"
            title="Leave Watch Party"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-wide flex items-center gap-1.5">
                <Film className="w-4 h-4 text-[#e50914]" />
                {movie.title}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#e50914]/20 text-[#ff7875] border border-[#e50914]/30 font-semibold">
                Watch Party Active
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>Room #{room.code}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[#4edea3]">
                <Radio className="w-3 h-3 animate-pulse" />
                Live Voice Mesh ({voiceParticipants.length} Connected)
              </span>
            </div>
          </div>
        </div>

        {/* Right header actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Host Screen Share Button */}
          {isSharingScreen ? (
            <button
              onClick={handleStopScreenShare}
              type="button"
              className="h-8 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md animate-pulse shadow-red-900/40"
              title="Stop sharing your movie screen"
            >
              <ScreenShareOff className="w-3.5 h-3.5" />
              <span>Stop Sharing</span>
            </button>
          ) : isRemoteScreenSharing ? (
            <div className="h-8 px-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <Tv className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              <span className="truncate max-w-[130px]">{screenShareInfo?.presenterName} Live</span>
            </div>
          ) : (
            <button
              onClick={() => setShowScreenShareModal(true)}
              type="button"
              className="h-8 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 active:scale-95"
              title="Share movie website where the link redirects (7Reels stream)"
            >
              <ScreenShare className="w-3.5 h-3.5 text-emerald-200" />
              <span>{isHost ? 'Host: Share Movie Screen' : 'Share Movie Screen'}</span>
            </button>
          )}

          {/* Direct Link to 7Reels */}
          <a
            href={movieStreamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-3 rounded-xl bg-[#e50914] hover:bg-[#ff2e4c] text-white text-xs font-bold flex items-center gap-1.5 transition-all no-underline shadow-md shadow-[#e50914]/30"
            title="Open 7Reels movie stream redirect in new tab"
          >
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              play_arrow
            </span>
            <span>7Reels Stream</span>
            <ExternalLink className="w-3 h-3 text-white/70" />
          </a>

          {/* Copy Invite Link */}
          <button
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}?room=${room.code}`;
              navigator.clipboard?.writeText(url);
              setCopiedUrl(true);
              setTimeout(() => setCopiedUrl(false), 2000);
            }}
            type="button"
            className="h-8 px-2.5 rounded-xl bg-[#282a2e] hover:bg-[#333539] text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-[#3d4047]"
            title="Copy Invite Link"
          >
            {copiedUrl ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Invite</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Responsive Grid: Laptop (8 cols video + 4 cols live voice) & Mobile (stacked) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (8 cols on laptop): Video Player & Controls & Reactions */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          {/* Main Video Cinema Canvas */}
          <div
            ref={playerContainerRef}
        onMouseMove={handleMouseMove}
        className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-[#2d3035] shadow-2xl group"
      >
        {/* HTML5 Video Element */}
        <video
          ref={videoRef}
          src={SAMPLE_VIDEOS[selectedVideoIndex].url}
          poster={SAMPLE_VIDEOS[selectedVideoIndex].poster}
          className="w-full h-full object-contain bg-black"
          playsInline
          autoPlay
          muted={isLocalMuted || isVoiceDeafened}
          onTimeUpdate={() => {
            if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration || 180);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            onSyncPlayback(false, 0, duration);
          }}
          onClick={handleTogglePlay}
        />

        {/* Floating Live Reaction Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          {activeReactions.map((reaction) => (
            <div
              key={reaction.id}
              className="absolute bottom-12 right-12 animate-bounce flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-lg text-lg transform -translate-y-8 transition-all duration-1000 opacity-90"
              style={{
                right: `${20 + Math.random() * 40}%`,
                bottom: `${15 + Math.random() * 50}%`,
              }}
            >
              <span>{reaction.emoji}</span>
              <span className="text-xs text-white/90 font-medium">{reaction.userName}</span>
            </div>
          ))}
        </div>

        {/* Active Speaker Notification Overlay in Top-Left of Video */}
        {activeSpeaker && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#4edea3]/40 shadow-lg animate-pulse">
            <div className="relative">
              <img
                src={activeSpeaker.avatar}
                alt={activeSpeaker.name}
                className="w-6 h-6 rounded-full object-cover ring-2 ring-[#4edea3]"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#4edea3] ring-1 ring-black" />
            </div>
            <span className="text-xs text-[#4edea3] font-semibold">{activeSpeaker.name} speaking...</span>
            <div className="flex items-center gap-0.5 h-3">
              {simulatedAudioLevels.map((lvl, idx) => (
                <div
                  key={idx}
                  className="w-0.5 bg-[#4edea3] rounded-full transition-all duration-150"
                  style={{ height: `${Math.min(100, lvl)}%` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Top Active Screen Share Banner on Video Player */}
        {isScreenShareActive && (
          <div className="absolute top-4 left-4 right-4 z-30 flex flex-wrap items-center justify-between gap-2 bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-red-500/40 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-extrabold text-white tracking-wide flex items-center gap-1.5">
                <Tv className="w-4 h-4 text-red-400" />
                {isSharingScreen ? (
                  <>You are streaming your screen live to room #{room.code}</>
                ) : (
                  <>{screenShareInfo?.presenterName} is streaming screen live from 7Reels</>
                )}
              </span>
              {hasTabAudio && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 font-semibold flex items-center gap-1">
                  <Volume2 className="w-3 h-3" />
                  Tab Audio Synced
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <a
                href={movieStreamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/30 px-2.5 py-1 rounded-lg transition-colors no-underline"
              >
                <span>Open Movie Site</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              {isSharingScreen && (
                <button
                  onClick={handleStopScreenShare}
                  type="button"
                  className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded-lg transition-colors"
                >
                  Stop Screen Share
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sync telemetry status pill in top-right */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-black/65 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-[#4edea3] animate-pulse' : 'bg-[#f1c111]'}`}
          />
          <span className="text-gray-300 font-medium">{lastSyncActionText}</span>
          <button
            onClick={handleForceResync}
            type="button"
            className="text-[11px] text-cyan-400 hover:text-cyan-300 underline ml-1 cursor-pointer"
            title="Snap to Host Time"
          >
            Resync
          </button>
        </div>

        {/* Dynamic Audio Ducking Active Badge Notification */}
        {isDuckingActive && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 bg-black/85 backdrop-blur-md px-4 py-2 rounded-full border border-emerald-500/60 shadow-[0_0_25px_rgba(78,222,163,0.35)] animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>
                {duckingMode === 'talk-to-pause'
                  ? 'Talk-to-Pause Active • Movie Paused for Discussion'
                  : 'Discord Ducking Active • Movie Audio Lowered to 20%'}
              </span>
            </span>
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Voice Priority
            </span>
          </div>
        )}

        {/* Play/Pause Center Indicator Splash on Click */}
        <div
          onClick={handleTogglePlay}
          className={`absolute inset-0 z-10 flex items-center justify-center cursor-pointer transition-opacity duration-300 ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {!isPlaying && (
            <div className="w-16 h-16 rounded-full bg-[#e50914]/90 hover:bg-[#e50914] text-white flex items-center justify-center shadow-2xl transform scale-110 active:scale-95 transition-all">
              <Play className="w-8 h-8 fill-current ml-1" />
            </div>
          )}
        </div>

        {/* Bottom Video Controls Overlay (Synchronous Play, Pause, Seek) */}
        <div
          className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Synchronized Seek Progress Bar */}
          <div className="w-full flex flex-col gap-1 mb-2">
            <div className="relative flex items-center w-full group/slider cursor-pointer">
              <input
                type="range"
                min={0}
                max={duration || 180}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#e50914] focus:outline-none hover:h-2 transition-all"
              />
            </div>

            <div className="flex justify-between text-[11px] text-gray-300 font-mono px-0.5">
              <span>{formatTime(currentTime)}</span>
              <div className="flex items-center gap-2">
                <span className="text-[#4edea3] text-[10px] uppercase font-bold tracking-wider">
                  Sync Mode: Peer-Locked
                </span>
                <span>/ {formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Controls Bottom Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Play / Pause Toggle */}
              <button
                onClick={handleTogglePlay}
                type="button"
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-transform active:scale-95"
                title={isPlaying ? 'Pause (Synced for all)' : 'Play (Synced for all)'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              {/* Skip -10s */}
              <button
                onClick={() => handleSkip(-10)}
                type="button"
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-transform active:scale-95"
                title="Skip back 10s (Synced)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Skip +10s */}
              <button
                onClick={() => handleSkip(10)}
                type="button"
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-transform active:scale-95"
                title="Skip ahead 10s (Synced)"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Volume Slider for video audio */}
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  onClick={() => setIsLocalMuted(!isLocalMuted)}
                  type="button"
                  className="text-gray-400 hover:text-white"
                >
                  {isLocalMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5 text-red-400" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isLocalMuted ? 0 : volume}
                  onChange={(e) => {
                    const newVol = Number(e.target.value);
                    setVolume(newVol);
                    setIsLocalMuted(false);
                    if (videoRef.current) videoRef.current.volume = newVol;
                  }}
                  className="w-16 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-[#e50914]"
                />
              </div>

              {/* Dynamic Audio Ducking Controller Button & Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowDuckingMenu(!showDuckingMenu)}
                  type="button"
                  className={`h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isDuckingActive
                      ? 'bg-emerald-600/40 text-emerald-300 border border-emerald-500/60 shadow-md shadow-emerald-950/40'
                      : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white border border-white/10'
                  }`}
                  title="Configure Dynamic Audio Ducking & Voice Priority"
                >
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span className="hidden sm:inline">
                    {duckingMode === 'talk-to-pause' ? 'Talk to Pause' : 'Ducking: 20%'}
                  </span>
                  <Sliders className="w-3 h-3 text-gray-400" />
                </button>

                {showDuckingMenu && (
                  <div className="absolute bottom-10 left-0 z-50 w-72 bg-[#181a1d] border border-[#2d3035] rounded-xl p-3 shadow-2xl flex flex-col gap-2.5 text-white animate-scale-in">
                    <div className="flex items-center justify-between border-b border-[#2d3035] pb-2">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Audio Ducking (Discord-Style)
                      </span>
                      <button
                        onClick={() => setShowDuckingMenu(false)}
                        type="button"
                        className="text-gray-400 hover:text-white text-xs p-1"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-[11px] text-gray-400 leading-snug">
                      Prioritizes WebRTC voice call audio so participants are heard clearly over movie & screen sound.
                    </p>

                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => {
                          setDuckingMode('duck-volume');
                          setShowDuckingMenu(false);
                        }}
                        type="button"
                        className={`p-2 rounded-lg text-left text-xs transition-colors flex flex-col gap-0.5 cursor-pointer ${
                          duckingMode === 'duck-volume'
                            ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-200'
                            : 'bg-[#202226] hover:bg-[#282a2e] text-gray-300'
                        }`}
                      >
                        <strong className="text-white font-semibold">Lower to 20% (Default)</strong>
                        <span className="text-[10px] text-gray-400">
                          Smoothly reduces movie volume to 20% while anyone is speaking.
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setDuckingMode('talk-to-pause');
                          setShowDuckingMenu(false);
                        }}
                        type="button"
                        className={`p-2 rounded-lg text-left text-xs transition-colors flex flex-col gap-0.5 cursor-pointer ${
                          duckingMode === 'talk-to-pause'
                            ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-200'
                            : 'bg-[#202226] hover:bg-[#282a2e] text-gray-300'
                        }`}
                      >
                        <strong className="text-white font-semibold">Talk to Pause</strong>
                        <span className="text-[10px] text-gray-400">
                          Automatically pauses movie playback when voice activity is detected.
                        </span>
                      </button>
                    </div>

                    {/* Live Mic Activity Meter */}
                    <div className="bg-[#121417] p-2 rounded-lg flex flex-col gap-1 border border-white/5">
                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span>Mic Input Level (AnalyserNode):</span>
                        <span className={isUserSpeaking ? 'text-emerald-400 font-bold' : 'text-gray-500'}>
                          {isUserSpeaking ? 'Speaking' : 'Silent'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 transition-all duration-75"
                          style={{ width: `${Math.min(100, localMicLevel * 2.5)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Party Reactions Bar */}
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10">
              <span className="text-[11px] text-gray-400 mr-1 hidden sm:inline">React:</span>
              {['🍿', '🔥', '😱', '😂', '❤️', '👏'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onSendReaction(emoji)}
                  type="button"
                  className="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center text-sm transform hover:scale-125 active:scale-95 transition-all"
                  title={`Send ${emoji} to watch party`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Fullscreen & Trailer selector */}
            <div className="flex items-center gap-2">
              <select
                value={selectedVideoIndex}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  setSelectedVideoIndex(idx);
                  setCurrentTime(0);
                  onSyncPlayback(true, 0);
                }}
                className="bg-[#282a2e] text-xs text-gray-300 rounded-lg px-2 py-1 border border-white/10 focus:outline-none"
              >
                {SAMPLE_VIDEOS.map((vid, idx) => (
                  <option key={idx} value={idx}>
                    Trailer {idx + 1}
                  </option>
                ))}
              </select>

              {/* Quick Screen Share Toggle on Player */}
              <button
                onClick={() => {
                  if (isSharingScreen) handleStopScreenShare();
                  else setShowScreenShareModal(true);
                }}
                type="button"
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform ${
                  isSharingScreen
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'
                }`}
                title={isSharingScreen ? 'Stop screen share' : 'Share movie stream website'}
              >
                {isSharingScreen ? <ScreenShareOff className="w-4 h-4" /> : <ScreenShare className="w-4 h-4" />}
              </button>

              <button
                onClick={toggleFullscreen}
                type="button"
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-transform"
                title="Fullscreen"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reaction Bar & Movie Details */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#181a1d] border border-[#2d3035] p-3 rounded-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="text-xs text-gray-400 font-bold mr-1 shrink-0">Reactions:</span>
          {['🍿', '🔥', '😱', '😂', '❤️', '👏', '🚀'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendReaction(emoji)}
              type="button"
              className="w-8 h-8 rounded-xl bg-[#252830] hover:bg-[#30333c] text-base flex items-center justify-center transition active:scale-90"
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="px-2.5 py-1 rounded-lg bg-[#252830] text-gray-200 font-medium">
            ⭐ {movie.imdbRating} IMDb
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-[#252830] text-gray-200 font-medium">
            ⏱️ {movie.runtime}
          </span>
        </div>
      </div>
    </div>

    {/* Right Column (4 cols on laptop): Discord-style Live Voice & Watch Party Sidebar */}
    <div className="lg:col-span-4 flex flex-col gap-4">
      <div className="w-full bg-[#181a1d] border border-[#2d3035] rounded-2xl p-4 shadow-xl flex flex-col gap-4">
        {/* Voice Bar Header */}
        <div className="flex items-center justify-between border-b border-[#2d3035] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#00a572]/20 border border-[#00a572]/40 flex items-center justify-center text-[#4edea3]">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Voice Room</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#00a572]/20 text-[#4edea3] font-bold border border-[#00a572]/30">
                  Live
                </span>
              </h3>
            </div>
          </div>

          {/* Dynamic Ducking Badge */}
          <div
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
              isDuckingActive
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                : 'bg-white/5 text-gray-400 border-white/10'
            }`}
          >
            {isDuckingActive ? '⚡ Ducking Movie' : 'Audio Ducking Ready'}
          </div>
        </div>

        {/* Voice Controls: Mic Live, Deafen, Test Ducking */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {/* Microphone Toggle (Mute/Unmute) */}
            <button
              id="voice-toggle-mic"
              onClick={handleToggleMic}
              type="button"
              className={`flex-1 h-10 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
                isVoiceMuted
                  ? 'bg-[#e50914] text-white hover:bg-[#ff2e4c] shadow-[#e50914]/30'
                  : 'bg-[#00a572] text-white hover:bg-[#00c98b] shadow-[#00a572]/30 ring-2 ring-[#4edea3]/40'
              }`}
            >
              {isVoiceMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 animate-pulse" />}
              <span>{isVoiceMuted ? 'Muted (Click to Talk)' : 'Mic Live'}</span>
            </button>

            {/* Speaker Toggle (Deafen / Listen) */}
            <button
              id="voice-toggle-speaker"
              onClick={onToggleVoiceSpeaker}
              type="button"
              className={`h-10 px-3 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-95 border ${
                isVoiceDeafened
                  ? 'bg-[#282a2e] text-red-400 border-red-500/40'
                  : 'bg-[#282a2e] text-[#e2e2e8] hover:text-white border-[#333539]'
              }`}
              title={isVoiceDeafened ? 'Restore Audio' : 'Mute Room Audio'}
            >
              <Headphones className="w-4 h-4" />
            </button>
          </div>

          {/* Test Voice Ducking Button */}
          <button
            onClick={handleTestVoiceDucking}
            type="button"
            className="w-full h-9 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 text-purple-300 border border-purple-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
            title="Simulates 2.5s speaking to test movie volume auto-ducking"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Test Voice Ducking (2.5s)</span>
          </button>
        </div>

        {/* Active Listeners & Participants List with Animated Voice Avatars */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[#2d3035]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Participants ({room.users.length})
            </span>
            <span className="text-[11px] text-gray-400">
              {activeSpeaker ? `🎙️ ${activeSpeaker.name}` : 'All quiet'}
            </span>
          </div>

          {/* Only show real participants who belong to room.users */}
          <div className="flex flex-col gap-2">
            {voiceParticipants
              .filter((p) => room.users.some((u) => u.id === p.userId))
              .map((participant) => {
                const isMe = participant.userId === currentUser.id;
                const isSpeakingNow = isMe
                  ? isUserSpeaking && !isVoiceMuted
                  : participant.isSpeaking && !participant.isMuted;
                const isMutedNow = isMe ? isVoiceMuted : participant.isMuted;

                const liveBars = isMe && isUserSpeaking
                  ? [
                      Math.min(100, Math.max(25, Math.round(localMicLevel * 1.6))),
                      Math.min(100, Math.max(40, Math.round(localMicLevel * 2.5))),
                      Math.min(100, Math.max(30, Math.round(localMicLevel * 2.1))),
                      Math.min(100, Math.max(20, Math.round(localMicLevel * 1.5))),
                    ]
                  : simulatedAudioLevels.slice(0, 4);

                return (
                  <div
                    key={participant.userId}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                      isSpeakingNow
                        ? 'bg-[#00a572]/20 border-[#00a572]/80 shadow-[0_0_15px_rgba(78,222,163,0.3)] ring-1 ring-[#4edea3]/50'
                        : 'bg-[#202226] border-[#2d3035]'
                    }`}
                  >
                    {/* Animated Avatar Container with Wave Ripple */}
                    <div className="relative shrink-0">
                      {isSpeakingNow && (
                        <>
                          <div className="absolute -inset-1 rounded-full bg-[#4edea3]/40 animate-ping pointer-events-none" />
                          <div className="absolute -inset-2 rounded-full border-2 border-[#4edea3]/60 animate-pulse pointer-events-none" />
                        </>
                      )}

                      <img
                        src={participant.avatar}
                        alt={participant.name}
                        className={`w-10 h-10 rounded-full object-cover relative z-10 transition-all ${
                          isSpeakingNow
                            ? 'ring-2 ring-[#4edea3] shadow-[0_0_12px_rgba(78,222,163,0.7)]'
                            : 'ring-1 ring-[#3b3e44]'
                        }`}
                      />

                      <div
                        className={`absolute -bottom-1 -right-1 z-20 w-4 h-4 rounded-full flex items-center justify-center text-[8px] shadow border ${
                          isMutedNow
                            ? 'bg-[#e50914] text-white border-black'
                            : 'bg-[#00a572] text-white border-black'
                        }`}
                      >
                        {isMutedNow ? (
                          <MicOff className="w-2.5 h-2.5" />
                        ) : (
                          <Mic className="w-2.5 h-2.5" />
                        )}
                      </div>
                    </div>

                    {/* User Info & Audio Bar */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-white truncate">
                          {participant.name}
                        </span>
                        {isMe && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-gray-300 font-medium">
                            You
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isSpeakingNow ? (
                          <div className="flex items-center gap-0.5 h-2.5">
                            {liveBars.map((lvl, idx) => (
                              <div
                                key={idx}
                                className="w-1 bg-[#4edea3] rounded-full transition-all duration-100"
                                style={{ height: `${Math.min(100, lvl)}%` }}
                              />
                            ))}
                            <span className="text-[10px] text-[#4edea3] font-semibold ml-1">
                              Speaking
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-500">
                            {isMutedNow ? 'Muted' : 'Listening'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* If user is alone in the room */}
          {room.users.length <= 1 && (
            <div className="bg-[#121418] border border-white/5 rounded-xl p-3 text-center flex flex-col gap-1.5">
              <span className="text-xs text-gray-300 font-semibold">Watching solo right now</span>
              <p className="text-[11px] text-gray-500">
                Share code <strong className="text-white font-mono">#{room.code}</strong> with friends so they can talk and watch together!
              </p>
            </div>
          )}
        </div>

        {/* Leave Room Action */}
        <button
          onClick={onLeaveWatchParty}
          type="button"
          className="w-full h-9 rounded-xl bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-800/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          <span>Leave Watch Party</span>
        </button>
      </div>
    </div>
  </div>

      {/* HOST SCREEN SHARE & MOVIE STREAM HUB MODAL */}
      {showScreenShareModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#181a1d] border border-[#333539] w-full max-w-xl rounded-2xl p-6 shadow-2xl flex flex-col gap-5 text-white animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#2d3035] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <ScreenShare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Host Movie Screen Sharing Hub
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 uppercase">
                      Live Stream
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Share the redirected movie website tab with everyone in Room #{room.code}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowScreenShareModal(false)}
                type="button"
                className="w-8 h-8 rounded-lg bg-[#24272c] hover:bg-[#2f3238] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Movie and Target Stream Preview Card */}
            <div className="flex items-center gap-3 bg-[#202328] border border-[#2d3035] p-3.5 rounded-xl">
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="w-14 h-20 rounded-lg object-cover shadow-md shrink-0 ring-1 ring-white/10"
              />
              <div className="flex flex-col min-w-0 flex-1">
                <h4 className="text-sm font-bold text-white truncate">{movie.title} ({movie.year})</h4>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                  <span>★ {movie.imdbRating}</span>
                  <span>•</span>
                  <span>{movie.genres.slice(0, 2).join(', ')}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-gray-400">Redirect Stream:</span>
                  <a
                    href={movieStreamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-cyan-400 hover:text-cyan-300 underline truncate max-w-[240px] flex items-center gap-1"
                  >
                    <span>7reels.cc/search?q={encodeURIComponent(movie.title)}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(movieStreamUrl);
                      setCopiedUrl(true);
                      setTimeout(() => setCopiedUrl(false), 2000);
                    }}
                    type="button"
                    className="text-gray-400 hover:text-white p-1"
                    title="Copy stream link"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                How It Works in 3 Quick Steps:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="bg-[#202328] border border-white/5 p-3 rounded-xl flex flex-col gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-[#e50914]/20 text-[#ff4d4f] font-extrabold flex items-center justify-center text-xs">
                    1
                  </div>
                  <strong className="text-white">Open 7Reels Tab</strong>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    The movie website search redirect opens in a new browser tab.
                  </p>
                </div>

                <div className="bg-[#202328] border border-white/5 p-3 rounded-xl flex flex-col gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-extrabold flex items-center justify-center text-xs">
                    2
                  </div>
                  <strong className="text-white">Pick "Chrome Tab"</strong>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    In the browser popup, pick the 7Reels tab where the movie is playing.
                  </p>
                </div>

                <div className="bg-[#202328] border border-emerald-500/30 p-3 rounded-xl flex flex-col gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold flex items-center justify-center text-xs">
                    3
                  </div>
                  <strong className="text-emerald-300">Check "Tab Audio"</strong>
                  <p className="text-gray-300 text-[11px] leading-relaxed">
                    Toggle <span className="text-white font-semibold">"Share tab audio"</span> ON so friends hear the movie sound!
                  </p>
                </div>
              </div>
            </div>

            {/* Error banner if browser denied or cancelled */}
            {screenShareError && (
              <div className="bg-red-950/60 border border-red-500/40 p-3 rounded-xl text-xs text-red-300 flex items-start gap-2">
                <span className="material-symbols-outlined text-base shrink-0 text-red-400">warning</span>
                <div className="flex flex-col gap-1">
                  <span>{screenShareError}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => window.open(window.location.href, '_blank')}
                      type="button"
                      className="text-[11px] font-bold underline text-white hover:text-red-200"
                    >
                      Open CineMatch in Full New Window
                    </button>
                    <span>•</span>
                    <a
                      href={movieStreamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold underline text-white hover:text-red-200"
                    >
                      Open 7Reels Directly
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => handleStartScreenShare(true)}
                type="button"
                className="w-full sm:flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all transform active:scale-95 cursor-pointer"
              >
                <ScreenShare className="w-4 h-4" />
                <span>🚀 1-Click: Open 7Reels & Share Screen</span>
              </button>

              <button
                onClick={() => handleStartScreenShare(false)}
                type="button"
                className="w-full sm:w-auto h-11 px-4 rounded-xl bg-[#24272c] hover:bg-[#2f3238] text-gray-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Laptop className="w-4 h-4" />
                <span>Share Existing Tab</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
