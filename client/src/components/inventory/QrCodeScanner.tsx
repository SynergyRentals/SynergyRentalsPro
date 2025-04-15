import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QrCode2, CameraAlt, CheckCircle } from "@mui/icons-material";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface QrCodeScannerProps {
  unitId: number | null;
  unitName: string;
}

export default function QrCodeScanner({ unitId, unitName }: QrCodeScannerProps) {
  const [open, setOpen] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [items, setItems] = useState<Array<{ id: number; name: string; quantity: number }>>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | "">("");
  const [quantity, setQuantity] = useState(1);
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [notes, setNotes] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  // Mock items that might be needed in this unit
  const availableItems = [
    { id: 1, name: "Towels (Bath)" },
    { id: 2, name: "Shampoo (Travel)" },
    { id: 3, name: "Coffee Pods" },
    { id: 4, name: "Toilet Paper" },
    { id: 5, name: "Paper Towels" },
    { id: 6, name: "Dish Soap" },
    { id: 7, name: "Laundry Detergent" },
    { id: 8, name: "Hand Soap" },
  ];

  // Request supplies mutation
  const requestSuppliesMutation = useMutation({
    mutationFn: async (data: {
      unitId: number | null;
      items: Array<{ id: number; name: string; quantity: number }>;
      urgency: string;
      notes: string;
    }) => {
      const response = await apiRequest("POST", "/api/inventory/request-supplies", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Supply Request Submitted",
        description: `Your request for ${unitName} has been sent to the inventory team.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Request Failed",
        description: error.message || "There was an error submitting your request.",
      });
    },
  });

  // Simulate QR code scanning
  const startScanner = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({
        title: "Camera not supported",
        description: "Your device doesn't support camera access.",
        variant: "destructive",
      });
      return;
    }

    setIsCameraActive(true);

    // In a real app, we would use the camera to scan a QR code
    // For this mockup, we'll simulate scanning after a delay
    setTimeout(() => {
      simulateSuccessfulScan();
    }, 2000);
  };

  const simulateSuccessfulScan = () => {
    setIsCameraActive(false);
    setScanComplete(true);
  };

  const stopScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const addItem = () => {
    if (selectedItemId && quantity > 0) {
      const selectedItem = availableItems.find(item => item.id === selectedItemId);
      if (selectedItem) {
        // Check if item already exists in the list
        const existingItemIndex = items.findIndex(item => item.id === selectedItemId);
        
        if (existingItemIndex >= 0) {
          // Update existing item
          const updatedItems = [...items];
          updatedItems[existingItemIndex].quantity += quantity;
          setItems(updatedItems);
        } else {
          // Add new item
          setItems([...items, { id: selectedItemId as number, name: selectedItem.name, quantity }]);
        }
        
        setSelectedItemId("");
        setQuantity(1);
      }
    } else {
      toast({
        title: "Invalid selection",
        description: "Please select an item and a valid quantity.",
        variant: "destructive",
      });
    }
  };

  const removeItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSubmit = () => {
    if (items.length === 0) {
      toast({
        title: "No items selected",
        description: "Please add at least one item to your request.",
        variant: "destructive",
      });
      return;
    }

    // Submit request through API
    requestSuppliesMutation.mutate({
      unitId,
      items,
      urgency,
      notes
    });
  };

  const resetForm = () => {
    setItems([]);
    setSelectedItemId("");
    setQuantity(1);
    setUrgency("normal");
    setNotes("");
    setScanComplete(false);
  };

  // Cleanup camera when component unmounts or dialog closes
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (!open) {
      stopScanner();
      resetForm();
    }
  }, [open]);

  return (
    <>
      <Button 
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center py-2 gap-2"
      >
        <QrCode2 className="h-4 w-4" />
        <span>Scan QR &amp; Request Supplies</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Supplies for {unitName}</DialogTitle>
            <DialogDescription>
              Scan the unit's QR code to verify your location and request supplies.
            </DialogDescription>
          </DialogHeader>

          {!scanComplete ? (
            <div className="space-y-4 py-4">
              {isCameraActive ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full h-64 bg-black rounded-md object-cover"
                    autoPlay
                    playsInline
                    muted
                  ></video>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-40 h-40 border-2 border-white rounded-md"></div>
                  </div>
                  <div className="mt-2 text-center text-sm text-muted-foreground animate-pulse">
                    Scanning QR code...
                  </div>
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={stopScanner}
                  >
                    Cancel Scan
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 border border-dashed border-gray-300 rounded-md">
                  <CameraAlt className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-center text-muted-foreground mb-4">
                    Scan the QR code posted in the unit to verify your location.
                  </p>
                  <Button onClick={startScanner}>
                    Start Scanner
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-2 bg-green-50 text-green-700 p-3 rounded-md mb-4">
                <CheckCircle />
                <span>Location verified: {unitName}</span>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="item">Item</Label>
                    <Select
                      value={selectedItemId.toString()}
                      onValueChange={(value) => setSelectedItemId(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableItems.map((item) => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20">
                    <Label htmlFor="quantity">Qty</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" onClick={addItem}>
                      Add
                    </Button>
                  </div>
                </div>

                {items.length > 0 && (
                  <div>
                    <Label>Items to request:</Label>
                    <div className="mt-2 space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center p-2 bg-gray-50 rounded"
                        >
                          <span>
                            {item.name} × {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select
                    value={urgency}
                    onValueChange={(value) => setUrgency(value as "normal" | "urgent")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal (24-48 hours)</SelectItem>
                      <SelectItem value="urgent">Urgent (ASAP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any special instructions or details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {scanComplete && (
              <Button onClick={handleSubmit} disabled={requestSuppliesMutation.isPending}>
                {requestSuppliesMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}