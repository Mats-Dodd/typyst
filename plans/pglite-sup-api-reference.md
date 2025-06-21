# Supabase Migration - API Endpoint Reference

## Collections API

### GET /api/collections
- **Purpose**: List all collections for authenticated user
- **Response**: Array of collection objects
- **Auth**: Required

**Example Response:**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "user_123",
    "path": "/Users/john/Documents/notes",
    "name": "My Notes",
    "lastOpened": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

### POST /api/collections
- **Purpose**: Create a new collection
- **Body**: `{ path: string, name?: string }`
- **Response**: Created collection object
- **Auth**: Required

**Example Request:**
```json
{
  "path": "/Users/john/Documents/projects/haptic",
  "name": "Haptic Project"
}
```

**Example Response:**
```json
{
  "id": "456e7890-e89b-12d3-a456-426614174001",
  "userId": "user_123",
  "path": "/Users/john/Documents/projects/haptic",
  "name": "Haptic Project",
  "lastOpened": "2024-01-15T11:00:00Z",
  "createdAt": "2024-01-15T11:00:00Z",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

### PUT /api/collections/[path]
- **Purpose**: Update collection (mainly lastOpened timestamp)
- **Response**: `{ success: true }`
- **Auth**: Required

### GET /api/collections/[path]/settings
- **Purpose**: Get collection-specific settings
- **Response**: Settings object with editor and notes config
- **Auth**: Required

### PUT /api/collections/[path]/settings
- **Purpose**: Update collection settings
- **Body**: `{ editor?: object, notes?: object }`
- **Response**: Updated settings object
- **Auth**: Required

## Entries API

### GET /api/entries
- **Purpose**: List entries in a collection/folder
- **Query params**: 
  - `collection`: Collection path (required)
  - `parent`: Parent folder path (optional)
- **Response**: Array of entry objects
- **Auth**: Required

**Example Request:**
```
GET /api/entries?collection=/Users/john/Documents/notes&parent=/daily
```

**Example Response:**
```json
[
  {
    "id": "789e0123-e89b-12d3-a456-426614174002",
    "userId": "user_123",
    "collectionId": "123e4567-e89b-12d3-a456-426614174000",
    "path": "/daily/2024-01-15.md",
    "name": "2024-01-15.md",
    "parentPath": "/daily",
    "content": null,
    "isFolder": false,
    "size": 1024,
    "createdAt": "2024-01-15T09:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  },
  {
    "id": "890e1234-e89b-12d3-a456-426614174003",
    "userId": "user_123",
    "collectionId": "123e4567-e89b-12d3-a456-426614174000",
    "path": "/daily/archive",
    "name": "archive",
    "parentPath": "/daily",
    "content": null,
    "isFolder": true,
    "size": null,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

### POST /api/entries
- **Purpose**: Create a new entry (file or folder)
- **Body**: 
  ```json
  {
    "collectionId": "uuid",
    "path": "string",
    "name": "string",
    "parentPath": "string",
    "content": "string (optional)",
    "isFolder": "boolean"
  }
  ```
- **Response**: Created entry object
- **Auth**: Required

### GET /api/entries/[path]
- **Purpose**: Get single entry details and content
- **Query params**: `collection`: Collection path
- **Response**: Entry object with content
- **Auth**: Required

### PUT /api/entries/[path]
- **Purpose**: Update entry content
- **Query params**: `collection`: Collection path
- **Body**: `{ content: string }`
- **Response**: Updated entry object
- **Auth**: Required

### DELETE /api/entries/[path]
- **Purpose**: Delete entry (and children if folder)
- **Query params**: `collection`: Collection path
- **Response**: `{ success: true }`
- **Auth**: Required

### POST /api/entries/batch
- **Purpose**: Batch operations on multiple entries
- **Body**: 
  ```json
  {
    "operations": [
      {
        "type": "create" | "update" | "delete",
        "data": { /* entry data */ }
      }
    ]
  }
  ```
- **Response**: Array of operation results
- **Auth**: Required

**Example Request:**
```json
{
  "operations": [
    {
      "type": "create",
      "data": {
        "collectionId": "123e4567-e89b-12d3-a456-426614174000",
        "path": "/projects/new-project",
        "name": "new-project",
        "parentPath": "/projects",
        "isFolder": true
      }
    },
    {
      "type": "create",
      "data": {
        "collectionId": "123e4567-e89b-12d3-a456-426614174000",
        "path": "/projects/new-project/README.md",
        "name": "README.md",
        "parentPath": "/projects/new-project",
        "content": "# New Project\n\nProject description here.",
        "isFolder": false
      }
    },
    {
      "type": "update",
      "data": {
        "id": "existing-entry-id",
        "content": "Updated content"
      }
    }
  ]
}
```

**Example Response:**
```json
{
  "results": [
    {
      "success": true,
      "type": "create",
      "data": {
        "id": "new-folder-id",
        "path": "/projects/new-project",
        // ... full entry data
      }
    },
    {
      "success": true,
      "type": "create",
      "data": {
        "id": "new-file-id",
        "path": "/projects/new-project/README.md",
        // ... full entry data
      }
    },
    {
      "success": true,
      "type": "update",
      "data": {
        "id": "existing-entry-id",
        // ... updated entry data
      }
    }
  ]
}
```

**Implementation Example:**
```typescript
// apps/web/src/routes/api/entries/batch/+server.ts
export const POST: RequestHandler = async (event) => {
  const userId = await getUserId(event);
  const { operations } = await event.request.json();
  
  const results = [];
  
  // Use a transaction for atomicity
  await db.transaction(async (tx) => {
    for (const op of operations) {
      try {
        let result;
        
        switch (op.type) {
          case 'create':
            [result] = await tx
              .insert(schema.entry)
              .values({ ...op.data, userId })
              .returning();
            break;
            
          case 'update':
            [result] = await tx
              .update(schema.entry)
              .set({ ...op.data, updatedAt: new Date() })
              .where(and(
                eq(schema.entry.id, op.data.id),
                eq(schema.entry.userId, userId)
              ))
              .returning();
            break;
            
          case 'delete':
            await tx
              .delete(schema.entry)
              .where(and(
                eq(schema.entry.id, op.data.id),
                eq(schema.entry.userId, userId)
              ));
            result = { id: op.data.id, deleted: true };
            break;
        }
        
        results.push({
          success: true,
          type: op.type,
          data: result,
        });
      } catch (error) {
        results.push({
          success: false,
          type: op.type,
          error: error.message,
        });
        throw error; // Rollback transaction
      }
    }
  });
  
  return json({ results });
};
```

## Search API

### GET /api/search
- **Purpose**: Search entries across collections
- **Query params**:
  - `q`: Search query
  - `collection`: Limit to specific collection (optional)
  - `type`: Filter by file/folder (optional)
- **Response**: Array of matching entries
- **Auth**: Required

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `UNAUTHORIZED`: User not authenticated
- `NOT_FOUND`: Resource not found
- `FORBIDDEN`: User lacks permission
- `VALIDATION_ERROR`: Invalid request data
- `SERVER_ERROR`: Internal server error 