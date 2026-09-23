# Store data-disclosure working notes

These notes are not completed Apple App Privacy or Google Play Data safety answers. Verify the deployed API, hosting, retention, SDKs, and support processes immediately before submission.

| Data | Purpose | Linked to identity | Public/shared | User control |
|---|---|---:|---|---|
| Email, username, display name | Account, authentication, support | Yes | Username/display name public; email private/service providers | Change and delete in app |
| Apple/Google provider subject | Authentication and account linking | Yes | Identity provider and API only | Disconnect/delete process before launch |
| Precise/approximate location | Current map position, nearby pins, user-selected public pin coordinate | Potentially | Current device position is not uploaded by default; posted pin coordinates are public | Optional permission; delete pin/account |
| Photos | Public recommendations | Yes | Public after posting; storage/CDN/moderation providers | Report and account deletion |
| Comments and chat | Social functionality and moderation | Yes | Public or room participants | Report, block, account deletion |
| Votes | Ranking and app functionality | Yes internally | Aggregate count public | Toggle/remove; account deletion |
| Favorites, itinerary, visited states | Private personalization | Yes | API/storage providers only | Remove or delete account |
| Friend requests/list | Private social functionality | Yes | Participants/API only | Accept, decline, remove, block, delete account |
| Reports and blocks | Safety and moderation | Yes | Moderators/API only | Unblock; retention schedule required |
| Push token | Requested notifications | Yes | Expo/Apple/Google push providers | Disable permission and delete token/account |
| Session/security records | Security, fraud prevention | Yes | Hosting/security providers only | Expire/revoke; deletion/retention policy |
| Diagnostics | Reliability/security | Potentially | Selected monitoring provider | Disclose the actual provider and retention |

StateUp currently has no ads, payments, contacts, health data, data brokerage, or cross-app tracking. Reassess the forms whenever an SDK, analytics/crash tool, provider, advertising feature, or data flow changes.

Google Play requires both an in-app deletion path and a public web deletion-request resource. Apple requires initiation of full account deletion in-app. The app implements in-app deletion; the operator must publish the web resource and final privacy policy.
