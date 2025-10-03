-- Add guard role to user who needs to perform patrols
-- This user (Koukouletsos) has manager role but also needs to do guard duties
INSERT INTO user_roles (user_id, role, created_at)
VALUES ('ef7195e2-664a-4671-9906-05e767d42c14', 'guard', NOW())
ON CONFLICT (user_id, role) DO NOTHING;