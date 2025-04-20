
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { setupGuestySyncRoutes } from '../../server/routes/guesty-sync-routes';

// Mock dependencies
vi.mock('../../server/services/guestySyncService', () => ({
  syncAllGuestyData: vi.fn()
}));

vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue([
      {
        id: 1,
        syncType: 'full',
        status: 'success',
        startedAt: new Date(),
        completedAt: new Date(),
        itemsProcessed: 150,
        notes: 'Successfully synced properties and reservations'
      }
    ])
  }
}));

vi.mock('../../server/auth', () => ({
  checkRole: () => (req, res, next) => next() // Mock as middleware that always passes
}));

vi.mock('@shared/schema', () => ({
  guestySyncLogs: {}
}));

// Import the mocked service
import { syncAllGuestyData } from '../../server/services/guestySyncService';

describe('Guesty Full Sync Routes', () => {
  let app;

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();
    
    // Set up a fresh Express app for each test
    app = express();
    app.use(express.json());
    
    // Set up the routes to test
    setupGuestySyncRoutes(app);
    
    // Mock successful environment variables
    process.env.GUESTY_CLIENT_ID = 'test-client-id';
    process.env.GUESTY_CLIENT_SECRET = 'test-client-secret';
  });

  describe('POST /api/admin/guesty/full-sync', () => {
    it('should return 200 with success response when sync succeeds', async () => {
      // Mock the syncAllGuestyData function to return a successful result
      const mockResult = {
        success: true,
        message: 'Successfully synced all Guesty data',
        propertiesResult: {
          success: true,
          propertiesCount: 100,
          errors: []
        },
        reservationsResult: {
          success: true,
          reservationsCount: 50,
          errors: []
        }
      };
      
      (syncAllGuestyData as any).mockResolvedValue(mockResult);
      
      // Send the request
      const response = await request(app)
        .post('/api/admin/guesty/full-sync')
        .expect(200);
      
      // Assert the response structure
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Successfully synced all Guesty data');
      expect(response.body.properties.count).toBe(100);
      expect(response.body.reservations.count).toBe(50);
      
      // Verify the sync function was called
      expect(syncAllGuestyData).toHaveBeenCalledTimes(1);
    });
    
    it('should return 500 when Guesty credentials are missing', async () => {
      // Remove mock environment variables
      delete process.env.GUESTY_CLIENT_ID;
      delete process.env.GUESTY_CLIENT_SECRET;
      
      // Send the request
      const response = await request(app)
        .post('/api/admin/guesty/full-sync')
        .expect(500);
      
      // Assert the response
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Guesty API credentials are not configured');
      
      // Verify the sync function was not called
      expect(syncAllGuestyData).not.toHaveBeenCalled();
    });
    
    it('should return 500 when sync throws an error', async () => {
      // Mock the syncAllGuestyData function to throw an error
      (syncAllGuestyData as any).mockRejectedValue(new Error('Test error'));
      
      // Send the request
      const response = await request(app)
        .post('/api/admin/guesty/full-sync')
        .expect(500);
      
      // Assert the response
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Test error');
    });
  });
  
  describe('GET /api/admin/guesty/status', () => {
    it('should return 200 with recent sync logs', async () => {
      // Send the request
      const response = await request(app)
        .get('/api/admin/guesty/status')
        .expect(200);
      
      // Assert the response structure
      expect(response.body.success).toBe(true);
      expect(response.body.logs).toBeInstanceOf(Array);
      expect(response.body.logs.length).toBeGreaterThan(0);
      expect(response.body.logs[0]).toHaveProperty('id');
      expect(response.body.logs[0]).toHaveProperty('syncType');
      expect(response.body.logs[0]).toHaveProperty('status');
    });
  });
});
