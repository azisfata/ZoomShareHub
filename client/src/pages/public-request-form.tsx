import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useLocation, useSearch } from "wouter";
import { CredentialsModal } from "@/components/modals/credentials-modal";
import { Booking, InsertBooking, ZoomAccount } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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

export default function PublicRequestForm() {
  const [showCredentials, setShowCredentials] = useState(false);
  const [zoomAccount, setZoomAccount] = useState<ZoomAccount | null>(null);
  const [meetingDetails, setMeetingDetails] = useState<{
    date: string;
    startTime: string;
    endTime: string;
  } | null>(null);

  // Parse query parameters to get the ticket code
  const searchParams = new URLSearchParams(useSearch());
  // Get the first parameter value (format: ?06010004)
  const kodeTiket = Array.from(searchParams.keys())[0] || '';

  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // State untuk status validasi tiket
  const [isValidatingTicket, setIsValidatingTicket] = useState(true);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState<string | null>(null);
  
  // Validate ticket code
  useEffect(() => {
    const validateTicket = async () => {
      if (!kodeTiket) {
        setTicketError("Link yang Anda gunakan tidak valid atau tidak lengkap.");
        setIsValidatingTicket(false);
        return;
      }
      
      setIsValidatingTicket(true);
      try {
        const response = await fetch(`/api/validate-tiket/${kodeTiket}`);
        const data = await response.json();
        
        if (!response.ok) {
          // Handle case when ticket is already used
          if (data.isAlreadyUsed) {
            setTicketError("Kode tiket ini sudah digunakan. Silakan gunakan kode tiket yang lain.");
            
            // Redirect to the error page after 5 seconds
            const timer = setTimeout(() => {
              window.location.href = "http://103.127.154.23/sinerghi/public/servicedesk/error";
            }, 5000);
            
            return () => clearTimeout(timer);
          }
          
          throw new Error(data.message || 'Gagal memvalidasi kode tiket');
        }
        
        if (!data.isValid) {
          setTicketError("Kode tiket yang Anda gunakan tidak terdaftar.");
          
          // Redirect ke halaman riwayat setelah 5 detik
          const timer = setTimeout(() => {
            window.location.href = "http://103.127.154.23/sinerghi/public/servicedesk/riwayat";
          }, 5000);
          
          return () => clearTimeout(timer);
        } else {
          // Simpan nama pegawai jika kode tiket valid
          setEmployeeName(data.employeeName);
        }
      } catch (error) {
        console.error('Error validating ticket:', error);
        setTicketError("Terjadi kesalahan saat memvalidasi kode tiket. Silakan coba lagi nanti.");
      } finally {
        setIsValidatingTicket(false);
      }
    };
    
    validateTicket();
  }, [kodeTiket]);
  
  // Redirect timer effect
  useEffect(() => {
    if (ticketError) {
      const timer = setTimeout(() => {
        window.location.href = "http://103.127.154.23/sinerghi/public/servicedesk/riwayat";
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [ticketError]);

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
      // Include pegawai_id as userId and kode_tiket in the request
      const response = await fetch("/api/public-bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          kodeTiket  // Will be stored in the kode_tiket field
        }),
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
    onError: (error: any) => {
      // Check if the error is because the ticket is already used
      if (error.message.includes('Kode tiket sudah digunakan')) {
        setTicketError("Kode tiket ini sudah digunakan. Silakan gunakan kode tiket yang lain.");
        
        // Redirect to the error page after 5 seconds
        const timer = setTimeout(() => {
          window.location.href = "http://103.127.154.23/sinerghi/public/servicedesk/error";
        }, 5000);
        
        return () => clearTimeout(timer);
      } else {
        // Show a toast for other errors
        toast({
          title: "Terjadi kesalahan",
          description: error.message || "Gagal membuat permintaan",
          variant: "destructive",
        });
      }
    },
  });
  
  const onSubmit = (data: BookingFormValues) => {
    bookingMutation.mutate(data);
  };
  
  // Tampilkan loading saat validasi tiket
  if (isValidatingTicket) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-center text-muted-foreground">Memvalidasi kode tiket...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Tampilkan pesan error jika ada
  if (ticketError) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Kesalahan</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{ticketError}</p>
                <p className="text-sm text-muted-foreground">
                  Anda akan dialihkan ke halaman riwayat dalam 5 detik...
                </p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Formulir Permintaan Akun Zoom</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Informasi Permintaan</AlertTitle>
            <AlertDescription>
              <div className="grid grid-cols-1 gap-2 mt-2">
                <div data-component-name="PublicRequestForm">
                  <div className="mb-2">
                    <span className="font-semibold">Kode Tiket:</span> {kodeTiket}
                  </div>
                  {employeeName && (
                    <div>
                      <span className="font-semibold">Nama Pemohon:</span> {employeeName}
                    </div>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="meetingTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Judul Rapat</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Masukkan judul rapat" 
                        {...field} 
                      />
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
        kodeTiket={kodeTiket}
        meetingDetails={meetingDetails}
      />
    </div>
  );
}
