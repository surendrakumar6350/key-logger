interface SearchResults {
  databaseResults: any[];
  s3Results: any[];
}

interface ResultCounts {
  database: number;
  s3: number;
  total: number;
}

export function combineAndSortResults(
  results: SearchResults,
  limit: number
): { finalResults: any[]; counts: ResultCounts } {
  const databaseResults = results.databaseResults.map(log => ({
    ...log,
    source: 'database',
  }));
  const combinedResults = [...databaseResults, ...results.s3Results];
  combinedResults.sort((a, b) => {
    const timeA = a.timestamp || '';
    const timeB = b.timestamp || '';
    return timeB.localeCompare(timeA);
  });
  const finalResults = combinedResults.slice(0, limit);
  const counts = {
    database: results.databaseResults.length,
    s3: results.s3Results.length,
    total: finalResults.length,
  };
  return { finalResults, counts };
}
