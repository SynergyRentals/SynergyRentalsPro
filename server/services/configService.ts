/**
 * Configuration service for properties
 * Provides utility functions to determine property attributes for adaptive caching and other features
 */

// High-traffic property IDs that need special handling
const HIGH_TRAFFIC_PROPERTY_IDS = [18, 5, 10]; // Add commonly booked property IDs

// Properties with custom/legacy behavior
const SPECIAL_PROPERTY_IDS = [18]; // Property ID 18 has special Guesty URL handling

// Maintenance mode configuration
let GLOBAL_MAINTENANCE_MODE = false;

/**
 * Set the global maintenance mode
 * @param enabled Whether maintenance mode is enabled
 */
export function setMaintenanceMode(enabled: boolean): void {
  GLOBAL_MAINTENANCE_MODE = enabled;
  console.log(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Check if the system is in maintenance mode
 * @returns True if maintenance mode is active
 */
export function isMaintenanceMode(): boolean {
  return GLOBAL_MAINTENANCE_MODE;
}

/**
 * Check if a property requires special handling
 * This includes properties with known issues or legacy integration patterns
 * @param propertyId The property ID to check
 * @returns True if the property needs special handling
 */
export function isSpecialProperty(propertyId?: number): boolean {
  if (!propertyId) return false;
  return SPECIAL_PROPERTY_IDS.includes(propertyId);
}

/**
 * Determine if a property is considered high-traffic 
 * High-traffic properties have different caching and polling strategies
 * @param propertyId The property ID to check
 * @returns True if the property is high-traffic
 */
export function isHighTrafficProperty(propertyId?: number): boolean {
  if (!propertyId) return false;
  return HIGH_TRAFFIC_PROPERTY_IDS.includes(propertyId);
}

/**
 * Get the appropriate polling interval for a property
 * @param propertyId The property ID
 * @returns The polling interval in milliseconds
 */
export function getPropertyPollingInterval(propertyId?: number): number {
  if (isHighTrafficProperty(propertyId)) {
    return 10 * 60 * 1000; // 10 minutes for high-traffic properties
  }
  return 30 * 60 * 1000; // 30 minutes for regular properties
}

/**
 * Get feature flags for the application
 * @returns Object with feature flags
 */
export function getFeatureFlags(): Record<string, boolean> {
  return {
    enableCalendarIntegration: true,
    enableSlackNotifications: false,
    enableAdvancedCaching: true,
    showExperimentalFeatures: false,
    useStandardizedDateHandling: true // Flag for our new standardized date handling
  };
}