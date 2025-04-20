import { useState } from "react";
import DataManagement from "../components/admin/DataManagement";

export default function AdminDataPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Data Management</h1>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Back to Home
          </button>
        </div>
      </div>
      
      <DataManagement />
    </div>
  );
}