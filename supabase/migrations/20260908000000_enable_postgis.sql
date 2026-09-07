-- Migration: Enable PostGIS
-- PostGIS is required for geographic coordinates on venue_branches.
-- Run this BEFORE creating the core schema.

CREATE EXTENSION IF NOT EXISTS postgis;
