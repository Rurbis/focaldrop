CREATE TABLE "agencies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"timezone" text DEFAULT 'America/Mexico_City' NOT NULL,
	"locale" text DEFAULT 'es-MX' NOT NULL,
	"currency" text DEFAULT 'MXN' NOT NULL,
	"notification_email" text NOT NULL,
	"retention_days" integer DEFAULT 60 NOT NULL,
	"notification_preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"storage_policy_accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agencies_slug_unique" UNIQUE("slug"),
	CONSTRAINT "agencies_slug_check" CHECK ("agencies"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length("agencies"."slug") BETWEEN 3 AND 63),
	CONSTRAINT "agencies_name_check" CHECK (char_length(trim("agencies"."name")) BETWEEN 1 AND 120),
	CONSTRAINT "agencies_status_check" CHECK ("agencies"."status" IN ('active', 'suspended')),
	CONSTRAINT "agencies_locale_check" CHECK ("agencies"."locale" = 'es-MX'),
	CONSTRAINT "agencies_currency_check" CHECK ("agencies"."currency" = 'MXN'),
	CONSTRAINT "agencies_retention_days_check" CHECK ("agencies"."retention_days" > 0),
	CONSTRAINT "agencies_preferences_check" CHECK (jsonb_typeof("agencies"."notification_preferences") = 'object')
);
--> statement-breakpoint
ALTER TABLE "agencies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "agency_domains" (
	"id" uuid PRIMARY KEY NOT NULL,
	"agency_id" uuid NOT NULL,
	"hostname" text NOT NULL,
	"kind" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	CONSTRAINT "agency_domains_hostname_unique" UNIQUE("hostname"),
	CONSTRAINT "agency_domains_kind_check" CHECK ("agency_domains"."kind" IN ('platform_subdomain', 'custom')),
	CONSTRAINT "agency_domains_hostname_check" CHECK ("agency_domains"."hostname" = lower("agency_domains"."hostname") AND char_length("agency_domains"."hostname") BETWEEN 1 AND 253 AND "agency_domains"."hostname" !~ '[[:space:]:/]')
);
--> statement-breakpoint
ALTER TABLE "agency_domains" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "agency_members" (
	"agency_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agency_members_agency_id_user_id_pk" PRIMARY KEY("agency_id","user_id"),
	CONSTRAINT "agency_members_role_check" CHECK ("agency_members"."role" IN ('owner', 'staff'))
);
--> statement-breakpoint
ALTER TABLE "agency_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"is_platform_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_full_name_check" CHECK (char_length(trim("profiles"."full_name")) BETWEEN 1 AND 120)
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agency_domains" ADD CONSTRAINT "agency_domains_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_members" ADD CONSTRAINT "agency_members_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_members" ADD CONSTRAINT "agency_members_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agency_domains_agency_id_idx" ON "agency_domains" USING btree ("agency_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agency_domains_one_primary_idx" ON "agency_domains" USING btree ("agency_id") WHERE "agency_domains"."is_primary";--> statement-breakpoint
CREATE INDEX "agency_members_user_id_idx" ON "agency_members" USING btree ("user_id");
--> statement-breakpoint
-- Custom layer-0 security (D60). Supabase owns auth.users and its API roles;
-- tests provide only those external prerequisites on plain Postgres.
DO $$ BEGIN
  CREATE ROLE app_api LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
-- Supabase's postgres role is not a superuser. It can create a restricted role,
-- but cannot ALTER privileged attributes even to set them to false. Validate
-- an existing role instead of attempting to rewrite those attributes.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'app_api' AND
      (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR NOT rolcanlogin)
  ) THEN
    RAISE EXCEPTION 'app_api must be a login role without administrative privileges or RLS bypass';
  END IF;
END $$;
--> statement-breakpoint
REVOKE ALL ON TABLE public.agencies, public.agency_domains, public.profiles, public.agency_members FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO app_api;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agencies, public.agency_domains, public.profiles, public.agency_members TO app_api;
--> statement-breakpoint
CREATE POLICY app_api_access ON public.agencies FOR ALL TO app_api USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY app_api_access ON public.agency_domains FOR ALL TO app_api USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY app_api_access ON public.profiles FOR ALL TO app_api USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY app_api_access ON public.agency_members FOR ALL TO app_api USING (true) WITH CHECK (true);
