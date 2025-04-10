import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Calendar, Monitor, Users } from "lucide-react";
import { BadgePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

type AdminStats = {
  totalBookings: number;
  totalUsers: number;
  activeZoomAccounts: number;
  inactiveZoomAccounts: number;
  pendingBookings: number;
  completedBookings: number;
  accountsWithStatus: Array<{
    id: number;
    name: string;
    username: string;
    isActive: boolean;
  }>;
  latestBookings: Array<{
    id: number;
    meetingTitle: string;
    meetingDate: string;
    startTime: string;
    endTime: string;
    status: string;
    zoomAccount?: {
      name: string;
    };
  }>;
  users: Array<{
    id: number;
    name: string;
    username: string;
  }>;
};

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const queryClient = useQueryClient();

  return (
    <>
      <MobileHeader />
      <Sidebar />
      
      <main className="md:pl-64 pt-16 md:pt-0">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Portal Admin</h1>
            <p className="text-gray-600">Kelola akun Zoom dan lihat statistik penggunaan</p>
          </div>

          {isLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
                    <User className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Pemesanan</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalBookings || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Akun Zoom Aktif</CardTitle>
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.activeZoomAccounts || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Akun Zoom Nonaktif</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.inactiveZoomAccounts || 0}</div>
                  </CardContent>
                </Card>
              </div>
              
              <Tabs defaultValue="accounts" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="accounts">Akun Zoom</TabsTrigger>
                  <TabsTrigger value="bookings">Semua Pemesanan</TabsTrigger>
                  <TabsTrigger value="users">Pengguna</TabsTrigger>
                </TabsList>
                
                <TabsContent value="accounts" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Kelola Akun Zoom</h2>
                    <Button asChild>
                      <Link href="/admin/accounts/new">
                        <BadgePlus className="h-4 w-4 mr-2" />
                        Tambah Akun Zoom
                      </Link>
                    </Button>
                  </div>
                  
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-neutral-100">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Akun</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tindakan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {stats?.accountsWithStatus?.map((account) => (
                              <tr key={account.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium">{account.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm">{account.username}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge variant={account.isActive ? "outline" : "secondary"}>
                                    {account.isActive ? "Aktif" : "Nonaktif"}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                  <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/admin/accounts/${account.id}/edit`}>
                                      <Edit className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="bookings" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Semua Pemesanan</h2>
                  </div>
                  
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-neutral-100">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Judul Meeting</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waktu</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akun Zoom</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {stats?.latestBookings?.map((booking) => (
                              <tr key={booking.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium">{booking.meetingTitle}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm">{booking.meetingDate}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm">{booking.startTime} - {booking.endTime}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge variant={booking.status === "confirmed" ? "outline" : "secondary"}>
                                    {booking.status === "confirmed" ? "Terkonfirmasi" : "Pending"}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm">{booking.zoomAccount?.name || "-"}</div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="users" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Kelola Pengguna</h2>
                  </div>
                  
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-neutral-100">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tindakan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {stats?.users?.map((user) => (
                              <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium">{user.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm">{user.username}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                  <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/admin/users/${user.id}/edit`}>
                                      <Edit className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </main>
    </>
  );
}