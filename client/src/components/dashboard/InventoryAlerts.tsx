import { Error, Warning, ShoppingCart, ArrowForward } from '@mui/icons-material';
import { Button } from '@/components/ui/button';

interface InventoryAlert {
  id: number;
  severity: 'critical' | 'warning' | 'info';
  location: string;
  item: string;
  current: number;
  target: number;
}

interface InventoryAlertsProps {
  alerts: InventoryAlert[];
  onViewAll: () => void;
  onRestock: (alertId: number) => void;
}

export default function InventoryAlerts({ alerts, onViewAll, onRestock }: InventoryAlertsProps) {
  // Helper functions for styling based on severity
  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Error className="text-red-500 mr-2" />;
      case 'warning':
        return <Warning className="text-yellow-500 mr-2" />;
      case 'info':
        return <ShoppingCart className="text-blue-500 mr-2" />;
      default:
        return null;
    }
  };
  
  const getAlertStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 border-opacity-50 bg-red-500 bg-opacity-5';
      case 'warning':
        return 'border-yellow-500 border-opacity-50 bg-yellow-500 bg-opacity-5';
      case 'info':
        return 'border-blue-500 border-opacity-50 bg-blue-500 bg-opacity-5';
      default:
        return '';
    }
  };
  
  const getButtonStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 text-red-500';
      case 'warning':
        return 'border-yellow-500 text-yellow-500';
      case 'info':
        return 'border-blue-500 text-blue-500';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[#2C2E3E]">Inventory Alerts</h2>
        <Button 
          variant="ghost" 
          className="text-[#FFCF45] hover:text-[#FFCF45] hover:underline text-sm flex items-center"
          onClick={onViewAll}
        >
          <span>View All</span>
          <ArrowForward className="h-4 w-4 ml-1" />
        </Button>
      </div>
      
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div 
            key={alert.id} 
            className={`border rounded-lg p-3 ${getAlertStyles(alert.severity)}`}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                {getAlertIcon(alert.severity)}
                <div>
                  <p className="font-medium text-[#2C2E3E]">{alert.location} - {alert.item}</p>
                  <p className="text-[#9EA2B1] text-xs mt-1">
                    Current: {alert.current}, Par Level: {alert.target}
                  </p>
                </div>
              </div>
              <Button 
                className={`text-xs bg-white border ${getButtonStyles(alert.severity)} px-2 py-1 rounded h-auto`}
                onClick={() => onRestock(alert.id)}
              >
                Restock
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
