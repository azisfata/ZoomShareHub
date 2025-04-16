import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Simpan sessionId di localStorage
  useEffect(() => {
    if (user && (user as any).sessionId) {
      localStorage.setItem('sessionId', (user as any).sessionId);
      // Join room sessionId di socket
      if (socket && (user as any).sessionId) {
        socket.emit('join_session', (user as any).sessionId);
      }
    }
  }, [user, socket]);

  useEffect(() => {
    // Connect to socket server
    const socketInstance = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Handle force logout event
    socket.on('force_logout', (data) => {
      const mySessionId = localStorage.getItem('sessionId');
      if (data.sessionId && data.sessionId === mySessionId) {
        // Abaikan event jika sessionId sama
        return;
      }
      
      toast({
        title: 'Sesi Berakhir',
        description: data.message,
        variant: 'destructive',
      });
      
      // Immediately clear user data and redirect
      queryClient.setQueryData(["/api/user"], null);
      
      // Redirect to login page immediately
      setLocation('/auth');
    });

    // Authenticate socket when user logs in
    if (user) {
      socket.emit('authenticate', user.id);
    }

    return () => {
      socket.off('force_logout');
    };
  }, [socket, user, setLocation, toast]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
