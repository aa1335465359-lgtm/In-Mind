# Memory Planet front-end release

## Scope

Replaces the active front end with a photo-driven Three.js memory object, diary reader/editor, archive, and the existing shared anonymous room. It does not change environment variable names, API routes, the password hash, encryption algorithm, or the Supabase schema.

## Saving behavior

- `JournalSync.change` synchronously writes an encrypted checkpoint before rendering the next edit. Only network synchronization is debounced (750 ms).
- `ht_sync_<hash>` stores current and last-acknowledged data together, encrypted with the existing algorithm. Legacy `ht_data_<hash>` / `ht_data_enc` are read and retained, not deleted.
- Loading remote records never writes directly into local storage. Three-way merging uses the last acknowledged baseline. Conflicting content is preserved as a recovery copy.
- Writes compare `updated_at` on the server before updating; a failed comparison triggers another read/merge attempt. Existing `encrypted_journals` columns are retained.
- Deletions are tombstones in the encrypted array, including deletion of the final entry. The new UI excludes tombstones.
- Online/focus/visibility events and a 30-second foreground interval retry pending work. Requests have a 12-second timeout. A failed local write remains visible and prevents locking without export.
- Local experience uses a per-device random key and never synchronizes its diary to Supabase. Public chat still uses the existing public connection when configured.
- Images are first saved as portable compressed data URLs, never temporary blob URLs. Successful storage uploads replace the local image source with the same service's URL. Failed uploads keep the embedded fallback.

The existing weak encryption and password-derived identity are unchanged; this release does not claim to fix the security architecture. RLS/connection failures are displayed, not bypassed. Actual production RLS and credentials must still be verified in the deployed environment. Keep old clients from writing after deployment by refreshing all open tabs.

## Chat compatibility

The room remains `hashPasscode('888')`, using the existing `room:<id>` broadcast channel and `chat` event. No private or additional rooms are unlocked. Reconnection status, acknowledgement errors, draft retention, IME-safe Enter, non-disruptive scroll, invitations and journal sharing are provided. Joining and leaving update connection state only after appropriate events; cleanup unsubscribes on lock/unmount. Ephemeral UI messages are removed from state after 60 seconds of being visible. This cannot prevent other participants recording or retaining messages.

## Graphics and AI

- Three.js is lazy-loaded. One active memory object is rendered; other memories use thumbnails. Frame rate and pixel ratio are capped, and offscreen/background rendering pauses.
- The photo is a curved photographic surface on an actual 3D object, not an inferred 3D reconstruction. Original images remain accessible. Failed WebGL falls back to the original photo/static view.
- User-selected weather changes the object environment. Photo-derived palettes and a stable seed are persisted. Mood is user-provided, not inferred from photo color.
- Existing DeepSeek memory and continuation features are user-triggered with explicit text-sharing confirmation. Nothing automatically sends journal text as the user types. Generated continuation is offered for acceptance rather than inserted unsolicited.

## Validation

Run `npm test` for 15 focused synchronization regressions, then `npm run build` for the existing TypeScript/Vite production build. No live user data is used by these tests. Production Supabase, live chat and browser/WebGL appearance are not validated by the unit suite.

## Rollback

Revert the release commit through Git. Before rollback, export pending records: the old client does not read the new checkpoint key, and does not understand deletion tombstones. Do not restore old JavaScript while users are still editing in the new client.
