const adjectives = [
  'Swift',
  'Brave',
  'Clever',
  'Bold',
  'Wise',
  'Quick',
  'Silent',
  'Bright',
  'Lucky',
  'Mighty',
  'Happy',
  'Calm',
  'Wild',
  'Free',
  'True',
  'Noble',
  'Proud',
  'Smart',
  'Cool',
  'Fast',
];

const nouns = [
  'Coder',
  'Hacker',
  'Dev',
  'Ninja',
  'Wizard',
  'Master',
  'Builder',
  'Creator',
  'Engineer',
  'Architect',
  'Guru',
  'Expert',
  'Pro',
  'Legend',
  'Hero',
  'Champion',
  'Tiger',
  'Dragon',
  'Phoenix',
  'Wolf',
];

/**
 * Generates a random username in the format: Adjective_Noun_Number
 * Example: Swift_Coder_42
 */
export function generateUsername(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 1000);

  return `${adjective}_${noun}_${number}`;
}

/**
 * Generates a random color for user avatar
 * Returns a hex color string
 */
export function generateColor(): string {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Cyan
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DFE6E9', // Gray
    '#74B9FF', // Light Blue
    '#A29BFE', // Purple
    '#FD79A8', // Pink
    '#FDCB6E', // Orange
  ];

  return colors[Math.floor(Math.random() * colors.length)];
}
