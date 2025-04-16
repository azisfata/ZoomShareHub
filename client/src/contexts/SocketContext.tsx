import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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
      toast({
        title: 'Sesi Berakhir',
        description: data.message,
        variant: 'destructive',
      });
      
      // Wait 3 seconds to show the message before logout
      setTimeout(() => {
        logoutMutation.mutate();
        setLocation('/auth');
      }, 3000);
    });

    // Authenticate socket when user logs in
    if (user) {
      socket.emit('authenticate', user.id);
    }

    return () => {
      socket.off('force_logout');
    };
  }, [socket, user, logoutMutation, setLocation, toast]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
