exports.up = async function(knex) {
  await knex.schema.alterTable('tasks', (t) => {
    t.timestamp('snooze_until').nullable();
    t.text('on_hold_reason').nullable();
    t.text('blocked_reason').nullable();
    t.bigInteger('parent_id').nullable();
    t.integer('depth').notNullable().defaultTo(0);
    t.boolean('has_children').notNullable().defaultTo(false);
    t.integer('order_in_parent').notNullable().defaultTo(0);
    t.text('path').nullable();
    t.jsonb('rollup_cache').notNullable().defaultTo('{}');
  });

  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_tasks_parent_order ON tasks(parent_id, order_in_parent)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON tasks(status, due_date)`);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_tasks_due_active
    ON tasks(due_date)
    WHERE status NOT IN ('done','cancelled','archived') AND due_date IS NOT NULL
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_tasks_snooze
    ON tasks(snooze_until)
    WHERE snooze_until IS NOT NULL
  `);
};

exports.down = async function(knex) {
  await knex.raw(`DROP INDEX IF EXISTS idx_tasks_snooze`);
  await knex.raw(`DROP INDEX IF EXISTS idx_tasks_due_active`);
  await knex.raw(`DROP INDEX IF EXISTS idx_tasks_status_due`);
  await knex.raw(`DROP INDEX IF EXISTS idx_tasks_updated_at`);
  await knex.raw(`DROP INDEX IF EXISTS idx_tasks_parent_order`);
  await knex.raw(`DROP INDEX IF EXISTS idx_tasks_status`);

  await knex.schema.alterTable('tasks', (t) => {
    t.dropColumn('rollup_cache');
    t.dropColumn('path');
    t.dropColumn('order_in_parent');
    t.dropColumn('has_children');
    t.dropColumn('depth');
    t.dropColumn('parent_id');
    t.dropColumn('blocked_reason');
    t.dropColumn('on_hold_reason');
    t.dropColumn('snooze_until');
  });
};

