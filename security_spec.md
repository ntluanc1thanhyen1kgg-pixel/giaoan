# Security Specification for User Management

## Data Invariants
1. Only Admins can create, delete, or lock Teacher accounts.
2. Admins cannot change their own role or lock/delete themselves.
3. Every user document must have a `uid` matching the document ID.
4. Usernames must be unique (enforced at app level, but ideally unique IDs).

## The Dirty Dozen Payloads

1. **Self-Promotion**: A teacher trying to update their role to 'admin'.
2. **Account Hijacking**: A teacher trying to update another user's document.
3. **Ghost Field**: Adding an `isAdmin: true` field to a user document.
4. **Admin Self-Harm**: Admin trying to delete their own account document.
5. **Admin Self-Downgrade**: Admin trying to change their own role to 'teacher'.
6. **Locked Access**: A locked teacher trying to write data (if they had other collections).
7. **Bypass UID**: Creating a user document where `uid` does not match `request.auth.uid`.
8. **Resource Poisoning**: Injecting a 1MB string into the `username` field.
9. **State Shortcutting**: Updating `createdAt` timestamp.
10. **Admin Self-Locking**: Admin trying to set `isLocked: true` on themselves.
11. **Malicious ID**: Using a very long or invalid string as a document ID.
12. **Unauthorized Creation**: A non-admin trying to create a new user document.
