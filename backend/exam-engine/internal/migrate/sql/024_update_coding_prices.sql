-- +goose Up
UPDATE pricing_items
SET price_cents = 9900
WHERE item_ref IN ('coding:python', 'coding:java', 'coding:cpp', 'coding:javascript', 'coding:c')
  AND item_kind = 'coding_language';

-- +goose Down
UPDATE pricing_items
SET price_cents = 19900
WHERE item_ref IN ('coding:python', 'coding:java', 'coding:cpp', 'coding:javascript', 'coding:c')
  AND item_kind = 'coding_language';
