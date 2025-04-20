/**
 * Restore Sample Data Script
 * 
 * This script inserts sample data back into the database to restore the application
 * to its normal operational state after a database cleanup.
 * 
 * Run with: npx tsx restore-sample-data.ts
 */

import { db } from "./server/db";
import { 
  guestyProperties, guestyReservations, 
  tasks, projects
} from "./shared/schema";

async function main() {
  try {
    console.log('Starting sample data restoration...');
    
    // First, check if we have any properties
    const existingProperties = await db.select({ count: { expression: "count(*)" } })
      .from(guestyProperties);
    
    const propertyCount = Number(existingProperties[0]?.count || 0);
    
    if (propertyCount > 0) {
      console.log(`Database already has ${propertyCount} properties. No restoration needed.`);
      return;
    }
    
    // Insert sample property data
    const propertiesResult = await db.insert(guestyProperties).values([
      {
        id: 18,
        name: 'Beachfront Villa',
        address: '123 Ocean Drive',
        city: 'Malibu',
        state: 'CA',
        zip: '90210',
        status: 'active',
        guestCapacity: 8,
        bedrooms: 4,
        bathrooms: 3,
        icalUrl: 'https://app.guesty.com/api/public/icalendar-dashboard-api/export/7c7a55f6-d047-462e-b848-d32f531d6fcb',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 19,
        name: 'Mountain Cabin',
        address: '456 Pine Road',
        city: 'Aspen',
        state: 'CO',
        zip: '81611',
        status: 'active',
        guestCapacity: 6,
        bedrooms: 3,
        bathrooms: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 20,
        name: 'Downtown Loft',
        address: '789 Main Street',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        status: 'active',
        guestCapacity: 4, 
        bedrooms: 2,
        bathrooms: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 21,
        name: 'Lakeside Cottage',
        address: '101 Lake Shore Road',
        city: 'Lake Tahoe',
        state: 'CA',
        zip: '96150',
        status: 'active',
        guestCapacity: 5,
        bedrooms: 2,
        bathrooms: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 22,
        name: 'Desert Oasis',
        address: '202 Palm Drive',
        city: 'Scottsdale',
        state: 'AZ',
        zip: '85251',
        status: 'active',
        guestCapacity: 6,
        bedrooms: 3,
        bathrooms: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]).returning();
    
    console.log(`Inserted ${propertiesResult.length} sample properties`);
    
    // Insert sample reservation data
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const twoWeeks = new Date(today);
    twoWeeks.setDate(twoWeeks.getDate() + 14);
    
    const reservationsResult = await db.insert(guestyReservations).values([
      {
        propertyId: 18,
        guestName: 'John Smith',
        checkInDate: today,
        checkOutDate: nextWeek,
        status: 'confirmed',
        guestCount: 4,
        reservationCode: 'RES-001',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        propertyId: 19,
        guestName: 'Jane Doe',
        checkInDate: tomorrow,
        checkOutDate: twoWeeks,
        status: 'confirmed',
        guestCount: 2,
        reservationCode: 'RES-002',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        propertyId: 20,
        guestName: 'Michael Johnson',
        checkInDate: nextWeek,
        checkOutDate: twoWeeks,
        status: 'confirmed',
        guestCount: 3,
        reservationCode: 'RES-003',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]).returning();
    
    console.log(`Inserted ${reservationsResult.length} sample reservations`);
    
    // Insert sample task data
    const tasksResult = await db.insert(tasks).values([
      {
        title: 'Check HVAC system',
        description: 'Perform regular maintenance on the HVAC system',
        dueDate: tomorrow,
        status: 'pending',
        priority: 'medium',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Restock cleaning supplies',
        description: 'Purchase and restock all cleaning supplies',
        dueDate: nextWeek,
        status: 'pending',
        priority: 'high',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Update property photos',
        description: 'Take new professional photos of all properties',
        dueDate: twoWeeks,
        status: 'pending',
        priority: 'low',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]).returning();
    
    console.log(`Inserted ${tasksResult.length} sample tasks`);
    
    // Create sample project
    const projectsResult = await db.insert(projects).values([
      {
        name: 'Property Renovation',
        description: 'Complete renovation of the Mountain Cabin property',
        status: 'in_progress',
        startDate: today,
        endDate: twoWeeks,
        createdBy: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]).returning();
    
    console.log(`Inserted ${projectsResult.length} sample projects`);
    
    console.log('Sample data restoration completed successfully');
  } catch (error) {
    console.error('Error restoring sample data:', error);
    process.exit(1);
  }
}

main();