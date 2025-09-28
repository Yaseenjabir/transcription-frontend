import "./App.css";
import AudioTranscriber from "./AudioTranscriber";
import LiveTranscriber from "./LiveTranscriber";

function App() {
  return (
    <>
      <div>
        <AudioTranscriber />
        <LiveTranscriber />
      </div>
    </>
  );
}

export default App;
