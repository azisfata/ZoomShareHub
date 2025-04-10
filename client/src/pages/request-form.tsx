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
import { Link } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { CredentialsModal } from "@/components/modals/credentials-modal";
import { Booking, InsertBooking, ZoomAccount } from "@shared/schema";

const bookingFormSchema = z.object({
  meetingTitle: z.string().min(3, "Title must be at least 3 characters"),
  meetingDate: z.string().min(1, "Date is required"),
  department: z.string().min(1, "Department is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  participants: z.coerce.number().min(1, "At least 1 participant is required"),
  purpose: z.string().min(5, "Purpose must be at least 5 characters"),
  needsRecording: z.boolean().default(false),
  needsBreakoutRooms: z.boolean().default(false),
  needsPolls: z.boolean().default(false),
}).refine(data => {
  if (data.startTime >= data.endTime) {
    return false;
  }
  return true;
}, {
  message: "End time must be after start time",
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
  
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      meetingTitle: "",
      meetingDate: new Date().toISOString().split('T')[0], // Today's date as default
      department: "",
      startTime: "",
      endTime: "",
      participants: 1,
      purpose: "",
      needsRecording: false,
      needsBreakoutRooms: false,
      needsPolls: false,
    },
  });
  
  const bookingMutation = useMutation({
    mutationFn: async (data: BookingFormValues) => {
      const res = await apiRequest("POST", "/api/bookings", data);
      return res.json();
    },
    onSuccess: (data: { booking: Booking, zoomAccount: ZoomAccount | null }) => {
      if (data.zoomAccount) {
        setZoomAccount(data.zoomAccount);
        setMeetingDetails({
          date: data.booking.meetingDate,
          startTime: data.booking.startTime,
          endTime: data.booking.endTime,
        });
        setShowCredentials(true);
      }
    },
  });
  
  function onSubmit(data: BookingFormValues) {
    bookingMutation.mutate(data);
  }
  
  return (
    <>
      <MobileHeader />
      <Sidebar />
      
      <main className="md:pl-64 pt-16 md:pt-0">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Request Zoom Account</h1>
            <p className="text-gray-600">Fill out the form to request a Zoom account for your meeting</p>
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
                        <FormLabel>Meeting Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Marketing Team Meeting" {...field} />
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
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="IT">IT</SelectItem>
                              <SelectItem value="Marketing">Marketing</SelectItem>
                              <SelectItem value="Sales">Sales</SelectItem>
                              <SelectItem value="Finance">Finance</SelectItem>
                              <SelectItem value="HR">Human Resources</SelectItem>
                              <SelectItem value="Operations">Operations</SelectItem>
                            </SelectContent>
                          </Select>
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
                          <FormLabel>Start Time</FormLabel>
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
                          <FormLabel>End Time</FormLabel>
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
                        <FormLabel>Expected Number of Participants</FormLabel>
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
                        <FormLabel>Meeting Purpose</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Briefly describe the purpose of this meeting" 
                            rows={3} 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div>
                    <FormLabel>Required Features</FormLabel>
                    <div className="mt-2 space-y-2">
                      <FormField
                        control={form.control}
                        name="needsRecording"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Recording</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="needsBreakoutRooms"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Breakout Rooms</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="needsPolls"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Polls</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 flex justify-end space-x-3">
                    <Button type="button" variant="outline" asChild>
                      <Link href="/">Cancel</Link>
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={bookingMutation.isPending}
                    >
                      {bookingMutation.isPending ? "Submitting..." : "Submit Request"}
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
