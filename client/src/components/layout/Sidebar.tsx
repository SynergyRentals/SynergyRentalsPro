import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dashboard,
  People as Users,
  CleaningServices,
  Construction,
  Inventory2,
  Groups,
  Business,
  Psychology,
  AdminPanelSettings,
  Add,
  HomeWork,
} from "@mui/icons-material";

interface SidebarProps {
  isMobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isMobileOpen, onClose }: SidebarProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/", icon: Dashboard },
    { name: "Properties", href: "/properties", icon: HomeWork },
    { name: "Guests", href: "/guests", icon: Users },
    { name: "Cleaning", href: "/cleaning", icon: CleaningServices },
    { name: "Maintenance", href: "/maintenance", icon: Construction },
    { name: "Inventory", href: "/inventory", icon: Inventory2 },
    { name: "Team", href: "/team", icon: Groups },
    { name: "Company Info", href: "/company", icon: Business },
    { name: "AI Tools", href: "/ai-tools", icon: Psychology },
    { name: "Admin & Support", href: "/admin", icon: AdminPanelSettings, roles: ["admin", "ops"] },
  ];

  // Filter menu items based on user role
  const filteredNavigation = user
    ? navigation.filter(item => !item.roles || item.roles.includes(user.role))
    : navigation;

  const handleNavClick = (href: string) => {
    navigate(href);
    if (isMobileOpen) onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`bg-[#2C2E3E] text-white w-64 flex-shrink-0 shadow-lg z-20 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } fixed lg:relative h-full overflow-y-auto scrollbar-hide`}
      >
        <div className="h-full flex flex-col">
          {/* Role indicator */}
          {user && (
            <div className="px-4 py-3 border-b border-gray-700 flex items-center bg-opacity-50 bg-black">
              <div className="bg-[#FFCF45] text-[#2C2E3E] rounded-md px-2 py-1 text-xs font-semibold mr-2 uppercase">
                {user.role}
              </div>
              <span className="text-sm font-medium">{roleDisplay(user.role)}</span>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="flex-1 py-2">
            <ul>
              {filteredNavigation.map((item) => {
                const isActive = location === item.href;
                const IconComponent = item.icon;
                
                return (
                  <li key={item.name}>
                    <button
                      onClick={() => handleNavClick(item.href)}
                      className={`w-full text-left flex items-center px-4 py-3 hover:bg-white hover:bg-opacity-10 transition-colors ${
                        isActive
                          ? "bg-[#FFCF45] bg-opacity-20 border-l-4 border-[#FFCF45]"
                          : ""
                      }`}
                    >
                      <IconComponent
                        className={`mr-3 ${isActive ? "text-[#FFCF45]" : "text-[#9EA2B1]"}`}
                        fontSize="small"
                      />
                      <span>{item.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Quick Actions Button */}
          <div className="p-4 border-t border-gray-700">
            <Button
              className="w-full bg-[#FFCF45] text-[#2C2E3E] hover:bg-opacity-90"
            >
              <Add className="mr-2 h-4 w-4" />
              <span>New Task</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

function roleDisplay(role: string): string {
  const roleMap: Record<string, string> = {
    admin: "Administrator",
    ops: "Operations Manager",
    va: "Virtual Assistant",
    maintenance: "Maintenance Tech",
    cleaner: "Cleaning Staff"
  };
  
  return roleMap[role] || "Team Member";
}
