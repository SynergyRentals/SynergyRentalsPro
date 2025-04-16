import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema, loginUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AutoAwesome } from "@mui/icons-material";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (loginMutation.error) {
      toast({
        title: "Login failed",
        description: loginMutation.error.message || "Invalid username or password",
        variant: "destructive"
      });
    }
  }, [loginMutation.error, toast]);
  const [, navigate] = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<z.infer<typeof loginUserSchema>>({
    resolver: zodResolver(loginUserSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const handleLogin = async (data: z.infer<typeof loginUserSchema>) => {
    try {
      await loginMutation.mutateAsync(data);
    } catch (error) {
      // Error will be handled by the useEffect above
      console.error("Login error:", error);
    }
  };

  // Register form with extended validation
  const extendedRegisterSchema = insertUserSchema.extend({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  }).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

  const registerForm = useForm<z.infer<typeof extendedRegisterSchema>>({
    resolver: zodResolver(extendedRegisterSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "va", // Default role
      phone: "",
    },
  });

  const handleRegister = (data: z.infer<typeof extendedRegisterSchema>) => {
    // Remove confirmPassword before sending to API
    const { confirmPassword, ...userData } = data;
    registerMutation.mutate(userData);
  };
  
  // If redirecting, don't render the form
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F5F5F7]">
      <div className="w-full md:w-1/2 p-4 md:p-8 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex justify-center mb-6">
              <div className="flex items-center">
                <AutoAwesome className="text-[#FFCF45] text-3xl mr-2" />
                <h1 className="text-2xl font-bold text-[#2C2E3E]">Synergy Rentals AI Brain</h1>
              </div>
            </div>
            
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your username" {...field} />
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
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter your password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="remember" />
                        <label htmlFor="remember" className="text-sm text-gray-600">
                          Remember me
                        </label>
                      </div>
                      
                      <Button variant="link" className="text-[#FFCF45] p-0 h-auto">
                        Forgot password?
                      </Button>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-[#2C2E3E] hover:bg-opacity-90" 
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing in..." : "Sign in"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Choose a username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Create a password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm your password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-[#2C2E3E] hover:bg-opacity-90"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating account..." : "Create account"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
            
            <div className="text-sm text-center text-gray-600 mt-4">
              <p>Contact your administrator if you need access</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="hidden md:flex md:w-1/2 bg-[#2C2E3E] text-white items-center justify-center p-8">
        <div className="max-w-lg">
          <h2 className="text-3xl font-bold mb-6">Welcome to Synergy Rentals AI Brain</h2>
          <p className="text-lg mb-8">
            Your all-in-one platform for managing short-term rental operations with the power of AI.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-[#FFCF45] rounded-full p-2 mr-4">
                <AutoAwesome className="text-[#2C2E3E]" />
              </div>
              <div>
                <h3 className="font-semibold text-xl">Streamlined Operations</h3>
                <p className="text-[#9EA2B1]">Manage cleaning, maintenance, inventory, and staff all in one place.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-[#FFCF45] rounded-full p-2 mr-4">
                <AutoAwesome className="text-[#2C2E3E]" />
              </div>
              <div>
                <h3 className="font-semibold text-xl">AI-Powered Insights</h3>
                <p className="text-[#9EA2B1]">Let AI help you optimize operations and improve guest experience.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-[#FFCF45] rounded-full p-2 mr-4">
                <AutoAwesome className="text-[#2C2E3E]" />
              </div>
              <div>
                <h3 className="font-semibold text-xl">Real-time Collaboration</h3>
                <p className="text-[#9EA2B1]">Connect your entire team with instant updates and notifications.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
