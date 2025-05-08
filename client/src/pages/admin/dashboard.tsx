import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Calendar, Monitor, Users, Trash2 } from "lucide-react";
import { BadgePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useSidebarCollapse } from '@/contexts/SidebarCollapseContext';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const registerSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),

  role: z.enum(["user", "admin"]).default("user"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

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
    department?: string;
    role?: string;
  }>;
};

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { isCollapsed } = useSidebarCollapse();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      username: '',
      password: '',

      email: '',
      role: 'user',
    },
    mode: 'onChange',
    reValidateMode: 'onBlur',
  });

  const addUserMutation = useMutation({
    mutationFn: async (values: RegisterFormValues) => {
      const res = await apiRequest('POST', '/api/admin/users', values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "User berhasil ditambahkan",
        description: `User ${form.getValues("username") || "-"} telah ditambahkan`,
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Gagal menambahkan user",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('DELETE', `/api/admin/users/${userId}`);
      if (!res.ok) throw new Error('Gagal menghapus user');
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: 'User berhasil dihapus' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal menghapus user', description: error.message, variant: 'destructive' });
    }
  });

  const handleDeleteUser = (userId: number, username: string) => {
    if (window.confirm(`Yakin ingin menghapus user "${username}"?`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const onSubmit = (values: RegisterFormValues) => {
    addUserMutation.mutate(values);
  };

  return (
    <>
      <MobileHeader />
      <Sidebar />
      
      <main className={`transition-all duration-300 ${isCollapsed ? "md:pl-16" : "md:pl-64"} pt-16 md:pt-0`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Portal Admin</h1>
              <p className="text-gray-600">Kelola akun Zoom dan lihat statistik penggunaan</p>
            </div>
            
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
                                  {(() => {
                                    switch (booking.status) {
                                      case "confirmed":
                                        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Terkonfirmasi</Badge>;
                                      case "pending":
                                        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Menunggu</Badge>;
                                      case "cancelled":
                                        return <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">Dibatalkan</Badge>;
                                      case "completed":
                                        return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Selesai</Badge>;
                                      default:
                                        return <Badge variant="outline">{booking.status}</Badge>;
                                    }
                                  })()}
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
                  <Card>
                    <CardHeader className="flex flex-row justify-between items-center">
                      <CardTitle>Daftar Pengguna</CardTitle>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button>
                            <Users className="mr-2 h-4 w-4" />
                            Tambah User
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Tambah User Baru</DialogTitle>
                            <DialogDescription>
                              Isi form berikut untuk menambahkan user baru ke sistem
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={form.handleSubmit(onSubmit)}>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Nama</Label>
                                <Input id="name" {...form.register("name")} className="col-span-3" />
                                <div className="col-span-4">
                                  {(form.formState.errors.name && (form.formState.touchedFields.name || form.watch('name') !== '')) && (
                                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message as string}</p>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="username" className="text-right">Username</Label>
                                <Input id="username" {...form.register("username")} className="col-span-3" />
                                <div className="col-span-4">
                                  {(form.formState.errors.username && (form.formState.touchedFields.username || form.watch('username') !== '')) && (
                                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.username.message as string}</p>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="password" className="text-right">Password</Label>
                                <Input id="password" type="password" {...form.register("password")} className="col-span-3" />
                                <div className="col-span-4">
                                  {(form.formState.errors.password && (form.formState.touchedFields.password || form.watch('password') !== '')) && (
                                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.password.message as string}</p>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">Email</Label>
                                <Input id="email" type="email" {...form.register("email")} className="col-span-3" />
                                <div className="col-span-4">
                                  {(form.formState.errors.email && (form.formState.touchedFields.email || form.watch('email') !== '')) && (
                                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message as string}</p>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="role" className="text-right">Role</Label>
                                <select id="role" {...form.register("role")} className="col-span-3 border rounded px-2 py-1 h-10">
                                  <option value="user">User</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <Button type="submit" variant="primary" className="w-full md:w-auto">
                                Tambah User
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-neutral-100">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
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
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm capitalize">{user.role || "-"}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                  <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/admin/users/${user.id}/edit`}>
                                      <Edit className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteUser(user.id, user.username)}
                                    disabled={deleteUserMutation.isPending}
                                    aria-label={`Hapus user ${user.username}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
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