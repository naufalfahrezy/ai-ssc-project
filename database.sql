-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.knowledge_base (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  file_name text NOT NULL,
  file_url text,
  content text NOT NULL,
  embedding USER-DEFINED,
  metadata jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT knowledge_base_pkey PRIMARY KEY (id)
);
CREATE TABLE public.chat_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  source text NOT NULL,
  user_identifier text NOT NULL,
  user_name text,
  chat_history jsonb DEFAULT '[]'::jsonb,
  rating integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  feedback_message text,
  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.wa_contacts (
  wa_number text NOT NULL,
  name text,
  is_bot_active boolean DEFAULT true,
  last_interaction timestamp with time zone DEFAULT now(),
  CONSTRAINT wa_contacts_pkey PRIMARY KEY (wa_number)
);
CREATE TABLE public.tickets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  pelapor_name text NOT NULL,
  pelapor_wa text NOT NULL,
  issue_description text NOT NULL,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tickets_pkey PRIMARY KEY (id)
);
CREATE TABLE public.bot_settings (
  id text NOT NULL DEFAULT 'default'::text,
  system_prompt text NOT NULL,
  web_welcome text NOT NULL,
  wa_welcome text NOT NULL,
  office_hours text NOT NULL,
  out_of_scope_message text NOT NULL,
  temperature numeric DEFAULT 0.2,
  max_output_tokens integer DEFAULT 900,
  match_threshold numeric DEFAULT 0.45,
  match_count integer DEFAULT 5,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bot_settings_pkey PRIMARY KEY (id)
);