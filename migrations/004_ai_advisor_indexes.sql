CREATE INDEX IF NOT EXISTS agents_agency_id_idx ON agents(agency_id);
CREATE INDEX IF NOT EXISTS properties_agent_status_idx ON properties(agent_id, status);
