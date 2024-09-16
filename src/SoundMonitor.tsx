import React, { useEffect, useState } from 'react';

const SoundMonitor: React.FC = () => {
  const [soundLevel, setSoundLevel] = useState<number>(0);
  const [threshold, setThreshold] = useState<number>(80);
  const [inputThreshold, setInputThreshold] = useState<number>(80);
  const [alarm, setAlarm] = useState<boolean>(false);
  const [alarmPlayed, setAlarmPlayed] = useState<boolean>(false);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [soundPlaying, setSoundPlaying] = useState<boolean>(false);
  const [monitoring, setMonitoring] = useState<boolean>(false); // Track whether monitoring is active
  const [peak, setPeak] = useState<number>(0); // State to track the highest dB value
  const alarmSound = new Audio('/alarm.mp3'); // Path to your alarm sound

  // Function to start/stop monitoring
  const toggleMonitoring = () => {
    if (monitoring) {
      // Stop monitoring
      setMonitoring(false);
      setAlarm(false);
      setShowWarning(false);
      if (soundPlaying) {
        alarmSound.pause();
        alarmSound.currentTime = 0; // Reset sound to the start
      }
    } else {
      // Start monitoring
      setMonitoring(true);
    }
  };

  useEffect(() => {
    if (monitoring) {
      const getMicrophoneAccess = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const analyser = audioContext.createAnalyser();
          const microphone = audioContext.createMediaStreamSource(stream);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          analyser.fftSize = 2048;
          microphone.connect(analyser);

          const checkSoundLevel = () => {
            if (!monitoring) return; // Stop measuring if monitoring is stopped

            analyser.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((a, b) => a + b, 0);
            const average = sum / dataArray.length;
            const dB = Math.round(average);

            setSoundLevel(dB);

            // Update peak value if the current dB is higher
            if (dB > peak) {
              setPeak(dB);
            }

            if (dB > threshold && !alarmPlayed) {
              setAlarm(true);
              setAlarmPlayed(true);
              setShowWarning(true);
            } else if (dB <= threshold) {
              setAlarm(false);
              setAlarmPlayed(false); // Reset alarmPlayed to allow future triggers
              setShowWarning(false);
            }

            requestAnimationFrame(checkSoundLevel);
          };

          checkSoundLevel();
        } catch (err) {
          console.error('Error accessing microphone:', err);
        }
      };

      getMicrophoneAccess();
    }
  }, [monitoring, alarmPlayed, threshold, peak]);

  useEffect(() => {
    if (alarm && !soundPlaying && monitoring) {
      alarmSound.play().then(() => {
        setSoundPlaying(true);
        setTimeout(() => {
          setShowWarning(false);
          setSoundPlaying(false);
        }, 16000); // Duration for the alarm sound
      }).catch(err => console.error('Error playing sound:', err));
    }
  }, [alarm, alarmSound, soundPlaying, monitoring]);

  useEffect(() => {
    const handleEnded = () => {
      setSoundPlaying(false);
    };

    alarmSound.addEventListener('ended', handleEnded);

    return () => {
      alarmSound.removeEventListener('ended', handleEnded);
    };
  }, [alarmSound]);

  // Handle user input change, but don't update the threshold directly
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputThreshold(Number(event.target.value));
  };

  // Update the threshold only when the submit button is clicked
  const handleThresholdSubmit = () => {
    setThreshold(inputThreshold);
  };

  return (
    <div>
      <h1>Sound Level Monitor</h1>
      <p>Current sound level: {soundLevel} dB</p>
      <p>Peak sound level: {peak} dB</p> {/* Display the peak value */}
      {showWarning && <p>Alarm! Sound level is too high!</p>}

      <label>
        <span>Adjust Alarm Threshold:</span>
        <input
          type="number"
          min="0"
          max="120"
          value={inputThreshold} // Use inputThreshold for the input field
          onChange={handleInputChange}
        />
      </label>
      <button onClick={handleThresholdSubmit}>Submit</button>
      <p>Threshold: {threshold}</p>

      {/* Start/Stop button for monitoring */}
      <button onClick={toggleMonitoring}>
        {monitoring ? 'Stop Monitoring' : 'Start Monitoring'}
      </button>

      {/* Display monitoring state */}
      <p>{monitoring ? 'Monitoring is ACTIVE' : 'Monitoring is STOPPED'}</p>
    </div>
  );
};

export default SoundMonitor;
