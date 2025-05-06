CREATE TABLE IF NOT EXISTS "zoom_sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);

ALTER TABLE "zoom_sessions" ADD CONSTRAINT session_pkey PRIMARY KEY ("sid");
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "zoom_sessions" ("expire");
