import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Link } from "wouter";
import { Loader2, User, Calendar, Monitor } from "lucide-react";
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

type DashboardStats = {
  availableAccountsCount: number;
  bookedAccountsCount: number;
  userActiveBookingsCount: number;
};

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

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false); // Added state for isCollapsed

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
  });

  const { data: bookings, isLoading: bookingsLoading, refetch } = useQuery<BookingWithZoomAccount[]>({
    queryKey: ["/api/bookings"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

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
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString("id-ID", options);
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
            Dikonfirmasi
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            Menunggu
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            Dibatalkan
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            Selesai
          </Badge>
        );
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
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed}/> {/* Pass isCollapsed and setIsCollapsed to Sidebar */}

      <main className={`transition-all duration-300 ${isCollapsed ? "md:pl-16" : "md:pl-64"} pt-16 md:pt-0`}>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Dasbor</h1>
            <p className="text-gray-600">Periksa dan kelola ketersediaan akun Zoom</p>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {statsLoading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="h-12 w-12 rounded-full bg-neutral-100 animate-pulse mr-4" />
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-neutral-100 animate-pulse" />
                          <div className="h-6 w-16 bg-neutral-100 animate-pulse" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-green-100 p-3 rounded-full mr-4">
                        <Monitor className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Akun Tersedia</p>
                        <p className="text-2xl font-bold">{stats?.availableAccountsCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Sedang Digunakan</p>
                        <p className="text-2xl font-bold">{stats?.bookedAccountsCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-purple-100 p-3 rounded-full mr-4">
                        <User className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Pemesanan Aktif Anda</p>
                        <p className="text-2xl font-bold">{stats?.userActiveBookingsCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
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
            <CardHeader>
              <CardTitle>Pemesanan Saya</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {bookingsLoading ? (
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
                            {booking.zoomAccount ? booking.zoomAccount.name : "Menunggu Penugasan"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {booking.zoomAccount ? booking.zoomAccount.password : "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {booking.status === "confirmed" && (
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
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}