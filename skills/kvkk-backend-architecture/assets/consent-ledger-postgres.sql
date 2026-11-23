-- KVKK Append-Only Consent, Legal Hash & Periodic Destruction Ledger (PostgreSQL 14+)
-- Technical compliance engineering artifact; not formal Turkish legal advice (hukuki mutalaa).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Registry of published Aydinlatma Metni, Acik Riza, and Cookie Policy versions
CREATE TABLE IF NOT EXISTS kvkk_legal_text_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_code   TEXT NOT NULL,          -- e.g., 'AYDINLATMA_WEB', 'ACIK_RIZA_ART6', 'ETK_IYS'
    version_tag     TEXT NOT NULL,          -- e.g., '2026-11-v1'
    locale          TEXT NOT NULL DEFAULT 'tr-TR',
    sha256_hash     CHAR(64) NOT NULL,      -- Lowercase hex SHA-256 of canonical UTF-8 document
    published_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    retired_at      TIMESTAMPTZ,
    CONSTRAINT uq_kvkk_doc_ver_locale UNIQUE (document_code, version_tag, locale),
    CONSTRAINT chk_sha256_hex CHECK (sha256_hash ~ '^[0-9a-f]{64}$')
);

-- 2. Append-only Consent Event Ledger (KVKK Art. 5/1, Art. 6/3-a, Cookie Opt-In, Law No. 6563 ETK)
-- Operational PII is stored in separate erasable domain tables and purged per Art. 7 / Periyodik Imha.
-- This ledger retains only pseudonymized evidentiary proof, strictly time-bounded under KVKK Art. 5/2-e.
CREATE TABLE IF NOT EXISTS kvkk_consent_events (
    event_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_ref_hash      CHAR(64) NOT NULL, -- Pseudonymized HMAC/SHA-256 subject identifier (decoupled from erasable PII)
    consent_scope         TEXT NOT NULL,     -- e.g., 'COOKIE_ANALYTICS', 'ART6_ID_SCAN', 'ETK_MARKETING_SMS'
    action                TEXT NOT NULL CHECK (action IN ('GRANT', 'REVOKE')),
    legal_text_version_id UUID NOT NULL REFERENCES kvkk_legal_text_versions(id),
    legal_text_sha256     CHAR(64) NOT NULL CHECK (legal_text_sha256 ~ '^[0-9a-f]{64}$'),
    collection_channel    TEXT NOT NULL,     -- e.g., 'WEB_BANNER_L1', 'ONBOARDING_FORM', 'DSAR_PORTAL'
    actor_ip_hmac         CHAR(64),          -- Keyed HMAC of client IP for evidentiary audit without raw PII sprawl
    user_agent_summary    TEXT,
    retention_legal_basis TEXT NOT NULL DEFAULT 'ART_5_2_E_RIGHT_DEFENSE',
    occurred_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    proof_retain_until    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 years'),
    CONSTRAINT chk_proof_retain_after_occurred CHECK (proof_retain_until > occurred_at)
);

CREATE INDEX IF NOT EXISTS idx_kvkk_consent_subject_scope
    ON kvkk_consent_events (subject_ref_hash, consent_scope, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_kvkk_consent_retain_until
    ON kvkk_consent_events (proof_retain_until);

-- 3. Destruction, Erasure, and Anonymization Audit Log
-- Erasure/Destruction/Anonymization Regulation mandates >= 3-year retention of destruction logs.
CREATE TABLE IF NOT EXISTS kvkk_destruction_logs (
    log_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_code             TEXT NOT NULL,     -- e.g., 'PERIYODIK_IMHA_2026_H2' or 'DSAR_ART11_2026_0042'
    trigger_type           TEXT NOT NULL CHECK (trigger_type IN ('PERIYODIK_IMHA', 'DSAR_ART11', 'TTL_EXPIRY')),
    target_table_or_bucket TEXT NOT NULL,
    record_count           BIGINT NOT NULL CHECK (record_count >= 0),
    method                 TEXT NOT NULL CHECK (method IN ('HARD_DELETE', 'CRYPTO_SHRED', 'ANONYMIZE', 'PHYSICAL_SHRED')),
    statutory_basis        TEXT NOT NULL,     -- e.g., 'KVKK Art. 7 & Erasure Regulation Art. 11 (<= 6m cycle)'
    executed_by_role       TEXT NOT NULL,
    executed_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    log_retain_until       TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '3 years'),
    CONSTRAINT chk_min_3yr_log_retention CHECK (log_retain_until >= executed_at + INTERVAL '3 years')
);

-- 4. Immutability Guard Trigger preventing UPDATE and premature DELETE on evidentiary ledgers.
-- Retention expiry purges require SET LOCAL kvkk.allow_retention_purge = 'on' AND expired proof_retain_until/log_retain_until.
CREATE OR REPLACE FUNCTION kvkk_prevent_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' AND current_setting('kvkk.allow_retention_purge', true) = 'on' THEN
        IF TG_TABLE_NAME = 'kvkk_consent_events' AND OLD.proof_retain_until <= now() THEN
            RETURN OLD;
        ELSIF TG_TABLE_NAME = 'kvkk_destruction_logs' AND OLD.log_retain_until <= now() THEN
            RETURN OLD;
        END IF;
    END IF;
    RAISE EXCEPTION 'KVKK compliance ledger table % is append-only; % operations are prohibited unless executing an authorized retention purge after expiry.',
        TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kvkk_consent_immutable ON kvkk_consent_events;
CREATE TRIGGER trg_kvkk_consent_immutable
    BEFORE UPDATE OR DELETE ON kvkk_consent_events
    FOR EACH ROW EXECUTE FUNCTION kvkk_prevent_mutation();

DROP TRIGGER IF EXISTS trg_kvkk_destruction_immutable ON kvkk_destruction_logs;
CREATE TRIGGER trg_kvkk_destruction_immutable
    BEFORE UPDATE OR DELETE ON kvkk_destruction_logs
    FOR EACH ROW EXECUTE FUNCTION kvkk_prevent_mutation();
