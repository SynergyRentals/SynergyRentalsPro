# SynergyOps API Documentation

This document provides a comprehensive list of all API endpoints available in the SynergyOps application.

## Authentication

All API endpoints except for `/api/auth/login` and `/api/auth/logout` require authentication.

### Authentication Endpoints

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/auth/login` | Log in to the application | `{ username: string, password: string }` | `{ id: number, name: string, username: string, email: string, role: string }` |
| POST | `/api/auth/logout` | Log out of the application | None | `{ message: string }` |
| GET | `/api/user` | Get the currently logged in user | None | `{ id: number, name: string, username: string, email: string, role: string }` |

## Properties

### Property Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/properties` | Get all properties |
| GET | `/api/properties/:id` | Get a specific property by ID |
| POST | `/api/properties` | Create a new property |
| PATCH | `/api/properties/:id` | Update a property |
| DELETE | `/api/properties/:id` | Delete a property |
| GET | `/api/properties/:id/calendar` | Get calendar events for a property |
| POST | `/api/properties/:id/refresh-calendar` | Force refresh of calendar data |
| POST | `/api/properties/validate-ical` | Validate an iCal URL |

## Guesty Integration

### Guesty Data Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/guesty/properties` | Get all Guesty properties |
| GET | `/api/guesty/properties/:id` | Get a specific Guesty property |
| PATCH | `/api/guesty/properties/:id` | Update a Guesty property |
| GET | `/api/guesty/properties/:id/calendar` | Get calendar for a Guesty property |
| GET | `/api/guesty/reservations` | Get all Guesty reservations |
| GET | `/api/guesty/health-check` | Check Guesty API health |
| GET | `/api/guesty/test-connection` | Test connection to Guesty API |
| GET | `/api/guesty/sync-status` | Get Guesty sync status |

### Guesty Sync Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/guesty/sync-properties` | Sync properties from Guesty |
| POST | `/api/guesty/sync-reservations` | Sync reservations from Guesty |
| POST | `/api/guesty/sync` | Sync both properties and reservations |
| POST | `/api/guesty/import-csv` | Import data from CSV |
| POST | `/api/guesty/import-csv-upload` | Upload and import CSV file |

### Guesty Webhook Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/guesty` | Receive Guesty webhook events |
| POST | `/api/webhooks/guesty/test` | Test Guesty webhook processing |
| GET | `/api/webhooks/guesty/events` | Get all Guesty webhook events |
| POST | `/api/webhooks/guesty/reprocess/:id` | Reprocess a Guesty webhook event |

### Guesty Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/guesty-management/get-webhook-secret` | Get Guesty webhook secret |
| GET | `/api/guesty-management/get-access-token` | Get Guesty API access token |
| GET | `/api/guesty-management/test-webhook-secret` | Test Guesty webhook secret |

## HostAI Integration

### HostAI Tasks Endpoints

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/hostai/tasks` | Get all HostAI tasks | None | Array of HostAI tasks |
| GET | `/api/hostai/tasks/:id` | Get a specific HostAI task | None | HostAI task object |
| PATCH | `/api/hostai/tasks/:id` | Update a HostAI task | Task update fields | Updated task object |
| GET | `/api/hostai/tasks/status/:status` | Get HostAI tasks by status | None | Array of tasks with specified status |

### HostAI Webhook Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/hostai` | Receive HostAI webhook events |
| POST | `/api/webhooks/hostai/test` | Test HostAI webhook processing |
| GET | `/hostai-test` | Serve HostAI test page |

### HostAI Autopilot Endpoints

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/settings/hostai-autopilot` | Get autopilot settings | None | `{ enabled: boolean, confidenceThreshold: number, userId: number }` |
| PATCH | `/api/settings/hostai-autopilot` | Update autopilot settings | `{ enabled?: boolean, confidenceThreshold?: number }` | Updated settings object |
| GET | `/api/hostai/autopilot-log` | Get autopilot logs | None | Array of autopilot logs |
| POST | `/api/hostai/autopilot-log` | Create autopilot log | Log entry fields | Created log entry |
| POST | `/api/hostai/tasks/:id/autopilot-process` | Process task with autopilot | None | Processing result |

## Cleaning and Maintenance

### Cleaning Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cleaning/assigned` | Get assigned cleaning tasks |
| GET | `/api/cleaning/checklist/:unitId` | Get cleaning checklist for a unit |
| POST | `/api/cleaning/checklist-item/complete` | Complete a cleaning checklist item |
| POST | `/api/cleaning/complete/:taskId` | Complete a cleaning task |

## Projects and Tasks

### Project Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | Get all projects |
| GET | `/api/projects/:id` | Get a specific project |
| POST | `/api/projects` | Create a new project |
| PATCH | `/api/projects/:id` | Update a project |
| DELETE | `/api/projects/:id` | Delete a project |

### Task Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/tasks` | Get tasks for a project |
| POST | `/api/projects/:id/tasks` | Create a task for a project |
| PATCH | `/api/tasks/:id` | Update a task |
| DELETE | `/api/tasks/:id` | Delete a task |

## Notes on API Response Format

All API endpoints return JSON responses with appropriate HTTP status codes:

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error responses follow this format:
```json
{
  "message": "Error message description"
}
```

Success responses typically return either:
1. The requested resource object
2. An array of resource objects
3. A success message: `{ "success": true, "message": "Operation succeeded" }`