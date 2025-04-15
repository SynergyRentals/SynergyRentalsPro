interface TaskCardProps {
  type: "cleaning" | "maintenance" | "inventory" | "urgent";
  time: string;
  title: string;
  assignee: {
    initials: string;
    name: string;
  };
}

export default function TaskCard({ type, time, title, assignee }: TaskCardProps) {
  // Define color schemes based on task type
  const typeConfig = {
    cleaning: {
      borderColor: "border-blue-500",
      bgColor: "bg-blue-50",
      textColor: "text-blue-500",
    },
    maintenance: {
      borderColor: "border-yellow-500",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-500",
    },
    inventory: {
      borderColor: "border-green-500",
      bgColor: "bg-green-50",
      textColor: "text-green-500",
    },
    urgent: {
      borderColor: "border-red-500",
      bgColor: "bg-red-50",
      textColor: "text-red-500",
    },
  };

  // Get configuration for this task type
  const config = typeConfig[type];
  
  // Get avatar background color based on task type
  const avatarBgColor = {
    cleaning: "bg-blue-500",
    maintenance: "bg-yellow-500", 
    inventory: "bg-green-500",
    urgent: "bg-red-500"
  }[type];

  return (
    <div className={`border-l-4 ${config.borderColor} ${config.bgColor} p-3 rounded-r-md`}>
      <div className="flex justify-between">
        <span className={`text-xs font-medium ${config.textColor}`}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </span>
        <span className="text-xs text-[#9EA2B1]">{time}</span>
      </div>
      
      <p className="font-medium text-[#2C2E3E] mt-1">{title}</p>
      
      <div className="flex items-center mt-2">
        <div className={`w-6 h-6 rounded-full ${avatarBgColor} text-white flex items-center justify-center text-xs`}>
          {assignee.initials}
        </div>
        <span className="text-xs text-[#9EA2B1] ml-2">{assignee.name}</span>
      </div>
    </div>
  );
}
