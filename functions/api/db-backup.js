async function getTableSchema(db, tableName) {
  const { results } = await db.prepare(`PRAGMA table_info(${tableName})`).all();
  return results;
}
async function generateCreateTableSql(db, tableName) {
    const { results } = await db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).bind(tableName).all();
    return results.length > 0 ? results[0].sql + ';\n' : '';
}
export const onRequestGet = async ({ env }) => {
  try {
    let sqlDump = `-- Database Backup: ${new Date().toISOString()}\n\n`;
    const { results: tables } = await env.D1.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    for (const table of tables) {
      const tableName = table.name;
      sqlDump += `-- Table structure for table \`${tableName}\`\n`;
      sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
      const createSql = await generateCreateTableSql(env.D1, tableName);
      sqlDump += createSql + '\n';
      const { results: rows } = await env.D1.prepare(`SELECT * FROM ${tableName}`).all();
      if (rows.length > 0) {
        sqlDump += `-- Dumping data for table \`${tableName}\`\n`;
        const columns = Object.keys(rows[0]);
        const columnNames = columns.map(c => `\`${c}\``).join(', ');
        for (const row of rows) {
          const values = columns.map(col => {
            const value = row[col];
            if (value === null) return 'NULL';
            if (typeof value === 'number') return value;
            // Simple string escaping
            return `'${String(value).replace(/'/g, "''")}'`;
          }).join(', ');
          sqlDump += `INSERT INTO \`${tableName}\` (${columnNames}) VALUES (${values});\n`;
        }
      }
      sqlDump += '\n';
    }
    return new Response(sqlDump, {
      headers: {
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="backup-${Date.now()}.sql"`,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
};