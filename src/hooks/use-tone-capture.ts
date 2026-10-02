import { useCallback, useEffect, useRef, useState } from "react";
import {
  analyzeFrames,
  detectPitch,
  spectralFlatness,
  type ToneAnalysis,
  type ToneFrame,
} from "@/lib/tone-analyzer";
import {
  calibrateInputGain,
  CALIBRATION_WINDOW,
  deadTakeMessageFor,
  deadTakeReason,
  gainedVolume,
  initialInputGain,
  isDeadTake,
  isPeak,
  isSpeechFrame,
  RECALIBRATE_EVERY,
  SOFTWARE_GAIN,
  updateNoiseFloor,
} from "@/lib/capture-gain";

export type CaptureState = "idle" | "recording" | "analyzing" | "done";

/**
 * True when the app is embedded in an iframe (e.g. a preview pane).
 * Browsers refuse getUserMedia inside a cross-origin iframe unless the
 * embedding page opts in with allow="microphone" — and they do it as a
 * NotAllowedError with *no permission prompt*, which is indistinguishable
 * from the user having blocked mic access. The UI uses this flag to say
 * so honestly and offer an escape hatch instead of blaming the user's
 * browser settings.
 */
export const isEmbeddedFrame =
  typeof window !== "undefined" && window.self !== window.top;

/** Suffix marking an error that "Open in a new tab" would likely fix. */
export const OPEN_IN_TAB_HINT = "\n[open-in-tab]";

interface UseToneCapture {
  state: CaptureState;
  error: string | null;
  level: number; // 0..1 live loudness
  livePitchHz: number | null;
  elapsedMs: number;
  analysis: ToneAnalysis | null;
  /** Best-effort live speech-to-text of the take (empty when unsupported). */
  transcript: string;
  /** Max raw mic level of the previous take, or null before the first one.
   * Pass it back into start() to pre-calibrate the input gain. */
  lastPeakRawRms: number | null;
  /** Pass the previous take's max raw mic level (capture.lastPeakRawRms)
   * to begin with its calibrated gain — the second take on a quiet mic
   * is heard immediately instead of being another dead take. */
  start: (
    lastPeakRawRms?: number | null,
    deviceId?: string | null,
  ) => Promise<void>;
  stop: () => void;
  reset: () => void;
  /** Label of the input device the last stream came from ("" if unknown). */
  activeDeviceLabel: string;
  /** True while recording and the audio track reports itself muted. */
  micMuted: boolean;
  /** Blob URL for playback of the latest mic take. */
  audioUrl: string | null;
}

const FRAME_INTERVAL_MS = 50;
/**
 * Gain staging, speech gating, and dead-mic thresholds live in
 * src/lib/capture-gain.ts (pure + unit-tested); the hook applies them.
 */

