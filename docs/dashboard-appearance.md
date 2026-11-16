# Personal dashboard appearance

Clients can customize theme, accent color, density, and corner radius in:

- Classic dashboard: Settings → Preferences → Appearance & Region.
- Managed client portal: Settings.
- V2 dashboard: Workspace Settings.

The editor previews changes across the current dashboard. **Save appearance** persists
the complete selection to the authenticated user's `boltcall_appearance` metadata in
Supabase Auth, so it follows that user's account across devices. This preference never
changes business settings, another account, or the public marketing website.

**Discard changes**, or leaving the editor, restores the last saved appearance.
**Reset to default** previews Boltcall blue, light mode, cozy spacing, and 12 px corners;
the user still chooses Save to persist the reset. Failed saves retain the draft and show
an error so the user can retry.

For users without saved appearance metadata, existing `business_profiles.user_preferences`
theme and accent settings are used as the initial selection. No schema migration is needed.
System theme preferences from the old editor resolve when loaded; the new editor provides
explicit light and dark choices.

The shared provider is mounted by `DashboardProviders`. Both dashboard shells scope
CSS variables under `data-dashboard-appearance`; semantic status colors and round avatars
remain independent. Account changes immediately hide the previous account's appearance,
and cancelled loads cannot overwrite the next user's selection.

Run the focused behavior checks with:

```sh
npx vitest run src/components/dashboard/__tests__/AppearanceSettings.test.tsx
```
