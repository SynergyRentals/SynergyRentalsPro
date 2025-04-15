import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Home, QrCode2 } from "@mui/icons-material";
import QrCodeScanner from "./QrCodeScanner";

interface UnitQrRequestCardProps {
  units: Array<{ id: number; name: string }>;
}

export default function UnitQrRequestCard({ units }: UnitQrRequestCardProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter units based on search
  const filteredUnits = units.filter((unit) =>
    unit.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <QrCode2 className="h-5 w-5 text-[#2C2E3E]" />
          QR Code Supply Requests
        </CardTitle>
        <CardDescription>
          Select a unit to scan its QR code and request supplies
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search units..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {filteredUnits.length > 0 ? (
              filteredUnits.map((unit) => (
                <Card key={unit.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="bg-gray-50 p-4 flex items-center gap-2">
                      <Home className="h-5 w-5 text-[#2C2E3E]" />
                      <span className="font-medium">{unit.name}</span>
                    </div>
                    <div className="p-4">
                      <QrCodeScanner unitId={unit.id} unitName={unit.name} />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <p>
                  {searchTerm
                    ? "No units found matching your search"
                    : "No units available"}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}