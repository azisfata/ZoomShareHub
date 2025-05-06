// Helper functions untuk MySQL

// Helper untuk mendapatkan insertId dari hasil query MySQL
export function getInsertId(result: any): number {
  if (result && typeof result === 'object') {
    // Untuk MySQL2
    if (result.insertId !== undefined) {
      return Number(result.insertId);
    }
    
    // Untuk struktur hasil lain
    if (result[0] && result[0].insertId !== undefined) {
      return Number(result[0].insertId);
    }
  }
  
  // Fallback, return 0 jika tidak ada insertId
  return 0;
}

// Helper untuk mendapatkan rowsAffected dari hasil query MySQL
export function getRowsAffected(result: any): number {
  if (result && typeof result === 'object') {
    // Untuk MySQL2
    if (result.affectedRows !== undefined) {
      return Number(result.affectedRows);
    }
    
    // Untuk struktur hasil lain
    if (result.rowsAffected !== undefined) {
      return Number(result.rowsAffected);
    }
    
    if (result[0] && result[0].affectedRows !== undefined) {
      return Number(result[0].affectedRows);
    }
  }
  
  // Fallback, return 0 jika tidak ada affectedRows
  return 0;
}
