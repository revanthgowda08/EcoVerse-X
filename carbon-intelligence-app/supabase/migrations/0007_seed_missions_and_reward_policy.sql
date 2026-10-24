-- Starter content so the live Missions page isn't empty on first load.
-- reward_policies requires_evidence_review = true on both, matching the
-- PRD's evidence-review requirement — nothing here auto-approves.

insert into reward_policies (name, trigger_type, amount, active, requires_evidence_review)
values ('Mission completion', 'mission_completed', 50, true, true);

insert into missions (title, description, category, metric_unit, active)
values
  ('Plant a tree', 'Plant a sapling and help it establish. Submit your estimate, then upload evidence for review.', 'tree_planting', 'trees_planted', true),
  ('Neighborhood waste collection', 'Organize or join a waste collection drive in your area.', 'waste_collection', 'kg_waste_collected', true);
