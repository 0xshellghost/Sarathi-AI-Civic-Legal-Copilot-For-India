import { useState, useRef, useCallback } from "react";

export type VoiceState = "idle" | "recording" | "transcribing" | "error";

interface UseVoiceRecorderProps {
  onTranscriptionSuccess: (text: string) => void;
  targetLanguageCode?: string;
}

export function useVoiceRecorder({
  onTranscriptionSuccess,
  targetLanguageCode = "en",
}: UseVoiceRecorderProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cleanupStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);

  /**
   * Browser-native Web Speech API fallback
   */
  const startBrowserSpeechRecognitionFallback = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceState("error");
      setErrorMessage("Unable to transcribe the audio right now. Please try again or type your message.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      // Set language locale
      const code = targetLanguageCode.toLowerCase();
      if (code.startsWith("hi")) recognition.lang = "hi-IN";
      else if (code.startsWith("ta")) recognition.lang = "ta-IN";
      else if (code.startsWith("bn")) recognition.lang = "bn-IN";
      else if (code.startsWith("te")) recognition.lang = "te-IN";
      else if (code.startsWith("mr")) recognition.lang = "mr-IN";
      else if (code.startsWith("gu")) recognition.lang = "gu-IN";
      else if (code.startsWith("kn")) recognition.lang = "kn-IN";
      else recognition.lang = "en-IN";

      recognition.onstart = () => {
        setVoiceState("recording");
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          onTranscriptionSuccess(transcript);
        }
        setVoiceState("idle");
      };

      recognition.onerror = (event: any) => {
        console.warn("[VOICE] Browser fallback speech recognition error:", event.error);
        setVoiceState("idle");
        if (event.error === "not-allowed") {
          setErrorMessage("Microphone permission is required for voice input.");
        }
      };

      recognition.onend = () => {
        setVoiceState("idle");
      };

      recognition.start();
    } catch (fallbackErr) {
      console.warn("[VOICE] Fallback start error:", fallbackErr);
      setVoiceState("error");
      setErrorMessage("Unable to record audio. Please try again.");
    }
  }, [targetLanguageCode, onTranscriptionSuccess]);

  /**
   * Sends recorded audio blob to Groq Whisper endpoint
   */
  const transcribeWithGroq = useCallback(
    async (blob: Blob, mimeType: string) => {
      setVoiceState("transcribing");
      setErrorMessage(null);

      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const base64Data = (reader.result as string).split(",")[1];
            if (base64Data) resolve(base64Data);
            else reject(new Error("Failed to encode audio to base64"));
          };
          reader.onerror = () => reject(reader.error);
        });

        reader.readAsDataURL(blob);
        const audioBase64 = await base64Promise;

        const response = await fetch("/api/voice/transcribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            audioBase64,
            mimeType,
            targetLanguage: targetLanguageCode,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success && data.text) {
          console.log("[VOICE] Groq transcription received:", data.text.slice(0, 60));
          onTranscriptionSuccess(data.text);
          setVoiceState("idle");
        } else {
          console.warn("[VOICE] Groq transcribe failed, falling back:", data.error);
          setErrorMessage(
            data.error || "Unable to transcribe the audio right now. Please try again or type your message."
          );
          setVoiceState("error");
        }
      } catch (err: any) {
        console.error("[VOICE] Transcription request error:", err);
        setErrorMessage("Unable to transcribe the audio right now. Please try again or type your message.");
        setVoiceState("error");
      }
    },
    [targetLanguageCode, onTranscriptionSuccess]
  );

  const startRecording = useCallback(async () => {
    setErrorMessage(null);

    // Check if the backend has Groq configured. If not, use native fallback directly.
    try {
      const statusRes = await fetch("/api/voice/status");
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (!statusData.configured) {
          console.warn("[VOICE] Groq Whisper is not configured on server. Falling back to native browser speech recognition.");
          startBrowserSpeechRecognitionFallback();
          return;
        }
      }
    } catch (e) {
      console.warn("[VOICE] Could not verify voice status, proceeding with default behavior.", e);
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Fallback directly to Web Speech API
      startBrowserSpeechRecognitionFallback();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // Determine best supported container format
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        mimeType = "audio/ogg";
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        cleanupStream();

        if (audioBlob.size > 200) {
          transcribeWithGroq(audioBlob, mimeType);
        } else {
          setVoiceState("idle");
        }
      };

      recorder.start(250); // collect 250ms chunks
      setVoiceState("recording");
      setRecordingSeconds(0);

      // Start elapsed timer
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn("[VOICE] MediaDevices getUserMedia error:", err);
      cleanupStream();

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMessage("Microphone permission is required for voice input.");
        setVoiceState("error");
      } else {
        // Attempt browser SpeechRecognition fallback
        startBrowserSpeechRecognitionFallback();
      }
    }
  }, [cleanupStream, transcribeWithGroq, startBrowserSpeechRecognitionFallback]);

  /**
   * Stop recording and initiate Groq Whisper transcription
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      cleanupStream();
      setVoiceState("idle");
    }
  }, [cleanupStream]);

  /**
   * Cancel and discard recording
   */
  const cancelRecording = useCallback(() => {
    cleanupStream();
    setVoiceState("idle");
    setErrorMessage(null);
  }, [cleanupStream]);

  return {
    voiceState,
    errorMessage,
    recordingSeconds,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError: () => setErrorMessage(null),
  };
}
