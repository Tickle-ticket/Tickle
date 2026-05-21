CREATE TABLE IF NOT EXISTS behavior_feature_records (
    id BIGSERIAL PRIMARY KEY,

    record_id VARCHAR(64) NOT NULL UNIQUE,

    type VARCHAR(32) NOT NULL,
    schedule_id BIGINT,
    event_id BIGINT,
    event_date DATE,
    created_at_client TIMESTAMPTZ,

    label VARCHAR(16) NOT NULL,
    p_macro DOUBLE PRECISION NOT NULL,

    features JSONB NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_behavior_feature_records_label
    CHECK (label IN ('ALLOW', 'REVIEW', 'BLOCK', 'REVALIDATED')),

    CONSTRAINT chk_behavior_feature_records_p_macro
    CHECK (p_macro >= 0.0 AND p_macro <= 1.0)
);

CREATE INDEX IF NOT EXISTS idx_behavior_feature_records_type
ON behavior_feature_records (type);

CREATE INDEX IF NOT EXISTS idx_behavior_feature_records_schedule_id
ON behavior_feature_records (schedule_id);

CREATE INDEX IF NOT EXISTS idx_behavior_feature_records_event_id
ON behavior_feature_records (event_id);

CREATE INDEX IF NOT EXISTS idx_behavior_feature_records_event_date
ON behavior_feature_records (event_date);

CREATE INDEX IF NOT EXISTS idx_behavior_feature_records_label
ON behavior_feature_records (label);

CREATE INDEX IF NOT EXISTS idx_behavior_feature_records_p_macro
ON behavior_feature_records (p_macro);

CREATE INDEX IF NOT EXISTS idx_behavior_feature_records_created_at
ON behavior_feature_records (created_at);

CREATE INDEX IF NOT EXISTS idx_behavior_feature_records_features_gin
ON behavior_feature_records USING GIN (features);

CREATE TABLE IF NOT EXISTS behavior_feature_records_gt (
    id BIGSERIAL PRIMARY KEY,

    record_id VARCHAR(64) NOT NULL UNIQUE,

    type VARCHAR(32) NOT NULL,
    schedule_id BIGINT,
    event_id BIGINT,
    event_date DATE,
    created_at_client TIMESTAMPTZ,

    label VARCHAR(16) NOT NULL,
    p_macro DOUBLE PRECISION NOT NULL,

    features JSONB NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_behavior_feature_records_gt_label
    CHECK (label IN ('ALLOW', 'REVIEW', 'BLOCK')),

    CONSTRAINT chk_behavior_feature_records_gt_p_macro
    CHECK (p_macro >= 0.0 AND p_macro <= 1.0)
);

CREATE INDEX IF NOT EXISTS idx_behavior_feature_records_gt_type
ON behavior_feature_records_gt (type);

CREATE INDEX IF NOT EXISTS idx_behavior_feature_records_gt_schedule_id
ON behavior_feature_records_gt (schedule_id);

CREATE INDEX IF NOT EXISTS idx_behavior_feature_records_gt_event_id
ON behavior_feature_records_gt (event_id);

CREATE INDEX IF NOT EXISTS idx_behavior_feature_records_gt_event_date
ON behavior_feature_records_gt (event_date);

CREATE INDEX IF NOT EXISTS idx_behavior_feature_records_gt_label
ON behavior_feature_records_gt (label);

CREATE INDEX IF NOT EXISTS idx_behavior_feature_records_gt_p_macro
ON behavior_feature_records_gt (p_macro);

CREATE INDEX IF NOT EXISTS idx_behavior_feature_records_gt_created_at
ON behavior_feature_records_gt (created_at);

CREATE INDEX IF NOT EXISTS idx_behavior_feature_records_gt_features_gin
ON behavior_feature_records_gt USING GIN (features);
