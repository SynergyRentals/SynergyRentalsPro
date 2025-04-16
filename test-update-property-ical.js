/**
 * Test script to check and update the iCal URL for property ID 5
 */
import { db } from './server/db.ts';
import { guestyProperties, eq } from './shared/schema.ts';

async function checkProperty(id) {
  console.log(`Checking if property ID ${id} exists...`);
  
  try {
    const [property] = await db.select()
      .from(guestyProperties)
      .where(eq(guestyProperties.id, id));
    
    if (!property) {
      console.log(`No property found with ID ${id}`);
      return null;
    }
    
    console.log(`Found property: ID=${property.id}, Name=${property.name}`);
    console.log(`Current iCal URL: ${property.icalUrl || 'None'}`);
    return property;
  } catch (error) {
    console.error('Error checking property:', error);
    return null;
  }
}

async function updatePropertyIcalUrl(id, icalUrl) {
  console.log(`Updating iCal URL for property ID ${id}...`);
  
  try {
    await db.update(guestyProperties)
      .set({
        icalUrl,
        updatedAt: new Date()
      })
      .where(eq(guestyProperties.id, id));
    
    console.log(`Successfully updated iCal URL for property ID ${id}`);
    
    // Verify update
    const updatedProperty = await checkProperty(id);
    if (updatedProperty && updatedProperty.icalUrl === icalUrl) {
      console.log('Verification successful!');
    } else {
      console.log('Verification failed!');
    }
  } catch (error) {
    console.error('Error updating property:', error);
  }
}

async function listAllProperties() {
  console.log('Listing all properties...');
  
  try {
    const properties = await db.select({
      id: guestyProperties.id,
      name: guestyProperties.name,
      propertyId: guestyProperties.propertyId,
      icalUrl: guestyProperties.icalUrl
    })
    .from(guestyProperties)
    .orderBy(guestyProperties.id);
    
    console.log(`Found ${properties.length} properties:`);
    properties.forEach(p => {
      console.log(`ID: ${p.id}, Name: ${p.name}, Property ID: ${p.propertyId}, iCal URL: ${p.icalUrl || 'None'}`);
    });
    
    return properties;
  } catch (error) {
    console.error('Error listing properties:', error);
    return [];
  }
}

async function main() {
  await listAllProperties();
  
  const targetId = 5;
  const icalUrl = 'https://app.guesty.com/api/public/icalendar-dashboard-api/export/cfcd36b9-4266-42e1-8de2-c234618eeda3';
  
  const property = await checkProperty(targetId);
  
  if (property) {
    await updatePropertyIcalUrl(targetId, icalUrl);
  } else {
    console.log('Cannot update property as it does not exist.');
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
});