


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."can_read"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select coalesce(my_access(), 'full') <> 'disabled'
$$;


ALTER FUNCTION "public"."can_read"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_write"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select coalesce(my_access(), 'full') = 'full'
$$;


ALTER FUNCTION "public"."can_write"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."customer_event_count"("p_owner" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select case when is_owner() then (select count(*)::int from events where owner_id = p_owner) else 0 end
$$;


ALTER FUNCTION "public"."customer_event_count"("p_owner" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_owner"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'owner')
$$;


ALTER FUNCTION "public"."is_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_access"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select case when coalesce(status, 'active') = 'deleted' then 'disabled'
              else coalesce(access, 'full') end
  from profiles where id = auth.uid()
$$;


ALTER FUNCTION "public"."my_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."owns_entry"("p_entry" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists(
    select 1 from entries en join rounds r on r.id = en.round_id
    join events e on e.id = r.event_id
    where en.id = p_entry and e.owner_id = auth.uid())
$$;


ALTER FUNCTION "public"."owns_entry"("p_entry" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."owns_event"("p_event" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists(select 1 from events where id = p_event and owner_id = auth.uid())
$$;


ALTER FUNCTION "public"."owns_event"("p_event" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."owns_round"("p_round" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists(
    select 1 from rounds r join events e on e.id = r.event_id
    where r.id = p_round and e.owner_id = auth.uid())
$$;


ALTER FUNCTION "public"."owns_round"("p_round" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purge_expired_events"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare n int;
begin
  with doomed as (
    delete from events
    where event_date is not null
      and event_date < current_date - (coalesce(retention_days, 90) || ' days')::interval
    returning id
  )
  select count(*) into n from doomed;
  return n;
end $$;


ALTER FUNCTION "public"."purge_expired_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_event_code"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare candidate text; tries int := 0;
begin
  if new.code is not null then return new; end if;
  loop
    candidate := (
      select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                               (floor(random() * 32) + 1)::int, 1), '')
      from generate_series(1, 6)
    );
    exit when not exists (select 1 from events where code = candidate);
    tries := tries + 1;
    exit when tries > 20;
  end loop;
  new.code := candidate;
  return new;
end $$;


ALTER FUNCTION "public"."set_event_code"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."acceptances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "document" "text" NOT NULL,
    "version" "text" NOT NULL,
    "accepted_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."acceptances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid",
    "action" "text" NOT NULL,
    "target_type" "text",
    "target_id" "uuid",
    "detail" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "round_id" "uuid" NOT NULL,
    "position" integer NOT NULL,
    "name" "text" NOT NULL,
    "max_score" numeric DEFAULT 10 NOT NULL,
    "weight" numeric DEFAULT 1 NOT NULL,
    "tiebreak_priority" integer
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contestants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "bib_number" "text",
    "name" "text" NOT NULL,
    "description" "text",
    "photo_url" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    CONSTRAINT "contestants_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'withdrawn'::"text"])))
);


ALTER TABLE "public"."contestants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enquiries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "organisation" "text",
    "message" "text" NOT NULL,
    "handled" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."enquiries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "round_id" "uuid" NOT NULL,
    "contestant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entry_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "judge_id" "uuid" NOT NULL,
    "entry_id" "uuid" NOT NULL,
    "body" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."entry_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "event_date" "date",
    "venue" "text",
    "logo_url" "text",
    "theme_color" "text" DEFAULT '#0F6E56'::"text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "scale_type" "text" DEFAULT 'whole'::"text" NOT NULL,
    "blind_mode" boolean DEFAULT true NOT NULL,
    "winners_count" integer DEFAULT 3 NOT NULL,
    "show_final_marks" boolean DEFAULT true NOT NULL,
    "public_results" boolean DEFAULT false NOT NULL,
    "tiebreak_order" "jsonb" DEFAULT '["category", "head2head", "judge_vote", "manual"]'::"jsonb",
    "retention_days" integer DEFAULT 90 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "code" "text",
    "carryover" "text" DEFAULT 'reset'::"text" NOT NULL,
    "show_scores" boolean DEFAULT true NOT NULL,
    "locked" boolean DEFAULT false NOT NULL,
    "comments_mode" "text" DEFAULT 'optional'::"text" NOT NULL,
    "progression" "text" DEFAULT 'synchronised'::"text" NOT NULL,
    CONSTRAINT "events_carryover_check" CHECK (("carryover" = ANY (ARRAY['reset'::"text", 'carry'::"text"]))),
    CONSTRAINT "events_comments_mode_check" CHECK (("comments_mode" = ANY (ARRAY['off'::"text", 'optional'::"text", 'required'::"text"]))),
    CONSTRAINT "events_progression_check" CHECK (("progression" = ANY (ARRAY['synchronised'::"text", 'independent'::"text"]))),
    CONSTRAINT "events_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'live'::"text", 'complete'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."judge_rounds" (
    "judge_id" "uuid" NOT NULL,
    "round_id" "uuid" NOT NULL
);


ALTER TABLE "public"."judge_rounds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."judge_sessions" (
    "token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "judge_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '12:00:00'::interval) NOT NULL
);


