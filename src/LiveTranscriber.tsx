// import React, { useState, useRef } from "react";

// interface TranscriptMessage {
//   transcript?: string;
//   confidence?: number;
//   isFinal?: boolean;
//   isTurn?: boolean;
//   error?: string;
//   status?: string;
//   sessionId?: string;
// }

// const LiveTranscriber: React.FC = () => {
//   const [finalTranscript, setFinalTranscript] = useState<string>("");
//   const [partialTranscript, setPartialTranscript] = useState<string>("");
//   const [currentTurnTranscript, setCurrentTurnTranscript] =
//     useState<string>("");
//   const [isRecording, setIsRecording] = useState<boolean>(false);
//   const wsRef = useRef<WebSocket | null>(null);
//   const audioContextRef = useRef<AudioContext | null>(null);
//   const streamRef = useRef<MediaStream | null>(null);
//   const processorRef = useRef<ScriptProcessorNode | null>(null);

//   // Convert Float32Array to 16-bit PCM
//   const float32ToPCM16 = (float32Array: Float32Array): ArrayBuffer => {
//     const buffer = new ArrayBuffer(float32Array.length * 2);
//     const view = new DataView(buffer);
//     let offset = 0;

//     for (let i = 0; i < float32Array.length; i++, offset += 2) {
//       let sample = Math.max(-1, Math.min(1, float32Array[i]));
//       sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
//       view.setInt16(offset, sample, true);
//     }

//     return buffer;
//   };

//   // Resample audio to 16kHz
//   const resampleBuffer = (
//     audioBuffer: AudioBuffer,
//     targetSampleRate: number
//   ): Float32Array => {
//     if (audioBuffer.sampleRate === targetSampleRate) {
//       return audioBuffer.getChannelData(0);
//     }

//     const sampleRateRatio = audioBuffer.sampleRate / targetSampleRate;
//     const newLength = Math.round(audioBuffer.length / sampleRateRatio);
//     const result = new Float32Array(newLength);

//     let offsetResult = 0;
//     let offsetBuffer = 0;

//     while (offsetResult < result.length) {
//       const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
//       let accum = 0;
//       let count = 0;

//       for (
//         let i = offsetBuffer;
//         i < nextOffsetBuffer && i < audioBuffer.length;
//         i++
//       ) {
//         accum += audioBuffer.getChannelData(0)[i];
//         count++;
//       }

//       result[offsetResult] = accum / count;
//       offsetResult++;
//       offsetBuffer = nextOffsetBuffer;
//     }

//     return result;
//   };

//   const startRecording = async (): Promise<void> => {
//     try {
//       // Clear previous transcripts
//       setFinalTranscript("");
//       setPartialTranscript("");
//       setCurrentTurnTranscript("");

//       // Connect to backend WebSocket
//       wsRef.current = new WebSocket("ws://localhost:3000/live-transcription");

//       wsRef.current.onopen = () => {
//         console.log("WebSocket connected");
//       };

//       wsRef.current.onmessage = (event: MessageEvent) => {
//         try {
//           const msg: TranscriptMessage = JSON.parse(event.data);
//           console.log("Received:", msg);

//           if (msg.transcript !== undefined && msg.transcript.trim() !== "") {
//             const transcript = msg.transcript.trim();

//             if (msg.isFinal && msg.isTurn) {
//               // This is a complete turn - add to final transcript
//               console.log("Complete turn received:", transcript);
//               setFinalTranscript((prev) => {
//                 const newFinal = prev + (prev ? " " : "") + transcript;
//                 console.log("Updated final transcript:", newFinal);
//                 return newFinal;
//               });
//               setPartialTranscript(""); // Clear partial
//               setCurrentTurnTranscript("");
//             } else if (msg.isFinal) {
//               // This is a final transcript but not a complete turn
//               setCurrentTurnTranscript(transcript);
//               setPartialTranscript("");
//             } else {
//               // This is a partial transcript - show as live update
//               console.log("Partial transcript:", transcript);
//               setPartialTranscript(transcript);
//               setCurrentTurnTranscript(transcript);
//             }
//           }

//           if (msg.error) {
//             console.error("Transcription error:", msg.error);
//           }
//         } catch (err) {
//           console.error("Error parsing WS message:", err);
//         }
//       };

//       wsRef.current.onerror = (error: Event) => {
//         console.error("WebSocket error:", error);
//       };

//       // Get microphone stream
//       streamRef.current = await navigator.mediaDevices.getUserMedia({
//         audio: {
//           sampleRate: 16000, // Request 16kHz if possible
//           channelCount: 1, // Mono
//           echoCancellation: true,
//           noiseSuppression: true,
//         },
//       });

//       // Create audio context for processing
//       audioContextRef.current = new (window.AudioContext ||
//         (window as unknown as { webkitAudioContext: typeof AudioContext })
//           .webkitAudioContext)();

