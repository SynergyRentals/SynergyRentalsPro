import { Router, Request, Response, NextFunction, Express } from "express";
import * as PropertyService from "./services/propertyService";

export function setupRoutes(app: Express) {
  const router = Router();

  // Add middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Properties API endpoints
  router.get("/properties", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const properties = await PropertyService.getAllProperties();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  router.get("/properties/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const property = await PropertyService.getPropertyById(parseInt(req.params.id));
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error(`Error fetching property ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  router.post("/properties", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const property = await PropertyService.createProperty(req.body);
      res.status(201).json(property);
    } catch (error) {
      console.error("Error creating property:", error);
      res.status(500).json({ message: "Failed to create property" });
    }
  });

  router.patch("/properties/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const property = await PropertyService.updateProperty(parseInt(req.params.id), req.body);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error(`Error updating property ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update property" });
    }
  });

  router.delete("/properties/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const property = await PropertyService.deleteProperty(parseInt(req.params.id));
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json({ message: "Property deleted" });
    } catch (error) {
      console.error(`Error deleting property ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  router.get("/properties/:id/calendar", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const events = await PropertyService.getPropertyCalendar(parseInt(req.params.id));
      res.json(events);
    } catch (error) {
      console.error(`Error fetching calendar for property ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch property calendar" });
    }
  });

  router.post("/properties/validate-ical", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }
      
      const validation = await PropertyService.validateIcalUrl(url);
      res.json(validation);
    } catch (error) {
      console.error("Error validating iCal URL:", error);
      res.status(500).json({ message: "Failed to validate iCal URL" });
    }
  });

  // Mount the router
  app.use("/api", router);
}