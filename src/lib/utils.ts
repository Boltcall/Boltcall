import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function scrollToElement(elementId: string) {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
}

export function updateMetaDescription(description: string) {
  // Ensure description is between 50-160 characters
  const trimmedDescription = description.length > 160 
    ? description.substring(0, 157) + '...'
    : description.length < 50
    ? description + ' ' + 'Learn more about Boltcall speed-to-lead services for your business.'
    : description;

  // Update standard meta description
  let metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    metaDescription = document.createElement('meta');
    metaDescription.setAttribute('name', 'description');
    document.head.appendChild(metaDescription);
  }
  metaDescription.setAttribute('content', trimmedDescription);

  // Update Open Graph description
  let ogDescription = document.querySelector('meta[property="og:description"]');
  if (!ogDescription) {
    ogDescription = document.createElement('meta');
    ogDescription.setAttribute('property', 'og:description');
    document.head.appendChild(ogDescription);
  }
  ogDescription.setAttribute('content', trimmedDescription);

  // Update Twitter description
  let twitterDescription = document.querySelector('meta[name="twitter:description"]');
  if (!twitterDescription) {
    twitterDescription = document.createElement('meta');
    twitterDescription.setAttribute('name', 'twitter:description');
    document.head.appendChild(twitterDescription);
  }
  twitterDescription.setAttribute('content', trimmedDescription);
}