// Minimal structural typing for the Web Speech API (not in lib.dom for all
// browsers, and webkit prefixes the constructor) — no `any` escapes here.
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((
        event: {
          resultIndex: number;
          results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
        },
      ) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Records a microphone take and analyzes tone.
 * Live state (level, pitch) drives the visualizer; stop() produces the full analysis.
 */
export function useToneCapture(): UseToneCapture {
  const [state, setState] = useState<CaptureState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [livePitchHz, setLivePitchHz] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [analysis, setAnalysis] = useState<ToneAnalysis | null>(null);
  const [transcript, setTranscript] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  /** Peak raw mic level of the previous take — the calibration seed for the
   * next start(). State, not a ref, so consumers re-render with the new seed. */
  const [lastPeakRawRms, setLastPeakRawRms] = useState<number | null>(null);
  /** Label of the input device from the last acquired stream. */
  const [activeDeviceLabel, setActiveDeviceLabel] = useState("");
  /** Live muted status of the current audio track (drives the hint). */
  const [micMuted, setMicMuted] = useState(false);
  const micMutedRef = useRef(false);
  /** The audio track of the live stream — muted flag checked per UI tick. */
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const framesRef = useRef<ToneFrame[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const lastFrameAtRef = useRef(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const audioUrlRef = useRef<string | null>(null);
  /** Gained copy of the analyser buffer, reused per frame (no per-frame alloc). */
  const gainedBufRef = useRef<Float32Array | null>(null);
  /** Speech-level frames captured this take — drives dead-mic detection. */
  const speechFramesRef = useRef(0);
  /** Monotonic take token: every await in start() re-checks it, so a take
   * cancelled by unmount or reset can't resurrect from its continuation. */
  const sessionRef = useRef(0);
  /** True from start() entry until stop/reset/unmount — covers the async
   * permission window where state is still "idle" and Start is clickable. */
  const startingRef = useRef(false);
  /** Post-stop analyze timer, so reset/unmount can cancel it. */
  const analyzeTimerRef = useRef<number | null>(null);
  const lastUiAtRef = useRef(0);
  const lastPitchRef = useRef<number | null>(null);
  /** Adaptive input gain (see capture-gain.ts) — raised when loud speech
   * still lands below the speech floor, relaxed on hot input. */
  const inputGainRef = useRef(1);
  /** Loudest raw sample since the last calibration pass, and across the
   * whole take (drives the dead-take verdict). */
  const windowMaxRawRef = useRef(0);
  const maxRawRef = useRef(0);
  const framesSinceCalibrationRef = useRef(0);

  const clearAudioUrl = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setAudioUrl(null);
  }, []);

  const cleanup = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (analyzeTimerRef.current !== null) {
      window.clearTimeout(analyzeTimerRef.current);
      analyzeTimerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        // recording can already be closed by the browser; ignore it
      }
    }
    recorderRef.current = null;
    audioChunksRef.current = [];
    startingRef.current = false;
    trackRef.current = null;
    micMutedRef.current = false;
    setMicMuted(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    gainedBufRef.current = null;
  }, []);

  useEffect(
    () => () => {
      // Invalidate any in-flight start() continuation, then stop tracks. A
      // stream acquired after unmount would otherwise keep the mic hot with
      // nothing left to stop it.
      sessionRef.current += 1;
      cleanup();
      clearAudioUrl();
      // The speech recognizer holds the mic independently of our stream —
      // leaving it running after unmount keeps the browser's mic indicator
      // alive on a page the user already left.
      try {
        recognitionRef.current?.abort();
      } catch {
        // transcript is best-effort
      }
      recognitionRef.current = null;
    },
    [cleanup, clearAudioUrl],
  );

  const stop = useCallback(() => {
    if (rafRef.current === null) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (recorderRef.current && recorderRef.current.state === "recording") {
      try {
        recorderRef.current.stop();
      } catch {
        // best-effort only
      }
    }
    // Record the take's peak before any early return — the next start()
    // uses it to begin pre-calibrated, so a quiet mic's second take is
    // heard immediately instead of failing twice.
    setLastPeakRawRms(maxRawRef.current);

    // Dead-mic check: if the take never contained speech-level frames,
    // the "analysis" would be noise dressed up as scores. Say why, based
    // on what was actually measured — muted, too quiet, faint, or short.
    if (isDeadTake(speechFramesRef.current)) {
      const reason = deadTakeReason(speechFramesRef.current, maxRawRef.current);
      // Enrich the verdict with what the stream reported — pure logic in
      // capture-gain.ts, so the rules stay unit-testable.
      const track = streamRef.current?.getAudioTracks()[0];
      const message = deadTakeMessageFor(
        reason,
        track?.muted ?? false,
        track?.label ?? "",
      );
      // Release the recognizer here too — it holds the mic independently
      // of the stream, and skipping it on this early exit would leave the
      // browser's mic indicator lit after a dead take.
      try {
        recognitionRef.current?.abort();
      } catch {
        // transcript is best-effort
      }
      recognitionRef.current = null;
      cleanup();
      setState("idle");
      setError(message);
      return;
    }

    try {
      recognitionRef.current?.stop();
    } catch {
      // transcript is best-effort
    }
    recognitionRef.current = null;
    const durationMs = performance.now() - startedAtRef.current;
    setState("analyzing");
    setLevel(0);

    // Let the UI paint the analyzing state before the (sync) aggregation.
    // Tracked so reset/unmount cancels it — no setState after unmount, and
    // no stale analysis resurrecting a take the user already cleared.
    analyzeTimerRef.current = window.setTimeout(() => {
      analyzeTimerRef.current = null;
      const result = analyzeFrames(framesRef.current, durationMs);
      setAnalysis(result);
      setState("done");
      cleanup();
    }, 60);
  }, [cleanup]);

  const start = useCallback(
    async (lastPeakRawRms?: number | null, deviceId?: string | null) => {
      // Double-start guard: rAF covers the recording phase; startingRef covers
      // the async window before it (permission prompt, getUserMedia) where
      // state is still "idle" and the Start button is still clickable — a
      // second call there would orphan the first stream.
      if (rafRef.current !== null || startingRef.current) return;
      const md = navigator.mediaDevices as MediaDevices | undefined;
      if (!md?.getUserMedia) {
        setError(
          "Microphone capture isn't available here — open the app over HTTPS (or localhost) in a modern browser and try again.",
        );
        return;
      }
      startingRef.current = true;
      const session = ++sessionRef.current;
      setError(null);
      setAnalysis(null);
      framesRef.current = [];
      speechFramesRef.current = 0;
      clearAudioUrl();
      setLevel(0);
      setLivePitchHz(null);
      setElapsedMs(0);
      setTranscript("");
      transcriptRef.current = "";
      inputGainRef.current = 1;
      windowMaxRawRef.current = 0;
      maxRawRef.current = 0;
      framesSinceCalibrationRef.current = 0;
      // Deterministic first frame: no stale pitch from the previous take
      // flashing on the meter before speech arrives.
      lastPitchRef.current = null;
      lastUiAtRef.current = 0;

      try {
        // Create the AudioContext synchronously, inside the click gesture.
        // Creating it after the `await getUserMedia` below breaks user
        // activation — Chrome then returns a *suspended* context and the
        // analyser reads pure silence for the whole take. Constructor failure
        // (ancient browsers) must land in the catch below, or startingRef
        // would stay true and brick the Start button.
        const AudioCtx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new AudioCtx();
        ctxRef.current = ctx;
        // Honor the user's device pick from the MicPicker (exact — so the
        // browser can't silently substitute another input). A saved device
        // that has since been unplugged falls back to the default instead of
        // failing the whole take.
        const audioConstraints: MediaTrackConstraints = {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        };
        if (deviceId) audioConstraints.deviceId = { exact: deviceId };
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
          });
        } catch (e) {
          if (
            deviceId &&
            e instanceof DOMException &&
            e.name === "OverconstrainedError"
          ) {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
              },
            });
          } else {
            throw e;
          }
        }
        // The user may have unmounted or hit reset while the permission
        // prompt was up — bail before touching refs so this stream can't leak
        // a live mic that nothing will ever stop.
        if (session !== sessionRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        // Remember which input actually delivered this stream — the dead-take
        // verdict names it, and a virtual-cable device showing up here is the
        // #1 "we heard nothing" culprit after permissions.
        const track = stream.getAudioTracks()[0] ?? null;
        trackRef.current = track;
        setActiveDeviceLabel(track?.label ?? "");
        micMutedRef.current = track?.muted ?? false;
        setMicMuted(micMutedRef.current);

        // Some browsers still park the context in "suspended" (Safari, or a
        // permission prompt that ate the gesture) — nudge it to running.
        if (ctx.state !== "running") {
          await ctx.resume().catch(() => {});
          if (session !== sessionRef.current) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
        }

        const source = ctx.createMediaStreamSource(stream);
        // High-pass at 70 Hz: kills desk rumble, handling noise, and HVAC
        // hum before any measurement — plosives and pitch are unaffected,
        // and the pitch detector stops chasing sub-voicing noise.
        const highpass = ctx.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = 70;
        highpass.Q.value = 0.7;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.6;
        source.connect(highpass);
        highpass.connect(analyser);

        const timeBuf = new Float32Array(analyser.fftSize);
        const gainedBuf = new Float32Array(analyser.fftSize);
        const freqBuf = new Uint8Array(analyser.frequencyBinCount);
        gainedBufRef.current = gainedBuf;
        // Room noise floor (raw RMS domain), tracked by the adaptive gate.
        let noiseFloor = 0.002;
        // Fresh take starts from the caller-supplied calibrated gain, not a
        // leftover value — and resets the calibration accumulators.
        inputGainRef.current = initialInputGain(lastPeakRawRms ?? null);
        windowMaxRawRef.current = 0;
        maxRawRef.current = 0;
        framesSinceCalibrationRef.current = 0;
        startedAtRef.current = performance.now();
        lastFrameAtRef.current = 0;
        setState("recording");

        if ("MediaRecorder" in window) {
          const mimeType = [
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/mp4",
          ].find((type) => MediaRecorder.isTypeSupported(type));
          const recorder = mimeType
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream);
          recorderRef.current = recorder;
          audioChunksRef.current = [];
          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunksRef.current.push(event.data);
          };
          recorder.onstop = () => {
            const blob = new Blob(audioChunksRef.current, {
              type: recorder.mimeType || "audio/webm",
            });
            if (blob.size > 0) {
              const nextUrl = URL.createObjectURL(blob);
              if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
              audioUrlRef.current = nextUrl;
              setAudioUrl(nextUrl);
            }
          };
          recorder.start(250);
        }

        // Defensive: release any recognizer a previous take left behind —
        // two live recognizers split the mic input and can keep the browser's
        // mic indicator lit between takes.
        try {
          recognitionRef.current?.abort();
        } catch {
          // transcript is best-effort
        }
        recognitionRef.current = null;

        // Best-effort transcript for the coach — silence on any failure.
        const Recognition = getSpeechRecognition();
        if (Recognition) {
          try {
            const recognition = new Recognition();
            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.lang = navigator.language || "en-US";
            recognition.onresult = (event) => {
              let next = "";
              for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) next += result[0].transcript + " ";
              }
              if (next) {
                transcriptRef.current = (transcriptRef.current + " " + next).trim();
                setTranscript(transcriptRef.current);
              }
            };
            recognition.onerror = () => {};
            recognition.onend = () => {};
            recognition.start();
            recognitionRef.current = recognition;
          } catch {
            recognitionRef.current = null;
          }
        }

        const loop = () => {
          const now = performance.now();
          // A device that ends mid-take (Bluetooth out of range, unplug) must
          // stop the loop — otherwise we record empty frames forever.
          if (trackRef.current?.readyState === "ended") {
            stop();
            return;
          }
          analyser.getFloatTimeDomainData(timeBuf);

          // RMS level for the live meter (gained so quiet mics feel alive)
          let sum = 0;
          for (let i = 0; i < timeBuf.length; i++) sum += timeBuf[i] * timeBuf[i];
          const rms = Math.sqrt(sum / timeBuf.length);
          maxRawRef.current = Math.max(maxRawRef.current, rms);
          windowMaxRawRef.current = Math.max(windowMaxRawRef.current, rms);
          const gainedRms = gainedVolume(rms, inputGainRef.current);

          // Frame capture at fixed cadence for analysis
          if (now - lastFrameAtRef.current >= FRAME_INTERVAL_MS) {
            lastFrameAtRef.current = now;
            let pitch: number | null = null;
            let flatness: number | undefined;
            // Dual voicing gate: the calibrated speech floor (normal case)
            // OR well above the room's tracked noise floor (quiet mics,
            // loud rooms). Adaptive floor updates on every frame.
            if (isSpeechFrame(rms, gainedRms, noiseFloor)) {
              // Loud peaks mean the input is hot — relax before clamping
              // squeezes every loud syllable to the same ceiling.
              if (isPeak(rms)) {
                inputGainRef.current = calibrateInputGain(inputGainRef.current, rms);
              }
              speechFramesRef.current += 1;
              for (let i = 0; i < timeBuf.length; i++) {
                gainedBuf[i] = timeBuf[i] * SOFTWARE_GAIN;
              }
              pitch = detectPitch(gainedBuf, ctx.sampleRate);
              // Spectral flatness of the frequency data — near 1 means this
              // frame is broadband noise, not a voice. The analyzer uses it
              // to keep hiss from scoring as clarity.
              analyser.getByteFrequencyData(freqBuf);
              flatness = spectralFlatness(freqBuf);
            }
            noiseFloor = updateNoiseFloor(noiseFloor, rms);
            lastPitchRef.current = pitch;
            framesRef.current.push({
              pitchHz: pitch,
              volume: gainedRms,
              timestamp: now,
              flatness,
            });

            // Mid-take calibration: if a full window has passed and their
            // loudest moment still lands below the floor, raise the gain —
            // a quiet speaker gets heard partway through the same take.
            framesSinceCalibrationRef.current += 1;
            if (
              framesSinceCalibrationRef.current >= CALIBRATION_WINDOW &&
              framesRef.current.length % RECALIBRATE_EVERY === 0 &&
              !isPeak(windowMaxRawRef.current)
            ) {
              inputGainRef.current = calibrateInputGain(
                inputGainRef.current,
                windowMaxRawRef.current,
              );
              windowMaxRawRef.current = 0;
              framesSinceCalibrationRef.current = 0;
            }
          }

          // React updates at ~30fps instead of every animation frame: the
          // meter feels identical, but recording no longer forces a re-render
          // per animation frame (render pressure can starve the capture loop
          // and jank the take).
          if (now - lastUiAtRef.current >= 33) {
            lastUiAtRef.current = now;
            // Surface a track that reports itself muted — the OS privacy layer
            // or another app holding the mic produces exactly this silent but
            // "live" stream, and the meter alone can't say which.
            const muted = trackRef.current?.muted ?? false;
            if (muted !== micMutedRef.current) {
              micMutedRef.current = muted;
              setMicMuted(muted);
            }
            setLevel(Math.min(gainedRms * 4, 1));
            setLivePitchHz(lastPitchRef.current);
            setElapsedMs(now - startedAtRef.current);
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      } catch (e) {
        cleanup();
        // Only touch state if this take is still the live one.
        if (session === sessionRef.current) setState("idle");
        const name = e instanceof Error ? e.name : "";
        setError(
          name === "NotAllowedError" || name === "SecurityError"
            ? isEmbeddedFrame
              ? "The preview frame is blocking microphone access — no permission prompt can even appear here. Click 'Open in a new tab' below and grant access there. It usually fixes this instant" +
                  OPEN_IN_TAB_HINT
              : "Microphone access was blocked. Click the lock/camera icon in your browser's address bar, allow the microphone for this site, and try again."
            : name === "NotFoundError" || name === "DevicesNotFoundError"
              ? "No microphone found. Connect one (or pick the right input in your browser's site settings) and try again."
              : name === "NotReadableError" || name === "TrackStartError"
                ? "Your microphone is busy — close other apps that might be using it and try again."
                : "Could not access your microphone. Check that one is connected and try again.",
        );
      }
    },
    [cleanup, clearAudioUrl, stop],
  );

  const reset = useCallback(() => {
    // Invalidate any in-flight start() (e.g. stuck on a permission prompt)
    // so its continuation can't resurrect the take after a reset.
    sessionRef.current += 1;
    cleanup();
    clearAudioUrl();
    try {
      recognitionRef.current?.abort();
    } catch {
      // transcript is best-effort
    }
    recognitionRef.current = null;
    setState("idle");
    setError(null);
    setAnalysis(null);
    setLevel(0);
    setLivePitchHz(null);
    setElapsedMs(0);
    setTranscript("");
    transcriptRef.current = "";
    setActiveDeviceLabel("");
    framesRef.current = [];
    speechFramesRef.current = 0;
    lastPitchRef.current = null;
    lastUiAtRef.current = 0;
  }, [cleanup, clearAudioUrl]);

  return {
    state,
    error,
    level,
    livePitchHz,
    elapsedMs,
    analysis,
    transcript,
    lastPeakRawRms,
    activeDeviceLabel,
    micMuted,
    audioUrl,
    start,
    stop,
    reset,
  };
}
