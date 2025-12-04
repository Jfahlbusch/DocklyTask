'use client';

import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (typeof window === 'undefined') {
    // SSR Guard
    throw new Error('Socket client cannot be used on the server');
  }
  if (!socketInstance) {
    socketInstance = io('/', {
      path: '/api/socketio',
      transports: ['websocket'],
    });
  }
  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}