//       const source = audioContextRef.current.createMediaStreamSource(
//         streamRef.current
//       );

//       // Create script processor (deprecated but widely supported)
//       // Buffer size: 4096 samples
//       processorRef.current = audioContextRef.current.createScriptProcessor(
//         4096,
//         1,
//         1
//       );

//       processorRef.current.onaudioprocess = (
//         audioProcessingEvent: AudioProcessingEvent
//       ) => {
//         if (wsRef.current?.readyState === WebSocket.OPEN) {
//           const inputBuffer = audioProcessingEvent.inputBuffer;
//           const inputData = inputBuffer.getChannelData(0);

//           // Resample to 16kHz if needed
//           let processedData: Float32Array;
//           if (inputBuffer.sampleRate !== 16000) {
//             processedData = resampleBuffer(inputBuffer, 16000);
//           } else {
//             processedData = inputData;
//           }

//           // Convert to PCM16
//           const pcmBuffer = float32ToPCM16(processedData);

//           // Send to WebSocket
//           wsRef.current.send(pcmBuffer);
//         }
//       };

//       // Connect the audio processing chain
//       source.connect(processorRef.current);
//       processorRef.current.connect(audioContextRef.current.destination);

//       setIsRecording(true);
//     } catch (err) {
//       console.error("Error starting recording:", err);
//       alert("Error starting recording. Please check microphone permissions.");
//     }
//   };

//   const stopRecording = (): void => {
//     // Stop audio processing
//     if (processorRef.current) {
//       processorRef.current.disconnect();
//       processorRef.current = null;
//     }

//     if (audioContextRef.current) {
//       audioContextRef.current.close();
//       audioContextRef.current = null;
//     }

//     if (streamRef.current) {
//       streamRef.current
//         .getTracks()
//         .forEach((track: MediaStreamTrack) => track.stop());
//       streamRef.current = null;
//     }

//     // Close WebSocket
//     if (wsRef.current) {
//       wsRef.current.close();
//       wsRef.current = null;
//     }

//     // Clear partial transcript when stopping
//     setPartialTranscript("");
//     setCurrentTurnTranscript("");
//     setIsRecording(false);
//   };

//   // Combine final and partial transcripts for display
//   const displayTranscript =
//     finalTranscript +
//     (partialTranscript ? (finalTranscript ? " " : "") + partialTranscript : "");

//   return (
//     <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
//       <h2>Live Transcription</h2>
//       <button
//         onClick={isRecording ? stopRecording : startRecording}
//         style={{
//           padding: "10px 20px",
//           marginBottom: "15px",
//           cursor: "pointer",
//           background: isRecording ? "red" : "green",
//           color: "white",
//           border: "none",
//           borderRadius: "5px",
//         }}
//       >
//         {isRecording ? "Stop Recording" : "Start Recording"}
//       </button>

//       <div
//         style={{
//           minHeight: "150px",
//           padding: "10px",
//           border: "1px solid #ccc",
//           borderRadius: "5px",
//           background: "#f9f9f9",
//           whiteSpace: "pre-wrap",
//         }}
//       >
//         <div>
//           {/* Final transcript (confirmed) */}
//           <span style={{ color: "#000" }}>{finalTranscript}</span>
//           {/* Partial transcript (live, unconfirmed) */}
//           {partialTranscript && (
//             <span style={{ color: "#666", fontStyle: "italic" }}>
//               {finalTranscript ? " " : ""}
//               {partialTranscript}
//             </span>
//           )}
//         </div>
//         {!displayTranscript && (
//           <span style={{ color: "#999" }}>Transcript will appear here...</span>
//         )}
//       </div>

//       {/* Debug info */}
//       <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
//         <div>Final: "{finalTranscript}"</div>
//         <div>Current Turn: "{currentTurnTranscript}"</div>
//         <div>Partial: "{partialTranscript}"</div>
//       </div>
//     </div>
//   );
// };

// export default LiveTranscriber;

// LiveTranscriber.tsx
import React, { useState, useRef } from "react";

interface TranscriptMessage {
  transcript?: string;
  confidence?: number;
  isFinal?: boolean;
  isPartial?: boolean;
  isTurn?: boolean;
  error?: string;
  status?: string;
  sessionId?: string;
}

