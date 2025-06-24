 function classifyPriority(subject, snippet) {
  const text = `${subject} ${snippet}`.toLowerCase();

  const highKeywords = ['urgent', 'asap', 'immediately', 'deadline', 'important'];
  const mediumKeywords = ['please confirm', 'follow up', 'reminder', 'waiting'];
  
  if (highKeywords.some(word => text.includes(word))) return 'high';
  if (mediumKeywords.some(word => text.includes(word))) return 'medium';
  return 'low';
}

module.exports = classifyPriority;