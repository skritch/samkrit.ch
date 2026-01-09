export function toRoman(num: number): string {
  const romanNumerals = [
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'
  ];
  return romanNumerals[num - 1] || num.toString();
}

export function toInitCap(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}