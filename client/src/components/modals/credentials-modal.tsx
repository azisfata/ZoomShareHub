import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomAccount } from "@shared/schema";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

interface CredentialsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zoomAccount: ZoomAccount | null;
  kodeTiket: string;
  meetingDetails: {
    date: string;
    startTime: string;
    endTime: string;
  } | null;
}

export function CredentialsModal({
  open,
  onOpenChange,
  zoomAccount,
  kodeTiket,
  meetingDetails,
}: CredentialsModalProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  if (!zoomAccount || !meetingDetails) {
    return null;
  }

  const formatTime = (timeString: string) => {
    // Convert 24-hour format to 12-hour with AM/PM
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      month: 'long',

      day: 'numeric', 
      year: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">Akun Zoom Ditetapkan</DialogTitle>
        </DialogHeader>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Rapat Anda telah berhasil dijadwalkan. Berikut adalah kredensial akun Zoom Anda:
          </p>
          
          <div className="bg-neutral-100 p-4 rounded-lg font-mono">
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-1">Nama Akun:</p>
              <p className="font-medium">{zoomAccount.name}</p>
            </div>
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-1">Nama Pengguna:</p>
              <p className="font-medium">{zoomAccount.username}</p>
            </div>
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-1">Kata Sandi:</p>
              <p className="font-medium">{zoomAccount.password}</p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800 flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>
                Kredensial ini berlaku dari {formatTime(meetingDetails.startTime)} hingga {formatTime(meetingDetails.endTime)} pada {formatDate(meetingDetails.date)}. Mohon keluar dari akun Zoom setelah rapat Anda selesai.
              </span>
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            onClick={() => {
              // Invalidate the bookings query to ensure fresh data
              queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
              queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
              onOpenChange(false);
              // Redirect to the specified URL with kodeTiket
              window.location.href = `http://103.127.154.23/sinerghi/public/servicedesk/tiket/${kodeTiket}?from=riwayat`;
            }}
          >
            Lihat Pemesanan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