ALTER TABLE "public"."judge_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."judge_votes" (
    "tiebreak_id" "uuid" NOT NULL,
    "judge_id" "uuid" NOT NULL,
    "chosen_entry_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."judge_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."judges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "photo_url" "text",
    "pin_hash" "text",
    "revoked" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "position" integer,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "pin" "text",
    "invite_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "judges_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."judges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "org_name" "text",
    "role" "text" DEFAULT 'customer'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "max_events" integer DEFAULT 1 NOT NULL,
    "max_contestants" integer DEFAULT 30 NOT NULL,
    "max_judges" integer DEFAULT 5 NOT NULL,
    "admin_access_until" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "access" "text" DEFAULT 'full'::"text" NOT NULL,
    "max_active_events" integer DEFAULT 1 NOT NULL,
    "backup_email" "text",
    CONSTRAINT "profiles_access_check" CHECK (("access" = ANY (ARRAY['full'::"text", 'readonly'::"text", 'disabled'::"text"]))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'customer'::"text"]))),
    CONSTRAINT "profiles_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'readonly'::"text", 'suspended'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recovery_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "code_hash" "text" NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."recovery_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rounds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "position" integer NOT NULL,
    "name" "text" NOT NULL,
    "advance_count" integer,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "locked_at" timestamp with time zone,
    "roster_status" "text" DEFAULT 'provisional'::"text" NOT NULL,
    "force_closed" boolean DEFAULT false NOT NULL,
    CONSTRAINT "rounds_roster_status_check" CHECK (("roster_status" = ANY (ARRAY['provisional'::"text", 'final'::"text"]))),
    CONSTRAINT "rounds_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'open'::"text", 'locked'::"text"])))
);


ALTER TABLE "public"."rounds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "judge_id" "uuid" NOT NULL,
    "entry_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "value" numeric,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."signin_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "identifier" "text" NOT NULL,
    "ok" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."signin_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."submissions" (
    "judge_id" "uuid" NOT NULL,
    "round_id" "uuid" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tiebreaks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "round_id" "uuid" NOT NULL,
    "place" integer,
    "method" "text",
    "winner_entry_id" "uuid",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "tied_entry_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "resolved_at" timestamp with time zone,
    CONSTRAINT "tiebreaks_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'resolved'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."tiebreaks" OWNER TO "postgres";


ALTER TABLE ONLY "public"."acceptances"
    ADD CONSTRAINT "acceptances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contestants"
    ADD CONSTRAINT "contestants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enquiries"
    ADD CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entries"
    ADD CONSTRAINT "entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entries"
    ADD CONSTRAINT "entries_round_id_contestant_id_key" UNIQUE ("round_id", "contestant_id");



ALTER TABLE ONLY "public"."entry_comments"
    ADD CONSTRAINT "entry_comments_judge_id_entry_id_key" UNIQUE ("judge_id", "entry_id");



ALTER TABLE ONLY "public"."entry_comments"
    ADD CONSTRAINT "entry_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."judge_rounds"
    ADD CONSTRAINT "judge_rounds_pkey" PRIMARY KEY ("judge_id", "round_id");



ALTER TABLE ONLY "public"."judge_sessions"
    ADD CONSTRAINT "judge_sessions_pkey" PRIMARY KEY ("token");



ALTER TABLE ONLY "public"."judge_votes"
    ADD CONSTRAINT "judge_votes_pkey" PRIMARY KEY ("tiebreak_id", "judge_id");



ALTER TABLE ONLY "public"."judges"
    ADD CONSTRAINT "judges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recovery_codes"
    ADD CONSTRAINT "recovery_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rounds"
    ADD CONSTRAINT "rounds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scores"
    ADD CONSTRAINT "scores_judge_id_entry_id_category_id_key" UNIQUE ("judge_id", "entry_id", "category_id");



