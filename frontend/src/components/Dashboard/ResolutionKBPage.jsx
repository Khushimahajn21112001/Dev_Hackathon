import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../UI/Navbar';
import Sidebar from '../UI/Sidebar';
import { BookOpen, Search, ThumbsUp, GitMerge, FileText, Tag, Layers, Server, AlertCircle } from 'lucide-react';

const ResolutionKBPage = () => {
  const [kbs, setKbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [selectedProblemFamily, setSelectedProblemFamily] = useState('');
  const [selectedRootCauseCat, setSelectedRootCauseCat] = useState('');

  const fetchKbs = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/resolution-kb', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setKbs(res.data.kbs || []);
    } catch (err) {
      console.error('Error fetching Resolution KB:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKbs();
  }, []);

  const problemFamilies = [...new Set(kbs.map(k => k.problemFamily).filter(Boolean))];
  const rootCauseCats = [...new Set(kbs.map(k => k.rootCauseCategory).filter(Boolean))];

  const filteredKbs = kbs.filter(kb => {
    const matchesSearch = kb.issueTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          kb.rootCause?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFamily = selectedProblemFamily ? kb.problemFamily === selectedProblemFamily : true;
    const matchesRootCat = selectedRootCauseCat ? kb.rootCauseCategory === selectedRootCauseCat : true;
    
    return matchesSearch && matchesFamily && matchesRootCat;
  });

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <BookOpen className="h-6 w-6 text-emerald-400" />
                  </div>
                  Resolution Knowledge Base
                </h1>
                <p className="text-sm text-slate-400 mt-1.5 ml-14">
                  AI-driven repository of successful issue resolutions and self-service guidelines.
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by issue title or root cause..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 text-slate-300 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none transition"
                />
              </div>
              
              <div className="flex-1">
                <select
                  value={selectedProblemFamily}
                  onChange={(e) => setSelectedProblemFamily(e.target.value)}
                  className="w-full bg-slate-950 text-slate-300 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none transition cursor-pointer"
                >
                  <option value="">All Problem Families</option>
                  {problemFamilies.map(fam => (
                    <option key={fam} value={fam}>{fam}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <select
                  value={selectedRootCauseCat}
                  onChange={(e) => setSelectedRootCauseCat(e.target.value)}
                  className="w-full bg-slate-950 text-slate-300 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none transition cursor-pointer"
                >
                  <option value="">All Root Cause Categories</option>
                  {rootCauseCats.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : filteredKbs.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center shadow-lg">
                <FileText className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-300">No Knowledge Base Entries Found</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2">
                  No resolutions have been marked as reusable, or no entries match your filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {filteredKbs.map((kb) => (
                  <div key={kb._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg hover:border-emerald-500/30 transition-colors flex flex-col">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <h3 className="text-base font-bold text-slate-100 flex-1">{kb.issueTitle}</h3>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <ThumbsUp className="h-3 w-3" />
                          {kb.successRate}% Success
                        </span>
                        <span className="text-[10px] text-slate-500">{kb.solvedCount} times solved</span>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {kb.problemFamily && (
                        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
                          <span className="flex items-center gap-1 text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                            <Layers className="h-3 w-3" /> Problem Family
                          </span>
                          <span className="text-xs text-indigo-300 font-semibold">{kb.problemFamily}</span>
                        </div>
                      )}
                      {kb.rootCauseCategory && (
                        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
                          <span className="flex items-center gap-1 text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                            <AlertCircle className="h-3 w-3" /> Root Cause Category
                          </span>
                          <span className="text-xs text-amber-300 font-semibold">{kb.rootCauseCategory}</span>
                        </div>
                      )}
                      {kb.applicationNames && kb.applicationNames.length > 0 && (
                        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60 col-span-2">
                          <span className="flex items-center gap-1 text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                            <Server className="h-3 w-3" /> Applications
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {kb.applicationNames.map((app, i) => (
                              <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                                {app}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {kb.rootCause && (
                      <div className="mb-4">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Root Cause</span>
                        <p className="text-sm text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                          {kb.rootCause}
                        </p>
                      </div>
                    )}
                    
                    <div className="mb-4">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5 block">
                        <GitMerge className="h-3.5 w-3.5" />
                        Resolution Steps
                      </span>
                      <ul className="space-y-1.5 list-disc list-inside bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                        {kb.knownFixSteps.map((step, idx) => (
                          <li key={idx} className="text-sm text-slate-300 leading-relaxed">{step}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Tags */}
                    {kb.tags && kb.tags.length > 0 && (
                      <div className="mt-auto pt-4 border-t border-slate-800/60 flex items-center gap-2 flex-wrap">
                        <Tag className="h-3.5 w-3.5 text-slate-500" />
                        {kb.tags.map((tag, i) => (
                          <span key={i} className="text-[10px] bg-slate-950 text-indigo-400 px-2 py-0.5 rounded-md border border-slate-800/80">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ResolutionKBPage;
