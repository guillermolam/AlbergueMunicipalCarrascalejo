-- Migration 0003: Update dormitory price from €8 to €15
-- Run with: npx wrangler d1 execute DB --local --file=migrations/0003_price_update.sql

UPDATE pricing_rules
   SET price_cents = 1500,
       label       = 'Tarifa base — litera',
       updated_at  = datetime('now')
 WHERE accommodation_type = 'dormitory'
   AND active = 1;
