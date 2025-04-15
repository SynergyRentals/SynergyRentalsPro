import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertGuestSchema, type InsertGuest } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface GuestFormProps {
  onSuccess?: () => void;
  initialData?: any;
  units?: any[];
  onCancel?: () => void;
}

export default function GuestForm({ onSuccess, initialData, units, onCancel }: GuestFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: Partial<InsertGuest> = {
    name: initialData?.name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    unitId: initialData?.unitId || undefined,
    notes: initialData?.notes || "",
    bookingSource: initialData?.bookingSource || "Direct",
    flags: initialData?.flags || [],
    checkIn: initialData?.checkIn ? format(new Date(initialData.checkIn), 'yyyy-MM-dd') : undefined,
    checkOut: initialData?.checkOut ? format(new Date(initialData.checkOut), 'yyyy-MM-dd') : undefined,
    sentiment: initialData?.sentiment || null,
  };

  const form = useForm<InsertGuest>({
    resolver: zodResolver(insertGuestSchema),
    defaultValues,
  });

  const createGuestMutation = useMutation({
    mutationFn: async (data: InsertGuest) => {
      // Convert strings to Date objects for API
      if (data.checkIn) {
        data.checkIn = new Date(data.checkIn);
      }
      if (data.checkOut) {
        data.checkOut = new Date(data.checkOut);
      }
      
      // Convert unitId to number
      if (typeof data.unitId === 'string') {
        data.unitId = parseInt(data.unitId, 10);
      }
      
      // Create a new guest
      const response = await apiRequest(
        "POST",
        "/api/guests", 
        data
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
      toast({
        title: "Success!",
        description: "Guest has been added.",
      });
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add guest: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateGuestMutation = useMutation({
    mutationFn: async (data: InsertGuest & { id?: number }) => {
      const { id, ...updateData } = data;
      
      // Convert strings to Date objects for API
      if (updateData.checkIn) {
        updateData.checkIn = new Date(updateData.checkIn);
      }
      if (updateData.checkOut) {
        updateData.checkOut = new Date(updateData.checkOut);
      }
      
      // Convert unitId to number
      if (typeof updateData.unitId === 'string') {
        updateData.unitId = parseInt(updateData.unitId, 10);
      }
      
      // Update existing guest
      const response = await apiRequest(
        "PATCH",
        `/api/guests/${id}`, 
        updateData
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
      toast({
        title: "Success!",
        description: "Guest has been updated.",
      });
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update guest: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: InsertGuest) => {
    setIsSubmitting(true);
    try {
      if (initialData?.id) {
        await updateGuestMutation.mutateAsync({ ...data, id: initialData.id });
      } else {
        await createGuestMutation.mutateAsync(data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Guest Name *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Full name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="Email address" />
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
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Phone number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="unitId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Property Unit *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a property unit" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {units && Array.isArray(units) && units.map((unit: any) => (
                    <SelectItem key={unit.id} value={unit.id.toString()}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="checkIn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Check-in Date</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="checkOut"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Check-out Date</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="bookingSource"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Booking Source</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value || "Direct"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select booking source" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Direct">Direct</SelectItem>
                  <SelectItem value="Airbnb">Airbnb</SelectItem>
                  <SelectItem value="Booking.com">Booking.com</SelectItem>
                  <SelectItem value="VRBO">VRBO</SelectItem>
                  <SelectItem value="Expedia">Expedia</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder="Enter any additional notes about the guest" 
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>{initialData ? "Update" : "Create"} Guest</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}