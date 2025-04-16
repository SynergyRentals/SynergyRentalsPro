/**
 * Sample webhook payloads for testing Guesty webhook integration
 * These can be used with the test endpoint at /api/webhooks/guesty/test
 */

// Sample property created webhook event
export const samplePropertyCreatedWebhook = {
  event: "listing.created",
  eventId: "test-event-" + Date.now(),
  timestamp: new Date().toISOString(),
  data: {
    _id: "test-property-" + Date.now().toString(36),
    title: "Test Property " + Date.now().toString(36).substring(0, 4),
    nickname: "Beach House Test",
    pictures: [
      {
        thumbnail: "https://example.com/thumbnail.jpg",
        regular: "https://example.com/image.jpg"
      }
    ],
    amenities: ["wifi", "pool", "air-conditioning"],
    bedrooms: 3,
    bathrooms: 2,
    accommodates: 6,
    propertyType: "House",
    address: {
      full: "123 Test Drive, Testville, FL 12345",
      street: "123 Test Drive",
      city: "Testville",
      state: "FL",
      zipcode: "12345",
      country: "United States",
      location: {
        lat: 26.1224,
        lng: -80.1373
      }
    },
    listingUrl: "https://example.com/property/123"
  }
};

// Sample property updated webhook event
export const samplePropertyUpdatedWebhook = {
  event: "listing.updated",
  eventId: "test-event-" + Date.now(),
  timestamp: new Date().toISOString(),
  data: {
    _id: "test-property-" + Date.now().toString(36),
    title: "Updated Test Property " + Date.now().toString(36).substring(0, 4),
    nickname: "Updated Beach House",
    pictures: [
      {
        thumbnail: "https://example.com/thumbnail-updated.jpg",
        regular: "https://example.com/image-updated.jpg"
      }
    ],
    amenities: ["wifi", "pool", "air-conditioning", "bbq"],
    bedrooms: 4,
    bathrooms: 3,
    accommodates: 8,
    propertyType: "House",
    address: {
      full: "456 Update Lane, Testville, FL 12345",
      street: "456 Update Lane",
      city: "Testville",
      state: "FL",
      zipcode: "12345",
      country: "United States",
      location: {
        lat: 26.1224,
        lng: -80.1373
      }
    },
    listingUrl: "https://example.com/property/456"
  }
};

// Sample reservation created webhook event
export const sampleReservationCreatedWebhook = {
  event: "reservation.created",
  eventId: "test-event-" + Date.now(),
  timestamp: new Date().toISOString(),
  data: {
    _id: "test-reservation-" + Date.now().toString(36),
    guest: {
      _id: "guest-" + Date.now().toString(36),
      fullName: "John Doe",
      email: "johndoe@example.com",
      phone: "+1234567890"
    },
    listing: {
      _id: "test-property-" + Date.now().toString(36)
    },
    checkIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
    checkOut: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks from now
    status: "confirmed",
    source: "direct",
    confirmationCode: "TEST" + Date.now().toString().substring(0, 6),
    money: {
      total: 1500,
      currency: "USD"
    },
    guests: {
      adults: 2,
      children: 2,
      infants: 0,
      pets: 0,
      total: 4
    }
  }
};

// Sample reservation updated webhook event
export const sampleReservationUpdatedWebhook = {
  event: "reservation.updated",
  eventId: "test-event-" + Date.now(),
  timestamp: new Date().toISOString(),
  data: {
    _id: "test-reservation-" + Date.now().toString(36),
    guest: {
      _id: "guest-" + Date.now().toString(36),
      fullName: "Jane Smith",
      email: "janesmith@example.com",
      phone: "+1987654321"
    },
    listing: {
      _id: "test-property-" + Date.now().toString(36)
    },
    checkIn: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks from now
    checkOut: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 weeks from now
    status: "modified",
    source: "airbnb",
    confirmationCode: "TEST" + Date.now().toString().substring(0, 6),
    money: {
      total: 2000,
      currency: "USD"
    },
    guests: {
      adults: 3,
      children: 1,
      infants: 1,
      pets: 0,
      total: 5
    }
  }
};

// Sample reservation cancelled webhook event
export const sampleReservationCancelledWebhook = {
  event: "reservation.cancelled",
  eventId: "test-event-" + Date.now(),
  timestamp: new Date().toISOString(),
  data: {
    _id: "test-reservation-" + Date.now().toString(36),
    guest: {
      _id: "guest-" + Date.now().toString(36),
      fullName: "Cancelled Booking",
      email: "cancelled@example.com",
      phone: "+1555555555"
    },
    listing: {
      _id: "test-property-" + Date.now().toString(36)
    },
    checkIn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
    checkOut: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: "cancelled",
    source: "booking.com",
    confirmationCode: "CANCEL" + Date.now().toString().substring(0, 6),
    money: {
      total: 1200,
      currency: "USD",
      refundAmount: 1000
    },
    guests: {
      adults: 2,
      children: 0,
      infants: 0,
      pets: 0,
      total: 2
    }
  }
};

// Sample property deleted webhook event
export const samplePropertyDeletedWebhook = {
  event: "listing.deleted",
  eventId: "test-event-" + Date.now(),
  timestamp: new Date().toISOString(),
  data: {
    _id: "test-property-" + Date.now().toString(36)
  }
};

// Sample reservation deleted webhook event
export const sampleReservationDeletedWebhook = {
  event: "reservation.deleted",
  eventId: "test-event-" + Date.now(),
  timestamp: new Date().toISOString(),
  data: {
    _id: "test-reservation-" + Date.now().toString(36)
  }
};