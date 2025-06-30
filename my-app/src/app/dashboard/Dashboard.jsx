'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function Dashboard() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [emails, setEmails] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [ruleInput, setRuleInput] = useState('');
  const [matchType, setMatchType] = useState('sender');
  const [priority, setPriority] = useState('high');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (!token) return;
    fetch(`https://email-notifier-production.up.railway.app/emails/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error('Session not found');
        return res.json();
      })
      .then((data) => {
        setEmails(data.emails);
        setFiltered(data.emails);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token, backendUrl]);

  useEffect(() => {
    let result = [...emails];
    const query = search.toLowerCase();
    if (query) {
      result = result.filter(
        (email) =>
          email.subject.toLowerCase().includes(query) ||
          email.snippet.toLowerCase().includes(query) ||
          email.from.toLowerCase().includes(query)
      );
    }
    if (priorityFilter !== 'All') {
      result = result.filter(
        (email) => email.priority.toLowerCase() === priorityFilter.toLowerCase()
      );
    }
    setFiltered(result);
  }, [search, priorityFilter, emails]);

  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!ruleInput.trim()) return alert('Enter a keyword or email');
    try {
      await fetch(`${backendUrl}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: extractUserFromToken(token),
          keyword: ruleInput,
          matchType,
          priority,
        }),
      });
      alert('Rule added. You can now re-authenticate to apply it.');
      setRuleInput('');
    } catch (err) {
      console.error(err);
      alert('Failed to add rule');
    }
  };

  if (loading) return <div className="text-center text-white mt-10">Loading...</div>;
  if (error) return <div className="text-center text-red-500 mt-10">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-[#0e1117] text-white px-6 py-10">
      <h1 className="text-3xl font-bold text-center mb-6">📬 Email Priority Dashboard</h1>
      {/* Rule form */}
      <form
        onSubmit={handleAddRule}
        className="bg-[#161b22] border border-gray-700 p-4 rounded-md mb-8 flex flex-col sm:flex-row sm:items-end gap-3"
      >
        <div className="flex-1">
          <label className="text-sm">Keyword / Sender</label>
          <input
            type="text"
            placeholder="e.g. urgent or boss@company.com"
            className="w-full mt-1 p-2 rounded bg-[#0e1117] border border-gray-700 text-white"
            value={ruleInput}
            onChange={(e) => setRuleInput(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm">Match</label>
          <select
            value={matchType}
            onChange={(e) => setMatchType(e.target.value)}
            className="mt-1 p-2 rounded bg-[#0e1117] border border-gray-700 text-white"
          >
            <option value="sender">Sender</option>
            <option value="keyword">Keyword</option>
          </select>
        </div>
        <div>
          <label className="text-sm">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="mt-1 p-2 rounded bg-[#0e1117] border border-gray-700 text-white"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 mt-1 sm:mt-0 px-4 py-2 rounded"
        >
          Add Rule
        </button>
      </form>

      {/* Search and filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search subject, sender, or snippet"
          className="flex-1 px-4 py-2 bg-[#161b22] text-white border border-gray-700 rounded-md"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-4 py-2 bg-[#161b22] text-white border border-gray-700 rounded-md"
        >
          <option>All</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </div>

      {/* Email list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((email, i) => (
          <div
            key={i}
            className="bg-[#161b22] rounded-lg p-5 shadow border border-gray-700 h-[270px] flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-semibold text-[#58a6ff]">{email.from}</p>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${getTagClass(
                    email.priority
                  )}`}
                >
                  {email.priority}
                </span>
              </div>
              <h3 className="font-medium text-base line-clamp-1">{email.subject}</h3>
              <p className="text-sm text-gray-400 mt-1 line-clamp-3">{email.snippet}</p>
            </div>
            <a
              href={`https://mail.google.com/mail/u/0/#inbox/${email.messageId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center text-blue-400 hover:text-blue-500 hover:underline text-sm font-medium"
            >
              See in Gmail
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function getTagClass(priority) {
  switch (priority?.toLowerCase()) {
    case 'high':
      return 'bg-red-600 text-white';
    case 'medium':
      return 'bg-yellow-500 text-black';
    case 'low':
      return 'bg-green-500 text-black';
    default:
      return 'bg-gray-500 text-white';
  }
}

function extractUserFromToken(token) {
  return 'dhruv711622@gmail.com'; // Dummy for now
}
