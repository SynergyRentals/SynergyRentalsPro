/**
 * Configuration service for property-specific settings
 * This provides a centralized way to manage property-specific configurations
 */

export interface PropertyConfig {
  id: number;
  icalUrl?: string;
  refreshInterval?: number; // in minutes
  special?: boolean;
  highTraffic?: boolean;
}

// Property configuration that can be extended as needed
// This replaces hardcoded special cases in the codebase
const propertyConfigs: PropertyConfig[] = [
  {
    id: 18,
    icalUrl: 'https://app.guesty.com/api/public/icalendar-dashboard-api/export/7c7a55f6-d047-462e-b848-d32f531d6fcb',
    refreshInterval: 10, // Refresh every 10 minutes
    special: true,
    highTraffic: true
  }
];

/**
 * Get configuration for a specific property
 * @param id The property ID
 * @returns The property configuration or undefined if not found
 */
export function getPropertyConfig(id: number): PropertyConfig | undefined {
  return propertyConfigs.find(config => config.id === id);
}

/**
 * Check if a property is considered high traffic (frequent bookings)
 * @param propertyId The property ID to check
 * @returns True if the property is high traffic
 */
export function isHighTrafficProperty(propertyId?: number): boolean {
  if (!propertyId) return false;
  const config = getPropertyConfig(propertyId);
  return config?.highTraffic === true;
}

/**
 * Get all property IDs that are configured as high traffic
 * @returns Array of high traffic property IDs
 */
export function getHighTrafficPropertyIds(): number[] {
  return propertyConfigs
    .filter(config => config.highTraffic)
    .map(config => config.id);
}

/**
 * Add a new property configuration
 * @param config The property configuration to add
 */
export function addPropertyConfig(config: PropertyConfig): void {
  // Remove any existing config for this property ID
  const existingIndex = propertyConfigs.findIndex(c => c.id === config.id);
  if (existingIndex >= 0) {
    propertyConfigs.splice(existingIndex, 1);
  }
  
  // Add the new config
  propertyConfigs.push(config);
}