ALTER TABLE ONLY "public"."scores"
    ADD CONSTRAINT "scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."signin_attempts"
    ADD CONSTRAINT "signin_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_pkey" PRIMARY KEY ("judge_id", "round_id");



ALTER TABLE ONLY "public"."tiebreaks"
    ADD CONSTRAINT "tiebreaks_pkey" PRIMARY KEY ("id");



CREATE INDEX "contestants_event_id_idx" ON "public"."contestants" USING "btree" ("event_id");



CREATE INDEX "enquiries_created_idx" ON "public"."enquiries" USING "btree" ("created_at" DESC);



CREATE INDEX "entries_round_id_idx" ON "public"."entries" USING "btree" ("round_id");



CREATE UNIQUE INDEX "events_code_unique" ON "public"."events" USING "btree" ("code");



CREATE UNIQUE INDEX "judges_invite_token_idx" ON "public"."judges" USING "btree" ("invite_token");



CREATE INDEX "recovery_codes_profile_idx" ON "public"."recovery_codes" USING "btree" ("profile_id");



CREATE INDEX "rounds_event_id_idx" ON "public"."rounds" USING "btree" ("event_id");



CREATE INDEX "scores_entry_id_idx" ON "public"."scores" USING "btree" ("entry_id");



CREATE INDEX "scores_judge_id_idx" ON "public"."scores" USING "btree" ("judge_id");



CREATE INDEX "signin_attempts_idx" ON "public"."signin_attempts" USING "btree" ("identifier", "created_at" DESC);



CREATE OR REPLACE TRIGGER "events_set_code" BEFORE INSERT ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."set_event_code"();



ALTER TABLE ONLY "public"."acceptances"
    ADD CONSTRAINT "acceptances_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contestants"
    ADD CONSTRAINT "contestants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entries"
    ADD CONSTRAINT "entries_contestant_id_fkey" FOREIGN KEY ("contestant_id") REFERENCES "public"."contestants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entries"
    ADD CONSTRAINT "entries_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entry_comments"
    ADD CONSTRAINT "entry_comments_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entry_comments"
    ADD CONSTRAINT "entry_comments_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "public"."judges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."judge_rounds"
    ADD CONSTRAINT "judge_rounds_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "public"."judges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."judge_rounds"
    ADD CONSTRAINT "judge_rounds_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."judge_sessions"
    ADD CONSTRAINT "judge_sessions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."judge_sessions"
    ADD CONSTRAINT "judge_sessions_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "public"."judges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."judge_votes"
    ADD CONSTRAINT "judge_votes_chosen_entry_id_fkey" FOREIGN KEY ("chosen_entry_id") REFERENCES "public"."entries"("id");



ALTER TABLE ONLY "public"."judge_votes"
    ADD CONSTRAINT "judge_votes_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "public"."judges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."judge_votes"
    ADD CONSTRAINT "judge_votes_tiebreak_id_fkey" FOREIGN KEY ("tiebreak_id") REFERENCES "public"."tiebreaks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."judges"
    ADD CONSTRAINT "judges_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recovery_codes"
    ADD CONSTRAINT "recovery_codes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rounds"
    ADD CONSTRAINT "rounds_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scores"
    ADD CONSTRAINT "scores_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scores"
    ADD CONSTRAINT "scores_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scores"
    ADD CONSTRAINT "scores_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "public"."judges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "public"."judges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tiebreaks"
    ADD CONSTRAINT "tiebreaks_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tiebreaks"
    ADD CONSTRAINT "tiebreaks_winner_entry_id_fkey" FOREIGN KEY ("winner_entry_id") REFERENCES "public"."entries"("id");



ALTER TABLE "public"."acceptances" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "add cats" ON "public"."categories" FOR INSERT WITH CHECK (("public"."owns_round"("round_id") AND "public"."can_write"()));



CREATE POLICY "add entries" ON "public"."entries" FOR INSERT WITH CHECK (("public"."owns_round"("round_id") AND "public"."can_write"()));



CREATE POLICY "add events" ON "public"."events" FOR INSERT WITH CHECK ((("owner_id" = "auth"."uid"()) AND "public"."can_write"()));



CREATE POLICY "add judges" ON "public"."judges" FOR INSERT WITH CHECK (("public"."owns_event"("event_id") AND "public"."can_write"()));



CREATE POLICY "add people" ON "public"."contestants" FOR INSERT WITH CHECK (("public"."owns_event"("event_id") AND "public"."can_write"()));



