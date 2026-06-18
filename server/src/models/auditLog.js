import pool from '../db.js';

export const log = async ({ userId=null, action, targetTable=null, targetId=null,
  oldValue=null, newValue=null, ipAddress=null, userAgent=null }) => {
  try {
    await pool.execute(
      `INSERT INTO audit_logs (user_id,action,target_table,target_id,old_value,new_value,ip_address,user_agent)
       VALUES (?,?,?,?,?,?,?,?)`,
      [ userId, action, targetTable, targetId,
        oldValue  ? JSON.stringify(oldValue)  : null,
        newValue  ? JSON.stringify(newValue)  : null,
        ipAddress, userAgent ]
    );
  } catch (err) {
    console.error('auditLog error:', err.message);
  }
};