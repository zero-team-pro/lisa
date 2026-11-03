-- Destructive rollback is intentionally manual: preserve stored bytes and metadata.
DO $$ BEGIN RAISE EXCEPTION 'Nexus files require coordinated application rollback; retain additive metadata and file store'; END $$;
