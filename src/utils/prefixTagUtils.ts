/**
 * Utility for adding tags based on filename prefixes
 */

interface PrefixMapping {
  prefix: string;
  description: string;
}

const PREFIX_MAPPINGS: PrefixMapping[] = [
  { prefix: 'ACP', description: 'Associate Consultant Programme' },
  { prefix: 'BSA', description: 'Building Security Scheme' },
  { prefix: 'CSF', description: 'CerticCS Schemes - Republic of Ireland' },
  { prefix: 'EAS', description: 'Evacuation Alert Systems' },
  { prefix: 'ESF', description: 'EMS Gold Scheme' },
  { prefix: 'FES', description: 'FIRE SCHEME: Gas Suppression Systems' },
  { prefix: 'FISF', description: 'FIRE SCHEME: Silver Scheme for FDA Systems' },
  { prefix: 'FSF', description: 'FIRE SCHEME: Gold Scheme for FDA Systems' },
  { prefix: 'HSSF', description: 'Occupational Health & Safety Scheme' },
  { prefix: 'HUB', description: 'Sharepoint Hub' },
  { prefix: 'ICL', description: 'Staff/infrastructure for example ICL 012 the Staff Handbook' },
  { prefix: 'ISF', description: 'Systems Silver Scheme' },
  { prefix: 'ISIA', description: 'Irish Security Industry Association (Qualsec)' },
  { prefix: 'ISMS', description: 'Information Security Management Systems' },
  { prefix: 'KFPS', description: 'Kitchen Fire Protection Systems' },
  { prefix: 'LSF', description: 'Life Safety Fire Risk Assessment Schemes' },
  { prefix: 'MSF', description: 'Guarding and Cash Services Gold, Silver or Bronze schemes' },
  { prefix: 'NSF', description: 'Forms relating to more than one scheme' },
  { prefix: 'OP1', description: 'Front line Certification Services procedures' },
  { prefix: 'OP2', description: 'Internal management procedures' },
  { prefix: 'OP3', description: 'CerticCS/Qualsec processes' },
  { prefix: 'SCF', description: 'Surveillance Camera Commissioner' },
  { prefix: 'SF', description: 'NACOSS Gold and ARC Gold schemes' },
  { prefix: 'SMF', description: 'Marketing documents' },
  { prefix: 'TAP', description: 'Transported Asset Protection Association (TAPA)' },
  { prefix: 'NAD', description: 'Historical NACOSS and ARC documents' },
  { prefix: 'NATM', description: 'Historical NACOSS and ARC documents' }
];

/**
 * Extracts prefix-based tags from a filename
 * @param filename The filename to analyze
 * @returns Array of tags to add (prefix + description)
 */
export function extractPrefixTags(filename: string): string[] {
  const tags: string[] = [];
  
  console.log('Checking filename for prefix:', filename);
  
  // Convert filename to uppercase for prefix matching
  const upperFilename = filename.toUpperCase();
  
  // Find matching prefixes
  for (const mapping of PREFIX_MAPPINGS) {
    // Check if filename starts with the prefix followed by a separator or number
    const pattern = new RegExp(`^${mapping.prefix}(?:[^A-Z]|$)`, 'i');
    if (pattern.test(filename)) {
      console.log('Found matching prefix:', mapping.prefix, 'for filename:', filename);
      // Add both the prefix and the full description as tags
      tags.push(mapping.prefix);
      tags.push(mapping.description);
      break; // Only match the first prefix found
    }
  }
  
  console.log('Generated prefix tags:', tags);
  return tags;
}

/**
 * Adds prefix-based tags to existing tags
 * @param existingTags Current tags string (comma-separated)
 * @param filename Filename to analyze
 * @returns Updated tags string with prefix tags added
 */
export function addPrefixTags(existingTags: string, filename: string): string {
  console.log('Adding prefix tags for:', filename, 'existing tags:', existingTags);
  const prefixTags = extractPrefixTags(filename);
  
  if (prefixTags.length === 0) {
    console.log('No prefix tags found for:', filename);
    return existingTags;
  }
  
  // Parse existing tags
  const currentTags = existingTags
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
  
  // Add prefix tags that aren't already present
  for (const prefixTag of prefixTags) {
    if (!currentTags.some(tag => tag.toLowerCase() === prefixTag.toLowerCase())) {
      currentTags.push(prefixTag);
    }
  }
  
  const result = currentTags.join(', ');
  console.log('Final tags result:', result);
  return result;
}