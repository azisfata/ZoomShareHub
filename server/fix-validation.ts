// Fungsi untuk memperbaiki validasi waktu
export function isValidMeetingTime(meetingDate: string, startTime: string): boolean {
  const now = new Date();
  
  // Parse tanggal dan waktu meeting dengan benar
  const [year, month, day] = meetingDate.split('-').map(Number);
  const [hours, minutes] = startTime.split(':').map(Number);
  
  // Buat objek Date dengan nilai yang benar (bulan dimulai dari 0 di JavaScript)
  const meetingDateTime = new Date(year, month - 1, day, hours, minutes);
  
  console.log('Current time:', now.toISOString());
  console.log('Meeting time:', meetingDateTime.toISOString());
  
  // Jika tanggal meeting di masa depan, selalu valid
  if (meetingDateTime.getFullYear() > now.getFullYear()) {
    return true;
  }
  
  // Jika tahun sama, periksa bulan
  if (meetingDateTime.getFullYear() === now.getFullYear() && 
      meetingDateTime.getMonth() > now.getMonth()) {
    return true;
  }
  
  // Jika bulan sama, periksa tanggal
  if (meetingDateTime.getFullYear() === now.getFullYear() && 
      meetingDateTime.getMonth() === now.getMonth() && 
      meetingDateTime.getDate() > now.getDate()) {
    return true;
  }
  
  // Jika tanggal sama, periksa jam dan menit
  if (meetingDateTime.getFullYear() === now.getFullYear() && 
      meetingDateTime.getMonth() === now.getMonth() && 
      meetingDateTime.getDate() === now.getDate()) {
    
    // Bandingkan waktu (jam dan menit)
    const nowTime = now.getHours() * 60 + now.getMinutes();
    const meetingTime = hours * 60 + minutes;
    
    return meetingTime >= nowTime;
  }
  
  // Jika tanggal meeting di masa lalu, tidak valid
  return false;
}
