# Supabase setup

For an existing project, run these migrations in order in the Supabase SQL Editor:

1. `migrations/20261112000000_public_explore_reactions.sql`
2. `migrations/20261112010000_anonymous_polls_and_share_streaks.sql`

For a new project, run `schema.sql` to create the full database schema, including the public feed, reactions, polls, and private sharing streaks.

Only messages their owners mark as public are returned by the Explore feed. Reaction and poll vote rows are not directly readable by clients; database functions return aggregate counts and the signed-in user's own state. Poll creators and individual voters are never shown publicly. Sharing streaks are private to the account and use the browser's local time zone.
