import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { motion } from 'framer-motion';
import {
  Camera,
  CheckCircle,
  Delete,
  PhotoCamera,
  Visibility,
  Assignment,
  Room,
} from "@mui/icons-material";

interface PhotoDocumentationProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  roomOptions?: string[];
  requiredCount?: number;
  requiredRooms?: string[];
  checklistItemId?: number;
  isMobile?: boolean;
}

export default function PhotoDocumentation({
  photos = [],
  onPhotosChange,
  roomOptions = ["Bathroom", "Bedroom", "Kitchen", "Living Room", "Outdoor", "Other"],
  requiredCount = 0,
  requiredRooms = [],
  checklistItemId,
}: PhotoDocumentationProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [roomTags, setRoomTags] = useState<Record<number, string>>({});
  const [photoNotes, setPhotoNotes] = useState<Record<number, string>>({});
  const [viewingPhoto, setViewingPhoto] = useState<boolean>(false);
  
  // Calculate verification stats
  const totalPhotos = photos.length;
  const hasRequiredCount = totalPhotos >= requiredCount;
  
  // Check if all required rooms have photos
  const requiredRoomsWithPhotos = Object.values(roomTags).filter(room => 
    requiredRooms.includes(room)
  );
  const allRequiredRoomsCovered = requiredRooms.length > 0 
    ? requiredRoomsWithPhotos.length === requiredRooms.length 
    : true;
  
  // Determine verification status
  const isVerified = hasRequiredCount && allRequiredRoomsCovered;
  
  // Handle photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // In a real implementation, you would upload these to a server
      // and get back URLs. This is a simplified mock version.
      const newUrls = Array.from(e.target.files).map(
        (_, index) => `https://placehold.co/800x600?text=Cleaning+Photo+${photos.length + index + 1}`
      );
      
      const updatedPhotos = [...photos, ...newUrls];
      onPhotosChange(updatedPhotos);
      
      toast({
        title: "Photos uploaded",
        description: `${e.target.files.length} photos have been added.`,
      });
    }
  };
  
  // Handle removing a photo
  const handleRemovePhoto = (index: number) => {
    const updatedPhotos = [...photos];
    updatedPhotos.splice(index, 1);
    onPhotosChange(updatedPhotos);
    
    // Also remove any tags or notes for this photo
    const updatedRoomTags = { ...roomTags };
    delete updatedRoomTags[index];
    setRoomTags(updatedRoomTags);
    
    const updatedNotes = { ...photoNotes };
    delete updatedNotes[index];
    setPhotoNotes(updatedNotes);
    
    toast({
      title: "Photo removed",
      description: "The photo has been removed.",
    });
  };
  
  // Handle setting room tag for a photo
  const handleSetRoomTag = (index: number, room: string) => {
    setRoomTags({
      ...roomTags,
      [index]: room,
    });
  };
  
  // Handle setting notes for a photo
  const handleSetPhotoNotes = (index: number, notes: string) => {
    setPhotoNotes({
      ...photoNotes,
      [index]: notes,
    });
  };
  
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium flex items-center">
          <PhotoCamera className="h-4 w-4 mr-1.5 text-blue-500" />
          Photo Documentation
        </h3>
        
        {requiredCount > 0 && (
          <Badge className={
            isVerified 
              ? "bg-green-100 text-green-800 border-0" 
              : "bg-yellow-100 text-yellow-800 border-0"
          }>
            {isVerified ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </>
            ) : (
              `${totalPhotos}/${requiredCount} Required`
            )}
          </Badge>
        )}
      </div>
      
      {/* Photo Gallery */}
      <div>
        <ScrollArea className="h-auto max-h-40 w-full mb-2">
          <div className="flex gap-2 pb-2">
            {photos.map((url, index) => (
              <div 
                key={index} 
                className={`w-20 h-20 rounded bg-gray-100 relative flex-shrink-0 ${
                  requiredRooms.includes(roomTags[index] || "") 
                    ? "ring-2 ring-green-500" 
                    : ""
                }`}
              >
                <img
                  src={url}
                  className="w-full h-full object-cover rounded"
                  alt={`Room: ${roomTags[index] || "Unspecified"}`}
                  onClick={() => {
                    setSelectedPhotoIndex(index);
                    setViewingPhoto(true);
                  }}
                />
                
                {roomTags[index] && (
                  <Badge className="absolute bottom-1 left-1 text-xs bg-black/70 text-white">
                    {roomTags[index]}
                  </Badge>
                )}
                
                <button
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"
                  onClick={() => handleRemovePhoto(index)}
                >
                  <Delete className="h-3 w-3" />
                </button>
                
                <button
                  className="absolute top-1 left-1 bg-blue-500 text-white rounded-full p-0.5"
                  onClick={() => {
                    setSelectedPhotoIndex(index);
                    setViewingPhoto(true);
                  }}
                >
                  <Visibility className="h-3 w-3" />
                </button>
              </div>
            ))}
            
            <label 
              htmlFor="enhanced-photo-upload" 
              className="w-20 h-20 flex flex-col items-center justify-center rounded border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 flex-shrink-0"
            >
              <Camera className="h-6 w-6 text-gray-400" />
              <span className="text-xs text-gray-500 mt-1">Add Photo</span>
              <input
                id="enhanced-photo-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </label>
          </div>
        </ScrollArea>
        
        {requiredRooms.length > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            <span className="font-medium">Required areas:</span>{" "}
            {requiredRooms.map((room, i) => (
              <span key={room}>
                {room}
                {i < requiredRooms.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Photo Detail Dialog */}
      <Dialog open={viewingPhoto} onOpenChange={setViewingPhoto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Photo Details</DialogTitle>
          </DialogHeader>
          
          {selectedPhotoIndex !== null && selectedPhotoIndex < photos.length && (
            <div className="py-4 space-y-4">
              <div className="w-full h-64 rounded bg-gray-100">
                <img
                  src={photos[selectedPhotoIndex]}
                  className="w-full h-full object-contain rounded"
                  alt={`Photo ${selectedPhotoIndex + 1}`}
                />
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="photo-room">Room/Area</Label>
                  <Select
                    value={roomTags[selectedPhotoIndex] || ""}
                    onValueChange={(value) => handleSetRoomTag(selectedPhotoIndex, value)}
                  >
                    <SelectTrigger id="photo-room">
                      <SelectValue placeholder="Select room or area" />
                    </SelectTrigger>
                    <SelectContent>
                      {roomOptions.map((room) => (
                        <SelectItem key={room} value={room}>
                          {room}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="photo-notes">Notes</Label>
                  <Textarea
                    id="photo-notes"
                    placeholder="Add any notes about this photo..."
                    value={photoNotes[selectedPhotoIndex] || ""}
                    onChange={(e) => handleSetPhotoNotes(selectedPhotoIndex, e.target.value)}
                    className="h-20"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    handleRemovePhoto(selectedPhotoIndex);
                    setViewingPhoto(false);
                  }}
                >
                  <Delete className="h-4 w-4 mr-1" />
                  Delete
                </Button>
                <DialogClose asChild>
                  <Button>Done</Button>
                </DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}