import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertZoomAccountSchema } from "@shared/schema";

const zoomAccountFormSchema = z.object({
  name: z.string().min(3, "Nama harus minimal 3 karakter"),
  username: z.string().min(3, "Username harus minimal 3 karakter").email("Format email tidak valid"),
  password: z.string().min(6, "Password harus minimal 6 karakter"),
  isActive: z.boolean().default(true),
});

type ZoomAccountFormValues = z.infer<typeof zoomAccountFormSchema>;

export default function NewZoomAccount() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<ZoomAccountFormValues>({
    resolver: zodResolver(zoomAccountFormSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      isActive: true,
    },
  });
  
  const createAccountMutation = useMutation({
    mutationFn: async (data: ZoomAccountFormValues) => {
      const res = await apiRequest("POST", "/api/admin/accounts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Akun Zoom dibuat",
        description: "Akun Zoom baru telah berhasil dibuat",
      });
      navigate("/admin/accounts");
    },
    onError: (error) => {
      toast({
        title: "Gagal membuat akun",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(data: ZoomAccountFormValues) {
    createAccountMutation.mutate(data);
  }
  
  return (
    <>
      <MobileHeader />
      <Sidebar />
      
      <main className="md:pl-64 pt-16 md:pt-0">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Tambah Akun Zoom</h1>
            <p className="text-gray-600">Tambahkan akun Zoom baru ke sistem</p>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Akun</FormLabel>
                        <FormControl>
                          <Input placeholder="contoh: Zoom Marketing 1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username/Email</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="contoh: zoom1@perusahaan.com" 
                            type="email"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Password akun Zoom" 
                            type="password"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Status Akun
                          </FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Aktifkan atau nonaktifkan akun ini
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-4 flex justify-end space-x-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => navigate("/admin/accounts")}
                    >
                      Batal
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createAccountMutation.isPending}
                    >
                      {createAccountMutation.isPending ? "Menyimpan..." : "Simpan Akun"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}