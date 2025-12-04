import { Server } from 'socket.io';

export const setupSocket = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Kommentare: Raum-basierte Kommunikation pro Task
    socket.on('comments:join', ({ taskId }: { taskId: string }) => {
      if (!taskId) return;
      socket.join(`task:${taskId}`);
    });

    socket.on('comments:leave', ({ taskId }: { taskId: string }) => {
      if (!taskId) return;
      socket.leave(`task:${taskId}`);
    });

    // Chat verwendet die gleichen Räume, aber eigene Events
    socket.on('chat:join', ({ taskId }: { taskId: string }) => {
      if (!taskId) return;
      socket.join(`task:${taskId}`);
    });

    socket.on('chat:leave', ({ taskId }: { taskId: string }) => {
      if (!taskId) return;
      socket.leave(`task:${taskId}`);
    });

    // Kundenchat (separat)
    socket.on('customerChat:join', ({ taskId }: { taskId: string }) => {
      if (!taskId) return;
      socket.join(`task:${taskId}`);
    });
    socket.on('customerChat:leave', ({ taskId }: { taskId: string }) => {
      if (!taskId) return;
      socket.leave(`task:${taskId}`);
    });

    // Serverseitiges Echo für Demo; in Produktion: nach DB-Insert vom API-Route emitten
    socket.on('comments:new', (payload: any) => {
      const { taskId } = payload || {};
      if (!taskId) return;
      io.to(`task:${taskId}`).emit('comments:created', payload);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // Begrüßung optional
  });
};