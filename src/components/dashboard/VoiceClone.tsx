import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Upload, Trash2, Mic, Play, Pause, AlertCircle, Square, RotateCcw, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';
import { Input } from '../ui/input';
import Card from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { authedFetch } from '../../lib/authedFetch';

interface ClonedVoice {
  id: string;
  name: string;
  description: string | null;
  gender: string | null;
  accent: string | null;
  eleven_voice_id: string;
  retell_voice_id: string;
  preview_audio_url: string | null;
  status: 'ready' | 'processing' | 'failed';
  created_at: string;
}

const FUNC_BASE = import.meta.env.DEV
  ? 'http://localhost:8888/.netlify/functions'
  : '/.netlify/functions';

const ACCEPTED_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/mp4'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_RECORD_SECONDS = 120;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

type InputMode = 'upload' | 'record';

const VoiceClone: React.FC = () => {
  const { user } = useAuth();

  const [voices, setVoices] = useState<ClonedVoice[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'neutral' | ''>('');
  const [accent, setAccent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedMime, setRecordedMime] = useState('audio/webm');
  const [recordPlayback, setRecordPlayback] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordAudioRef = useRef<HTMLAudioElement>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await authedFetch(`${FUNC_BASE}/elevenlabs-clone-voice?userId=${encodeURIComponent(user.id)}`);
      if (res.ok) setVoices((await res.json()).voices || []);
    } catch (err) {
      console.error('Failed to load cloned voices', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleFile = (f: File | null) => {
    setError(null);
    if (!f) { setFile(null); return; }
    if (!ACCEPTED_TYPES.includes(f.type)) { setError('Unsupported file type. Use MP3, WAV, M4A, OGG, or WebM.'); return; }
    if (f.size > MAX_FILE_SIZE) { setError('File too large. Maximum is 10 MB.'); return; }
    setFile(f);
  };

  const switchMode = (mode: InputMode) => {
    setError(null);
    setFile(null);
    setRecordedBlob(null);
    setRecordingSeconds(0);
    setRecordPlayback(false);
    if (isRecording) { mediaRecorderRef.current?.stop(); stopStream(); setIsRecording(false); }
    setInputMode(mode);
  };

  const startRecording = async () => {
    setError(null);
    setRecordedBlob(null);
    setRecordingSeconds(0);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      setRecordedMime(mimeType.split(';')[0]);
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        setRecordedBlob(new Blob(chunksRef.current, { type: mimeType }));
        stopStream();
        setIsRecording(false);
      };
      recorder.start(250);
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev + 1 >= MAX_RECORD_SECONDS) { recorder.stop(); return MAX_RECORD_SECONDS; }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setError('Microphone access denied. Allow microphone access in your browser and try again.');
    }
  };

  const playRecording = () => {
    if (!recordedBlob || !recordAudioRef.current) return;
    if (recordPlayback) { recordAudioRef.current.pause(); setRecordPlayback(false); return; }
    recordAudioRef.current.src = URL.createObjectURL(recordedBlob);
    recordAudioRef.current.play().then(() => setRecordPlayback(true)).catch(() => setRecordPlayback(false));
  };

  const getAudioFile = (): File | null => {
    if (inputMode === 'upload') return file;
    if (recordedBlob) {
      const ext = recordedMime.includes('ogg') ? 'ogg' : 'webm';
      return new File([recordedBlob], `recording.${ext}`, { type: recordedMime });
    }
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user?.id) { setError('You must be signed in.'); return; }
    if (!name.trim()) { setError('Give your voice a name.'); return; }
    const audioFile = getAudioFile();
    if (!audioFile) { setError(inputMode === 'upload' ? 'Upload an audio sample.' : 'Record an audio sample first.'); return; }
    if (!consent) { setError('You must confirm you own this voice or have explicit permission to clone it.'); return; }

    setSubmitting(true);
    try {
      const res = await authedFetch(`${FUNC_BASE}/elevenlabs-clone-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: name.trim(),
          description: description.trim() || undefined,
          gender: gender || undefined,
          accent: accent.trim() || undefined,
          audio_base64: await fileToBase64(audioFile),
          mime_type: audioFile.type,
          file_name: audioFile.name,
          consent_confirmed: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || data.details || 'Failed to clone voice'); return; }
      setName(''); setDescription(''); setGender(''); setAccent('');
      setFile(null); setRecordedBlob(null); setRecordingSeconds(0); setConsent(false);
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to clone voice');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!user?.id) return;
    if (!confirm('Delete this cloned voice? Agents using it will fall back to the default voice.')) return;
    const res = await authedFetch(
      `${FUNC_BASE}/elevenlabs-clone-voice?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(user.id)}`,
      { method: 'DELETE' },
    );
    if (res.ok) refresh();
  };

  const togglePreview = (v: ClonedVoice) => {
    if (!v.preview_audio_url) return;
    if (playingId === v.id) { audioRef.current?.pause(); setPlayingId(null); return; }
    if (audioRef.current) {
      audioRef.current.src = v.preview_audio_url;
      audioRef.current.play().then(() => setPlayingId(v.id)).catch(() => setPlayingId(null));
    }
  };

  const recordingProgress = (recordingSeconds / MAX_RECORD_SECONDS) * 100;

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Mic className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Clone My Voice</h2>
        </div>
        <p className="text-sm text-gray-500">
          Create a custom voice from a recording or audio file. Your clone appears in every agent voice picker.
        </p>
      </div>

      {/* Form card */}
      <Card className="rounded-2xl shadow-sm p-6">
        <form onSubmit={submit} className="space-y-5">

          {/* Name + Accent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium">
                Voice name <span className="text-red-500">*</span>
              </label>
              <Input placeholder="e.g. My Voice" value={name} onChange={e => setName(e.target.value)} disabled={submitting} maxLength={120} />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium">
                Accent <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <Input placeholder="e.g. American, British" value={accent} onChange={e => setAccent(e.target.value)} disabled={submitting} maxLength={60} />
            </div>
          </div>

          {/* Gender + Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium">
                Gender <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="flex gap-2">
                {(['female', 'male', 'neutral'] as const).map(g => (
                  <Button key={g} type="button" variant={gender === g ? 'default' : 'outline'} size="sm"
                    onClick={() => setGender(gender === g ? '' : g)} disabled={submitting}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium">
                Description <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <Input placeholder="Short note about this voice" value={description} onChange={e => setDescription(e.target.value)} disabled={submitting} maxLength={200} />
            </div>
          </div>

          {/* Audio sample */}
          <div className="space-y-3">
            <label className="block text-sm font-medium">
              Audio sample <span className="text-red-500">*</span>
            </label>

            {/* Mode toggle — uses design-system border/bg tokens */}
            <div className="inline-flex rounded-lg border-2 border-border overflow-hidden">
              {(['upload', 'record'] as InputMode[]).map((mode, i) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => switchMode(mode)}
                  disabled={submitting}
                  className={[
                    'flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors',
                    i === 0 ? 'border-r-2 border-border' : '',
                    inputMode === mode ? 'bg-main text-mtext' : 'bg-bw text-text hover:bg-black/5',
                  ].join(' ')}
                >
                  {mode === 'upload' ? <Upload className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {mode === 'upload' ? 'Upload file' : 'Record voice'}
                </button>
              ))}
            </div>

            {/* Upload panel */}
            {inputMode === 'upload' && (
              <div className="rounded-xl border-2 border-dashed border-border p-6 flex flex-col items-center gap-3 text-center bg-bw">
                <div className="w-10 h-10 rounded-full border-2 border-border bg-white flex items-center justify-center shadow-shadow">
                  <Upload className="w-5 h-5 text-text" />
                </div>
                <div>
                  <label className="cursor-pointer text-sm font-medium underline underline-offset-2 decoration-border">
                    {file ? 'Replace file' : 'Choose a file'}
                    <input type="file" className="hidden" accept={ACCEPTED_TYPES.join(',')}
                      onChange={e => handleFile(e.target.files?.[0] || null)} disabled={submitting} />
                  </label>
                  {file
                    ? <p className="text-sm text-gray-600 mt-1">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    : <p className="text-xs text-gray-400 mt-1">MP3, WAV, M4A, OGG, or WebM · up to 10 MB</p>
                  }
                </div>
                <p className="text-xs text-gray-400">60–90 s of clean speech gives the best clone quality.</p>
              </div>
            )}

            {/* Record panel */}
            {inputMode === 'record' && (
              <div className="rounded-xl border-2 border-border bg-bw p-5 space-y-4">
                {!recordedBlob ? (
                  !isRecording ? (
                    /* Idle state — centered mic button */
                    <div className="flex flex-col items-center gap-3 py-3">
                      <button
                        type="button"
                        onClick={startRecording}
                        disabled={submitting}
                        className="w-16 h-16 rounded-full border-2 border-border bg-main text-mtext flex items-center justify-center shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all disabled:pointer-events-none disabled:opacity-50"
                        aria-label="Start recording"
                      >
                        <Mic className="w-7 h-7" />
                      </button>
                      <p className="text-sm text-gray-500">Click to start recording</p>
                    </div>
                  ) : (
                    /* Active recording state */
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Button type="button" variant="destructive" size="sm"
                          onClick={() => mediaRecorderRef.current?.stop()}>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          Stop
                        </Button>
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                        </span>
                        <span className="text-sm font-mono tabular-nums">{formatTime(recordingSeconds)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-black/10 overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full transition-all duration-500"
                            style={{ width: `${recordingProgress}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 tabular-nums shrink-0">
                          {formatTime(MAX_RECORD_SECONDS)}
                        </span>
                      </div>
                    </div>
                  )
                ) : (
                  /* Post-recording state */
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Recorded {formatTime(recordingSeconds)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={playRecording}>
                        {recordPlayback ? <><Pause className="w-3.5 h-3.5" />Pause</> : <><Play className="w-3.5 h-3.5" />Preview</>}
                      </Button>
                      <Button type="button" variant="ghost" size="sm"
                        onClick={() => { setRecordedBlob(null); setRecordingSeconds(0); setRecordPlayback(false); }}>
                        <RotateCcw className="w-3.5 h-3.5" />
                        Re-record
                      </Button>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  Record 60–90 s of clean speech. No background noise for best quality.
                </p>
                <audio ref={recordAudioRef} onEnded={() => setRecordPlayback(false)} preload="none" />
              </div>
            )}
          </div>

          {/* Consent */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
              disabled={submitting} className="mt-0.5" />
            <span className="text-sm text-gray-600 leading-snug">
              I confirm this is my own voice, or I have explicit written permission from the speaker to clone it.
              I will not use this clone to impersonate, defraud, or harass anyone.
            </span>
          </label>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <Button type="submit" variant="default" disabled={submitting}>
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" />Cloning…</>
              : <><Mic className="w-4 h-4" />Clone voice</>
            }
          </Button>
        </form>
      </Card>

      {/* Existing clones list */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Your cloned voices</h3>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : voices.length === 0 ? (
          <p className="text-sm text-gray-400">
            No voices cloned yet. Use the form above to create your first.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {voices.map(v => (
              <Card key={v.id} className="rounded-2xl shadow-sm p-4">
                <div className="space-y-3">
                  <div>
                    <div className="font-medium">{v.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {v.accent || 'Custom'} · {v.gender || 'neutral'} · {v.status}
                    </div>
                    {v.description && <div className="text-xs text-gray-400 mt-1">{v.description}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {v.preview_audio_url && (
                      <Button onClick={() => togglePreview(v)} variant={playingId === v.id ? 'secondary' : 'default'} size="sm">
                        {playingId === v.id
                          ? <><Pause className="w-3.5 h-3.5" />Stop</>
                          : <><Play className="w-3.5 h-3.5" />Preview</>
                        }
                      </Button>
                    )}
                    <Button onClick={() => remove(v.id)} variant="outline" size="sm">
                      <Trash2 className="w-3.5 h-3.5" />Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <audio ref={audioRef} onEnded={() => setPlayingId(null)} preload="none" />
    </div>
  );
};

export default VoiceClone;
