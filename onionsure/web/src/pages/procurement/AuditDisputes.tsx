import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ShieldAlert, History, Clock, FileText, Download, Search, Filter, X,
  ChevronRight, AlertTriangle, CheckCircle2, XCircle, RotateCcw, Eye,
  User, Building2, Calendar, Package, Award, TrendingUp
} from 'lucide-react';
import { api } from '../../lib/api';
import { Card, Badge, GradeBadge, Spinner, EmptyState } from '../../components/ui';
import { PageTransition } from '../../components/motion';

type Tab = 'disputes' | 'overrides' | 'logs';

export default function AuditDisputes() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Data state
  const [logs, setLogs] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI state
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'disputes');
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Filter state
  const [searchLotId, setSearchLotId] = useState(searchParams.get('lotId') || searchParams.get('search') || '');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCenter, setFilterCenter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Action state
  const [actionType, setActionType] = useState<'accept' | 'reject' | 'reassess' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [reassessGrade, setReassessGrade] = useState('GRADE A');
  const [reassessScore, setReassessScore] = useState(92);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  // KPI state
  const [kpis, setKpis] = useState({
    openDisputes: 0,
    pendingReviews: 0,
    manualOverrides: 0,
    reassessments: 0,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [auditRes, dispRes] = await Promise.all([
        api.getAuditLogs(),
        api.getDisputes(),
      ]);
      
      const allLogs = auditRes.logs || [];
      const allOverrides = auditRes.overrides || [];
      const allDisputes = dispRes || [];
      
      setLogs(allLogs);
      setOverrides(allOverrides);
      setDisputes(allDisputes);
      
      // Calculate KPIs from real data
      const openCount = allDisputes.filter(d => 
        d.status === 'submitted' || d.status === 'under_review'
      ).length;
      const reviewCount = allDisputes.filter(d => d.status === 'under_review').length;
      const overrideCount = allOverrides.length;
      const reassessCount = allLogs.filter(l => 
        l.action === 'REASSESSMENT_STARTED' || l.action === 'FINAL_RESULT_UPDATED'
      ).length;
      
      setKpis({
        openDisputes: openCount,
        pendingReviews: reviewCount,
        manualOverrides: overrideCount,
        reassessments: Math.floor(reassessCount / 2), // Divide by 2 since there are 2 events per reassessment
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab]);

  // Filtered data
  const filteredDisputes = disputes.filter(d => {
    if (searchLotId && !d.centralLotId?.toLowerCase().includes(searchLotId.toLowerCase())) return false;
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    return true;
  });

  const filteredOverrides = overrides.filter(o => {
    if (searchLotId && !o.centralLotId?.toLowerCase().includes(searchLotId.toLowerCase())) return false;
    return true;
  });

  const filteredLogs = logs.filter(l => {
    if (searchLotId && !l.lotNumber?.toLowerCase().includes(searchLotId.toLowerCase())) return false;
    return true;
  });

  // Handle dispute actions
  const handleDisputeAction = async (type: 'accept' | 'reject' | 'reassess') => {
    if (!selectedDispute) return;
    
    if (type === 'reassess') {
      setActionType('reassess');
      return;
    }
    
    setActionType(type);
  };

  const submitAction = async () => {
    if (!selectedDispute || !actionType) return;
    
    if ((actionType === 'reject' || actionType === 'accept') && !actionReason.trim()) {
      alert(`${actionType === 'reject' ? 'Rejection' : 'Acceptance'} reason is required`);
      return;
    }

    setSubmitting(true);
    setMsg('');
    
    try {
      if (actionType === 'accept') {
        await api.acceptDispute(selectedDispute.id, { reason: actionReason });
        setMsg('✓ Dispute accepted successfully');
      } else if (actionType === 'reject') {
        await api.rejectDispute(selectedDispute.id, { reason: actionReason });
        setMsg('✓ Dispute rejected');
      } else if (actionType === 'reassess') {
        await api.reinspectDispute(selectedDispute.id, {
          newGrade: reassessGrade,
          newScore: reassessScore,
          reason: actionReason || 'Reassessment completed with updated grade',
        });
        setMsg('✓ Reassessment completed! Central Lot & Certificate updated.');
      }
      
      setActionType(null);
      setActionReason('');
      setDrawerOpen(false);
      setSelectedDispute(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const openDisputeDetail = (dispute: any) => {
    setSelectedDispute(dispute);
    setDrawerOpen(true);
    setActionType(null);
    setActionReason('');
  };

  const handleKPIClick = (filter: string) => {
    setActiveTab('disputes');
    if (filter === 'open') setFilterStatus('submitted');
    else if (filter === 'review') setFilterStatus('under_review');
    else setFilterStatus('all');
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { tone: any; label: string }> = {
      submitted: { tone: 'gray', label: 'SUBMITTED' },
      under_review: { tone: 'amber', label: 'UNDER REVIEW' },
      reinspection: { tone: 'blue', label: 'REINSPECTION' },
      resolved: { tone: 'forest', label: 'RESOLVED' },
      rejected: { tone: 'reject', label: 'REJECTED' },
    };
    const config = statusMap[status] || { tone: 'gray', label: status.toUpperCase() };
    return <Badge tone={config.tone}>{config.label}</Badge>;
  };

  // Export functionality
  const handleExport = () => {
    const data = activeTab === 'disputes' ? filteredDisputes :
                 activeTab === 'overrides' ? filteredOverrides : filteredLogs;
    
    const csv = [
      ['Type', 'Lot ID', 'Date', 'Status', 'Details'].join(','),
      ...data.map((item: any) => [
        activeTab,
        item.centralLotId || item.lotNumber || item.lotId || '-',
        new Date(item.timestamp || item.createdAt).toLocaleString(),
        item.status || item.action || '-',
        (item.reason || item.details || item.description || '-').replace(/,/g, ';')
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `onionsure-audit-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageTransition className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-fresh">
            Quality & Accountability
          </div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink md:text-2xl">
            <ShieldAlert size={22} className="text-forest" /> Audit & Disputes
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            Trace every inspection decision, human override, farmer challenge and reassessment across procurement centers.
          </p>
        </div>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm">
          <Download size={16} /> Export Audit Report
        </button>
      </div>

      {/* KPI Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer border-l-4 border-l-amber-500 transition hover:shadow-lg"
          onClick={() => handleKPIClick('open')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted">
                Open Disputes
              </div>
              <div className="mt-1 text-3xl font-extrabold text-amber-600">
                {kpis.openDisputes}
              </div>
            </div>
            <AlertTriangle size={32} className="text-amber-600/30" />
          </div>
        </Card>

        <Card 
          className="cursor-pointer border-l-4 border-l-blue-500 transition hover:shadow-lg"
          onClick={() => handleKPIClick('review')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted">
                Pending Reviews
              </div>
              <div className="mt-1 text-3xl font-extrabold text-blue-600">
                {kpis.pendingReviews}
              </div>
            </div>
            <Clock size={32} className="text-blue-600/30" />
          </div>
        </Card>

        <Card 
          className="cursor-pointer border-l-4 border-l-purple-500 transition hover:shadow-lg"
          onClick={() => { setActiveTab('overrides'); }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted">
                Manual Overrides
              </div>
              <div className="mt-1 text-3xl font-extrabold text-purple-600">
                {kpis.manualOverrides}
              </div>
            </div>
            <History size={32} className="text-purple-600/30" />
          </div>
        </Card>

        <Card className="border-l-4 border-l-forest">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted">
                Reassessments
              </div>
              <div className="mt-1 text-3xl font-extrabold text-forest">
                {kpis.reassessments}
              </div>
            </div>
            <RotateCcw size={32} className="text-forest/30" />
          </div>
        </Card>
      </div>

      {msg && (
        <div className="rounded-xl bg-mint px-4 py-3 text-sm font-semibold text-forest flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="text-forest hover:text-darkgreen">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search by Central Lot ID (e.g., ON-2026-00421)"
                value={searchLotId}
                onChange={(e) => setSearchLotId(e.target.value)}
                className="input w-full pl-10 text-sm"
              />
            </div>
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-ghost text-sm flex items-center gap-2"
          >
            <Filter size={16} /> Filters
          </button>

          {(searchLotId || filterStatus !== 'all') && (
            <button
              onClick={() => { setSearchLotId(''); setFilterStatus('all'); }}
              className="btn-ghost text-sm flex items-center gap-2 text-reject"
            >
              <X size={16} /> Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-3 pt-3 border-t border-border grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-ink block mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input w-full text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="reinspection">Reinspection</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        )}
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('disputes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition relative ${
            activeTab === 'disputes'
              ? 'text-forest'
              : 'text-muted hover:text-ink'
          }`}
        >
          <ShieldAlert size={16} /> Farmer Disputes ({filteredDisputes.length})
          {activeTab === 'disputes' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-forest" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('overrides')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition relative ${
            activeTab === 'overrides'
              ? 'text-forest'
              : 'text-muted hover:text-ink'
          }`}
        >
          <History size={16} /> Human Overrides ({filteredOverrides.length})
          {activeTab === 'overrides' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-forest" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition relative ${
            activeTab === 'logs'
              ? 'text-forest'
              : 'text-muted hover:text-ink'
          }`}
        >
          <Clock size={16} /> System Event Trail ({filteredLogs.length})
          {activeTab === 'logs' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-forest" />
          )}
        </button>
      </div>

      {loading ? (
        <div className="grid h-48 place-items-center">
          <Spinner label="Loading records…" />
        </div>
      ) : (
        <>
          {/* DISPUTES TAB */}
          {activeTab === 'disputes' && (
            <div className="space-y-3">
              {filteredDisputes.length === 0 ? (
                <EmptyState
                  title={searchLotId ? 'No disputes found' : 'No open farmer disputes'}
                  hint={searchLotId ? 'Try a different search term' : 'All submitted lots are currently uncontested.'}
                />
              ) : (
                filteredDisputes.map((d) => (
                  <Card key={d.id} className="p-4 hover:shadow-md transition">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-forest">
                            {d.disputeNumber}
                          </span>
                          {getStatusBadge(d.status)}
                        </div>
                        
                        <div className="grid gap-2 sm:grid-cols-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Package size={14} className="text-muted" />
                            <span className="text-muted">Central Lot:</span>
                            <span className="font-mono font-bold text-ink">
                              {d.centralLotId || d.lotId}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-muted" />
                            <span className="text-muted">Farmer:</span>
                            <span className="font-semibold text-ink">{d.farmerName || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Award size={14} className="text-muted" />
                            <span className="text-muted">Original Grade:</span>
                            <GradeBadge grade={d.grade} />
                            <span className="text-muted">({d.qualityScore || '—'}/100)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-muted" />
                            <span className="text-muted">{new Date(d.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="mt-2 rounded-lg bg-amber-50/50 border border-amber-200/50 p-2 text-xs">
                          <span className="font-bold text-amber-900">Reason:</span>{' '}
                          <span className="text-amber-800">{d.reason}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => openDisputeDetail(d)}
                        className="btn-primary text-xs flex items-center gap-1"
                      >
                        <Eye size={14} /> View Details
                      </button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* OVERRIDES TAB */}
          {activeTab === 'overrides' && (
            <div className="space-y-3">
              {filteredOverrides.length === 0 ? (
                <EmptyState
                  title="No human overrides"
                  hint="Overrides requiring mandatory reasons will be permanently recorded here."
                />
              ) : (
                <Card className="overflow-x-auto p-0">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-bg/50 uppercase text-muted">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Lot ID</th>
                        <th className="p-3">Officer</th>
                        <th className="p-3">AI Result</th>
                        <th className="p-3">Final Result</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3">Center</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredOverrides.map((o) => (
                        <tr key={o.id} className="hover:bg-mint/30">
                          <td className="p-3 text-muted">
                            {new Date(o.timestamp).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="p-3 font-mono font-bold text-forest">
                            {o.centralLotId || o.lotId}
                          </td>
                          <td className="p-3 font-medium text-ink">
                            {o.officerName || o.officerId}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <GradeBadge grade={o.originalResult} />
                              <span className="text-muted text-[10px]">
                                {o.originalScore ? `(${o.originalScore})` : ''}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <GradeBadge grade={o.newResult} />
                              <span className="text-muted text-[10px]">
                                {o.newScore ? `(${o.newScore})` : ''}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 max-w-xs">
                            <div className="font-medium text-ink line-clamp-2">
                              {o.reason}
                            </div>
                          </td>
                          <td className="p-3 text-muted">
                            {o.centerName || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          )}

          {/* SYSTEM EVENT TRAIL */}
          {activeTab === 'logs' && (
            <div className="space-y-2">
              {filteredLogs.length === 0 ? (
                <EmptyState
                  title="No system events"
                  hint="Audit events will appear here as inspections are processed."
                />
              ) : (
                <Card className="p-4">
                  <div className="space-y-3">
                    {filteredLogs.slice(0, 50).map((log, idx) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 pb-3 border-b border-border last:border-0"
                      >
                        <div className="flex flex-col items-center">
                          <div className="rounded-full bg-forest/10 p-2">
                            <FileText size={14} className="text-forest" />
                          </div>
                          {idx < filteredLogs.length - 1 && (
                            <div className="h-full w-px bg-border mt-2" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-mono text-xs font-bold text-forest">
                                {log.action}
                              </div>
                              <div className="text-xs text-muted mt-0.5">
                                {new Date(log.timestamp).toLocaleString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                            {log.lotNumber && (
                              <span className="font-mono text-xs font-semibold text-ink bg-mint/30 px-2 py-0.5 rounded">
                                {log.lotNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-ink mt-1">{log.details}</p>
                          {log.actorRole && (
                            <div className="text-xs text-muted mt-1">
                              Actor: {log.actorRole}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* Dispute Detail Drawer */}
      {drawerOpen && selectedDispute && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/60" onClick={() => setDrawerOpen(false)}>
          <div
            className="w-full max-w-2xl bg-white shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-border p-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-ink">Farmer Dispute Details</h2>
                <p className="text-xs text-muted mt-0.5">
                  {selectedDispute.disputeNumber} • {selectedDispute.centralLotId}
                </p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-bg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-muted">Status:</span>
                {getStatusBadge(selectedDispute.status)}
              </div>

              {/* Lot Info */}
              <Card className="bg-mint/10">
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <div className="text-xs font-bold uppercase text-muted">Central Lot ID</div>
                    <div className="font-mono font-bold text-forest mt-1">
                      {selectedDispute.centralLotId}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-muted">Farmer</div>
                    <div className="font-semibold text-ink mt-1">
                      {selectedDispute.farmerName || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-muted">Original Grade</div>
                    <div className="mt-1">
                      <GradeBadge grade={selectedDispute.grade} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-muted">Quality Score</div>
                    <div className="font-bold text-ink mt-1">
                      {selectedDispute.qualityScore || '—'}/100
                    </div>
                  </div>
                </div>
              </Card>

              {/* Farmer's Reason */}
              <div>
                <h3 className="text-sm font-bold text-ink mb-2">FARMER'S REASON</h3>
                <Card className="bg-amber-50/50 border-amber-200">
                  <div className="text-sm">
                    <div className="font-bold text-amber-900">{selectedDispute.reason}</div>
                    {selectedDispute.description && (
                      <p className="mt-2 text-amber-800">{selectedDispute.description}</p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Timeline */}
              {selectedDispute.timeline && selectedDispute.timeline.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-ink mb-2">TIMELINE</h3>
                  <div className="space-y-2">
                    {selectedDispute.timeline.map((t: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 size={14} className="text-forest mt-0.5" />
                        <div>
                          <div className="font-semibold text-ink">{t.label}</div>
                          <div className="text-muted">{t.note}</div>
                          <div className="text-muted">
                            {new Date(t.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedDispute.status !== 'resolved' && selectedDispute.status !== 'rejected' && !actionType && (
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-bold text-ink mb-3">ACTIONS</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleDisputeAction('accept')}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <CheckCircle2 size={16} /> Accept Dispute
                    </button>
                    <button
                      onClick={() => handleDisputeAction('reassess')}
                      className="btn-primary flex items-center gap-2"
                    >
                      <RotateCcw size={16} /> Start Reassessment
                    </button>
                    <button
                      onClick={() => handleDisputeAction('reject')}
                      className="btn-ghost border border-reject/30 text-reject flex items-center gap-2"
                    >
                      <XCircle size={16} /> Reject Dispute
                    </button>
                  </div>
                </div>
              )}

              {/* Action Form */}
              {actionType && (
                <Card className="border-2 border-forest/20 bg-forest/5">
                  <h3 className="text-sm font-bold text-ink mb-3">
                    {actionType === 'accept' && 'ACCEPT DISPUTE'}
                    {actionType === 'reject' && 'REJECT DISPUTE'}
                    {actionType === 'reassess' && 'START REASSESSMENT'}
                  </h3>

                  {actionType === 'reassess' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-ink block mb-1">
                          Reassessment Grade
                        </label>
                        <select
                          value={reassessGrade}
                          onChange={(e) => setReassessGrade(e.target.value)}
                          className="input w-full"
                        >
                          <option value="GRADE A">GRADE A</option>
                          <option value="URS">URS</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-ink block mb-1">
                          Updated Score (0-100)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={reassessScore}
                          onChange={(e) => setReassessScore(Number(e.target.value))}
                          className="input w-full"
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-3">
                    <label className="text-xs font-semibold text-ink block mb-1">
                      {actionType === 'reject' ? 'Rejection Reason (Required)' : 'Reason'}
                      {actionType === 'accept' && ' (Required)'}
                    </label>
                    <textarea
                      rows={3}
                      placeholder={
                        actionType === 'reject'
                          ? 'Explain why this dispute is being rejected...'
                          : actionType === 'accept'
                          ? 'Explain why this dispute is being accepted...'
                          : 'Technical reinspection findings...'
                      }
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      className="input w-full"
                    />
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => setActionType(null)}
                      className="btn-ghost"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitAction}
                      disabled={submitting}
                      className="btn-primary"
                    >
                      {submitting ? 'Processing...' : 'Confirm'}
                    </button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
