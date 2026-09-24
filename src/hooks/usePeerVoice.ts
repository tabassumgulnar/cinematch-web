import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { MediaConnection } from 'peerjs';
import { User, VoiceParticipant } from '../types';

interface UsePeerVoiceOptions {
  roomCode: string;
  currentUser: User;
  roomUsers: User[];
  isVoiceMuted: boolean;
  isVoiceDeafened: boolean;
  onRemoteScreenStream?: (stream: MediaStream | null, presenterId: string) => void;
  onScreenShareEnded?: () => void;
  onPeerSpeakingChange?: (userId: string, isSpeaking: boolean) => void;
}

export function usePeerVoice({
  roomCode,
  currentUser,
  roomUsers,
  isVoiceMuted,
  isVoiceDeafened,
  onRemoteScreenStream,
  onScreenShareEnded,
  onPeerSpeakingChange,
}: UsePeerVoiceOptions) {
  const [peerReady, setPeerReady] = useState(false);
  const [localMicStream, setLocalMicStream] = useState<MediaStream | null>(null);
  const [activeVoiceCalls, setActiveVoiceCalls] = useState<string[]>([]);
  const [remoteAudioStreams, setRemoteAudioStreams] = useState<Map<string, MediaStream>>(new Map());

  const peerRef = useRef<Peer | null>(null);
  const callsRef = useRef<Map<string, MediaConnection>>(new Map());
  const screenCallsRef = useRef<Map<string, MediaConnection>>(new Map());
  const localMicStreamRef = useRef<MediaStream | null>(null);
  const localScreenStreamRef = useRef<MediaStream | null>(null);

  // Helper to get normalized Peer ID for a user in this room
  const getPeerIdForUser = useCallback(
    (userId: string) => {
      const cleanRoom = roomCode.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanUser = userId.replace(/[^a-z0-9]/g, '');
      return `cm_${cleanRoom}_${cleanUser}`;
    },
    [roomCode]
  );

  const myPeerId = getPeerIdForUser(currentUser.id);

  // Safely attach remote MediaStream to a dynamic HTML <audio autoPlay playsInline> element appended to document.body
  const attachRemoteAudio = useCallback(
    (peerId: string, stream: MediaStream) => {
      try {
        const audioId = `cinematch-peer-audio-${peerId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

        // Ensure all audio tracks are active
        stream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });

        let audioEl = document.getElementById(audioId) as HTMLAudioElement | null;
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.id = audioId;
          audioEl.autoplay = true;
          (audioEl as any).playsInline = true;
          // Positioned offscreen to avoid visual disturbance while maintaining full audio pipeline access
          audioEl.style.position = 'fixed';
          audioEl.style.bottom = '-999px';
          audioEl.style.left = '-999px';
          audioEl.style.width = '1px';
          audioEl.style.height = '1px';
          audioEl.style.opacity = '0.01';
          audioEl.volume = isVoiceDeafened ? 0 : 1.0;
          document.body.appendChild(audioEl);
        }

        audioEl.volume = isVoiceDeafened ? 0 : 1.0;

        if (audioEl.srcObject !== stream) {
          audioEl.srcObject = stream;
        }

        // Play unmuted audio stream with browser promise recovery
        audioEl.play().catch((playErr) => {
          console.warn(`[PeerJS Audio] Auto-play was deferred for peer ${peerId}:`, playErr);
          // User-interaction fallback unlock
          const unlock = () => {
            audioEl?.play().catch(() => {});
            window.removeEventListener('click', unlock);
            window.removeEventListener('touchstart', unlock);
          };
          window.addEventListener('click', unlock, { once: true });
          window.addEventListener('touchstart', unlock, { once: true });
        });

        setRemoteAudioStreams((prev) => {
          const next = new Map(prev);
          next.set(peerId, stream);
          return next;
        });
      } catch (err) {
        console.warn('[PeerJS Audio] Error attaching audio element:', err);
      }
    },
    [isVoiceDeafened]
  );

  // Remove peer audio element on leave/close
  const removeRemoteAudio = useCallback((peerId: string) => {
    try {
      const audioId = `cinematch-peer-audio-${peerId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
      const audioEl = document.getElementById(audioId);
      if (audioEl) {
        if (audioEl instanceof HTMLAudioElement) {
          audioEl.pause();
          audioEl.srcObject = null;
        }
        audioEl.remove();
      }

      setRemoteAudioStreams((prev) => {
        const next = new Map(prev);
        next.delete(peerId);
        return next;
      });
    } catch (err) {
      console.warn('[PeerJS Audio] Error removing audio element:', err);
    }
  }, []);

  // Create a silent audio track for calls when mic is off or not yet granted
  const createSilentStream = useCallback((): MediaStream => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const dst = audioCtx.createMediaStreamDestination();
    osc.connect(dst);
    osc.start();
    const track = dst.stream.getAudioTracks()[0];
    track.enabled = false;
    return new MediaStream([track]);
  }, []);

  // Initialize or request local microphone
  const requestLocalMicrophone = useCallback(async (): Promise<MediaStream | null> => {
    if (localMicStreamRef.current && localMicStreamRef.current.active) {
      return localMicStreamRef.current;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      stream.getAudioTracks().forEach((track) => {
        track.enabled = !isVoiceMuted;
      });

      localMicStreamRef.current = stream;
      setLocalMicStream(stream);

      // If active peer calls exist, replace silent track with live mic track
      const liveTrack = stream.getAudioTracks()[0];
      if (liveTrack) {
        callsRef.current.forEach((call) => {
          const peerConnection = (call as any).peerConnection as RTCPeerConnection;
          if (peerConnection) {
            const senders = peerConnection.getSenders();
            const audioSender = senders.find((s) => s.track && s.track.kind === 'audio');
            if (audioSender) {
              audioSender.replaceTrack(liveTrack).catch(() => {});
            }
          }
        });
      }

      return stream;
    } catch (err) {
      console.warn('[PeerJS Voice] Microphone permission denied or unavailable:', err);
      return null;
    }
  }, [isVoiceMuted]);

  // Sync mute state to local mic tracks
  useEffect(() => {
    if (localMicStreamRef.current) {
      localMicStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isVoiceMuted;
      });
    }
  }, [isVoiceMuted]);

  // Sync deafen state to all remote audio elements
  useEffect(() => {
    const audioElements = document.querySelectorAll<HTMLAudioElement>('audio[id^="cinematch-peer-audio-"]');
    audioElements.forEach((el) => {
      el.volume = isVoiceDeafened ? 0 : 1.0;
    });
  }, [isVoiceDeafened]);

  // Initialize PeerJS instance
  useEffect(() => {
    let isMounted = true;
    let peerInstance: Peer | null = null;

    try {
      peerInstance = new Peer(myPeerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      });

      peerRef.current = peerInstance;

      peerInstance.on('open', (id) => {
        if (!isMounted) return;
        setPeerReady(true);
      });

      // Handle incoming voice or screen calls
      peerInstance.on('call', (incomingCall) => {
        const callerPeerId = incomingCall.peer;
        const isScreenCall = incomingCall.metadata?.type === 'screen_share';

        if (isScreenCall) {
          // Screen share call from presenter
          incomingCall.answer();
          incomingCall.on('stream', (remoteStream) => {
            onRemoteScreenStream?.(remoteStream, incomingCall.metadata?.presenterId || callerPeerId);
          });
          incomingCall.on('close', () => {
            onRemoteScreenStream?.(null, '');
            onScreenShareEnded?.();
          });
          screenCallsRef.current.set(callerPeerId, incomingCall);
          return;
        }

        // Voice call
        const outgoingStream = localMicStreamRef.current || createSilentStream();
        incomingCall.answer(outgoingStream);

        incomingCall.on('stream', (remoteStream) => {
          attachRemoteAudio(callerPeerId, remoteStream);
          setActiveVoiceCalls((prev) => Array.from(new Set([...prev, callerPeerId])));
        });

        incomingCall.on('close', () => {
          removeRemoteAudio(callerPeerId);
          callsRef.current.delete(callerPeerId);
          setActiveVoiceCalls((prev) => prev.filter((id) => id !== callerPeerId));
        });

        incomingCall.on('error', (err) => {
          console.warn(`[PeerJS] Call error with ${callerPeerId}:`, err);
          removeRemoteAudio(callerPeerId);
        });

        callsRef.current.set(callerPeerId, incomingCall);
      });

      // Handle peer disconnection / recovery
      peerInstance.on('disconnected', () => {
        if (!isMounted) return;
        setPeerReady(false);
        peerInstance?.reconnect();
      });

      peerInstance.on('close', () => {
        if (!isMounted) return;
        setPeerReady(false);
      });

      peerInstance.on('error', (err: any) => {
        // ID is already taken in same room or harmless warning
        if (err.type === 'unavailable-id') {
          console.info('[PeerJS] Peer ID already registered, continuing with current session.');
        } else {
          console.warn('[PeerJS] Peer error:', err);
        }
      });
    } catch (err) {
      console.warn('[PeerJS] Initialization error:', err);
    }

    return () => {
      isMounted = false;
      // Close all ongoing calls and remove audio elements
      callsRef.current.forEach((call) => call.close());
      callsRef.current.clear();
      screenCallsRef.current.forEach((call) => call.close());
      screenCallsRef.current.clear();

      if (peerInstance) {
        peerInstance.destroy();
        peerRef.current = null;
      }

      // Cleanup local mic tracks
      if (localMicStreamRef.current) {
        localMicStreamRef.current.getTracks().forEach((t) => t.stop());
        localMicStreamRef.current = null;
      }

      // Clear audio elements
      const audioElements = document.querySelectorAll('audio[id^="cinematch-peer-audio-"]');
      audioElements.forEach((el) => {
        if (el instanceof HTMLAudioElement) {
          el.pause();
          el.srcObject = null;
        }
        el.remove();
      });
    };
  }, [myPeerId, attachRemoteAudio, removeRemoteAudio, createSilentStream, onRemoteScreenStream, onScreenShareEnded]);

  // Connect / call other users in the room when room roster updates
  useEffect(() => {
    if (!peerReady || !peerRef.current) return;

    const connectPeers = () => {
      if (!peerReady || !peerRef.current) return;

      roomUsers.forEach((user) => {
        if (user.id === currentUser.id) return;
        const targetPeerId = getPeerIdForUser(user.id);

        // Deterministic calling order to avoid duplicate bidirectional calls:
        // User with alphabetically smaller ID calls user with larger ID
        if (currentUser.id < user.id && !callsRef.current.has(targetPeerId) && peerRef.current) {
          const streamToSend = localMicStreamRef.current || createSilentStream();
          try {
            const call = peerRef.current.call(targetPeerId, streamToSend, {
              metadata: { type: 'voice', callerId: currentUser.id },
            });

            if (call) {
              call.on('stream', (remoteStream) => {
                attachRemoteAudio(targetPeerId, remoteStream);
                setActiveVoiceCalls((prev) => Array.from(new Set([...prev, targetPeerId])));
              });

              call.on('close', () => {
                removeRemoteAudio(targetPeerId);
                callsRef.current.delete(targetPeerId);
                setActiveVoiceCalls((prev) => prev.filter((id) => id !== targetPeerId));
              });

              call.on('error', (err) => {
                console.warn(`[PeerJS] Outgoing call error with ${targetPeerId}:`, err);
                removeRemoteAudio(targetPeerId);
                callsRef.current.delete(targetPeerId);
              });

              callsRef.current.set(targetPeerId, call);
            }
          } catch (callErr) {
            console.warn(`[PeerJS] Failed calling peer ${targetPeerId}:`, callErr);
            callsRef.current.delete(targetPeerId);
          }
        }
      });
    };

    connectPeers();
    const retryInterval = setInterval(connectPeers, 3500);

    // Cleanup peers who left the room
    const activePeerIds = new Set(roomUsers.map((u) => getPeerIdForUser(u.id)));
    callsRef.current.forEach((call, peerId) => {
      if (!activePeerIds.has(peerId)) {
        call.close();
        callsRef.current.delete(peerId);
        removeRemoteAudio(peerId);
      }
    });

    return () => {
      clearInterval(retryInterval);
    };
  }, [peerReady, roomUsers, currentUser.id, getPeerIdForUser, createSilentStream, attachRemoteAudio, removeRemoteAudio]);

  // Start Screen Sharing: captures display media and broadcasts to all peers
  const startScreenShare = useCallback(
    async (stream: MediaStream) => {
      localScreenStreamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        // Native browser "Stop Sharing" floating bar clicked
        videoTrack.onended = () => {
          stopScreenShare();
          onScreenShareEnded?.();
        };

        // Iterate through active PeerJS connections and replace video track using peerConnection.getSenders()
        callsRef.current.forEach((call) => {
          const pc = (call as any).peerConnection as RTCPeerConnection;
          if (pc) {
            const senders = pc.getSenders();
            const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(videoTrack).catch(() => {});
            } else {
              try {
                pc.addTrack(videoTrack, stream);
              } catch {}
            }
          }
        });
      }

      // Also initiate new PeerJS media calls sending the screen stream to all other room members
      if (peerRef.current) {
        roomUsers.forEach((user) => {
          if (user.id === currentUser.id) return;
          const targetPeerId = getPeerIdForUser(user.id);
          try {
            const screenCall = peerRef.current!.call(targetPeerId, stream, {
              metadata: {
                type: 'screen_share',
                presenterId: currentUser.id,
                presenterName: currentUser.name,
              },
            });
            if (screenCall) {
              screenCallsRef.current.set(targetPeerId, screenCall);
            }
          } catch (err) {
            console.warn(`[PeerJS] Screen share call error to ${targetPeerId}:`, err);
          }
        });
      }
    },
    [currentUser.id, currentUser.name, roomUsers, getPeerIdForUser, onScreenShareEnded]
  );

  // Stop Screen Sharing
  const stopScreenShare = useCallback(() => {
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach((track) => track.stop());
      localScreenStreamRef.current = null;
    }

    screenCallsRef.current.forEach((call) => call.close());
    screenCallsRef.current.clear();
    onScreenShareEnded?.();
  }, [onScreenShareEnded]);

  return {
    peerReady,
    localMicStream,
    activeVoiceCalls,
    remoteAudioStreams,
    requestLocalMicrophone,
    startScreenShare,
    stopScreenShare,
  };
}