const LiveTranscriber: React.FC = () => {
  const [finalTranscript, setFinalTranscript] = useState<string>("");
  const [partialTranscript, setPartialTranscript] = useState<string>("");
  const [currentTurnTranscript, setCurrentTurnTranscript] =
    useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Convert Float32Array to 16-bit PCM
  const float32ToPCM16 = (float32Array: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;

    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      let sample = Math.max(-1, Math.min(1, float32Array[i]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, sample, true);
    }

    return buffer;
  };

  // Resample audio to 16kHz
  const resampleBuffer = (
    audioBuffer: AudioBuffer,
    targetSampleRate: number
  ): Float32Array => {
    if (audioBuffer.sampleRate === targetSampleRate) {
      return audioBuffer.getChannelData(0);
    }

    const sampleRateRatio = audioBuffer.sampleRate / targetSampleRate;
    const newLength = Math.round(audioBuffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);

    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;

      for (
        let i = offsetBuffer;
        i < nextOffsetBuffer && i < audioBuffer.length;
        i++
      ) {
        accum += audioBuffer.getChannelData(0)[i];
        count++;
      }

      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }

    return result;
  };

  const startRecording = async (): Promise<void> => {
    try {
      // Clear previous transcripts
      setFinalTranscript("");
      setPartialTranscript("");
      setCurrentTurnTranscript("");

      // Connect to backend WebSocket
      wsRef.current = new WebSocket(
        "ws://transcription-backend-production-e460.up.railway.app/live-transcription"
      );

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
      };

      wsRef.current.onmessage = (event: MessageEvent) => {
        try {
          const msg: TranscriptMessage = JSON.parse(event.data);
          console.log("Received:", msg);

          if (msg.transcript !== undefined && msg.transcript.trim() !== "") {
            const transcript = msg.transcript.trim();

            if (msg.isFinal && msg.isTurn) {
              // This is a complete sentence - add to final transcript
              console.log("Complete sentence received:", transcript);
              setFinalTranscript((prev) => {
                const newFinal = prev + (prev ? " " : "") + transcript;
                console.log("Updated final transcript:", newFinal);
                return newFinal;
              });
              setPartialTranscript(""); // Clear partial
              setCurrentTurnTranscript("");
            } else if (msg.isPartial || !msg.isFinal) {
              // This is a partial transcript - show in real-time
              console.log("Partial transcript:", transcript);
              setPartialTranscript(transcript);
              setCurrentTurnTranscript(transcript);
            }
          }

          if (msg.error) {
            console.error("Transcription error:", msg.error);
          }
        } catch (err) {
          console.error("Error parsing WS message:", err);
        }
      };

      wsRef.current.onerror = (error: Event) => {
        console.error("WebSocket error:", error);
      };

      // Get microphone stream
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000, // Request 16kHz if possible
          channelCount: 1, // Mono
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Create audio context for processing
      audioContextRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();

      const source = audioContextRef.current.createMediaStreamSource(
        streamRef.current
      );

      // Create script processor (deprecated but widely supported)
      // Buffer size: 4096 samples
      processorRef.current = audioContextRef.current.createScriptProcessor(
        4096,
        1,
        1
      );

      processorRef.current.onaudioprocess = (
        audioProcessingEvent: AudioProcessingEvent
      ) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputBuffer = audioProcessingEvent.inputBuffer;
          const inputData = inputBuffer.getChannelData(0);

          // Resample to 16kHz if needed
          let processedData: Float32Array;
          if (inputBuffer.sampleRate !== 16000) {
            processedData = resampleBuffer(inputBuffer, 16000);
          } else {
            processedData = inputData;
          }

          // Convert to PCM16
          const pcmBuffer = float32ToPCM16(processedData);

          // Send to WebSocket
          wsRef.current.send(pcmBuffer);
        }
      };

      // Connect the audio processing chain
      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Error starting recording. Please check microphone permissions.");
    }
  };

  const stopRecording = (): void => {
    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track: MediaStreamTrack) => track.stop());
      streamRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clear partial transcript when stopping
    setPartialTranscript("");
    setCurrentTurnTranscript("");
    setIsRecording(false);
  };

  // Combine final and partial transcripts for display
  const displayTranscript =
    finalTranscript +
    (partialTranscript ? (finalTranscript ? " " : "") + partialTranscript : "");

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h2>Live Transcription</h2>
      <button
        onClick={isRecording ? stopRecording : startRecording}
        style={{
          padding: "10px 20px",
          marginBottom: "15px",
          cursor: "pointer",
          background: isRecording ? "red" : "green",
          color: "white",
          border: "none",
          borderRadius: "5px",
        }}
      >
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>

      <div
        style={{
          minHeight: "150px",
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "5px",
          background: "#f9f9f9",
          whiteSpace: "pre-wrap",
        }}
      >
        <div>
          {/* Final transcript (confirmed) */}
          <span style={{ color: "#000" }}>{finalTranscript}</span>
          {/* Partial transcript (live, unconfirmed) */}
          {partialTranscript && (
            <span style={{ color: "#666", fontStyle: "italic" }}>
              {finalTranscript ? " " : ""}
              {partialTranscript}
            </span>
          )}
        </div>
        {!displayTranscript && (
          <span style={{ color: "#999" }}>Transcript will appear here...</span>
        )}
      </div>

      {/* Debug info */}
      <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
        <div>Final: "{finalTranscript}"</div>
        <div>Current Turn: "{currentTurnTranscript}"</div>
        <div>Partial: "{partialTranscript}"</div>
      </div>
    </div>
  );
};

export default LiveTranscriber;
