import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Info, RefreshCw, CheckCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface BatchSyncOptions {
  prioritizeProperties: boolean;
  prioritizeReservations: boolean;
  reservationTimeRange?: {
    checkInAfter?: Date;
    checkInBefore?: Date;
    checkOutAfter?: Date;
    checkOutBefore?: Date;
  };
  forceSync?: boolean;
}

// Placeholder for the response structure
interface BatchSyncResponse {
  success: boolean;
  message: string;
  propertiesSynced: number;
  reservationsSynced: number;
  requestsUsed: number;
  requestsRemaining: number;
  errors: string[];
  propertiesDetails?: {
    new: number;
    updated: number;
    total: number;
  };
  reservationsDetails?: {
    new: number;
    updated: number;
    total: number;
  };
}

export function GuestyBatchSync() {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [options, setOptions] = useState<BatchSyncOptions>({
    prioritizeProperties: false,
    prioritizeReservations: true,
    reservationTimeRange: {
      // Default to current month
      checkInAfter: new Date(new Date().setDate(1)), // First day of current month
      checkOutBefore: new Date(new Date().setMonth(new Date().getMonth() + 3)) // 3 months ahead
    }
  });
  const [syncResult, setSyncResult] = useState<BatchSyncResponse | null>(null);

  // Query to get the current rate limit status
  const { 
    data: rateLimitStatus, 
    isLoading: isLoadingRateLimit,
    refetch: refetchRateLimit
  } = useQuery({
    queryKey: ['/api/guesty/rate-limit-status'],
    refetchInterval: false, // Don't auto-refresh to avoid API calls
    refetchOnWindowFocus: false
  });

  // Mutation for batch sync
  const batchSyncMutation = useMutation({
    mutationFn: async (options: BatchSyncOptions) => {
      setIsSyncing(true);
      try {
        return await apiRequest<BatchSyncResponse>('POST', '/api/guesty/batch-sync', options);
      } finally {
        setIsSyncing(false);
      }
    },
    onSuccess: (data) => {
      setSyncResult(data);
      toast({
        title: data.success ? "Sync Completed" : "Sync Completed with Issues",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
      refetchRateLimit();
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "An error occurred during sync",
        variant: "destructive"
      });
    }
  });

  const handleSyncStart = () => {
    batchSyncMutation.mutate(options);
  };

  const getRateLimitColor = () => {
    if (!rateLimitStatus) return "bg-gray-300";
    if (rateLimitStatus.isRateLimited) return "bg-red-500";
    if (rateLimitStatus.requestsRemaining <= 1) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getRateLimitPercentage = () => {
    if (!rateLimitStatus) return 0;
    return (rateLimitStatus.requestsRemaining / 5) * 100;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <RefreshCw size={20} className="text-primary" />
          Guesty Batch Sync
        </CardTitle>
        <CardDescription>
          Efficiently synchronize data with Guesty API respecting rate limits (5 requests/24hr)
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Rate Limit Status */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">API Requests Remaining</span>
            <Badge variant={rateLimitStatus?.isRateLimited ? "destructive" : "secondary"}>
              {isLoadingRateLimit ? "Loading..." : 
                `${rateLimitStatus?.requestsRemaining || 0}/5 Requests`
              }
            </Badge>
          </div>
          <Progress 
            value={getRateLimitPercentage()} 
            className="h-2" 
            indicatorClassName={getRateLimitColor()}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {rateLimitStatus?.message || "Checking rate limit status..."}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => refetchRateLimit()}
          >
            Refresh Status
          </Button>
        </div>

        {rateLimitStatus?.isRateLimited && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Rate Limited</AlertTitle>
            <AlertDescription>
              You've reached the Guesty API rate limit. Please wait until {rateLimitStatus.nextAvailableTimestamp ? new Date(rateLimitStatus.nextAvailableTimestamp).toLocaleString() : 'tomorrow'} to try again.
            </AlertDescription>
          </Alert>
        )}

        <Separator />
        
        {/* Sync Options */}
        <div className="space-y-4">
          <h3 className="text-md font-medium">Sync Configuration</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="prioritize-properties"
                  checked={options.prioritizeProperties}
                  onCheckedChange={(checked) => setOptions({...options, prioritizeProperties: checked})}
                />
                <Label htmlFor="prioritize-properties">Prioritize Properties</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Allocate more API requests to property sync
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="prioritize-reservations"
                  checked={options.prioritizeReservations}
                  onCheckedChange={(checked) => setOptions({...options, prioritizeReservations: checked})}
                />
                <Label htmlFor="prioritize-reservations">Prioritize Reservations</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Allocate more API requests to reservation sync
              </p>
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
            <Label>Reservation Date Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Check-in After</Label>
                <DatePicker
                  date={options.reservationTimeRange?.checkInAfter}
                  onSelect={(date) => setOptions({
                    ...options, 
                    reservationTimeRange: {
                      ...options.reservationTimeRange,
                      checkInAfter: date
                    }
                  })}
                />
              </div>
              <div>
                <Label className="text-xs">Check-out Before</Label>
                <DatePicker
                  date={options.reservationTimeRange?.checkOutBefore}
                  onSelect={(date) => setOptions({
                    ...options, 
                    reservationTimeRange: {
                      ...options.reservationTimeRange,
                      checkOutBefore: date
                    }
                  })}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2 mt-4">
            <div className="flex items-center space-x-2">
              <Switch 
                id="force-sync"
                checked={options.forceSync}
                onCheckedChange={(checked) => setOptions({...options, forceSync: checked})}
              />
              <Label htmlFor="force-sync">Force Sync (Override Rate Limits)</Label>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <IconAlertTriangle size={14} className="text-yellow-500" />
              Use sparingly - this can potentially exceed Guesty's rate limits
            </p>
          </div>
        </div>
        
        {/* Last Sync Results */}
        {syncResult && (
          <div className="mt-6 border rounded-md p-4">
            <h3 className="text-md font-medium mb-2 flex items-center gap-2">
              <IconInfoCircle size={16} className="text-primary" />
              Last Sync Results
            </h3>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Properties</p>
                  <p className="text-sm">
                    Synced: {syncResult.propertiesSynced}<br/>
                    New: {syncResult.propertiesDetails?.new || 0}<br/>
                    Updated: {syncResult.propertiesDetails?.updated || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Reservations</p>
                  <p className="text-sm">
                    Synced: {syncResult.reservationsSynced}<br/>
                    New: {syncResult.reservationsDetails?.new || 0}<br/>
                    Updated: {syncResult.reservationsDetails?.updated || 0}
                  </p>
                </div>
              </div>
              <p className="text-sm mt-2">
                API Requests Used: {syncResult.requestsUsed} (Remaining: {syncResult.requestsRemaining})
              </p>
              
              {syncResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-destructive">Errors ({syncResult.errors.length})</p>
                  <div className="max-h-24 overflow-y-auto border rounded p-2 text-xs">
                    {syncResult.errors.map((error, index) => (
                      <p key={index} className="text-destructive">{error}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <Button 
          onClick={handleSyncStart} 
          disabled={isSyncing || (rateLimitStatus?.isRateLimited && !options.forceSync)}
          className="gap-2"
        >
          {isSyncing ? 
            <>
              <IconRefresh className="animate-spin" size={18} />
              Syncing...
            </> : 
            <>
              <IconRefresh size={18} />
              Start Batch Sync
            </>
          }
        </Button>
      </CardFooter>
    </Card>
  );
}