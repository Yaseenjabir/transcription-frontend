import React, { useState, type ChangeEvent } from "react";

const AudioTranscriber: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    } else {
      setFile(null);
    }
    setTranscript("");
    setError("");
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select an audio file first.");
      return;
    }

    setLoading(true);
    setTranscript("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("audio", file);

      const res = await fetch(
        "https://transcription-backend-production-e460.up.railway.app/transcribe",
        {
          method: "POST",
          body: formData,
        }
      );

      const data: { text?: string; error?: string } = await res.json();

      if (res.ok && data.text) {
        setTranscript(data.text);
      } else {
        setError(data.error || "Transcription failed.");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong while uploading.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2>Audio Transcriber 🎙️</h2>

      <input type="file" accept="audio/*" onChange={handleFileChange} />

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        style={styles.button}
      >
        {loading ? "Transcribing..." : "Upload & Transcribe"}
      </button>

      {error && <p style={styles.error}>{error}</p>}

      {transcript && (
        <div style={styles.resultBox}>
          <h3>Transcript:</h3>
          <p>{transcript}</p>
        </div>
      )}
    </div>
  );
};

// Inline styles (same as your original)
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "500px",
    margin: "2rem auto",
    padding: "1.5rem",
    border: "1px solid #ddd",
    borderRadius: "12px",
    textAlign: "center",
    fontFamily: "sans-serif",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
  },
  button: {
    marginTop: "1rem",
    padding: "0.7rem 1.2rem",
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  error: {
    marginTop: "1rem",
    color: "red",
    fontWeight: "bold",
  },
  resultBox: {
    marginTop: "1.5rem",
    padding: "1rem",
    background: "#f8f9fa",
    borderRadius: "8px",
    textAlign: "left",
  },
};

export default AudioTranscriber;
