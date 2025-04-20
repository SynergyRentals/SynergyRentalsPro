import { Express } from "express";
import { createServer, Server } from "http";
// Auth middleware
const checkAuth = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
import { storage } from "./storage";
import { z } from "zod";
import * as icalService from "./services/icalService";
import { formatISO } from "date-fns";

export function registerRoutes(app: Express): Server {
  // Simple middleware for logging API access without creating log entries
  app.use("/api/*", async (req, res, next) => {
    console.log(`API Request: ${req.method} ${req.path}`);
    next();
  });

  // Basic routes for user data
  app.get("/api/user/profile", checkAuth, async (req, res) => {
    res.json(req.user);
  });

  // Property routes
  app.get("/api/properties", async (req, res) => {
    try {
      const properties = await storage.getAllProperties();
      res.json(properties);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getProperty(parseInt(req.params.id));
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Calendar data endpoint
  app.get("/api/properties/:id/calendar", async (req, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      const startDate = req.query.start ? new Date(req.query.start as string) : new Date();
      const endDate = req.query.end ? new Date(req.query.end as string) : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
      
      // First get the property to check if it has an iCal URL
      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      // Get existing reservations from the database
      const reservations = await storage.getPropertyReservations(propertyId);
      
      // Try to get iCal events if the property has an iCal URL
      let icalEvents = [];
      if (property.icalUrl) {
        try {
          console.log(`Fetching iCal events for property ${propertyId} from ${property.icalUrl}`);
          const events = await icalService.getEventsFromUrl(property.icalUrl, startDate, endDate);
          icalEvents = events.map(event => ({
            id: `ical-${event.uid}`,
            title: event.summary || 'Reserved',
            start: formatISO(event.start),
            end: formatISO(event.end),
            allDay: true,
            source: 'ical',
            extendedProps: {
              description: event.description,
              location: event.location,
              source: 'ical',
              status: 'confirmed'
            }
          }));
        } catch (error) {
          console.error(`Error fetching iCal events for property ${propertyId}:`, error);
          // Still continue with database reservations
        }
      }
      
      // Map database reservations to calendar events
      const dbEvents = reservations.map(res => ({
        id: `db-${res.id}`,
        title: res.guestName || 'Reserved',
        start: formatISO(res.checkInDate),
        end: formatISO(res.checkOutDate),
        allDay: true,
        source: 'database',
        extendedProps: {
          guestName: res.guestName,
          status: res.status,
          reservationCode: res.reservationCode,
          guestCount: res.guestCount,
          source: 'database'
        }
      }));
      
      // Merge all events
      const events = [...dbEvents, ...icalEvents];
      res.json(events);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}