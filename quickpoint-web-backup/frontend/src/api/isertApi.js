import axios from 'axios'

const api = axios.create({
    baseURL: '/api',
    timeout: 180000,  // 3 min – Whisper + models can be slow on CPU
})

// ── Module 0: Audio Enhancement ──────────────────────────────────────────────
export const enhanceAudio = (formData, onUploadProgress) =>
    api.post('/enhance-audio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'arraybuffer',   // binary audio file response
        onUploadProgress,
    })

export const getEnhancementStatus = () =>
    api.get('/enhance-audio/status')

// ── Module 1: Transcription ──────────────────────────────────────────────────
export const transcribeAudio = (formData, onUploadProgress) =>
    api.post('/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
    })

// ── Module 2: Intelligence  ──────────────────────────────────────────────────
export const summarizeTranscript = (transcript, sessionName = 'Untitled') =>
    api.post('/summarize', { transcript, session_name: sessionName })

export const saveIntelligence = (payloadOrTranscript, sessionName = 'Untitled', extraParams = {}) => {
    if (typeof payloadOrTranscript === 'object') {
        return api.post('/intelligence/save', payloadOrTranscript)
    }
    return api.post('/intelligence/save', {
        transcript: payloadOrTranscript,
        session_name: sessionName,
        ...extraParams
    })
}

// ── Module 3: Analyzer ───────────────────────────────────────────────────────
export const analyzeAudio = (formData, onUploadProgress) =>
    api.post('/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
    })

export const analyzeText = (text, durationSec = 60) =>
    api.post(`/analyze/text?text=${encodeURIComponent(text)}&duration_sec=${durationSec}`)

// ── Module 4: Dashboard ──────────────────────────────────────────────────────
export const getSessions = (skip = 0, limit = 50) =>
    api.get(`/dashboard/sessions?skip=${skip}&limit=${limit}`)

export const getSession = (id) =>
    api.get(`/dashboard/sessions/${id}`)

export const getStats = () =>
    api.get('/dashboard/stats')

export const deleteSession = (id) =>
    api.delete(`/dashboard/sessions/${id}`)

export default api
