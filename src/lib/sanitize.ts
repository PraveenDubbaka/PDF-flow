import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Only allows safe formatting tags used in the rich text editor.
 */
export const sanitizeHtml = (html: string): string => {
 if (!html) return '';
 
 return DOMPurify.sanitize(html, {
 ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'p', 'br', 'ol', 'ul', 'li', 'code', 'span', 'div', 'a'],
 ALLOWED_ATTR: ['style', 'class', 'href', 'target', 'rel'],
 });
};
