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
      const refresh = req.query.refresh === 'true';
      const events = await PropertyService.getPropertyCalendar(parseInt(req.params.id), refresh);
      res.json(events);
    } catch (error) {
      console.error(`Error fetching calendar for property ${req.params.id}:`, error);
      
      // More specific error handling based on error type
      if (error instanceof Error) {
        if (error.message.includes("No iCal URL")) {
          return res.status(404).json({ message: "No calendar URL configured for this property" });
        } else if (error.message.includes("Invalid URL") || error.message.includes("inaccessible")) {
          return res.status(400).json({ message: error.message });
        } else if (error.message.includes("Failed to parse")) {
          return res.status(422).json({ message: error.message });
        }
      }
      
      // Default error response
      res.status(500).json({ 
        message: "Failed to fetch property calendar", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Endpoint to explicitly refresh the calendar data
  router.post("/properties/:id/refresh-calendar", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const propertyId = parseInt(req.params.id);
      const property = await PropertyService.getPropertyById(propertyId);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (!property.icalUrl) {
        return res.status(400).json({ message: "Property does not have an iCal URL configured" });
      }
      
      // Force refresh by passing true
      const events = await PropertyService.getPropertyCalendar(propertyId, true);
      res.json({ 
        success: true, 
        message: "Calendar data refreshed successfully", 
        eventsCount: events.length 
      });
    } catch (error) {
      console.error(`Error refreshing calendar for property ${req.params.id}:`, error);
      
      // More specific error handling based on error type
      if (error instanceof Error) {
        if (error.message.includes("Invalid URL") || error.message.includes("inaccessible")) {
          return res.status(400).json({ 
            success: false,
            message: error.message 
          });
        } else if (error.message.includes("Failed to parse")) {
          return res.status(422).json({ 
            success: false,
            message: error.message 
          });
        }
      }
      
      // Default error response
      res.status(500).json({ 
        success: false,
        message: "Failed to refresh property calendar", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  router.post("/properties/validate-ical", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ 
          valid: false, 
          message: "URL is required",
          details: "Please provide a URL to validate"
        });
      }
      
      const validation = await PropertyService.validateIcalUrl(url);
      
      // Add additional helpful information in the response
      const response: any = {
        ...validation,
        validationTime: new Date().toISOString(),
        validatedBy: req.user?.username || 'system'
      };
      
      // Format dates in a more human-readable format if we have a sample event
      if (validation.valid && validation.sampleEvent) {
        const sampleEvent = validation.sampleEvent;
        response.sampleEventFormatted = {
          title: sampleEvent.title,
          startDate: sampleEvent.start?.toISOString().split('T')[0],
          endDate: sampleEvent.end?.toISOString().split('T')[0]
        };
        
        // Add checkout date if available
        if (sampleEvent.checkout) {
          response.sampleEventFormatted.checkoutDate = sampleEvent.checkout.toISOString().split('T')[0];
        }
      }
      
      res.json(response);
    } catch (error) {
      console.error("Error validating iCal URL:", error);
      
      // More specific error handling based on error type
      if (error instanceof Error) {
        if (error.message.includes("Invalid URL") || error.message.includes("inaccessible") || 
            error.message.includes("protocol") || error.message.includes("format")) {
          return res.status(400).json({ 
            valid: false,
            message: error.message,
            errorType: "URL_INVALID",
            suggestions: [
              "Check that the URL begins with http:// or https://",
              "Verify you can access the URL in a web browser",
              "Contact the calendar provider if the URL was provided by them"
            ]
          });
        } else if (error.message.includes("Failed to parse") || error.message.includes("format")) {
          return res.status(422).json({ 
            valid: false,
            message: error.message,
            errorType: "PARSE_ERROR",
            suggestions: [
              "Verify this is an iCal format calendar URL (.ics)",
              "Check if the calendar requires authentication",
              "Try accessing the URL directly in a browser to see the raw calendar data"
            ]
          });
        } else if (error.message.includes("timeout") || error.message.includes("timed out")) {
          return res.status(504).json({
            valid: false,
            message: error.message,
            errorType: "TIMEOUT",
            suggestions: [
              "The calendar server might be slow or overloaded",
              "Try again later",
              "Check if the URL is correct"
            ]
          });
        }
      }
      
      // Default error response
      res.status(500).json({ 
        valid: false,
        message: "Failed to validate iCal URL", 
        error: error instanceof Error ? error.message : "Unknown error",
        errorType: "UNKNOWN",
        suggestions: [
          "Try with a different URL",
          "Check your internet connection",
          "Contact support if the issue persists"
        ]
      });
    }
  });

  // Mount the router
  app.use("/api", router);
}