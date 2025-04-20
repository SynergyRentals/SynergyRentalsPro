import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileText, Trash2, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

// EntityType enum matching the server-side enum
enum EntityType {
  USER = 'user',
  UNIT = 'unit',
  GUEST = 'guest',
  PROPERTY = 'property',
  GUESTY_PROPERTY = 'guesty_property',
  GUESTY_RESERVATION = 'guesty_reservation',
  PROJECT = 'project',
  TASK = 'task',
  MAINTENANCE = 'maintenance',
  INVENTORY = 'inventory',
  CLEANING_TASK = 'cleaning_task',
  DOCUMENT = 'document',
  VENDOR = 'vendor'
}

// Entity type labels for display
const entityTypeLabels: Record<EntityType, string> = {
  [EntityType.USER]: 'Users',
  [EntityType.UNIT]: 'Units',
  [EntityType.GUEST]: 'Guests',
  [EntityType.PROPERTY]: 'Properties',
  [EntityType.GUESTY_PROPERTY]: 'Guesty Properties',
  [EntityType.GUESTY_RESERVATION]: 'Guesty Reservations',
  [EntityType.PROJECT]: 'Projects',
  [EntityType.TASK]: 'Tasks',
  [EntityType.MAINTENANCE]: 'Maintenance',
  [EntityType.INVENTORY]: 'Inventory',
  [EntityType.CLEANING_TASK]: 'Cleaning Tasks',
  [EntityType.DOCUMENT]: 'Documents',
  [EntityType.VENDOR]: 'Vendors',
};

// Interface for field mapping
interface FieldMapping {
  csvField: string;
  entityField: string;
  required?: boolean;
}

// Interface for import configuration
interface ImportConfig {
  entityType: EntityType;
  fieldMappings: FieldMapping[];
  updateExisting: boolean;
  identifierField?: string;
  options?: {
    skipFirstRow?: boolean;
    delimiter?: string;
  };
}

