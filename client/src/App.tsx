import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import AdminDataPage from "./pages/AdminDataPage";

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <div className="flex items-center justify-center h-screen">
          <div className="p-6 bg-white rounded shadow-lg w-full max-w-md">
            <h1 className="text-2xl font-bold mb-4">Login</h1>
            <p className="mb-4">For demonstration purposes, this is a simplified login page.</p>
            <button 
              className="w-full py-2 px-4 bg-primary-600 text-white rounded hover:bg-primary-700"
              onClick={() => window.location.href = '/admin/data'}
            >
              Login as Admin
            </button>
          </div>
        </div>
      </Route>
      <Route path="/admin/data">
        <AdminDataPage />
      </Route>
      <Route path="/">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Welcome to Property Management System</h1>
          <p className="mb-4">This is a simplified version showing only the data management functionality.</p>
          <a href="/admin/data" className="text-primary-600 hover:underline">Go to Admin Data Management</a>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}

export default App;
