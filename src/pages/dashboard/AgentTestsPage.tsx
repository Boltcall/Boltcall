import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageSkeleton } from '../../components/ui/loading-skeleton';
import {
  CheckCircle,
  XCircle,
  Play,
  Loader2,
  AlertCircle,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Agent {
  id: string;
  name: string;
  retell_agent_id: string;
  agent_type?: string;
}

interface TestScenarioResult {
  scenarioId: string;
  scenarioName: string;
  chatId: string;
  conversation: Array<{ role: string; content: string }>;
  analysis: any;
  successCriteria: string;
}

interface TestRunResult {
  success: boolean;
  agentId: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    unknown: number;
  };
  results: TestScenarioResult[];
}

interface TestRunRecord {
  id: string;
  agent_id: string;
  test_type: string;
  scenarios_total: number;
  scenarios_passed: number;
  scenarios_failed: number;
  results: any;
  elapsed_ms: number;
  status: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

import { FUNCTIONS_BASE } from '../../lib/api';
import { authedFetch } from '../../lib/authedFetch';

async function runAgentTests(agentId: string): Promise<TestRunResult> {
  const res = await authedFetch(`${FUNCTIONS_BASE}/agent-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'run-tests', agentId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Test failed' }));
    throw new Error(err.error || 'Test failed');
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AGENT_TYPE_LABELS: Record<string, string> = {
  ai_receptionist: 'AI Receptionist',
  follow_up: 'Follow-Up Agent',
  inbound: 'Inbound Receptionist',
  outbound_speed_to_lead: 'Speed to Lead',
  outbound_reactivation: 'Reactivation',
  outbound_reminder: 'Appointment Reminder',
  outbound_review: 'Review Request',
  outbound: 'Outbound Agent',
};

function formatAgentType(type: string): string {
  return AGENT_TYPE_LABELS[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getPassRateColor(passed: number, total: number): string {
  if (total === 0) return 'text-gray-500';
  const rate = (passed / total) * 100;
  if (rate >= 80) return 'text-green-600';
  if (rate >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const AgentTestsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [testRunRecords, setTestRunRecords] = useState<TestRunRecord[]>([]);

  // Test running state
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestRunResult | null>(null);
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Load data
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [agentRows, testRecords] = await Promise.all([
        supabase
          .from('agents')
          .select('id, name, retell_agent_id, agent_type')
          .eq('user_id', user.id)
          .not('retell_agent_id', 'is', null)
          .then(({ data }) => data || []),
        supabase
          .from('agent_test_runs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
          .then(({ data }) => data || []),
      ]);

      setAgents(agentRows);
      setTestRunRecords(testRecords);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -----------------------------------------------------------------------
  // Run test
  // -----------------------------------------------------------------------

  const handleRunTest = async (agent: Agent) => {
    if (runningAgent) return;
    setRunningAgent(agent.id);
    setTestResult(null);
    setExpandedScenario(null);

    try {
      const result = await runAgentTests(agent.retell_agent_id);
      setTestResult(result);

      // Store in Supabase
      if (user) {
        await supabase.from('agent_test_runs').insert({
          agent_id: agent.retell_agent_id,
          user_id: user.id,
          test_type: 'manual',
          scenarios_total: result.summary.total,
          scenarios_passed: result.summary.passed,
          scenarios_failed: result.summary.failed,
          scenarios_unknown: result.summary.unknown,
          results: result.results,
          trigger_source: 'dashboard',
          status: 'completed',
        });
      }

      {
        const { passed, failed, total, unknown } = result.summary;
        const allPassed = passed === total && failed === 0 && unknown === 0;
        showToast({
          message: allPassed
            ? `All ${total} scenarios passed!`
            : `Test run complete — ${passed} passed, ${failed} failed, ${unknown} inconclusive`,
          variant: allPassed ? 'success' : failed > 0 ? 'warning' : 'default',
        });
      }

      fetchData();
    } catch (err: any) {
      showToast({ message: err.message || 'Test failed', variant: 'error' });
    } finally {
      setRunningAgent(null);
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {loading ? (
        <PageSkeleton />
      ) : agents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No agents to test</p>
          <p className="text-gray-400 text-sm mt-1">Create a voice agent first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {agents.map((agent) => {
            const isRunning = runningAgent === agent.id;
            const agentHistory = testRunRecords.filter(r => r.agent_id === agent.retell_agent_id);
            const lastTest = agentHistory[0];

            return (
              <div key={agent.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Agent Header */}
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-blue-50 rounded-lg">
                      <Shield className="w-5 h-5 text-brand-blue" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                      <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500">
                        {agent.agent_type && <span>{formatAgentType(agent.agent_type)}</span>}
                        {lastTest && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span>Last test: {timeAgo(lastTest.created_at)}</span>
                            <span className={`font-medium ${getPassRateColor(lastTest.scenarios_passed, lastTest.scenarios_total)}`}>
                              {lastTest.scenarios_passed}/{lastTest.scenarios_total} passed
                            </span>
                          </>
                        )}
                        {!lastTest && <span>No tests run yet</span>}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRunTest(agent)}
                    disabled={!!runningAgent}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      runningAgent
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-brand-blue text-white hover:bg-blue-700'
                    }`}
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Testing 12 scenarios...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Run Tests
                      </>
                    )}
                  </button>
                </div>

                {/* Live progress */}
                {isRunning && !testResult && (
                  <div className="px-5 pb-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">Running 12 stress-test scenarios...</p>
                          <p className="text-xs text-blue-600 mt-0.5">
                            Testing price extraction, prompt injection, social engineering, emotional escalation, and more
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Test Results */}
                {testResult && testResult.agentId === agent.retell_agent_id && (
                  <div className="border-t">
                    {/* Summary */}
                    <div className="px-5 py-4 bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`text-2xl font-bold ${getPassRateColor(testResult.summary.passed, testResult.summary.total)}`}>
                          {testResult.summary.passed}/{testResult.summary.total}
                        </div>
                        <div className="text-sm text-gray-600">scenarios passed</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {testResult.summary.failed > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3" />
                            {testResult.summary.failed} failed
                          </span>
                        )}
                        {testResult.summary.passed === testResult.summary.total && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3" />
                            All passed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Scenario list */}
                    <div className="divide-y">
                      {testResult.results.map((scenario) => {
                        const passed = scenario.analysis?.call_successful === true;
                        const failed = scenario.analysis?.call_successful === false;
                        const hasTranscript = scenario.conversation.length > 0;
                        // BUG-U7: three distinct states — no data (gray), inconclusive (yellow), failed (red), passed (green)
                        const isExpanded = expandedScenario === scenario.scenarioId;

                        return (
                          <div key={scenario.scenarioId}>
                            <button
                              onClick={() => setExpandedScenario(isExpanded ? null : scenario.scenarioId)}
                              className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {passed ? (
                                  <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : failed ? (
                                  <XCircle className="w-5 h-5 text-red-500" />
                                ) : !hasTranscript ? (
                                  // BUG-A5: scenario never ran — grey, not yellow
                                  <AlertCircle className="w-5 h-5 text-gray-400" />
                                ) : (
                                  // Ran but no automated verdict available
                                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                                )}
                                <span className="text-sm font-medium text-gray-900">{scenario.scenarioName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {scenario.analysis?.user_sentiment && (
                                  <span className="text-xs text-gray-500">
                                    Sentiment: {scenario.analysis.user_sentiment}
                                  </span>
                                )}
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                            </button>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-5 pb-4 space-y-3">
                                    {/* BUG-U8: Per-scenario verdict */}
                                    <div className={`flex items-center gap-1.5 text-sm font-medium ${
                                      passed ? 'text-green-700' : failed ? 'text-red-700' : !hasTranscript ? 'text-gray-500' : 'text-yellow-700'
                                    }`}>
                                      {passed ? <CheckCircle className="w-4 h-4" /> : failed ? <XCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                      {passed ? 'Passed' : failed ? 'Failed' : !hasTranscript ? 'Did not run' : 'Inconclusive — no automated verdict available'}
                                    </div>

                                    {/* Success criteria */}
                                    <div className="text-xs text-gray-500">
                                      <strong>Expected:</strong> {scenario.successCriteria}
                                    </div>

                                    {/* Call summary */}
                                    {scenario.analysis?.call_summary && (
                                      <div className={`text-sm p-3 rounded-lg ${passed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                        {scenario.analysis.call_summary}
                                      </div>
                                    )}

                                    {/* BUG-A5: Explicit error when no transcript was captured */}
                                    {!hasTranscript ? (
                                      <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-500">
                                        This scenario failed to generate a transcript. The agent connection may have timed out or the chat session could not be created. Check server logs for details.
                                      </div>
                                    ) : (
                                      /* Transcript */
                                      <div className="bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto">
                                        <h5 className="text-xs font-semibold text-gray-400 uppercase mb-2">Transcript</h5>
                                        <div className="space-y-2">
                                          {scenario.conversation.map((msg, i) => (
                                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                              <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                                                msg.role === 'user'
                                                  ? 'bg-blue-600 text-white'
                                                  : msg.role === 'agent'
                                                  ? 'bg-white text-gray-900 border'
                                                  : 'bg-red-100 text-red-700'
                                              }`}>
                                                <p className="text-xs font-medium opacity-70 mb-0.5">
                                                  {msg.role === 'user' ? 'Caller' : msg.role === 'agent' ? 'AI Agent' : 'System'}
                                                </p>
                                                {msg.content}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default AgentTestsPage;