export function DataManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("import");
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [identifierField, setIdentifierField] = useState<string>("");
  const [skipFirstRow, setSkipFirstRow] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === "text/csv" || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        // Reset mappings when a new file is selected
        setFieldMappings([]);
        setPreviewData([]);
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

  // Open file browser
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Analyze the CSV file to get preview and suggest mappings
  const analyzeFile = async () => {
    if (!selectedFile || !selectedEntityType) {
      toast({
        title: "Missing Information",
        description: "Please select an entity type and upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Create a FormData instance
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('entityType', selectedEntityType);
      
      // Upload and analyze the file
      const result = await apiRequest('/api/admin/data-import/analyze', {
        method: 'POST',
        body: formData,
      });
      
      if (result.success) {
        setPreviewData(result.previewData || []);
        setFieldMappings(result.suggestedMappings || []);
        setShowMappingDialog(true);
      } else {
        toast({
          title: "Analysis Failed",
          description: result.message || "Failed to analyze the CSV file",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while analyzing the CSV file",
        variant: "destructive",
      });
      console.error("Error analyzing file:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Update field mapping
  const updateFieldMapping = (index: number, csvField: string) => {
    const newMappings = [...fieldMappings];
    newMappings[index].csvField = csvField;
    setFieldMappings(newMappings);
  };

  // Import the data with the configured mappings
  const importData = async () => {
    if (!selectedFile || !selectedEntityType || fieldMappings.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please configure field mappings before importing",
        variant: "destructive",
      });
      return;
    }

    // Check if required fields are mapped
    const missingRequiredFields = fieldMappings
      .filter(mapping => mapping.required && (!mapping.csvField || mapping.csvField === ""))
      .map(mapping => mapping.entityField);
    
    if (missingRequiredFields.length > 0) {
      toast({
        title: "Missing Required Mappings",
        description: `Please map the following required fields: ${missingRequiredFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setUploadProgress(0);
    
    try {
      // Create the import configuration
      const importConfig: ImportConfig = {
        entityType: selectedEntityType,
        fieldMappings: fieldMappings,
        updateExisting,
        identifierField: identifierField || undefined,
        options: {
          skipFirstRow,
        },
      };
      
      // Create a FormData instance for the file and config
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('config', JSON.stringify(importConfig));
      
      // Track upload progress
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/admin/data-import/import', true);
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      };
      
      // Convert XHR into a Promise
      const result = await new Promise<any>((resolve, reject) => {
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            reject(new Error(`HTTP Error: ${xhr.status}`));
          }
        };
        
        xhr.onerror = function() {
          reject(new Error('Network error'));
        };
        
        xhr.send(formData);
      });
      
      setUploadProgress(100);
      
      // Check the result
      if (result.success) {
        toast({
          title: "Import Successful",
          description: `Successfully imported ${result.recordsImported} records`,
          variant: "default",
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries();
        
        // Close the mapping dialog
        setShowMappingDialog(false);
        
        // Reset state for next import
        setSelectedFile(null);
        setPreviewData([]);
        setFieldMappings([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        toast({
          title: "Import Failed",
          description: result.message || "Failed to import data",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while importing the data",
        variant: "destructive",
      });
      console.error("Error importing data:", error);
    } finally {
      setIsImporting(false);
    }
  };

  // Delete all data (cleanup database)
  const deleteAllData = async () => {
    setIsDeleting(true);
    
    try {
      const result = await apiRequest('/api/admin/data-import/cleanup', {
        method: 'POST',
      });
      
      if (result.success) {
        toast({
          title: "Cleanup Successful",
          description: "All sample data has been removed from the database",
          variant: "default",
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries();
      } else {
        toast({
          title: "Cleanup Failed",
          description: result.message || "Failed to clean up the database",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while cleaning up the database",
        variant: "destructive",
      });
      console.error("Error cleaning up database:", error);
    } finally {
      setIsDeleting(false);
      setShowCleanupConfirm(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Data Management</h2>
      <p className="text-muted-foreground">
        Import, export, and manage your company data
      </p>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="export">Export Data</TabsTrigger>
          <TabsTrigger value="cleanup">Cleanup</TabsTrigger>
        </TabsList>
        
        {/* Import Data Tab */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CSV Data Import</CardTitle>
              <CardDescription>
                Upload CSV files to import data into the system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Entity Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="entity-type">Select Entity Type</Label>
                <Select 
                  value={selectedEntityType || undefined} 
                  onValueChange={(value) => setSelectedEntityType(value as EntityType)}
                >
                  <SelectTrigger id="entity-type">
                    <SelectValue placeholder="Select entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(entityTypeLabels).map(([type, label]) => (
                      <SelectItem key={type} value={type}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="csv-upload">Upload CSV File</Label>
                <input
                  type="file"
                  id="csv-upload"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex items-center gap-2 text-sm p-2 border rounded">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">{selectedFile.name}</span>
                    <span className="text-muted-foreground">
                      ({Math.round(selectedFile.size / 1024)} KB)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-24 border border-dashed rounded-md cursor-pointer hover:bg-secondary/10" onClick={handleUploadClick}>
                    <div className="flex flex-col items-center space-y-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <div className="text-sm text-muted-foreground">
                        Click to select a CSV file
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleUploadClick}
                  disabled={isAnalyzing || isImporting}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Select File
                </Button>
                
                <Button
                  variant="default"
                  onClick={analyzeFile}
                  disabled={isAnalyzing || isImporting || !selectedFile || !selectedEntityType}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>Analyze & Configure</>
                  )}
                </Button>
              </div>
              
              {/* Field Mapping Dialog */}
              {showMappingDialog && (
                <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                    <DialogHeader>
                      <DialogTitle>Configure Data Import</DialogTitle>
                      <DialogDescription>
                        Map CSV columns to database fields for {entityTypeLabels[selectedEntityType!]}
                      </DialogDescription>
                    </DialogHeader>
                    
                    {/* Data Preview */}
                    {previewData.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Data Preview</h3>
                        <div className="border rounded overflow-auto max-h-40">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {Object.keys(previewData[0]).map((header) => (
                                  <TableHead key={header}>{header}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {previewData.map((row, rowIndex) => (
                                <TableRow key={rowIndex}>
                                  {Object.values(row).map((value, cellIndex) => (
                                    <TableCell key={cellIndex}>
                                      {value?.toString() || ''}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                    
                    {/* Field Mappings */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Field Mappings</h3>
                      <p className="text-sm text-muted-foreground">
                        Match CSV columns to database fields. Required fields are marked with *.
                      </p>
                      
                      <div className="border rounded overflow-auto max-h-60">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Database Field</TableHead>
                              <TableHead>CSV Column</TableHead>
                              <TableHead>Required</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fieldMappings.map((mapping, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  {mapping.entityField} {mapping.required && <span className="text-destructive">*</span>}
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={mapping.csvField || ""}
                                    onValueChange={(value) => updateFieldMapping(index, value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select CSV column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="">Not mapped</SelectItem>
                                      {previewData.length > 0 &&
                                        Object.keys(previewData[0]).map((header) => (
                                          <SelectItem key={header} value={header}>
                                            {header}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  {mapping.required ? (
                                    <CheckCircle2 className="h-4 w-4 text-destructive" />
                                  ) : (
                                    "No"
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    
                    {/* Import Options */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Import Options</h3>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="update-existing"
                          checked={updateExisting}
                          onCheckedChange={(checked) => setUpdateExisting(!!checked)}
                        />
                        <Label htmlFor="update-existing">
                          Update existing records
                        </Label>
                      </div>
                      
                      {updateExisting && (
                        <div className="ml-6 space-y-2">
                          <Label htmlFor="identifier-field">Identifier Field</Label>
                          <Select
                            id="identifier-field"
                            value={identifierField}
                            onValueChange={setIdentifierField}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select identifier field" />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldMappings.map((mapping, index) => (
                                <SelectItem key={index} value={mapping.entityField}>
                                  {mapping.entityField}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            This field will be used to identify existing records for updating
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="skip-first-row"
                          checked={skipFirstRow}
                          onCheckedChange={(checked) => setSkipFirstRow(!!checked)}
                        />
                        <Label htmlFor="skip-first-row">
                          Skip first row (use if header row is already parsed as a data row)
                        </Label>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowMappingDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={importData}
                        disabled={isImporting}
                      >
                        {isImporting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>Import Data</>
                        )}
                      </Button>
                    </DialogFooter>
                    
                    {isImporting && (
                      <div className="w-full space-y-1">
                        <Progress value={uploadProgress} className="h-2 w-full" />
                        <p className="text-xs text-muted-foreground text-center">
                          {uploadProgress === 100 ? "Processing complete!" : `Uploading... ${uploadProgress}%`}
                        </p>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Import Guidelines</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 text-sm">
                <li>Prepare your CSV file with a header row that describes each column</li>
                <li>Required fields must be mapped to a CSV column</li>
                <li>Dates should be in YYYY-MM-DD format</li>
                <li>For multiple values in a single field (like tags), separate values with commas</li>
                <li>For best results, import data in this order: Users, Units, Properties, Reservations, Tasks</li>
              </ul>
            </AlertDescription>
          </Alert>
        </TabsContent>
        
        {/* Export Data Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Export Data</CardTitle>
              <CardDescription>
                Export data from the system to CSV files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label>Select entity type to export</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(entityTypeLabels).map(([type, label]) => (
                    <Card key={type} className="hover:bg-accent/50 cursor-pointer">
                      <CardContent className="p-4 flex justify-between items-center">
                        <span>{label}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            toast({
                              title: "Export Started",
                              description: `Exporting ${label} to CSV`,
                            });
                            window.location.href = `/api/admin/data-export/${type}`;
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Cleanup Tab */}
        <TabsContent value="cleanup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Cleanup</CardTitle>
              <CardDescription>
                Remove all sample data from the database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  This action will delete all data from the database except for the admin user and logs.
                  This operation cannot be undone. Make sure to export any data you want to keep before proceeding.
                </AlertDescription>
              </Alert>
              
              <div className="mt-4">
                <Button
                  variant="destructive"
                  onClick={() => setShowCleanupConfirm(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All Sample Data
                </Button>
                
                <Dialog open={showCleanupConfirm} onOpenChange={setShowCleanupConfirm}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Data Deletion</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete all sample data? This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowCleanupConfirm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={deleteAllData}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>Confirm Delete</>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}