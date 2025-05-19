import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { CredentialsModal } from "@/components/modals/credentials-modal";
import { Booking, InsertBooking, ZoomAccount } from "@shared/schema";
import { useSidebarCollapse } from '@/contexts/SidebarCollapseContext';
import { useToast } from "@/hooks/use-toast";

const bookingFormSchema = z.object({
  meetingTitle: z.string().min(3, "Judul harus minimal 3 karakter"),
  meetingDate: z.string().min(1, "Tanggal wajib diisi"),
  startTime: z.string().min(1, "Waktu mulai wajib diisi"),
  endTime: z.string().min(1, "Waktu selesai wajib diisi"),
  participants: z.coerce.number().min(1, "Minimal 1 peserta diperlukan"),
  purpose: z.string().min(5, "Tujuan harus minimal 5 karakter"),
}).refine(data => {
  if (data.startTime >= data.endTime) {
    return false;
  }
  return true;
}, {
  message: "Waktu selesai harus setelah waktu mulai",
  path: ["endTime"],
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

export default function RequestForm() {
  const [showCredentials, setShowCredentials] = useState(false);
  const [zoomAccount, setZoomAccount] = useState<ZoomAccount | null>(null);
  const [meetingDetails, setMeetingDetails] = useState<{
    date: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      meetingTitle: "",
      meetingDate: new Date().toISOString().split('T')[0], // Today's date as default
      startTime: "",
      endTime: "",
      participants: 1,
      purpose: "",
    },
  });
  
  const bookingMutation = useMutation({
    mutationFn: async (data: BookingFormValues) => {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Gagal membuat permintaan");
      }
      return result;
    },
    onSuccess: (data) => {
      if (data.success && data.zoomAccount) {
        // Jika booking berhasil dan mendapatkan akun Zoom
        setZoomAccount(data.zoomAccount);
        setMeetingDetails({
          date: data.booking.meetingDate,
          startTime: data.booking.startTime,
          endTime: data.booking.endTime,
        });
        setShowCredentials(true);
        // Reset form setelah berhasil booking
        form.reset();
      } else if (!data.success) {
        // Tampilkan toast notifikasi jika tidak ada akun Zoom yang tersedia
        toast({
          title: "Tidak ada akun Zoom yang tersedia",
          description: "Silakan coba jadwal lain atau hubungi admin untuk bantuan lebih lanjut.",
          variant: "destructive",
        });
        // Form tetap terbuka, tidak ada redirect
      }
    },
    onError: (error) => {
      toast({
        title: "Terjadi kesalahan",
        description: error.message || "Gagal membuat permintaan",
        variant: "destructive",
      });
    },
  });
  
  const { isCollapsed } = useSidebarCollapse();
  
  function onSubmit(data: BookingFormValues) {
    bookingMutation.mutate(data);
  }
  
  return (
    <>
      <MobileHeader />
      <Sidebar />
      
      <main className={`transition-all duration-300 ${isCollapsed ? "md:pl-16" : "md:pl-64"} pt-16 md:pt-0`}>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Permintaan Akun Zoom</h1>
            <p className="text-gray-600">Isi formulir untuk meminta akun Zoom untuk rapat Anda</p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="meetingTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Judul Rapat</FormLabel>
                        <FormControl>
                          <Input placeholder="contoh: Rapat Tim Marketing" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="meetingDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tanggal</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Waktu Mulai</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Waktu Selesai</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="participants"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Perkiraan Jumlah Peserta</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="purpose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tujuan Rapat</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Jelaskan secara singkat tujuan rapat ini" 
                            rows={3} 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-4 flex justify-end space-x-3">
                    <Button type="button" variant="outline" asChild>
                      <Link href="/">Batal</Link>
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={bookingMutation.isPending}
                    >
                      {bookingMutation.isPending ? "Mengirim..." : "Kirim Permintaan"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <CredentialsModal 
            open={showCredentials} 
            onOpenChange={setShowCredentials} 
            zoomAccount={zoomAccount}
            meetingDetails={meetingDetails}
          />
        </div>
      </main>
    </>
  );
}
