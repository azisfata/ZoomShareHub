import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { useSidebarCollapse } from '@/contexts/SidebarCollapseContext';

type BookingWithZoomAccount = {
  id: number;
  userId: number;
  zoomAccountId: number | null;
  meetingTitle: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  department: string;
  participants: number;
  purpose: string;
  needsRecording: boolean;
  needsBreakoutRooms: boolean;
  needsPolls: boolean;
  status: string;
  createdAt: string;
  zoomAccount: {
    id: number;
    name: string;
    username: string;
    password: string;
    isActive: boolean;
  } | null;
};

export default function MyBookings() {
  const [bookingToCancel, setBookingToCancel] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isCollapsed } = useSidebarCollapse();

  const { data: bookings, isLoading, refetch } = useQuery<BookingWithZoomAccount[]>({
    queryKey: ["/api/bookings"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Ensure data is updated when the component mounts or when redirected here
  useEffect(() => {
    refetch();
  }, [refetch]);

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/bookings/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Pemesanan dibatalkan",
        description: "Pemesanan Anda telah berhasil dibatalkan.",
      });
    },
    onError: (error) => {
      toast({
        title: "Gagal membatalkan pemesanan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  const formatTime = (timeString: string) => {
    // Convert 24-hour format to 12-hour with AM/PM
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Dikonfirmasi</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Menunggu</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">Dibatalkan</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Selesai</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Sort bookings by date and time (newest first)
  const sortedBookings = bookings?.slice().sort((a, b) => {
    const dateA = new Date(`${a.meetingDate}T${a.startTime}`).getTime();
    const dateB = new Date(`${b.meetingDate}T${b.startTime}`).getTime();
    return dateB - dateA;
  });

  return (
    <>
      <MobileHeader />
      <Sidebar />

      <main className={`transition-all duration-300 ${isCollapsed ? "md:pl-16" : "md:pl-64"} pt-16 md:pt-0`}>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Pemesanan Saya</h1>
            <p className="text-gray-600">Lihat dan kelola pemesanan akun Zoom Anda</p>
          </div>

          <div className="mb-6 flex flex-wrap gap-4">
            <Button asChild>
              <Link href="/request">
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Pemesanan Baru
              </Link>
            </Button>
          </div>

          {/* Bookings List */}
          <Card>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Pemesanan Anda</h2>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : sortedBookings?.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500">Anda belum memiliki pemesanan</p>
                  <Button asChild className="mt-4">
                    <Link href="/request">Minta Akun Zoom</Link>
                  </Button>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-neutral-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Judul Rapat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal & Waktu</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akun</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Password</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {sortedBookings?.map((booking) => (
                      <tr key={booking.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium">{booking.meetingTitle}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(booking.meetingDate)}, {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(booking.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {booking.zoomAccount ? booking.zoomAccount.name : 'Menunggu Penugasan'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {booking.zoomAccount ? booking.zoomAccount.password : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {booking.status === 'confirmed' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                  Batalkan
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Batalkan Pemesanan</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Apakah Anda yakin ingin membatalkan pemesanan ini? Tindakan ini tidak dapat dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Tidak, tetap simpan</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => cancelMutation.mutate(booking.id)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Ya, batalkan
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}