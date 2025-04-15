import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export function GuestyCSVImport() {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);

  const importFromCSV = async () => {
    setIsImporting(true);
    try {
      const response = await apiRequest("POST", "/api/guesty/import-csv");
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "CSV Import Successful",
          description: `Imported ${result.propertiesCount} properties from CSV`,
        });
        
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
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={importFromCSV} 
      disabled={isImporting}
    >
      {isImporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Importing...
        </>
      ) : (
        "Import Properties from CSV"
      )}
    </Button>
  );
}