DROP TABLE IF EXISTS "zoom_sessions";

CREATE TABLE "zoom_sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "zoom_sessions" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
CREATE INDEX "IDX_session_expire" ON "zoom_sessions" ("expire");
