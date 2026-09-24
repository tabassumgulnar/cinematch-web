import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { Room, User } from './types';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
export const firebaseApp = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

// Firebase Auth with Local Persistence
export const auth = getAuth(firebaseApp);
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Firebase Auth persistence error:', err);
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Firestore Instance (supporting custom databaseId from config)
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

export interface FirestoreUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  lastLogin: string;
}

/**
 * Save or update user profile under collection users/{uid}
 */
export async function saveUserProfileInFirestore(user: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}) {
  if (!user || !user.uid) return;

  const profileData: FirestoreUserProfile = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'CineMatch User',
    photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
    lastLogin: new Date().toISOString(),
  };

  try {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, profileData, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Failed to save user profile, saving locally:', err);
  }

  // Also cache in localStorage for instant retrieval across tabs
  localStorage.setItem(`cinematch_user_profile_${user.uid}`, JSON.stringify(profileData));
}

/**
 * Generate a truly random dynamic Room ID (e.g. ROOM_489213)
 */
export function generateRandomRoomId(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `ROOM_${digits}`;
}

/**
 * Save complete room state under Firestore collection rooms/{roomId}
 */
export async function saveRoomToFirestore(room: Room): Promise<void> {
  if (!room || !room.code) return;
  try {
    const roomDocRef = doc(db, 'rooms', room.code);
    await setDoc(
      roomDocRef,
      {
        id: room.id || `room-${room.code}`,
        code: room.code,
        hostId: room.hostId,
        filters: room.filters,
        users: room.users || [],
        votes: room.votes || {},
        matches: room.matches || [],
        matchHistory: room.matchHistory || [],
        status: room.status || 'lobby',
        currentMovieIndex: room.currentMovieIndex || 0,
        vibe: room.vibe || null,
        watchParty: room.watchParty || null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[Firestore] Error saving room to Firestore:', err);
  }
}

/**
 * Subscribe to real-time room updates in Firestore under rooms/{roomCode}
 */
export function subscribeToRoomInFirestore(
  roomCode: string,
  onUpdate: (roomData: Partial<Room>) => void,
  onError?: (err: any) => void
): () => void {
  if (!roomCode) return () => {};

  try {
    const roomDocRef = doc(db, 'rooms', roomCode);
    const unsubscribe = onSnapshot(
      roomDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<Room>;
          onUpdate(data);
        }
      },
      (err) => {
        console.warn(`[Firestore] Snapshot error on room ${roomCode}:`, err);
        onError?.(err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn(`[Firestore] Could not attach listener for room ${roomCode}:`, err);
    return () => {};
  }
}

/**
 * Update Watch Party playback & screen share state in Firestore
 */
export async function updateRoomWatchPartyInFirestore(
  roomCode: string,
  watchPartyState: any
): Promise<void> {
  if (!roomCode) return;
  try {
    const roomDocRef = doc(db, 'rooms', roomCode);
    await updateDoc(roomDocRef, {
      watchParty: watchPartyState,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    // If updateDoc fails (e.g. doc doesn't exist yet), use setDoc with merge
    try {
      const roomDocRef = doc(db, 'rooms', roomCode);
      await setDoc(roomDocRef, { watchParty: watchPartyState, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (fallbackErr) {
      console.warn('[Firestore] Error updating watch party state:', fallbackErr);
    }
  }
}

/**
 * Room Chat Message Interface
 */
export interface RoomChatMessage {
  id: string;
  roomCode: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: number;
}

/**
 * Send real-time in-room chat message to Firestore under rooms/{roomCode}/messages
 */
export async function sendRoomChatMessage(
  roomCode: string,
  message: Omit<RoomChatMessage, 'id' | 'timestamp'>
): Promise<void> {
  if (!roomCode || !message.text.trim()) return;
  try {
    const messagesCol = collection(db, 'rooms', roomCode, 'messages');
    await addDoc(messagesCol, {
      ...message,
      text: message.text.trim(),
      timestamp: Date.now(),
    });
  } catch (err) {
    console.warn('[Firestore] Error sending room chat message:', err);
  }
}

/**
 * Subscribe to real-time chat messages for a room from Firestore
 */
export function subscribeToRoomChat(
  roomCode: string,
  onMessages: (messages: RoomChatMessage[]) => void
): () => void {
  if (!roomCode) return () => {};
  try {
    const messagesCol = collection(db, 'rooms', roomCode, 'messages');
    const q = query(messagesCol, orderBy('timestamp', 'asc'), limit(60));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messages: RoomChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          messages.push({
            id: docSnap.id,
            roomCode,
            senderId: data.senderId || '',
            senderName: data.senderName || 'Anonymous',
            senderAvatar:
              data.senderAvatar ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.senderId || 'user'}`,
            text: data.text || '',
            timestamp: data.timestamp || Date.now(),
          });
        });
        onMessages(messages);
      },
      (err) => {
        console.warn(`[Firestore] Chat subscription error for room ${roomCode}:`, err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn(`[Firestore] Failed to attach chat listener:`, err);
    return () => {};
  }
}

/**
 * Save room swipe history under rooms/{roomId}
 */
export async function saveRoomSwipeInFirestore(
  roomId: string,
  userId: string,
  voteType: string,
  movieTitle: string,
  likesCount: number = 0,
  matchesCount: number = 0
) {
  try {
    const roomDocRef = doc(db, 'rooms', roomId);
    await setDoc(
      roomDocRef,
      {
        roomId,
        updatedAt: new Date().toISOString(),
        lastVote: {
          userId,
          vote: voteType,
          movieTitle,
          timestamp: new Date().toISOString(),
        },
        likesCount,
        matchesCount,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[Firestore] Failed to record room swipe:', err);
  }
}

