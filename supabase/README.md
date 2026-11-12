# Supabase setup

For an existing project, run `migrations/20261112000000_public_explore_reactions.sql` in the Supabase SQL Editor to enable the live Explore feed and authenticated reactions.

For a new project, run `schema.sql` to create the full database schema, including the same public-feed and reaction setup.

Only messages their owners mark as public are returned by the Explore feed. Reaction rows are not directly readable by clients; the database returns aggregate counts and the signed-in user's own reaction state.
