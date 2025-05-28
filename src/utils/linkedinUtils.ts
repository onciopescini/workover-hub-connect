
export const validateLinkedInUrl = (url: string): boolean => {
  if (!url || !url.trim()) return true; // Empty is valid
  
  // Più permissivo per rispettare il constraint del database
  const linkedinRegex = /^https:\/\/(www\.)?linkedin\.com\/(in|pub|profile)\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+$/i;
  return linkedinRegex.test(url);
};

export const formatLinkedInUrl = (url: string): string => {
  if (!url || !url.trim()) return '';
  
  const linkedinUrl = url.trim();
  
  // Se l'utente inserisce solo il nome utente, costruisci l'URL completo
  if (!linkedinUrl.includes('linkedin.com') && !linkedinUrl.includes('http')) {
    return `https://linkedin.com/in/${linkedinUrl}`;
  }
  // Se manca il protocollo, aggiungilo
  else if (linkedinUrl.includes('linkedin.com') && !linkedinUrl.startsWith('http')) {
    return `https://${linkedinUrl}`;
  }
  // Assicurati che sia https
  else if (linkedinUrl.startsWith('http://linkedin.com')) {
    return linkedinUrl.replace('http://', 'https://');
  }
  
  return linkedinUrl;
};
