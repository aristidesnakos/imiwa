import axios from 'axios';
import { JSDOM } from 'jsdom';

export async function fetchUrlContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url);
    
    // Parse HTML content
    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    // Remove script and style elements
    document.querySelectorAll('script, style').forEach(el => el.remove());

    // Get main content (prioritize main content areas)
    const mainContent = document.querySelector('main, article, .content, #content, .main-content');
    
    // If no main content area found, use body
    const content = mainContent ? mainContent.textContent : document.body.textContent;
    
    // Clean up the text
    return content
      ?.replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .trim() || '';
      
  } catch (error) {
    console.error('Error fetching URL content:', error);
    throw new Error('Failed to fetch URL content');
  }
} 