CREATE POLICY "add rounds" ON "public"."rounds" FOR INSERT WITH CHECK (("public"."owns_event"("event_id") AND "public"."can_write"()));



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contestants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "drop cats" ON "public"."categories" FOR DELETE USING (("public"."owns_round"("round_id") AND "public"."can_write"()));



CREATE POLICY "drop entries" ON "public"."entries" FOR DELETE USING (("public"."owns_round"("round_id") AND "public"."can_write"()));



CREATE POLICY "drop events" ON "public"."events" FOR DELETE USING ((("owner_id" = "auth"."uid"()) AND "public"."can_write"()));



CREATE POLICY "drop judges" ON "public"."judges" FOR DELETE USING (("public"."owns_event"("event_id") AND "public"."can_write"()));



CREATE POLICY "drop people" ON "public"."contestants" FOR DELETE USING (("public"."owns_event"("event_id") AND "public"."can_write"()));



CREATE POLICY "drop rounds" ON "public"."rounds" FOR DELETE USING (("public"."owns_event"("event_id") AND "public"."can_write"()));



CREATE POLICY "edit cats" ON "public"."categories" FOR UPDATE USING (("public"."owns_round"("round_id") AND "public"."can_write"()));



CREATE POLICY "edit entries" ON "public"."entries" FOR UPDATE USING (("public"."owns_round"("round_id") AND "public"."can_write"()));



CREATE POLICY "edit events" ON "public"."events" FOR UPDATE USING ((("owner_id" = "auth"."uid"()) AND "public"."can_write"()));



CREATE POLICY "edit judges" ON "public"."judges" FOR UPDATE USING (("public"."owns_event"("event_id") AND "public"."can_write"()));



CREATE POLICY "edit people" ON "public"."contestants" FOR UPDATE USING (("public"."owns_event"("event_id") AND "public"."can_write"()));



CREATE POLICY "edit rounds" ON "public"."rounds" FOR UPDATE USING (("public"."owns_event"("event_id") AND "public"."can_write"()));



ALTER TABLE "public"."enquiries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."entry_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."judge_rounds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."judge_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."judge_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."judges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "own acceptances read" ON "public"."acceptances" FOR SELECT USING (("profile_id" = "auth"."uid"()));



CREATE POLICY "own acceptances write" ON "public"."acceptances" FOR INSERT WITH CHECK (("profile_id" = "auth"."uid"()));



CREATE POLICY "own audit read" ON "public"."audit_log" FOR SELECT USING (("actor_id" = "auth"."uid"()));



CREATE POLICY "own codes read" ON "public"."recovery_codes" FOR SELECT USING (("profile_id" = "auth"."uid"()));



CREATE POLICY "own media read" ON "public"."judge_rounds" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."rounds" "r"
     JOIN "public"."events" "e" ON (("e"."id" = "r"."event_id")))
  WHERE (("r"."id" = "judge_rounds"."round_id") AND ("e"."owner_id" = "auth"."uid"())))));



CREATE POLICY "own profile" ON "public"."profiles" USING (("id" = "auth"."uid"()));



CREATE POLICY "own tiebreaks" ON "public"."tiebreaks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."rounds" "r"
     JOIN "public"."events" "e" ON (("e"."id" = "r"."event_id")))
  WHERE (("r"."id" = "tiebreaks"."round_id") AND ("e"."owner_id" = "auth"."uid"())))));



CREATE POLICY "owner reads enquiries" ON "public"."enquiries" FOR SELECT USING ("public"."is_owner"());



CREATE POLICY "owner reads profiles" ON "public"."profiles" FOR SELECT USING ("public"."is_owner"());



CREATE POLICY "owner updates enquiries" ON "public"."enquiries" FOR UPDATE USING ("public"."is_owner"());



CREATE POLICY "owner updates profiles" ON "public"."profiles" FOR UPDATE USING ("public"."is_owner"());



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read cats" ON "public"."categories" FOR SELECT USING (("public"."owns_round"("round_id") AND "public"."can_read"()));



CREATE POLICY "read entries" ON "public"."entries" FOR SELECT USING (("public"."owns_round"("round_id") AND "public"."can_read"()));



CREATE POLICY "read events" ON "public"."events" FOR SELECT USING ((("owner_id" = "auth"."uid"()) AND "public"."can_read"()));



CREATE POLICY "read judges" ON "public"."judges" FOR SELECT USING (("public"."owns_event"("event_id") AND "public"."can_read"()));



