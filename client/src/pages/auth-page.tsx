import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function AuthPage() {
  const { user, loginMutation } = useAuth();

  const loginForm = useForm<z.infer<typeof loginSchema>>({    
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-100">
      <div className="container mx-auto grid md:grid-cols-2 gap-6 px-4">
        <div className="flex flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">Manajemen Akun Zoom</h1>
            <p className="text-gray-600">Masuk untuk meminta dan mengelola akun Zoom untuk rapat Anda</p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Masuk</CardTitle>
              <CardDescription>
                Masukkan kredensial Anda untuk mengakses akun Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Pengguna</FormLabel>
                        <FormControl>
                          <Input placeholder="nama pengguna" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kata Sandi</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="********" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Sedang Masuk..." : "Masuk"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        
        <div className="hidden md:flex flex-col justify-center">
          <div className="bg-primary text-white rounded-lg p-8 shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Sistem Peminjaman Akun Zoom</h2>
            <p className="mb-6">Akses akun Zoom perusahaan untuk rapat Anda tanpa repot berbagi akun atau mengelola kredensial.</p>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-white bg-opacity-20 p-2 rounded-full mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="M12 5v14"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Pemesanan Mudah</h3>
                  <p className="text-sm opacity-90">Minta akses ke akun Zoom hanya dengan beberapa klik</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-white bg-opacity-20 p-2 rounded-full mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Manajemen Jadwal</h3>
                  <p className="text-sm opacity-90">Lihat dan kelola pemesanan akun Zoom Anda</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-white bg-opacity-20 p-2 rounded-full mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Akses Instan</h3>
                  <p className="text-sm opacity-90">Dapatkan akses langsung ke kredensial rapat</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
