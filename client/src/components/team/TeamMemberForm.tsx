import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Form schema - matches user schema but without password confirmation
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.string().min(1, "Role is required"),
  phone: z.string().optional(),
});

// Type for our form fields
type FormValues = z.infer<typeof formSchema>;

interface TeamMemberFormProps {
  initialData?: FormValues;
  onSuccess?: () => void;
}

export default function TeamMemberForm({ initialData, onSuccess }: TeamMemberFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: "",
      username: "",
      email: "",
      password: "",
      role: "",
      phone: "",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/users", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Team member created",
        description: "The team member has been successfully added",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      form.reset();
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating team member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("PATCH", `/api/users/${initialData?.username}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Team member updated",
        description: "The team member information has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating team member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Determine if we're creating or updating
  const isEditing = Boolean(initialData);
  const mutation = isEditing ? updateMutation : createMutation;

  // Handle form submission
  const onSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter team member's full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Email address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Phone number" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="ops">Operations Manager</SelectItem>
                  <SelectItem value="va">Virtual Assistant</SelectItem>
                  <SelectItem value="maintenance">Maintenance Technician</SelectItem>
                  <SelectItem value="cleaner">Cleaning Staff</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Login username" {...field} disabled={isEditing} />
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
              <FormLabel>{isEditing ? "New Password (leave blank to keep current)" : "Password"}</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input 
                    type={passwordVisible ? "text" : "password"} 
                    placeholder={isEditing ? "New password (optional)" : "Set password"} 
                    {...field}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 px-2 text-xs"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                >
                  {passwordVisible ? "Hide" : "Show"}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => {
              form.reset();
              if (onSuccess) onSuccess();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update" : "Add"} Team Member
          </Button>
        </div>
      </form>
    </Form>
  );
}