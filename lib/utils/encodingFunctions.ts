export function customEncodeURIComponent(str: string): string {
    return str
      .replace(/\s+/g, '-')  // Replace spaces with hyphens
      .replace(/,/g, '')     // Remove commas
      .replace(/[^a-zA-Z0-9-]/g, '') // Remove any other non-alphanumeric characters except hyphens
      .toLowerCase();
  }

export function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

export function formatHyphenatedNames(name: string): string {
    // The implementation remains the same, just the function name changes
    return name.split('-').map(capitalizeFirstLetter).join(' ');
}

export function capitalizeEachWord(string: string) {
    return string.split(' ')
      .map(word => word.toLowerCase() === 'usa' ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
}