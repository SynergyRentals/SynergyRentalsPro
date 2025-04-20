import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export function GuestyCSVImport() {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === "text/csv" || file.name.endsWith('.csv')) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        e.target.value = "";
      }
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const importFromCSV = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setUploadProgress(0);
    
    try {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      // Simulated progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 5, 90));
      }, 100);
      
      // Using fetch directly for FormData since apiRequest doesn't handle it well
      const response = await fetch("/api/guesty/import-csv-upload", {
        method: "POST",
        body: formData,
        credentials: "same-origin"
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Add additional validation of the response
      if (!result) {
        throw new Error("Server returned an empty response");
      }
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (result.success) {
        toast({
          title: "CSV Import Successful",
          description: `Imported ${result.propertiesCount} properties from CSV`,
        });
        
        // Reset the form
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        
        // Invalidate the properties cache to refresh the list
        queryClient.invalidateQueries({ queryKey: ["/api/guesty/properties"] });
      } else {
        toast({
          title: "CSV Import Failed",
          description: result.message || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error importing from CSV:", error);
      toast({
        title: "CSV Import Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card className="mt-2 w-full border border-border/50">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="csv-upload">Upload Guesty Properties CSV</Label>
            <input
              type="file"
              id="csv-upload"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-muted-foreground">
                  ({Math.round(selectedFile.size / 1024)} KB)
                </span>
              </div>
            ) : null}
            
            <div className="flex flex-row gap-2 items-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleUploadClick}
                disabled={isImporting}
              >
                <Upload className="mr-2 h-4 w-4" />
                Select File
              </Button>
              
              <Button 
                variant="default" 
                size="sm" 
                onClick={importFromCSV} 
                disabled={isImporting || !selectedFile}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Process CSV"
                )}
              </Button>
            </div>
            
            {isImporting && (
              <div className="w-full space-y-1">
                <Progress value={uploadProgress} className="h-2 w-full" />
                <p className="text-xs text-muted-foreground">
                  {uploadProgress === 100 ? "Processing complete!" : "Processing..."}
                </p>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground mt-2">
              Upload a CSV file exported from Guesty containing property data. 
              This is useful when API rate limits are reached.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}