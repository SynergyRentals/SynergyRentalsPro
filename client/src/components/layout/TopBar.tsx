import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Menu, Search, Notifications, Person, Settings, Logout, AutoAwesome, CalendarMonth, Assignment, AssignmentTurnedIn } from "@mui/icons-material";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface TopBarProps {
  onToggleSidebar: () => void;
}

export default function TopBar({ onToggleSidebar }: TopBarProps) {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [notificationCount] = useState(3); // This would be from an API in a real app

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation("/auth");
      },
    });
  };

  // Get initials from user name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex justify-between items-center px-4 py-2">
        {/* Left section: Menu toggle and logo */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="lg:hidden text-[#2C2E3E]"
          >
            <Menu />
          </Button>

          <div className="flex items-center ml-2 lg:ml-0">
            <AutoAwesome className="text-[#FFCF45] h-6 w-6 mr-2" />
            <h1 className="text-lg font-semibold text-[#2C2E3E] hidden md:block">
              Synergy Rentals AI Brain
            </h1>
            <h1 className="text-lg font-semibold text-[#2C2E3E] md:hidden">
              SR Brain
            </h1>
          </div>
        </div>

        {/* Right section: Search, notifications, user menu */}
        <div className="flex items-center space-x-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-1 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#FFCF45] w-40 lg:w-64"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-[#2C2E3E] relative" aria-label="Open notifications">
                <Notifications />
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[380px] max-h-[500px] overflow-y-auto">
              <div className="p-4">
                <h3 className="font-semibold mb-2">Notifications</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-md">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <CalendarMonth className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">New Reservation</p>
                      <p className="text-xs text-gray-500">Unit #123 booked for July 15-20</p>
                      <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-md">
                    <div className="bg-yellow-100 p-2 rounded-full">
                      <Assignment className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Cleaning Task Due</p>
                      <p className="text-xs text-gray-500">Unit #456 needs cleaning by 3 PM</p>
                      <p className="text-xs text-gray-400 mt-1">5 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-md">
                    <div className="bg-green-100 p-2 rounded-full">
                      <AssignmentTurnedIn className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Maintenance Complete</p>
                      <p className="text-xs text-gray-500">AC repair completed in Unit #789</p>
                      <p className="text-xs text-gray-400 mt-1">1 day ago</p>
                    </div>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
              <Button variant="ghost" className="w-full text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                View All Notifications
              </Button>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-1 focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-[#2C2E3E] flex items-center justify-center text-white text-sm">
                  {user ? getInitials(user.name) : "?"}
                </div>
                <span className="hidden lg:block text-sm font-medium text-[#2C2E3E]">
                  {user?.name || "User"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <Person className="h-4 w-4 mr-2" />
                <span>Your Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <Logout className="h-4 w-4 mr-2" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
