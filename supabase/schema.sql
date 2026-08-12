-- ============================================================
-- SECTION: SCHEMA
-- ============================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS "public";


--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";


--
-- Name: EXTENSION "pg_graphql"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "pg_graphql" IS 'pg_graphql: GraphQL support';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "pgcrypto"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "pgcrypto" IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";


--
-- Name: EXTENSION "supabase_vault"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "supabase_vault" IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: divination_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."divination_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "question" "text",
    "spread_type_id" bigint,
    "cards_drawn" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: spread_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."spread_types" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "card_count" integer NOT NULL,
    "positions" "jsonb" NOT NULL,
    "category" "text" NOT NULL,
    "theme" "text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "spread_types_category_check" CHECK (("category" = ANY (ARRAY['basic'::"text", 'classic'::"text", 'theme'::"text"])))
);


--
-- Name: spread_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS "public"."spread_types_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: spread_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."spread_types_id_seq" OWNED BY "public"."spread_types"."id";


--
-- Name: tarot_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."tarot_cards" (
    "id" bigint NOT NULL,
    "name_cn" "text" NOT NULL,
    "name_en" "text" NOT NULL,
    "card_type" "text" NOT NULL,
    "suit" "text",
    "number" integer NOT NULL,
    "image_url" "text" NOT NULL,
    "keywords_upright" "text"[] NOT NULL,
    "keywords_reversed" "text"[] NOT NULL,
    "meaning_upright" "text" NOT NULL,
    "meaning_reversed" "text" NOT NULL,
    "advice_upright" "text" NOT NULL,
    "advice_reversed" "text" NOT NULL,
    "element" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tarot_cards_card_type_check" CHECK (("card_type" = ANY (ARRAY['major'::"text", 'minor'::"text"]))),
    CONSTRAINT "tarot_cards_suit_check" CHECK ((("suit" = ANY (ARRAY['wands'::"text", 'cups'::"text", 'swords'::"text", 'pentacles'::"text"])) OR ("suit" IS NULL)))
);


--
-- Name: tarot_cards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS "public"."tarot_cards_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tarot_cards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."tarot_cards_id_seq" OWNED BY "public"."tarot_cards"."id";


--
-- Name: spread_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."spread_types" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."spread_types_id_seq"'::"regclass");


--
-- Name: tarot_cards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tarot_cards" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."tarot_cards_id_seq"'::"regclass");


--
-- Name: divination_records divination_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'divination_records_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'divination_records'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."divination_records"
    ADD CONSTRAINT "divination_records_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: spread_types spread_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'spread_types_name_key'
      AND n.nspname = 'public'
      AND c.relname = 'spread_types'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."spread_types"
    ADD CONSTRAINT "spread_types_name_key" UNIQUE ("name");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: spread_types spread_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'spread_types_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'spread_types'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."spread_types"
    ADD CONSTRAINT "spread_types_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: tarot_cards tarot_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'tarot_cards_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'tarot_cards'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."tarot_cards"
    ADD CONSTRAINT "tarot_cards_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: idx_divination_records_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_divination_records_created" ON "public"."divination_records" USING "btree" ("created_at" DESC);


--
-- Name: idx_divination_records_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_divination_records_user" ON "public"."divination_records" USING "btree" ("user_id");


--
-- Name: idx_spread_types_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_spread_types_category" ON "public"."spread_types" USING "btree" ("category");


--
-- Name: idx_tarot_cards_suit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_tarot_cards_suit" ON "public"."tarot_cards" USING "btree" ("suit");


--
-- Name: idx_tarot_cards_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_tarot_cards_type" ON "public"."tarot_cards" USING "btree" ("card_type");


--
-- Name: divination_records divination_records_spread_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'divination_records_spread_type_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'divination_records'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."divination_records"
    ADD CONSTRAINT "divination_records_spread_type_id_fkey" FOREIGN KEY ("spread_type_id") REFERENCES "public"."spread_types"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- PostgreSQL database dump complete
--




-- ============================================================
-- SECTION: DIFF FILTER OBJECTS
-- ============================================================
-- Objects that match diff-filter.json but cannot be represented
-- precisely by pg_dump --filter.


-- ============================================================
-- SECTION: STORAGE BUCKETS DATA
-- ============================================================


-- ============================================================
-- SECTION: CRON JOBS
-- ============================================================
-- 用户自定义 pg_cron 任务。

