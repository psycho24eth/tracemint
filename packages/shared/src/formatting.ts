/**
 * Formatting & Presentation Utilities
 */

export function truncateAddress(address?: string, chars = 4): string {
  if (!address) return "0x00...0000";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatWeiToEther(weiStr: string, decimals = 4): string {
  try {
    const wei = BigInt(weiStr);
    const divisor = 10n ** 18n;
    const integerPart = wei / divisor;
    const remainder = wei % divisor;
    if (remainder === 0n) return integerPart.toString();
    const remainderStr = remainder.toString().padStart(18, "0").slice(0, decimals);
    return `${integerPart}.${remainderStr}`.replace(/\.?0+$/, "");
  } catch {
    return "0";
  }
}

export function formatEtherToWei(etherStr: string): string {
  try {
    const [intPart, decPart = ""] = etherStr.split(".");
    const paddedDec = decPart.padEnd(18, "0").slice(0, 18);
    const totalWei = BigInt(intPart || "0") * (10n ** 18n) + BigInt(paddedDec);
    return totalWei.toString();
  } catch {
    return "0";
  }
}

export function formatDate(isoStr: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoStr));
  } catch {
    return isoStr;
  }
}
