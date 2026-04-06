# Firestore Security Rules

This document contains the required Firestore security rules for the LMS application.

## Required Rules

Add these rules to your Firebase Console (Firestore Database > Rules):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function to check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Users collection - users can read/write their own data
    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }

    // User subcollections (progress, badges, activity)
    match /users/{userId}/{collection}/{docId} {
      allow read, write: if isOwner(userId);
    }

    // Interview Solutions - Public read, authenticated write
    match /interview_solutions/{docId} {
      // Anyone can read solutions
      allow read: if true;

      // Authenticated users can create new solutions
      allow create: if isAuthenticated()
        && request.resource.data.keys().hasAll(['questionId', 'authorName', 'code', 'createdAt'])
        && request.resource.data.questionId is string
        && request.resource.data.authorName is string
        && request.resource.data.code is string
        && request.resource.data.createdAt is number;

      // Only the author or admin can update/delete (optional, for moderation)
      allow update, delete: if isAuthenticated()
        && (resource.data.authorName == request.auth.token.name || request.auth.token.admin == true);
    }
  }
}
```

## Collections Overview

### 1. `users/{userId}`
Stores user profile information.
- **Read/Write**: Only the authenticated user

### 2. `users/{userId}/progress/{courseId}`
Stores course progress data.
- **Read/Write**: Only the authenticated user

### 3. `users/{userId}/badges/earned`
Stores earned badges.
- **Read/Write**: Only the authenticated user

### 4. `users/{userId}/activity/{date}`
Stores daily activity tracking.
- **Read/Write**: Only the authenticated user

### 5. `interview_solutions/{docId}`
Stores community-submitted solutions for interview questions.
- **Read**: Public (anyone can view)
- **Create**: Authenticated users only
- **Update/Delete**: Author or admin only (for moderation)

## Deployment

Deploy these rules using Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

Or manually copy-paste into Firebase Console:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Firestore Database > Rules
4. Paste the rules above
5. Click "Publish"

## Testing

Test the rules using the Firebase Emulator Suite:

```bash
firebase emulators:start --only firestore
```

Or test manually by:
1. Viewing interview questions while logged out (should work)
2. Submitting a solution while logged in (should work)
3. Submitting a solution while logged out (should fail)
