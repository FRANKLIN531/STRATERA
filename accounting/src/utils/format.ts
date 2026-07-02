export const formatCurrency = (n: number, currency = 'USD') =>
  n.toLocaleString('en-US', { style: 'currency', currency });
