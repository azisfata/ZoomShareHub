import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Edit, Trash2, Plus, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { ZoomAccount } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AdminAccounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [accountToDelete, setAccountToDelete] = useState<number | null>(null);
  
  const { data: accounts, isLoading } = useQuery<ZoomAccount[]>({
    queryKey: ["/api/admin/accounts"],
  });
  
  const toggleAccountStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/accounts/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Status akun diperbarui",
        description: "Status akun Zoom telah berhasil diperbarui",
      });
    },
    onError: (error) => {
      toast({
        title: "Gagal memperbarui status akun",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/accounts/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Akun dihapus",
        description: "Akun Zoom telah berhasil dihapus",
      });
      setAccountToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Gagal menghapus akun",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleToggleStatus = (id: number, currentStatus: boolean) => {
    toggleAccountStatusMutation.mutate({ id, isActive: !currentStatus });
  };
  
  return (
    <>
      <MobileHeader />
      <Sidebar />
      
      <main className="md:pl-64 pt-16 md:pt-0">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Kelola Akun Zoom</h1>
              <p className="text-gray-600">Tambah, edit, atau nonaktifkan akun Zoom</p>
            </div>
            <Button asChild>
              <Link href="/admin/accounts/new">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Akun Zoom
              </Link>
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : accounts?.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500">Belum ada akun Zoom yang terdaftar</p>
                  <Button asChild className="mt-4">
                    <Link href="/admin/accounts/new">Tambah Akun Zoom</Link>
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Akun</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aktifkan/Nonaktifkan</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {accounts?.map((account) => (
                        <tr key={account.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium">{account.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">{account.username}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {account.isActive ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                                <Check className="h-3 w-3 mr-1" />
                                Aktif
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">
                                <X className="h-3 w-3 mr-1" />
                                Nonaktif
                              </Badge>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <Switch 
                              checked={account.isActive} 
                              onCheckedChange={() => handleToggleStatus(account.id, account.isActive)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/admin/accounts/${account.id}/edit`}>
                                  <Edit className="h-4 w-4" />
                                </Link>
                              </Button>
                              
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => setAccountToDelete(account.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Hapus Akun Zoom</DialogTitle>
                                    <DialogDescription>
                                      Apakah Anda yakin ingin menghapus akun Zoom ini? Tindakan ini tidak dapat dibatalkan
                                      dan akan menghapus semua data terkait akun ini.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setAccountToDelete(null)}>
                                      Batal
                                    </Button>
                                    <Button 
                                      variant="destructive" 
                                      onClick={() => {
                                        if (accountToDelete) {
                                          deleteAccountMutation.mutate(accountToDelete);
                                        }
                                      }}
                                    >
                                      Hapus
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}