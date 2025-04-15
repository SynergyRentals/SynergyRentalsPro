import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Add, 
  Edit, 
  Delete, 
  FilterList, 
  Person,
  Phone,
  Email,
  Home,
  CalendarMonth,
  Flag
} from "@mui/icons-material";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

export default function GuestsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch guests
  const {
    data: guests,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/guests"],
    queryFn: undefined,
  });

  // Fetch units for the dropdown
  const {
    data: units,
    isLoading: isLoadingUnits,
  } = useQuery({
    queryKey: ["/api/units"],
    queryFn: undefined,
  });

  const getUnitName = (unitId: number) => {
    if (!units) return `Unit #${unitId}`;
    const unit = units.find(u => u.id === unitId);
    return unit ? unit.name : `Unit #${unitId}`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  // Filter guests based on search term
  const filteredGuests = guests ? guests.filter(guest => 
    guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (guest.email && guest.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (guest.phone && guest.phone.includes(searchTerm))
  ) : [];

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#2C2E3E]" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center py-10">
          <p className="text-red-500">Error loading guests data</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-8">
        {/* Page Title and Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#2C2E3E]">Guests</h1>
            <p className="text-[#9EA2B1]">Manage your guests and their details</p>
          </div>
          
          <div className="flex items-center mt-3 md:mt-0 space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search guests..."
                className="pl-10 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <FilterList className="h-4 w-4 mr-2" />
                  <span>Filter</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>All Guests</DropdownMenuItem>
                <DropdownMenuItem>Active Guests</DropdownMenuItem>
                <DropdownMenuItem>Upcoming Guests</DropdownMenuItem>
                <DropdownMenuItem>Past Guests</DropdownMenuItem>
                <DropdownMenuItem>Flagged Guests</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Add className="h-4 w-4 mr-2" />
                  <span>Add Guest</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Guest</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-[#9EA2B1] mb-4">Enter the guest details below</p>
                  {/* Form fields for new guest would go here */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <Input placeholder="Guest full name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <Input type="email" placeholder="Email address" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Phone</label>
                        <Input placeholder="Phone number" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Unit</label>
                        <select className="w-full p-2 border border-gray-300 rounded">
                          <option value="">Select a unit</option>
                          {units && units.map(unit => (
                            <option key={unit.id} value={unit.id}>{unit.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Check-in</label>
                          <Input type="date" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Check-out</label>
                          <Input type="date" />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline">Cancel</Button>
                      <Button>Save Guest</Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Guests table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuests.length > 0 ? (
                  filteredGuests.map((guest) => (
                    <TableRow key={guest.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-[#2C2E3E] flex items-center justify-center text-white mr-2">
                            <Person className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">{guest.name}</div>
                            <div className="text-sm text-[#9EA2B1]">{guest.bookingSource || 'Direct'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {guest.email && (
                            <div className="flex items-center text-sm">
                              <Email className="h-4 w-4 mr-1 text-[#9EA2B1]" />
                              <span>{guest.email}</span>
                            </div>
                          )}
                          {guest.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-4 w-4 mr-1 text-[#9EA2B1]" />
                              <span>{guest.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Home className="h-4 w-4 mr-1 text-[#9EA2B1]" />
                          <span>{getUnitName(guest.unitId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <CalendarMonth className="h-4 w-4 mr-1 text-[#9EA2B1]" />
                          <span>{formatDate(guest.checkIn)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <CalendarMonth className="h-4 w-4 mr-1 text-[#9EA2B1]" />
                          <span>{formatDate(guest.checkOut)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {guest.flags && guest.flags.length > 0 ? (
                            guest.flags.map((flag, index) => (
                              <Badge key={index} variant="outline" className="bg-red-50 text-red-500 border-red-200">
                                <Flag className="h-3 w-3 mr-1" />
                                {flag}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-[#9EA2B1]">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500">
                            <Delete className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {searchTerm ? (
                        <p>No guests found matching "{searchTerm}"</p>
                      ) : (
                        <p>No guests data available</p>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* Guest Sentiment Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-[#2C2E3E] mb-4">Guest Sentiment</h2>
              <div className="flex items-center justify-center py-6">
                <div className="w-36 h-36 relative">
                  <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-500">4.8</div>
                      <div className="text-sm text-[#9EA2B1]">Average Rating</div>
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-full border-4 border-green-500 border-opacity-70" 
                      style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)' }}></div>
                  <div className="absolute inset-0 rounded-full border-4 border-green-500" 
                      style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }}></div>
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#2C2E3E]">Positive</span>
                    <span className="text-sm font-medium text-[#2C2E3E]">89%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '89%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#2C2E3E]">Neutral</span>
                    <span className="text-sm font-medium text-[#2C2E3E]">8%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '8%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#2C2E3E]">Negative</span>
                    <span className="text-sm font-medium text-[#2C2E3E]">3%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '3%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-[#2C2E3E] mb-4">Key Insights</h2>
              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4 py-2">
                  <h3 className="font-medium">Top Positive Mentions</h3>
                  <ul className="text-sm text-[#9EA2B1] ml-5 list-disc">
                    <li>Cleanliness of properties</li>
                    <li>Quick response to inquiries</li>
                    <li>Comfortable furnishings</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-red-500 pl-4 py-2">
                  <h3 className="font-medium">Top Negative Mentions</h3>
                  <ul className="text-sm text-[#9EA2B1] ml-5 list-disc">
                    <li>WiFi connectivity issues</li>
                    <li>Noise from street at downtown locations</li>
                    <li>Kitchen supplies incomplete</li>
                  </ul>
                </div>
                
                <div className="mt-6">
                  <Button variant="outline" className="w-full justify-center">
                    <Add className="h-4 w-4 mr-2" />
                    View Full Reports
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
