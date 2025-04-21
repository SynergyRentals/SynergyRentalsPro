
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function GuestyCSVImport() {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === "text/csv" || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        // Clear any previous errors or results
        setImportError(null);
        setImportResult(null);
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

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setImportError(null);
    setImportResult(null);
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
    setImportError(null);
    setImportResult(null);
    
    try {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      // Simulated progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          // Only increase if we're not already at 100%
          return prev < 90 ? Math.min(prev + 5, 90) : prev;
        });
      }, 150);
      
      // Revert to using a standard endpoint to avoid CORS issues in deployment environments
      const response = await fetch("/api/guesty/import-csv-upload", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
        headers: {
          // Don't set Content-Type header for FormData - browser will set it with boundary
          "Accept": "application/json"
        }
      });
      
      clearInterval(progressInterval);
      
      // Get the response text first for better error handling
      const text = await response.text();
      
      // Try to parse as JSON, handle HTML responses as errors
      let result;
      if (text.trim().startsWith('<!DOCTYPE html>') || text.includes('<html')) {
        console.error("Received HTML response instead of JSON");
        throw new Error("Server returned HTML instead of JSON. This usually indicates a server-side error. Please check server logs or try again.");
      }
      
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        console.error("Failed to parse server response as JSON:", parseError);
        throw new Error(`Invalid response format from server. Please try again with a different CSV file.`);
      }
      
      if (!response.ok) {
        throw new Error(result?.message || `Server error: ${response.status} ${response.statusText}`);
      }
      
      // Set progress to 100%
      setUploadProgress(100);
      
      // Store the result
      setImportResult(result);
      
      // Show success toast
      toast({
        title: "CSV Import Successful",
        description: `Imported ${result.propertiesCount || 0} properties from CSV`,
      });
      
      // Invalidate the properties cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/guesty/properties"] });
      
    } catch (error) {
      console.error("Error importing from CSV:", error);
      
      // Get more detailed error information
      let errorMessage = "Unknown error occurred";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }
      
      setImportError(errorMessage);
      
      toast({
        title: "CSV Import Failed",
        description: errorMessage.substring(0, 150) + (errorMessage.length > 150 ? '...' : ''),
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
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
              <div className="flex items-center gap-2 text-sm bg-secondary/50 p-2 rounded-md">
                <FileText className="h-4 w-4" />
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-muted-foreground">
                  ({Math.round(selectedFile.size / 1024)} KB)
                </span>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="ml-auto h-6 w-6" 
                  onClick={clearSelectedFile}
                  disabled={isImporting}
                >
                  <X className="h-4 w-4" />
                </Button>
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
            
            {importError && (
              <Alert variant="destructive" className="mt-2">
                <AlertTitle>Import Failed</AlertTitle>
                <AlertDescription className="text-xs whitespace-pre-wrap">
                  {importError}
                </AlertDescription>
              </Alert>
            )}
            
            {importResult && importResult.success && (
              <Alert variant="success" className="mt-2 bg-green-50 border-green-200">
                <AlertTitle>Import Successful</AlertTitle>
                <AlertDescription className="text-xs">
                  Successfully imported {importResult.propertiesCount || 0} properties.
                  {importResult.hadWarnings && (
                    <div className="mt-1">
                      {importResult.warningCount} warning(s) occurred during import.
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            <p className="text-xs text-muted-foreground mt-2">
              Upload a CSV file containing property data. The file should have columns for at least NAME, 
              along with optional BEDROOMS, BATHROOMS, ADDRESS, LISTING_URL, and ICAL_URL.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
