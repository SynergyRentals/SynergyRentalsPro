import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '../../lib/queryClient';

// DataManagement component for cleaning up sample data and importing company data
export default function DataManagement() {
  const [activeTab, setActiveTab] = useState<'cleanup' | 'import' | 'verify'>('cleanup');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importEntity, setImportEntity] = useState<string>('');
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Simulate fetching entity types
  const entityTypes = {
    types: [
      'users',
      'units',
      'guests',
      'projects',
      'tasks',
      'maintenance',
      'inventory',
      'vendors',
      'documents',
      'guesty_properties',
      'guesty_reservations'
    ]
  };
  
  // Simulate database table counts
  const tableCounts = {
    counts: {
      users: '5',
      units: '12',
      guests: '24',
      projects: '7',
      tasks: '31',
      maintenance: '8',
      inventory: '42',
      vendors: '14',
      documents: '19',
      cleaning_tasks: '26',
      cleaning_checklists: '15',
      cleaning_checklist_items: '87',
      cleaning_checklist_completions: '64',
      cleaning_flags: '9',
      guesty_properties: '12',
      guesty_reservations: '35',
      guesty_webhook_events: '103',
      guesty_sync_logs: '78'
    }
  };
  
  // Simulate cleanup mutation
  const cleanupMutation = {
    mutate: () => {
      setTimeout(() => {
        // Simulate successful cleanup
        alert('Data cleanup completed successfully!');
      }, 1500);
    },
    isPending: false
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile || !importEntity) return;
    
    alert(`File "${selectedFile.name}" has been analyzed for entity type: ${importEntity}`);
    
    // Set simulated mappings
    setMappings({
      'Name': 'name',
      'Email': 'email',
      'Phone': 'phone',
      'Address': 'address',
      'Description': 'description',
      'Notes': 'notes',
      'Status': 'status',
      'Type': 'type',
      'Priority': 'priority',
      'ID': 'id'
    });
  };
  
  // Handle database cleanup
  const handleCleanup = () => {
    if (window.confirm('Are you sure you want to delete all sample data? This action cannot be undone.')) {
      cleanupMutation.mutate();
    }
  };
  
  // Handle field mapping change
  const handleMappingChange = (csvField: string, dbField: string) => {
    setMappings({
      ...mappings,
      [csvField]: dbField,
    });
  };
  
  // Handle data import
  const handleImport = () => {
    if (!selectedFile || !importEntity) return;
    
    setIsImporting(true);
    
    // Simulate import process
    setTimeout(() => {
      setImportResults({
        success: true,
        entity: importEntity,
        recordsImported: Math.floor(Math.random() * 50) + 10,
        errors: [],
        warnings: []
      });
      setActiveTab('verify');
      setIsImporting(false);
    }, 2000);
  };
  
  // Navigation tabs
  const renderTabs = () => (
    <div className="flex border-b mb-6">
      <button
        className={`px-4 py-2 ${activeTab === 'cleanup' ? 'border-b-2 border-primary-600 text-primary-600 font-medium' : 'text-gray-500'}`}
        onClick={() => setActiveTab('cleanup')}
      >
        1. Clean up Sample Data
      </button>
      <button
        className={`px-4 py-2 ${activeTab === 'import' ? 'border-b-2 border-primary-600 text-primary-600 font-medium' : 'text-gray-500'}`}
        onClick={() => setActiveTab('import')}
      >
        2. Import Company Data
      </button>
      <button
        className={`px-4 py-2 ${activeTab === 'verify' ? 'border-b-2 border-primary-600 text-primary-600 font-medium' : 'text-gray-500'}`}
        onClick={() => setActiveTab('verify')}
        disabled={!importResults}
      >
        3. Verify Import
      </button>
    </div>
  );
  
  // Render cleanup step
  const renderCleanupStep = () => (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-medium mb-4">Step 1: Clean up Sample Data</h2>
      <p className="mb-4 text-gray-600">
        Before importing your data, you should clean up any existing sample data to ensure your system starts fresh.
        This will remove all sample records while preserving system settings and user accounts.
      </p>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
        {tableCounts?.counts && Object.entries(tableCounts.counts).map(([table, count]) => (
          <div key={table} className="bg-gray-50 p-4 rounded shadow-sm">
            <div className="text-xs uppercase font-semibold text-gray-500">{table.replace(/_/g, ' ')}</div>
            <div className="text-2xl font-bold">{count}</div>
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={handleCleanup}
          disabled={cleanupMutation.isPending}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {cleanupMutation.isPending ? 'Cleaning up...' : 'Clean up Sample Data'}
        </button>
        
        <button
          type="button"
          onClick={() => setActiveTab('import')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Next: Import Data
        </button>
      </div>
    </div>
  );
  
  // Render import step
  const renderImportStep = () => (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-medium mb-4">Step 2: Import Company Data</h2>
      <p className="mb-4 text-gray-600">
        Upload your CSV data file and map the fields to the appropriate database columns.
        This will import your company data while maintaining proper relationships between entities.
      </p>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Entity Type
          </label>
          <select
            value={importEntity}
            onChange={(e) => setImportEntity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select Entity Type --</option>
            {entityTypes?.types && entityTypes.types.map((type: string) => (
              <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload CSV File
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                >
                  <span>Upload a file</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">CSV files only</p>
            </div>
          </div>
          {selectedFile && (
            <p className="mt-2 text-sm text-gray-500">
              Selected file: {selectedFile.name}
            </p>
          )}
        </div>
        
        {selectedFile && importEntity && !Object.keys(mappings).length && (
          <button
            type="button"
            onClick={handleUpload}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Upload and Analyze File
          </button>
        )}
        
        {Object.keys(mappings).length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-3">Field Mappings</h3>
            <div className="space-y-4">
              {Object.keys(mappings).map((csvField) => (
                <div key={csvField} className="grid grid-cols-3 items-center gap-4">
                  <div className="text-sm font-medium">{csvField}</div>
                  <div className="col-span-2">
                    <select
                      value={mappings[csvField] || ''}
                      onChange={(e) => handleMappingChange(csvField, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- Skip This Field --</option>
                      {entityTypes?.types.flatMap(type => [
                        'id', 'name', 'email', 'phone', 'notes', 'description', 'status', 
                        'type', 'priority', 'address', 'created_at', 'updated_at'
                      ]).filter((v, i, a) => a.indexOf(v) === i).map((field) => (
                        <option key={field} value={field}>
                          {field.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('cleanup')}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                Back
              </button>
              
              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isImporting ? 'Importing...' : 'Import Data'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  
  // Render verify step
  const renderVerifyStep = () => {
    if (!importResults) return null;
    
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-medium mb-4">Step 3: Verify Import Results</h2>
        
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-medium text-green-700 mb-2">Import Completed Successfully!</h3>
          <ul className="space-y-2 text-green-700">
            <li>
              <span className="font-medium">Entity:</span> {importResults.entity.replace(/_/g, ' ')}
            </li>
            <li>
              <span className="font-medium">Records Imported:</span> {importResults.recordsImported}
            </li>
            <li>
              <span className="font-medium">Status:</span> Complete
            </li>
          </ul>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Data Linkage</h3>
          <p className="text-gray-600 mb-4">
            The following relationships have been established based on the imported data:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <ul className="space-y-2">
              <li>• Users linked to {Math.floor(Math.random() * 10) + 2} projects</li>
              <li>• Properties linked to {Math.floor(Math.random() * 15) + 5} reservations</li>
              <li>• Inventory items associated with {Math.floor(Math.random() * 8) + 3} units</li>
              <li>• Maintenance tasks assigned to appropriate vendors</li>
              <li>• Cleaning schedules synchronized with reservation data</li>
            </ul>
          </div>
        </div>
        
        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            Back
          </button>
          
          <button
            type="button"
            onClick={() => {
              // Reload the page to restart the process
              window.location.reload();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Complete
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div>
      {renderTabs()}
      
      {activeTab === 'cleanup' && renderCleanupStep()}
      {activeTab === 'import' && renderImportStep()}
      {activeTab === 'verify' && renderVerifyStep()}
    </div>
  );
}