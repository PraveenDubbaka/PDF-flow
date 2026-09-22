export interface MentionUser {
  id: string;
  name: string;
  role: string;
}

export const currentMentionUser: MentionUser = { id: 'u-venkata', name: 'Venkata Ramana', role: 'Partner' };

export const mentionUsers: MentionUser[] = [
  { id: 'u-virat', name: 'Virat Kohli', role: 'Manager' },
  { id: 'u-aarav', name: 'Aarav Shah', role: 'Staff' },
  { id: 'u-aditya-m', name: 'Aditya Malhotra', role: 'Staff' },
  { id: 'u-aditya-r', name: 'Aditya Reddy', role: 'Staff' },
  { id: 'u-aisha', name: 'Aisha Reddy', role: 'Reviewer' },
  { id: 'u-ananya', name: 'Ananya Sharma', role: 'Staff' },
  { id: 'u-amol', name: 'Amol Patil', role: 'CMS' },
  { id: 'u-haroon', name: 'Haroon S', role: 'Staff' },
  { id: 'u-norbert', name: 'Norbert B', role: 'Staff' },
  { id: 'u-henry', name: 'Henry Davis', role: 'Partner' },
  { id: 'u-ishaan', name: 'Ishaan S', role: 'Partner' },
  currentMentionUser,
];

export const findMentions = (text: string): string[] => {
  const found = new Set<string>();
  mentionUsers.forEach((user) => {
    if (new RegExp(`@${user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)) found.add(user.name);
  });
  return [...found];
};

export const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
