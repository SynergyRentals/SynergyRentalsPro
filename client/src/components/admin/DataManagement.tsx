import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Upload, FileUp, FileDown, DownloadCloud, AlertTriangle, CheckCircle, Play, Save, Info, MessageSquare } from "lucide-react";

// Types for data handling
export interface FieldMapping {
  csvField: string;
  entityField: string;
  required?: boolean;
}

export interface ImportConfig {
  entityType: string;
  fieldMappings: FieldMapping[];
  updateExisting: boolean;
  identifierField?: string;
  options?: {
    skipFirstRow?: boolean;
    delimiter?: string;
  };
}

export default function DataManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Tab state
  const [activeTab, setActiveTab] = useState("overview");
  
  // Table counts
  const { data: tableCounts, isLoading: isCountsLoading } = useQuery({
    queryKey: ['/api/admin/data/counts'],
    refetchOnWindowFocus: false,
  });
  
  // Entity types
  const { data: entityTypesData, isLoading: isEntityTypesLoading } = useQuery({
    queryKey: ['/api/admin/data/entity-types'],
    refetchOnWindowFocus: false,
  });
  
  // For CSV Import
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [sampleData, setSampleData] = useState<any[]>([]);
  const [selectedEntityType, setSelectedEntityType] = useState<string>('');
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [mappingsConfigured, setMappingsConfigured] = useState(false);
  const [importConfig, setImportConfig] = useState<ImportConfig | null>(null);
  
  // For cleanup
  const [cleanupConfirmOpen, setCleanupConfirmOpen] = useState(false);
  const [cleanupInProgress, setCleanupInProgress] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<any | null>(null);
  
  // Mutations
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiRequest('/api/admin/data/upload', {
        method: 'POST',
        body: formData,
      });
      
      return response;
    },
    onSuccess: (data) => {
      setUploadedFilePath(data.filePath);
      setSampleData(data.sampleData || []);
      setUploadProgress(100);
      toast({
        title: "File Uploaded",
        description: "The CSV file was successfully uploaded.",
      });
    },
    onError: (error: any) => {
      setUploadProgress(0);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file.",
        variant: "destructive",
      });
    },
  });
  
  const suggestMappingsMutation = useMutation({
    mutationFn: async ({ filePath, entityType }: { filePath: string; entityType: string }) => {
      const response = await apiRequest('/api/admin/data/suggest-mappings', {
        method: 'POST',
        body: JSON.stringify({ filePath, entityType }),
      });
      
      return response;
    },
    onSuccess: (data) => {
      setMappings(data.mappings || []);
      setMappingsConfigured(true);
      toast({
        title: "Mappings Generated",
        description: "Field mappings have been suggested based on CSV data.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Mapping Generation Failed",
        description: error.message || "Failed to generate field mappings.",
        variant: "destructive",
      });
    },
  });
  
  const importDataMutation = useMutation({
    mutationFn: async ({ filePath, config }: { filePath: string; config: ImportConfig }) => {
      const response = await apiRequest('/api/admin/data/import', {
        method: 'POST',
        body: JSON.stringify({ filePath, config }),
      });
      
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Import Successful",
        description: `Imported ${data.recordsImported} records. Skipped ${data.recordsSkipped} records.`,
      });
      
      // Close upload dialog and refresh table counts
      setUploadDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/data/counts'] });
      
      // Reset import state
      setSelectedFile(null);
      setUploadProgress(0);
      setUploadedFilePath(null);
      setSampleData([]);
      setSelectedEntityType('');
      setMappings([]);
      setMappingsConfigured(false);
      setImportConfig(null);
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import data.",
        variant: "destructive",
      });
    },
  });
  
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      setCleanupInProgress(true);
      const response = await apiRequest('/api/admin/data/cleanup', {
        method: 'POST',
      });
      return response;
    },
    onSuccess: (data) => {
      setCleanupResult(data);
      setCleanupInProgress(false);
      toast({
        title: "Cleanup Successful",
        description: data.message || "Database cleanup completed successfully.",
      });
      // Refresh table counts
      queryClient.invalidateQueries({ queryKey: ['/api/admin/data/counts'] });
    },
    onError: (error: any) => {
      setCleanupInProgress(false);
      toast({
        title: "Cleanup Failed",
        description: error.message || "Failed to clean up database.",
        variant: "destructive",
      });
    },
  });
  
  // Reset import state when closing upload dialog
  useEffect(() => {
    if (!uploadDialogOpen) {
      setSelectedFile(null);
      setUploadProgress(0);
      setUploadedFilePath(null);
      setSampleData([]);
      setSelectedEntityType('');
      setMappings([]);
      setMappingsConfigured(false);
      setImportConfig(null);
    }
  }, [uploadDialogOpen]);
  
  // Build import config when mappings are configured and entity type is selected
  useEffect(() => {
    if (mappingsConfigured && selectedEntityType) {
      setImportConfig({
        entityType: selectedEntityType,
        fieldMappings: mappings,
        updateExisting: true,
        identifierField: 'id',
        options: {
          skipFirstRow: false,
          delimiter: ',',
        },
      });
    }
  }, [mappingsConfigured, selectedEntityType, mappings]);
  
  // Handler for file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    
    // Reset import state when file changes
    setUploadProgress(0);
    setUploadedFilePath(null);
    setSampleData([]);
    setMappings([]);
    setMappingsConfigured(false);
    setImportConfig(null);
  };
  
  // Handler for file upload
  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
      setUploadProgress(10);
    }
  };
  
  // Handler for entity type selection
  const handleEntityTypeChange = (value: string) => {
    setSelectedEntityType(value);
    setMappingsConfigured(false);
    
    // If we have a file uploaded, suggest mappings
    if (uploadedFilePath) {
      suggestMappingsMutation.mutate({ filePath: uploadedFilePath, entityType: value });
    }
  };
  
  // Handler for updating field mappings
  const handleMappingChange = (index: number, field: string, value: string) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setMappings(newMappings);
  };
  
  // Handler for starting import
  const handleImport = () => {
    if (uploadedFilePath && importConfig) {
      importDataMutation.mutate({ filePath: uploadedFilePath, config: importConfig });
    }
  };
  
  // Handler for starting cleanup
  const handleCleanup = () => {
    setCleanupConfirmOpen(false);
    cleanupMutation.mutate();
  };
  
  // Convert table counts to chart data
  const getChartData = () => {
    if (!tableCounts?.counts) return [];
    
    return Object.entries(tableCounts.counts)
      .map(([name, count]) => ({
        name: name.replace(/_/g, ' '),
        count: typeof count === 'string' ? parseInt(count, 10) : count,
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);
  };
  
  // Render tabs
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-3 mb-6 max-w-[600px]">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="import">Import Data</TabsTrigger>
        <TabsTrigger value="cleanup">Cleanup</TabsTrigger>
      </TabsList>
      
      {/* Overview Tab */}
      <TabsContent value="overview">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Statistics</CardTitle>
              <CardDescription>
                Current record counts in the database
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isCountsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : !tableCounts?.counts ? (
                <div className="text-center py-8 text-gray-500">
                  No data available
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Table</TableHead>
                        <TableHead className="text-right">Records</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(tableCounts.counts).map(([table, count]) => (
                        <TableRow key={table}>
                          <TableCell className="font-medium">
                            {table.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </TableCell>
                          <TableCell className="text-right">{count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Data Distribution</CardTitle>
              <CardDescription>
                Visual representation of record counts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isCountsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : !tableCounts?.counts ? (
                <div className="text-center py-8 text-gray-500">
                  No data available
                </div>
              ) : (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getChartData()}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 90, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={90} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      
      {/* Import Tab */}
      <TabsContent value="import">
        <Card>
          <CardHeader>
            <CardTitle>Import Data from CSV</CardTitle>
            <CardDescription>
              Upload CSV files to import data into the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Import Guidelines</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 mt-2 text-sm">
                    <li>File must be in CSV format with headers in the first row</li>
                    <li>CSV files should be UTF-8 encoded for best results</li>
                    <li>Dates should be in YYYY-MM-DD format</li>
                    <li>Required fields must have values for each row</li>
                  </ul>
                </AlertDescription>
              </Alert>
              
              <div className="flex flex-col md:flex-row gap-4">
                <Button onClick={() => setUploadDialogOpen(true)} className="w-full md:w-auto">
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV Data
                </Button>
              </div>
            </div>
            
            {/* Import Dialog */}
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                  <DialogTitle>Import Data from CSV</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file and map fields to import data into the system
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-6 py-4">
                  {/* Step 1: File Selection */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Step 1: Select CSV File</h3>
                    
                    <div className="flex items-center gap-4">
                      <Input 
                        type="file" 
                        accept=".csv" 
                        onChange={handleFileChange}
                        className="flex-1"
                      />
                      
                      <Button 
                        onClick={handleUpload} 
                        disabled={!selectedFile || uploadProgress > 0}
                      >
                        <FileUp className="mr-2 h-4 w-4" />
                        Upload
                      </Button>
                    </div>
                    
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Step 2: Entity Type Selection */}
                  {uploadedFilePath && (
                    <div className="space-y-4">
                      <h3 className="font-semibold">Step 2: Select Entity Type</h3>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="entityType">Data Type</Label>
                          <Select
                            value={selectedEntityType}
                            onValueChange={handleEntityTypeChange}
                          >
                            <SelectTrigger id="entityType">
                              <SelectValue placeholder="Select entity type" />
                            </SelectTrigger>
                            <SelectContent>
                              {isEntityTypesLoading ? (
                                <SelectItem value="loading" disabled>Loading...</SelectItem>
                              ) : (
                                entityTypesData?.entityTypes?.map((type: any) => (
                                  <SelectItem key={type.id} value={type.id}>
                                    {type.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Step 3: Field Mapping */}
                  {selectedEntityType && uploadedFilePath && (
                    <div className="space-y-4">
                      <h3 className="font-semibold">Step 3: Map Fields</h3>
                      
                      {suggestMappingsMutation.isPending ? (
                        <div className="flex justify-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : mappings.length > 0 ? (
                        <div className="max-h-[200px] overflow-y-auto border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[200px]">Database Field</TableHead>
                                <TableHead>CSV Field</TableHead>
                                <TableHead className="w-[100px]">Required</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {mappings.map((mapping, index) => (
                                <TableRow key={index}>
                                  <TableCell>{mapping.entityField}</TableCell>
                                  <TableCell>
                                    <Select
                                      value={mapping.csvField}
                                      onValueChange={(value) => handleMappingChange(index, 'csvField', value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a field" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="">None</SelectItem>
                                        {sampleData.length > 0 &&
                                          Object.keys(sampleData[0]).map((header) => (
                                            <SelectItem key={header} value={header}>
                                              {header}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {mapping.required ? "Yes" : "No"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center p-4 text-gray-500 border rounded-md">
                          Select an entity type to generate field mappings
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Step 4: Sample Data Preview */}
                  {sampleData.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold">Step 4: Preview Data</h3>
                      
                      <div className="max-h-[200px] overflow-y-auto border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {Object.keys(sampleData[0]).map((header) => (
                                <TableHead key={header}>{header}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sampleData.map((row, rowIndex) => (
                              <TableRow key={rowIndex}>
                                {Object.values(row).map((value: any, cellIndex) => (
                                  <TableCell key={cellIndex}>
                                    {typeof value === 'string' && value.length > 30
                                      ? value.substring(0, 30) + '...'
                                      : String(value)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={
                      !importConfig ||
                      !uploadedFilePath ||
                      !selectedEntityType ||
                      importDataMutation.isPending
                    }
                  >
                    {importDataMutation.isPending ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></div>
                        Importing...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Import Data
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </TabsContent>
      
      {/* Cleanup Tab */}
      <TabsContent value="cleanup">
        <Card>
          <CardHeader>
            <CardTitle>Database Cleanup</CardTitle>
            <CardDescription>
              Remove sample data from the database while preserving essential system data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  This operation will delete all sample data from the database. 
                  This action cannot be undone. Admin accounts will be preserved.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <Button variant="destructive" onClick={() => setCleanupConfirmOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clean Database
                </Button>
                
                {cleanupResult && (
                  <Alert variant={cleanupResult.success ? 'default' : 'destructive'}>
                    {cleanupResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {cleanupResult.success ? 'Cleanup Successful' : 'Cleanup Failed'}
                    </AlertTitle>
                    <AlertDescription>{cleanupResult.message}</AlertDescription>
                  </Alert>
                )}
              </div>
              
              {/* Confirm Dialog */}
              <Dialog open={cleanupConfirmOpen} onOpenChange={setCleanupConfirmOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Database Cleanup</DialogTitle>
                    <DialogDescription>
                      This will permanently remove all sample data from the database.
                      Admin accounts will be preserved, but all other data will be deleted.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="py-4">
                    <p className="font-semibold text-destructive">
                      Are you sure you want to continue?
                    </p>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCleanupConfirmOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleCleanup}
                      disabled={cleanupInProgress}
                    >
                      {cleanupInProgress ? (
                        <>
                          <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></div>
                          Cleaning...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Yes, Clean Database
                        </>
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
  );
}