CREATE POLICY "read notes" ON "public"."entry_comments" FOR SELECT USING (("public"."owns_entry"("entry_id") AND "public"."can_read"()));



CREATE POLICY "read people" ON "public"."contestants" FOR SELECT USING (("public"."owns_event"("event_id") AND "public"."can_read"()));



CREATE POLICY "read rounds" ON "public"."rounds" FOR SELECT USING (("public"."owns_event"("event_id") AND "public"."can_read"()));



CREATE POLICY "read scores" ON "public"."scores" FOR SELECT USING (("public"."owns_entry"("entry_id") AND "public"."can_read"()));



CREATE POLICY "read subs" ON "public"."submissions" FOR SELECT USING (("public"."owns_round"("round_id") AND "public"."can_read"()));



ALTER TABLE "public"."recovery_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rounds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."signin_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tiebreaks" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."can_read"() TO "anon";
GRANT ALL ON FUNCTION "public"."can_read"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_read"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_write"() TO "anon";
GRANT ALL ON FUNCTION "public"."can_write"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_write"() TO "service_role";



GRANT ALL ON FUNCTION "public"."customer_event_count"("p_owner" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."customer_event_count"("p_owner" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."customer_event_count"("p_owner" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_owner"() TO "service_role";



GRANT ALL ON FUNCTION "public"."my_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."my_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."my_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."owns_entry"("p_entry" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."owns_entry"("p_entry" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."owns_entry"("p_entry" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."owns_event"("p_event" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."owns_event"("p_event" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."owns_event"("p_event" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."owns_round"("p_round" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."owns_round"("p_round" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."owns_round"("p_round" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."purge_expired_events"() TO "anon";
GRANT ALL ON FUNCTION "public"."purge_expired_events"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."purge_expired_events"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_event_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_event_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_event_code"() TO "service_role";
























GRANT ALL ON TABLE "public"."acceptances" TO "anon";
GRANT ALL ON TABLE "public"."acceptances" TO "authenticated";
GRANT ALL ON TABLE "public"."acceptances" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."contestants" TO "anon";
GRANT ALL ON TABLE "public"."contestants" TO "authenticated";
GRANT ALL ON TABLE "public"."contestants" TO "service_role";



GRANT ALL ON TABLE "public"."enquiries" TO "anon";
GRANT ALL ON TABLE "public"."enquiries" TO "authenticated";
GRANT ALL ON TABLE "public"."enquiries" TO "service_role";



GRANT ALL ON TABLE "public"."entries" TO "anon";
GRANT ALL ON TABLE "public"."entries" TO "authenticated";
GRANT ALL ON TABLE "public"."entries" TO "service_role";



GRANT ALL ON TABLE "public"."entry_comments" TO "anon";
GRANT ALL ON TABLE "public"."entry_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."entry_comments" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."judge_rounds" TO "anon";
GRANT ALL ON TABLE "public"."judge_rounds" TO "authenticated";
GRANT ALL ON TABLE "public"."judge_rounds" TO "service_role";



GRANT ALL ON TABLE "public"."judge_sessions" TO "anon";
GRANT ALL ON TABLE "public"."judge_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."judge_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."judge_votes" TO "anon";
GRANT ALL ON TABLE "public"."judge_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."judge_votes" TO "service_role";



GRANT ALL ON TABLE "public"."judges" TO "anon";
GRANT ALL ON TABLE "public"."judges" TO "authenticated";
GRANT ALL ON TABLE "public"."judges" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."recovery_codes" TO "anon";
GRANT ALL ON TABLE "public"."recovery_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."recovery_codes" TO "service_role";



GRANT ALL ON TABLE "public"."rounds" TO "anon";
GRANT ALL ON TABLE "public"."rounds" TO "authenticated";
GRANT ALL ON TABLE "public"."rounds" TO "service_role";



GRANT ALL ON TABLE "public"."scores" TO "anon";
GRANT ALL ON TABLE "public"."scores" TO "authenticated";
GRANT ALL ON TABLE "public"."scores" TO "service_role";



GRANT ALL ON TABLE "public"."signin_attempts" TO "anon";
GRANT ALL ON TABLE "public"."signin_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."signin_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."submissions" TO "anon";
GRANT ALL ON TABLE "public"."submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."submissions" TO "service_role";



GRANT ALL ON TABLE "public"."tiebreaks" TO "anon";
GRANT ALL ON TABLE "public"."tiebreaks" TO "authenticated";
GRANT ALL ON TABLE "public"."tiebreaks" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































