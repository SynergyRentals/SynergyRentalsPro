import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Add, 
  Description, 
  Download, 
  Upload, 
  FolderOpen, 
  School, 
  PlayCircle,
  OndemandVideo,
  AssignmentTurnedIn,
  Group
} from "@mui/icons-material";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";

// Mock SOPs and training materials
const sopCategories = [
  "Cleaning",
  "Maintenance",
  "Guest Relations",
  "Operations",
  "Administration"
];

const trainingSections = [
  "Onboarding",
  "Software Systems",
  "Communications",
  "Safety",
  "Management"
];

interface SopDocument {
  id: number;
  title: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  assignedRoles: string[];
  version: string;
}

interface TrainingModule {
  id: number;
  title: string;
  description: string;
  type: "video" | "document" | "test";
  section: string;
  duration: number; // in minutes
  requiredFor: string[];
  completionStatus?: Record<number, { completed: boolean; date: string }>;
}

// Empty data arrays
const sampleSops: SopDocument[] = [];

const sampleTrainings: TrainingModule[] = [];

// Props interface
interface TrainingAndSopsProps {
  users?: User[];
  currentUser?: User;
}

export default function TrainingAndSops({ users, currentUser }: TrainingAndSopsProps) {
  const { toast } = useToast();
  const [sopCategory, setSopCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [trainingSection, setTrainingSection] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("sops");

  // Filter SOPs based on category and search term
  const filteredSops = sampleSops.filter(sop => 
    (sopCategory === "all" || sop.category === sopCategory) &&
    (searchTerm === "" || 
      sop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sop.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Filter training modules based on section
  const filteredTrainings = sampleTrainings.filter(training =>
    (trainingSection === "all" || training.section === trainingSection) &&
    (searchTerm === "" || 
      training.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      training.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Check if a training is assigned to current user's role
  const isTrainingRequired = (training: TrainingModule) => {
    if (!currentUser || !currentUser.role) return false;
    return training.requiredFor.includes(currentUser.role);
  };

  // Handle document download
  const handleDownload = (id: number, title: string) => {
    toast({
      title: "Download Started",
      description: `Downloading "${title}"`
    });
  };

  // Handle upload new document
  const handleUpload = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Document upload will be available in the next update."
    });
  };

  // Handle assignment of SOPs to team members
  const handleAssign = (id: number, title: string) => {
    toast({
      title: "Assign SOP",
      description: `Assignment of "${title}" will be available soon.`
    });
  };

  // Handle launching training
  const handleLaunchTraining = (id: number, title: string) => {
    toast({
      title: "Launch Training",
      description: `Training "${title}" will be available soon.`
    });
  };

  return (
    <div className="space-y-6">
      <Tabs 
        defaultValue="sops" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sops">
            <Description className="mr-2 h-4 w-4" />
            SOPs & Documents
          </TabsTrigger>
          <TabsTrigger value="training">
            <School className="mr-2 h-4 w-4" />
            Training & Certifications
          </TabsTrigger>
        </TabsList>

        {/* SOPs & Documents Tab */}
        <TabsContent value="sops" className="mt-4 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative flex-1">
              <Input
                type="search"
                placeholder="Search SOPs and documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Description className="h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleUpload}>
                <Upload className="mr-2 h-4 w-4" />
                Upload New
              </Button>
              <Button>
                <Add className="mr-2 h-4 w-4" />
                Create New
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge 
              variant={sopCategory === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSopCategory("all")}
            >
              All Categories
            </Badge>
            {sopCategories.map(category => (
              <Badge
                key={category}
                variant={sopCategory === category ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSopCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSops.map(sop => (
              <Card key={sop.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <div className="mr-3 p-2 bg-blue-50 rounded-md">
                        <Description className="h-6 w-6 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-medium text-[#2C2E3E]">{sop.title}</h3>
                        <p className="text-xs text-[#9EA2B1]">
                          Version {sop.version} • Last updated {sop.updatedAt}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{sop.category}</Badge>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap gap-1 mb-3">
                    {sop.assignedRoles.map(role => (
                      <Badge 
                        key={role} 
                        variant="outline"
                        className="bg-gray-50"
                      >
                        {role === "va" ? "Virtual Assistant" : role.charAt(0).toUpperCase() + role.slice(1)}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex justify-between mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload(sop.id, sop.title)}
                    >
                      <Download className="mr-1 h-4 w-4" />
                      Download
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleAssign(sop.id, sop.title)}
                    >
                      <Group className="mr-1 h-4 w-4" />
                      Assign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredSops.length === 0 && (
              <div className="col-span-2 text-center p-8 bg-slate-50 rounded-md">
                <FolderOpen className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-[#9EA2B1]">No documents found matching your criteria.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Training & Certifications Tab */}
        <TabsContent value="training" className="mt-4 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative flex-1">
              <Input
                type="search"
                placeholder="Search training materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <School className="h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            <Button>
              <Add className="mr-2 h-4 w-4" />
              Add Training Material
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge 
              variant={trainingSection === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setTrainingSection("all")}
            >
              All Sections
            </Badge>
            {trainingSections.map(section => (
              <Badge
                key={section}
                variant={trainingSection === section ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setTrainingSection(section)}
              >
                {section}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredTrainings.map(training => {
              const isRequired = isTrainingRequired(training);
              const TypeIcon = training.type === 'video' 
                ? OndemandVideo 
                : training.type === 'document' 
                  ? Description 
                  : AssignmentTurnedIn;
              
              return (
                <Card key={training.id} className={isRequired ? 'border-blue-200' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className={`mr-3 p-2 rounded-md ${
                          training.type === 'video' 
                            ? 'bg-red-50 text-red-500' 
                            : training.type === 'document' 
                              ? 'bg-blue-50 text-blue-500' 
                              : 'bg-green-50 text-green-500'
                        }`}>
                          <TypeIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-medium text-[#2C2E3E]">{training.title}</h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{training.section}</Badge>
                            <p className="text-xs text-[#9EA2B1]">
                              {training.duration} min {training.type}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {isRequired && (
                        <Badge className="bg-blue-100 text-blue-800 border-0">
                          Required for your role
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-[#2C2E3E] mt-3">
                      {training.description}
                    </p>

                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-[#9EA2B1]">
                        Required for: {training.requiredFor.map(role => 
                          role === "va" ? "Virtual Assistant" : role.charAt(0).toUpperCase() + role.slice(1)
                        ).join(", ")}
                      </div>
                      
                      <Button 
                        onClick={() => handleLaunchTraining(training.id, training.title)}
                      >
                        <PlayCircle className="mr-1 h-4 w-4" />
                        {training.type === 'test' ? 'Take Test' : 'Start'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {filteredTrainings.length === 0 && (
              <div className="text-center p-8 bg-slate-50 rounded-md">
                <School className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-[#9EA2B1]">No training materials found matching your criteria.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}