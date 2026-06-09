export function formatDecimal(value: number | string | null | undefined, decimals = 2): string {
  const numericValue = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

export function formatMoney(
  value: number | string | null | undefined,
  simboloMoneda: string,
  decimals = 2,
): string {
  return `${simboloMoneda} ${formatDecimal(value, decimals)}`;
}
