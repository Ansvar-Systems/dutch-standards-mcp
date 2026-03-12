// src/types.ts

export interface Framework {
  id: string;
  name: string;
  name_nl: string | null;
  issuing_body: string;
  version: string;
  effective_date: string | null;
  scope: string | null;
  scope_sectors: string | null; // JSON array string
  structure_description: string | null;
  source_url: string | null;
  license: string | null;
  language: string;
}

export interface Control {
  id: string;
  framework_id: string;
  control_number: string;
  title: string | null;
  title_nl: string;
  description: string | null;
  description_nl: string;
  category: string | null;
  subcategory: string | null;
  level: string | null;
  iso_mapping: string | null;
  implementation_guidance: string | null;
  verification_guidance: string | null;
  source_url: string | null;
}

export interface ControlSearchResult {
  id: string;
  framework_id: string;
  control_number: string;
  title: string;
  category: string | null;
  level: string | null;
  rank: number;
}

export interface FrameworkStats {
  id: string;
  name: string;
  issuing_body: string;
  version: string;
  control_count: number;
  scope_sectors: string[];
  language: string;
}

export interface DbMetadata {
  schema_version: string;
  category: string;
  mcp_name: string;
  database_built: string;
  database_version: string;
}

export type Language = 'nl' | 'en';

export type ErrorType = 'NO_MATCH' | 'INVALID_INPUT';
