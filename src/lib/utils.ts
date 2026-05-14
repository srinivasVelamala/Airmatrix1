import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'New': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Assigned': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'Accepted': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
    case 'On Route': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Arrived': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'In Progress': return 'bg-blue-600 text-white border-blue-700';
    case 'Parts Required': return 'bg-red-100 text-red-700 border-red-200';
    case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
    case 'Cancelled': return 'bg-gray-100 text-gray-700 border-gray-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}
